import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";

export const metadata = { title: "Datenschutzerklärung" };

const prose =
  "mx-auto max-w-3xl space-y-4 text-muted [&_a]:text-accent [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-fg [&_h3]:mt-6 [&_h3]:font-medium [&_h3]:text-fg [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_strong]:text-fg";

export default function DatenschutzPage() {
  return (
    <>
      <PageIntro eyebrow="Rechtliches" title="Datenschutzerklärung" />
      <section className="py-14">
        <Container>
          <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-accent/40 bg-surface p-4 text-sm text-muted">
            ⚠️ <strong className="text-fg">Entwurf</strong> — anwaltlich prüfen lassen. Alle
            externen Dienste werden vor dem Go-Live hinter ein echtes Consent-Tool (Opt-in)
            gelegt; Auftragsverarbeitungsverträge (Art. 28 DSGVO) sind vor dem Echtbetrieb
            abzuschließen.
          </div>

          <div className={prose}>
            <h2>1. Verantwortlicher</h2>
            <p>
              Verantwortlich für die Datenverarbeitung auf dieser Website ist:
              <br />
              <strong>RIEGEL Immobilien</strong>, Inhaberin Sylwia Riegel, Wormser Straße 13,
              67346 Speyer.
              <br />
              E-Mail: <a href="mailto:info@riegel-immobilien.de">info@riegel-immobilien.de</a>,
              Telefon: 06232 100 10 10.
            </p>

            <h2>2. Ihre Rechte</h2>
            <p>Ihnen stehen gegenüber dem Verantwortlichen folgende Rechte zu:</p>
            <ul>
              <li>Auskunft (Art. 15 DSGVO)</li>
              <li>Berichtigung (Art. 16 DSGVO)</li>
              <li>Löschung (Art. 17 DSGVO)</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO)</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
              <li>
                <strong>Widerruf einer erteilten Einwilligung</strong> jederzeit mit Wirkung
                für die Zukunft (Art. 7 Abs. 3 DSGVO)
              </li>
            </ul>
            <p>
              Es besteht zudem ein Beschwerderecht bei einer Aufsichtsbehörde, etwa dem
              Landesbeauftragten für den Datenschutz und die Informationsfreiheit
              Rheinland-Pfalz.
            </p>

            <h2>3. Hosting (Vercel)</h2>
            <p>
              Diese Website wird bei der Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA
              91789, USA) gehostet. Beim Aufruf werden technisch notwendige Daten (Server-
              Logfiles: IP-Adresse, Datum/Uhrzeit, abgerufene Datei, Browser/OS) verarbeitet,
              Rechtsgrundlage Art. 6 Abs. 1 lit. f DSGVO (sicherer, störungsfreier Betrieb).
              Bei einer Übermittlung in die USA stützt sich diese auf
              EU-Standardvertragsklauseln; ein Auftragsverarbeitungsvertrag wird geschlossen.
            </p>

            <h2>4. SSL-/TLS-Verschlüsselung</h2>
            <p>
              Diese Seite nutzt aus Sicherheitsgründen eine SSL-/TLS-Verschlüsselung. Eine
              verschlüsselte Verbindung erkennen Sie an „https://" in der Adresszeile.
            </p>

            <h2>5. Cookies & Einwilligungsverwaltung</h2>
            <p>
              Technisch notwendige Speicherungen (z. B. Ihre Merkliste und Suchaufträge im
              lokalen Speicher Ihres Browsers) erfolgen auf Grundlage von § 25 Abs. 2 TDDDG
              bzw. Art. 6 Abs. 1 lit. f DSGVO. Alle nicht notwendigen externen Dienste werden
              erst nach Ihrer Einwilligung geladen (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a
              DSGVO). Ihre Einwilligung ist jederzeit über die Cookie-Einstellungen mit
              Wirkung für die Zukunft widerrufbar.
            </p>

            <h2>6. Kontaktaufnahme</h2>
            <p>
              Bei Kontaktaufnahme (Formular, E-Mail, Telefon) verarbeiten wir Ihre Angaben zur
              Bearbeitung der Anfrage. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
              (vorvertragliche Maßnahmen) bzw. lit. f DSGVO (Beantwortung von Anfragen). Die
              Daten werden gelöscht, sobald sie nicht mehr erforderlich sind, vorbehaltlich
              gesetzlicher Aufbewahrungsfristen.
            </p>

            <h2>7. Immobilienbewertung (Wertrechner)</h2>
            <p>
              Wenn Sie den Bewertungsrechner nutzen, verarbeiten wir die von Ihnen
              eingegebenen Objekt- und Kontaktdaten, um Ihnen eine Einschätzung zu erstellen
              und Sie auf Wunsch zu kontaktieren. Rechtsgrundlage ist Ihre Einwilligung
              (Art. 6 Abs. 1 lit. a DSGVO), die Sie jederzeit widerrufen können, sowie
              vorvertragliche Maßnahmen (lit. b).
            </p>

            <h2>8. Immobiliendaten / CRM (onOffice)</h2>
            <p>
              Zur Darstellung von Objekten und zur Bearbeitung von Anfragen setzen wir die
              CRM-Lösung der onOffice GmbH ein. Übermittelte Anfragedaten werden dort als
              Auftragsverarbeiter (Art. 28 DSGVO) verarbeitet; ein entsprechender Vertrag
              wird geschlossen.
            </p>

            <h2>9. Schriftarten (Adobe Fonts)</h2>
            <p>
              Zur einheitlichen Darstellung nutzen wir – nach Ihrer Einwilligung – „Adobe
              Fonts" der Adobe Systems Software Ireland Ltd. Hierbei kann Ihre IP-Adresse an
              Adobe übermittelt werden. Ohne Einwilligung wird eine lokal gehostete
              Ersatzschrift verwendet.
            </p>

            <h2>10. Kartendarstellung</h2>
            <p>
              Für die Kartenansicht im Immobilienportal setzen wir – nach Ihrer Einwilligung
              – einen Kartendienst auf Basis von OpenStreetMap-Daten (Kartenkacheln via CARTO)
              ein. Dabei wird Ihre IP-Adresse an den Kartendienst übermittelt.
            </p>

            <h2>11. Social-Media-Verlinkungen</h2>
            <p>
              Wir verlinken auf unsere Profile (Instagram, Facebook, YouTube) ausschließlich
              per einfachem Link. Es findet keine Einbettung statt; ein Datenabfluss erfolgt
              erst, wenn Sie den Link aktiv anklicken und die jeweilige Plattform besuchen.
            </p>

            <h2>12. Speicherdauer</h2>
            <p>
              Wir verarbeiten personenbezogene Daten nur so lange, wie es für die genannten
              Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen es vorschreiben.
            </p>

            <p className="pt-4 text-sm text-faint">
              Stand: Entwurf 2026 — anwaltlich zu finalisieren.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
