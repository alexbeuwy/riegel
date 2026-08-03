import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyInternAccess } from "@/lib/intern-access";
import { createOnOfficeAddress } from "@/lib/onoffice";
import type { LeadQuelle } from "@/lib/lead-bearbeitung";

/**
 * Übergibt einen Report (Bewertungsanfrage) oder eine Anfrage aus dem
 * /intern-Cockpit als Adressdatensatz an OnOffice (Button "An OnOffice
 * übergeben" bei einem Lead). Zugriff wie beim übrigen /intern (Passwort
 * ODER freigeschaltete E-Mail). Fehlermeldungen bleiben nach außen generisch,
 * Details nur in den Logs.
 *
 * Doppelklick-/Mehrfach-Schutz: existiert für (quelle, quelle_id) in
 * lead_bearbeitung bereits eine onoffice_adresse_id, wird KEIN zweiter
 * Datensatz in OnOffice angelegt. Die vorhandene Id kommt einfach zurück.
 */

/** "Max Mustermann" -> Vorname "Max", Name "Mustermann". Einzelnes Wort ->
 *  nur Name. Analog zur splitName-Hilfe in api/inquiry/route.ts. */
function splitName(full: string): { vorname?: string; nachname: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { nachname: full.trim() || "Unbekannt" };
  return { vorname: parts.slice(0, -1).join(" "), nachname: parts[parts.length - 1] };
}

/**
 * Zusätzlich zur DB-Prüfung (existing.data?.onoffice_adresse_id) ein
 * In-Memory-Sperrschutz je (quelle, quelle_id): zwei nahezu gleichzeitige
 * Requests (Doppelklick, bevor die erste Antwort da ist) würden sonst beide
 * die DB-Prüfung VOR dem ersten Upsert passieren und zwei Datensätze in
 * OnOffice anlegen. Gilt nur pro Serverless-Instanz (wie rate-limit.ts),
 * deckt aber genau das eine reale Szenario ab: denselben Button zweimal
 * hintereinander klicken.
 */
const inFlight = new Set<string>();

