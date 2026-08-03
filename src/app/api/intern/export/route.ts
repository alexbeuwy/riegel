import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyInternAccess } from "@/lib/intern-access";

/**
 * CSV-Export für /intern: Reports (valuation_requests) oder Anfragen (leads)
 * als Excel-taugliche CSV-Datei (UTF-8-BOM, Semikolon-Trenner). Zugriff/
 * Rate-Limit wie die übrigen /intern-Routen; Fehlermeldungen bleiben nach
 * außen generisch, Details nur in den Logs.
 */

type Was = "leads" | "reports";

const OBJEKTART_LABEL: Record<string, string> = {
  wohnung: "Wohnung",
  haus: "Haus",
  grundstueck: "Grundstück",
  gewerbe: "Gewerbe",
  mehrfamilienhaus: "Mehrfamilienhaus",
};

/** Datumsangabe (z. B. aus einem <input type="date">, "YYYY-MM-DD") robust
 *  parsen. Bei fehlendem/ungültigem Wert null statt eines Fehlers, der
 *  Filter bleibt dann einfach weg. */
function parseDateParam(v: unknown): Date | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

function fmtDatum(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Eine CSV-Zelle absichern:
 *  - Formel-Injection: Excel/Sheets führen Zellinhalte aus, die mit
 *    = + - @ (oder, je nach Programm, mit Tab/Wagenrücklauf) beginnen,
 *    solche Werte bekommen ein führendes Hochkomma und gelten damit als
 *    reiner Text (deckt sich mit dem OWASP-CSV-Injection-Cheatsheet; die
 *    Namens-/Nachrichtenfelder kommen aus Formularen mit Nutzereingabe,
 *    z. B. api/report, api/contact, api/booking, api/inquiry).
 *  - Enthält der Wert Semikolon, Anführungszeichen oder einen Zeilenumbruch,
 *    wird die Zelle in Anführungszeichen gekapselt (interne " verdoppelt).
 */
function csvCell(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[;"\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(cols: string[], rows: Record<string, unknown>[]): string {
  const lines = [cols.map(csvCell).join(";")];
  for (const r of rows) lines.push(cols.map((c) => csvCell(r[c])).join(";"));
  return lines.join("\r\n");
}

export async function POST(req: Request) {
  if (!rateLimit(`intern-export:${clientIp(req)}`, 20, 10 * 60_000)) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Versuche, bitte später erneut." },
      { status: 429 },
    );
  }

  let b: {
    password?: string;
    accessToken?: string;
    was?: string;
    vonDatum?: string;
    bisDatum?: string;
  };
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const auth = await verifyInternAccess({ password: b.password, accessToken: b.accessToken });
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  if (b.was !== "leads" && b.was !== "reports") {
    return NextResponse.json({ ok: false, error: "was fehlt/ungültig." }, { status: 400 });
  }
  const was: Was = b.was;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("[intern/export] Supabase-Env fehlt.");
    return NextResponse.json({ ok: false, error: "Zugriff derzeit nicht möglich." }, { status: 503 });
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const von = parseDateParam(b.vonDatum);
  const bis = parseDateParam(b.bisDatum);

  const table = was === "leads" ? "leads" : "valuation_requests";
  let queryBuilder = admin
    .from(table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (von) queryBuilder = queryBuilder.gte("created_at", von.toISOString());
  // "bis" schließt den ganzen Tag ein (exklusive obere Grenze am Folgetag).
  if (bis) queryBuilder = queryBuilder.lt("created_at", new Date(bis.getTime() + 86_400_000).toISOString());

  const { data, error } = await queryBuilder;
  if (error) {
    console.error("[intern/export] DB-Fehler:", error.message);
    return NextResponse.json({ ok: false, error: "Daten konnten nicht geladen werden." }, { status: 500 });
  }
  const rows: Record<string, unknown>[] = data ?? [];

  let cols: string[];
  let csvRows: Record<string, unknown>[];

  if (was === "reports") {
    cols = ["Datum", "Name", "E-Mail", "Telefon", "Ort", "Objektart", "Flaeche", "Wert"];
    csvRows = rows.map((r) => ({
      Datum: fmtDatum(r.created_at as string | null),
      Name: r.name ?? "",
      "E-Mail": r.email ?? "",
      Telefon: r.phone ?? "",
      Ort: [r.postcode, r.city].filter(Boolean).join(" "),
      Objektart: OBJEKTART_LABEL[(r.objektart as string) ?? ""] ?? r.objektart ?? "",
      Flaeche: r.wohnflaeche ?? "",
      Wert: r.value_mid ?? "",
    }));
  } else {
    cols = ["Datum", "Art", "Name", "E-Mail", "Telefon", "Betreff", "Nachricht"];
    csvRows = rows.map((r) => ({
      Datum: fmtDatum(r.created_at as string | null),
      Art: r.kind === "booking" ? "Termin" : r.kind === "archiv" ? "Alt-Kontakt" : "Kontakt",
      Name: r.name ?? "",
      "E-Mail": r.email ?? "",
      Telefon: r.phone ?? "",
      Betreff: r.subject ?? "",
      Nachricht: r.message ?? "",
    }));
  }

  const csv = toCsv(cols, csvRows);
  const heute = new Date().toISOString().slice(0, 10);
  const zeitraum =
    von || bis
      ? `_${von ? von.toISOString().slice(0, 10) : "anfang"}-bis-${bis ? bis.toISOString().slice(0, 10) : "heute"}`
      : "";
  const filename = `RIEGEL-${was === "reports" ? "Reports" : "Anfragen"}${zeitraum}_${heute}.csv`;

  // UTF-8-BOM voranstellen, damit Excel unter Windows die Umlaute korrekt
  // als UTF-8 statt Windows-1252 interpretiert.
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
