/**
 * Einmaliges Reporting-Mail an Manfred + Sissy: was aus Manfreds E-Mail-Input
 * (17.07.) auf der Website umgesetzt wurde. Nutzung:
 *   npx tsx --env-file=.env.local scripts/report-manfred.mts          → Testversand an Alex
 *   npx tsx --env-file=.env.local scripts/report-manfred.mts --send   → echter Versand (Manfred + Sissy, CC Alex)
 */
import { sendMail, emailLayout } from "../src/lib/email";

const BASE = "https://riegel.vercel.app";
const real = process.argv.includes("--send");

const li = (title: string, text: string, href?: string) =>
  `<tr><td style="padding:0 0 16px;">
     <div style="color:#141724;font-size:15px;font-weight:700;line-height:1.4;">${title}</div>
     <div style="color:#5a6072;font-size:14px;line-height:1.6;margin-top:3px;">${text}${
       href ? ` &middot; <a href="${href}" style="color:#015cff;text-decoration:none;">Ansehen &rarr;</a>` : ""
     }</div>
   </td></tr>`;

const body = `
<p style="margin:0 0 18px;color:#5a6072;font-size:15px;line-height:1.6;">
Hallo Manfred, hallo Sissy,<br><br>
aus Manfreds vier E-Mails vom 17.07. (Fragenkataloge, Unternehmensprofil, Experten-Idee) ist
in den letzten Tagen ein ganzes Paket auf der neuen Website geworden. Hier der Überblick:
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${li(
  "1. Die Experten-Seiten sind live (Manfreds Idee)",
  "Fünf Verkäufer-Landingpages: Mehrfamilienhäuser &amp; Zinshäuser, Gewerbeimmobilien, Wohn- und Geschäftshäuser, Anlage- &amp; Investmentimmobilien, Nachlass- &amp; Erbimmobilien. Jede Seite mit eigener Überschrift, USPs (121.000+ Suchaufträge, Direktankauf über die Investorenfirmen, Investoren-Netzwerk), einer animierten Infografik, echten Beispielobjekten aus OnOffice, Kundenstimmen und häufigen Eigentümerfragen. Die lange Begriffsliste ist bewusst zu kompakten Schlagwort-Reihen destilliert, damit nichts überladen wirkt.",
  `${BASE}/verkaufen/mehrfamilienhaus`,
)}
${li(
  "2. Erreichbar über ein neues Aufklapp-Menü",
  "„Verkaufen&quot; öffnet in der Navigation jetzt ein Menü mit sechs Einträgen (wie bei der Immobilienbewertung) — Desktop und mobil.",
  `${BASE}/verkaufen`,
)}
${li(
  "3. Der Fragenkatalog ist jetzt ein Ratgeber-Artikel",
  "Manfreds echte Antworten auf die KI-generierten Verkäufer-Fragenkataloge sind — ohne jeden Kundenbezug — als Artikel „15 Fragen, die Sie jedem Makler stellen sollten&quot; veröffentlicht. Der Hintergedanke: Verkäufer lassen sich solche Fragen von KI-Assistenten erstellen. Stehen unsere Antworten öffentlich im Netz, finden und zitieren genau diese Assistenten künftig RIEGEL. Die Arbeit an den Antworten zahlt sich damit dauerhaft aus.",
  `${BASE}/ratgeber/fragenkatalog-makler`,
)}
${li(
  "4. Die Kennzahlen aus dem Profil sind eingebaut",
  "121.000+ aktive Suchaufträge stehen auf der Startseite und als Verkäufer-Argument auf den Experten-Seiten („Käufer schon vor der Veröffentlichung&quot;). Der Direktankauf durch die beiden Investorenfirmen ist als eigenes Alleinstellungsmerkmal auf der Anlage-Seite erklärt.",
  BASE,
)}
${li(
  "5. Kleinigkeiten, bewusst anders umgesetzt",
  "„BFFI&quot; aus der E-Mail wurde als BVFI übernommen (Tippfehler) und statt „über 300 Google-Bewertungen&quot; zeigen wir die exakt abgelesenen 449 (Speyer 414 + Ludwigshafen 35) — beides, damit alle Angaben nachprüfbar bleiben.",
)}
</table>
<p style="margin:6px 0 0;color:#5a6072;font-size:14px;line-height:1.6;">
Weitere Objektarten (z.&nbsp;B. Pflegeimmobilien oder Grundstücke) lassen sich jederzeit als
zusätzliche Experten-Seite ergänzen — das ist jetzt ein kleiner Konfigurationseintrag.
Feedback wie immer gern direkt über die Kommentar-Funktion auf der Seite oder per Mail.
</p>`;

const html = emailLayout({
  heading: "Ihr Input ist online",
  intro: undefined,
  bodyHtml: body,
  ctaLabel: "Die neuen Experten-Seiten ansehen",
  ctaHref: `${BASE}/verkaufen`,
});

const to = real ? ["info@riegel-immobilien.de", "sissy.riegel@riegel-immobilien.de"] : "alex@beuwy.com";
const cc = real ? "alex@beuwy.com" : undefined;

const res = await sendMail({
  to: Array.isArray(to) ? to.join(", ") : to,
  ...(cc ? { cc } : {}),
  subject: "Website-Update: Ihre Ideen vom 17.07. sind umgesetzt",
  html,
});
console.log(real ? "ECHTER Versand" : "Testversand an Alex", "→", JSON.stringify(res));
