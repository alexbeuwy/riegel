/**
 * Preview-Versand des NEUEN Marktwert-Reports an Alex — baut denselben Report
 * wie die Live-Route (echte Rechen-Engine, echter Standort-Kontext, echte
 * OnOffice-Vergleichsobjekte, Esri-Luftbild) und hängt das PDF an eine Mail.
 *
 *   npx tsx --env-file=.env.local scripts/preview-report-mail.mts
 *
 * Bewusst KEIN interner CC / kein Supabase-Log — reine Vorschau an alex@beuwy.com.
 */
import { sendMail, emailLayout } from "../src/lib/email";
import { buildReportPdf } from "../src/lib/report-pdf";
import { buildReportContext } from "../src/lib/report-context";
import { selectReportObjekte } from "../src/lib/report-objekte";
import { fetchOnOfficeEstates } from "../src/lib/onoffice";
import { fetchSatellite } from "../src/lib/satellite";
import { estimateValue } from "../src/lib/valuation";

// Realistisches Beispiel-Objekt: gepflegtes Haus in Speyer (Koordinaten =
// Innenstadt Speyer, damit Luftbild + Standort-Kontext echt greifen).
const LAT = 49.3172;
const LNG = 8.441;
const CITY = "Speyer";

const calc = estimateValue(
  {
    objektart: "haus",
    ort: CITY,
    plz: "67346",
    addressLabel: "Musterstraße 7, 67346 Speyer",
    lat: LAT,
    lng: LNG,
    wohnflaeche: 168,
    grundflaeche: 430,
    zimmer: 6,
    badezimmer: 2,
    baujahr: 1998,
    zustand: "gepflegt",
    qualitaet: "gehoben",
    energieklasse: "C",
    ausstattung: ["Balkon", "Garage", "Garten", "Fußbodenheizung"],
  },
  {},
);

const context = buildReportContext({ city: CITY, lat: LAT, lng: LNG });
// Direkt gegen die OnOffice-API (getEstateData fällt unter tsx auf Mock
// zurück, s. selectReportObjekte-Kommentar) — genau wie die Live-Route echte
// Referenzobjekte, nur ohne den Next-Cache davor.
const [liveEstates, satelliteB64] = await Promise.all([
  fetchOnOfficeEstates(),
  fetchSatellite(LAT, LNG),
]);
const vergleichsobjekte = liveEstates ? await selectReportObjekte(liveEstates, "haus", CITY) : [];

const pdfBase64 = await buildReportPdf({
  name: "Alex (Preview)",
  address: "Musterstraße 7, 67346 Speyer",
  city: CITY,
  postcode: "67346",
  objektartLabel: "Haus",
  wohnflaeche: 168,
  grundflaeche: 430,
  zimmer: 6,
  baujahr: 1998,
  zustand: "gepflegt",
  qualitaet: "gehoben",
  energieklasse: "C",
  ausstattung: ["Balkon", "Garage", "Garten", "Fußbodenheizung"],
  factors: calc.factors,
  context,
  vergleichsobjekte,
  satelliteB64: satelliteB64 ?? undefined,
  value: {
    low: calc.low,
    mid: calc.mid,
    high: calc.high,
    pricePerSqm: calc.pricePerSqm,
    comparables: calc.comparables,
    trendPct: calc.trendPct,
    mikrolage: calc.mikrolage,
    confidence: calc.confidence,
    vervielfaeltiger: calc.vervielfaeltiger,
  },
  dateLabel: new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date()),
});

const html = emailLayout({
  heading: "Preview: der neue Marktwert-Report",
  intro:
    "Hallo Alex, hier das überarbeitete Report-PDF als Vorschau, gebaut mit den echten Speyer-Marktdaten, dem Standort-Kontext und aktuellen OnOffice-Vergleichsobjekten. Das PDF hängt an.",
  bodyHtml: `<p style="margin:0;color:#5a6072;font-size:14px;line-height:1.6;">
Beispiel: Haus in Speyer, 168&nbsp;m², Baujahr 1998, gepflegt, gehobene Ausstattung.
Enthalten sind unter anderem die Preis-Zusammensetzung (Segment-Balken plus Wasserfall),
die Markt-Seite zu Speyer, echte Referenzobjekte aus der Vermarktung sowie die Facts-&amp;-Figures-Seite.
Zahl der Vergleichsobjekte in dieser Vorschau: ${vergleichsobjekte.length}.
</p>`,
});

const res = await sendMail({
  to: "alex@beuwy.com",
  subject: "Preview: neuer RIEGEL Marktwert-Report (PDF)",
  html,
  attachments: [{ filename: "RIEGEL-Marktwert-Report-Preview.pdf", content: Buffer.from(pdfBase64, "base64") }],
});

console.log(
  JSON.stringify({
    ok: res.ok,
    error: res.error ?? null,
    skipped: res.skipped ?? false,
    pdfBytes: Buffer.from(pdfBase64, "base64").length,
    vergleichsobjekte: vergleichsobjekte.length,
    hatLuftbild: Boolean(satelliteB64),
    mid: calc.mid,
  }),
);