export async function POST(req: Request) {
  if (!rateLimit(`intern-onoffice:${clientIp(req)}`, 30, 10 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Versuche. Bitte später erneut." },
      { status: 429 },
    );
  }

  // quelle_id als Alias: die Schwester-Route /api/intern/bearbeitung nutzt snake_case.
  let b: { password?: string; accessToken?: string; quelle?: string; quelleId?: string; quelle_id?: string };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const auth = await verifyInternAccess({ password: b.password, accessToken: b.accessToken });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  if (b.quelle !== "report" && b.quelle !== "lead") {
    return NextResponse.json({ ok: false, error: "quelle ungültig" }, { status: 400 });
  }
  const quelle: LeadQuelle = b.quelle;

  const quelleId = String(b.quelleId ?? b.quelle_id ?? "").trim();
  if (!quelleId) {
    return NextResponse.json({ ok: false, error: "quelleId fehlt" }, { status: 400 });
  }

  const lockKey = `${quelle}:${quelleId}`;
  if (inFlight.has(lockKey)) {
    return NextResponse.json(
      { ok: false, error: "Übergabe läuft bereits, bitte kurz warten." },
      { status: 409 },
    );
  }
  inFlight.add(lockKey);

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error("[intern-onoffice] Supabase-Env fehlt.");
      return NextResponse.json({ ok: false, error: "Zugriff derzeit nicht möglich." }, { status: 503 });
    }
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Doppelklick-/Mehrfach-Schutz: schon übergeben? Dann die vorhandene Id
    // zurückgeben, statt einen zweiten Datensatz in OnOffice anzulegen.
    const existing = await admin
      .from("lead_bearbeitung")
      .select("onoffice_adresse_id")
      .eq("quelle", quelle)
      .eq("quelle_id", quelleId)
      .maybeSingle();
    if (existing.error) {
      console.error("[intern-onoffice] Bearbeitung-Load-Fehler:", existing.error.message);
    }
    if (existing.data?.onoffice_adresse_id) {
      return NextResponse.json({
        ok: true,
        onoffice_adresse_id: existing.data.onoffice_adresse_id,
        bereitsUebergeben: true,
      });
    }

    // Quelldatensatz laden: Report (valuation_requests) oder Anfrage (leads).
    let name = "";
    let email: string | undefined;
    let telefon: string | undefined;
    let strasse: string | undefined;
    let plz: string | undefined;
    let ort: string | undefined;
    const kontextParts: string[] = [];

    if (quelle === "report") {
      const { data, error } = await admin
        .from("valuation_requests")
        .select("name, email, phone, address, city, postcode, objektart, value_mid, message")
        .eq("id", quelleId)
        .maybeSingle();
      if (error || !data) {
        console.error("[intern-onoffice] Report-Load-Fehler:", error?.message ?? "nicht gefunden");
        return NextResponse.json({ ok: false, error: "Datensatz nicht gefunden." }, { status: 404 });
      }
      name = data.name ?? "";
      email = data.email ?? undefined;
      telefon = data.phone ?? undefined;
      strasse = data.address ?? undefined;
      plz = data.postcode ?? undefined;
      ort = data.city ?? undefined;
      if (data.objektart) kontextParts.push(`Objektart: ${data.objektart}`);
      if (data.value_mid) kontextParts.push(`Richtwert ca. ${Number(data.value_mid).toLocaleString("de-DE")} EUR`);
      if (data.message) kontextParts.push(`Nachricht: ${data.message}`);
    } else {
      const { data, error } = await admin
        .from("leads")
        .select("name, email, phone, subject, message")
        .eq("id", quelleId)
        .maybeSingle();
      if (error || !data) {
        console.error("[intern-onoffice] Anfrage-Load-Fehler:", error?.message ?? "nicht gefunden");
        return NextResponse.json({ ok: false, error: "Datensatz nicht gefunden." }, { status: 404 });
      }
      name = data.name ?? "";
      email = data.email ?? undefined;
      telefon = data.phone ?? undefined;
      if (data.subject) kontextParts.push(`Betreff: ${data.subject}`);
      if (data.message) kontextParts.push(`Nachricht: ${data.message}`);
    }

    if (!name.trim()) {
      return NextResponse.json({ ok: false, error: "Datensatz hat keinen Namen." }, { status: 422 });
    }

    const { vorname, nachname } = splitName(name);
    const bemerkung = ["Quelle: Website-Lead", ...kontextParts].join(". ");

    const addressId = await createOnOfficeAddress({
      vorname,
      name: nachname,
      email,
      telefon,
      strasse,
      plz,
      ort,
      bemerkung,
    });

    if (!addressId) {
      console.error("[intern-onoffice] OnOffice-Adressanlage fehlgeschlagen oder nicht konfiguriert.");
      return NextResponse.json({ ok: false, error: "OnOffice-Übergabe derzeit nicht möglich." }, { status: 502 });
    }

    const { error: upsertError } = await admin.from("lead_bearbeitung").upsert(
      {
        quelle,
        quelle_id: quelleId,
        onoffice_adresse_id: addressId,
        geaendert_am: new Date().toISOString(),
      },
      { onConflict: "quelle,quelle_id" },
    );
    if (upsertError) {
      // Der Adressdatensatz existiert in OnOffice bereits. Die Id wird trotzdem
      // zurückgegeben, damit sie nicht verloren geht, auch wenn der
      // Bearbeitungsstand hier gerade nicht mitgeschrieben werden konnte.
      console.error("[intern-onoffice] Speichern der onoffice_adresse_id fehlgeschlagen:", upsertError.message);
    }

    return NextResponse.json({ ok: true, onoffice_adresse_id: addressId });
  } finally {
    inFlight.delete(lockKey);
  }
}
