import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";

export const metadata = {
  title: "Datenschutzerklärung",
  description:
    "Datenschutzerklärung von Riegel Immobilien — umfassende Informationen zur Verarbeitung personenbezogener Daten nach DSGVO und TDDDG.",
};

const prose =
  "mx-auto max-w-3xl space-y-4 text-muted [&_a]:text-accent [&_a]:underline [&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-fg [&_h3]:mt-7 [&_h3]:font-medium [&_h3]:text-fg [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_strong]:text-fg [&_p]:leading-relaxed";

const toc: { id: string; label: string }[] = [
  { id: "verantwortlicher", label: "1. Verantwortlicher & Kontakt" },
  { id: "begriffe", label: "2. Grundlagen & Begriffe" },
  { id: "rechtsgrundlagen", label: "3. Rechtsgrundlagen" },
  { id: "rechte", label: "4. Ihre Rechte" },
  { id: "widerspruch", label: "5. Widerspruchsrecht (Art. 21)" },
  { id: "speicherdauer", label: "6. Speicherdauer & Löschung" },
  { id: "sicherheit", label: "7. Datensicherheit" },
  { id: "hosting", label: "8. Hosting & Server-Logfiles (Vercel)" },
  { id: "cookies", label: "9. Cookies, lokale Speicherung & Einwilligung" },
  { id: "kontakt", label: "10. Kontaktaufnahme & WhatsApp" },
  { id: "termin", label: "11. Online-Terminbuchung" },
  { id: "rechner", label: "12. Immobilienbewertung (Rechner)" },
  { id: "geocoding", label: "13. Adresssuche / Geokodierung" },
  { id: "karten", label: "14. Kartendarstellung (CARTO & Esri)" },
  { id: "konten", label: "15. Benutzerkonten (Supabase)" },
  { id: "mailversand", label: "16. E-Mail-Versand (Resend)" },
  { id: "onoffice", label: "17. Immobilien & CRM (onOffice)" },
  { id: "makler", label: "18. Maklertätigkeit & GwG-Pflichten" },
  { id: "empfaenger", label: "19. Empfänger & Weitergabe" },
  { id: "drittland", label: "20. Drittlandübermittlung" },
  { id: "schriften", label: "21. Schriftarten (self-hosted)" },
  { id: "social", label: "22. Social-Media-Verlinkung & Reels" },
  { id: "automatisiert", label: "23. Keine automatisierte Entscheidung" },
  { id: "minderjaehrige", label: "24. Minderjährige" },
  { id: "aenderungen", label: "25. Aktualität & Änderungen" },
];

export default function DatenschutzPage() {
  return (
    <>
      <PageIntro eyebrow="Rechtliches" title="Datenschutzerklärung" />
      <section className="py-14">
        <Container>
          <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-accent/40 bg-surface p-4 text-sm text-muted">
            Diese Datenschutzerklärung wurde mit größter Sorgfalt erstellt und informiert Sie
            umfassend über die Verarbeitung Ihrer Daten. Da die datenschutzrechtliche Bewertung
            vom konkreten Einsatz abhängt, erfolgt vor dem Echtbetrieb eine abschließende
            anwaltliche Prüfung; mit allen Dienstleistern werden Verträge zur Auftragsverarbeitung
            (Art. 28 DSGVO) geschlossen.
          </div>

          {/* Inhaltsübersicht */}
          <nav aria-label="Inhaltsübersicht" className="mx-auto mb-12 max-w-3xl rounded-xl border border-border bg-surface p-6">
            <div className="mb-3 text-xs uppercase tracking-widest text-faint">Inhaltsübersicht</div>
            <ol className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
              {toc.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="text-muted underline-offset-2 hover:text-accent hover:underline">
                    {t.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className={prose}>
            <p>
              Wir freuen uns über Ihr Interesse an Riegel Immobilien. Der Schutz Ihrer
              personenbezogenen Daten ist uns ein wichtiges Anliegen. Nachfolgend informieren wir
              Sie ausführlich über Art, Umfang und Zweck der Verarbeitung personenbezogener Daten
              auf dieser Website sowie im Rahmen unserer Maklertätigkeit gemäß der
              Datenschutz-Grundverordnung (DSGVO), dem Bundesdatenschutzgesetz (BDSG) und dem
              Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz (TDDDG).
            </p>

            <h2 id="verantwortlicher">1. Verantwortlicher & Kontakt</h2>
            <p>
              Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO ist:
              <br />
              <strong>Riegel Immobilien</strong>, Inhaberin Sylwia Riegel
              <br />
              Wormser Straße 13, 67346 Speyer
              <br />
              Zweigstelle: Kaiser-Wilhelm-Straße 16, 67059 Ludwigshafen am Rhein
              <br />
              Telefon: 06232 100 10 10 · E-Mail:{" "}
              <a href="mailto:info@riegel-immobilien.de">info@riegel-immobilien.de</a>
            </p>
            <p>
              Ein Datenschutzbeauftragter ist gesetzlich nicht zwingend zu bestellen; bei Fragen zum
              Datenschutz wenden Sie sich bitte unmittelbar an die vorstehenden Kontaktdaten.
            </p>

            <h2 id="begriffe">2. Grundlagen & Begriffe</h2>
            <p>
              „Personenbezogene Daten" sind alle Informationen, die sich auf eine identifizierte
              oder identifizierbare natürliche Person beziehen (Art. 4 Nr. 1 DSGVO). „Verarbeitung"
              ist jeder Vorgang im Zusammenhang mit solchen Daten (z. B. Erheben, Speichern,
              Verwenden, Übermitteln, Löschen). Wir verarbeiten Daten stets im Einklang mit den
              Grundsätzen der Rechtmäßigkeit, Transparenz, Zweckbindung, Datenminimierung,
              Richtigkeit, Speicherbegrenzung sowie Integrität und Vertraulichkeit (Art. 5 DSGVO).
            </p>

            <h2 id="rechtsgrundlagen">3. Rechtsgrundlagen der Verarbeitung</h2>
            <p>Soweit wir Daten verarbeiten, stützen wir uns auf folgende Rechtsgrundlagen:</p>
            <ul>
              <li><strong>Art. 6 Abs. 1 lit. a DSGVO</strong> — Ihre Einwilligung;</li>
              <li><strong>lit. b</strong> — Vertragserfüllung und vorvertragliche Maßnahmen;</li>
              <li><strong>lit. c</strong> — Erfüllung rechtlicher Verpflichtungen (z. B. GwG, Steuerrecht);</li>
              <li><strong>lit. f</strong> — Wahrung berechtigter Interessen (z. B. sicherer Betrieb, Beantwortung von Anfragen, Direktwerbung).</li>
            </ul>
            <p>
              Für das Speichern von bzw. den Zugriff auf Informationen in Ihrem Endgerät gilt
              ergänzend § 25 TDDDG (notwendige Speicherung: Abs. 2; sonst Einwilligung: Abs. 1).
            </p>

            <h2 id="rechte">4. Ihre Rechte als betroffene Person</h2>
            <p>Ihnen stehen gegenüber dem Verantwortlichen folgende Rechte zu:</p>
            <ul>
              <li>Auskunft über die verarbeiteten Daten (Art. 15 DSGVO);</li>
              <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO);</li>
              <li>Löschung (Art. 17 DSGVO);</li>
              <li>Einschränkung der Verarbeitung (Art. 18 DSGVO);</li>
              <li>Datenübertragbarkeit (Art. 20 DSGVO);</li>
              <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO, siehe Ziffer 5);</li>
              <li><strong>Widerruf einer erteilten Einwilligung</strong> jederzeit mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO).</li>
            </ul>
            <p>
              Zudem haben Sie das Recht auf Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO).
              Zuständig ist insbesondere:
              <br />
              <strong>Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit
              Rheinland-Pfalz</strong>, Hintere Bleiche 34, 55116 Mainz, E-Mail:{" "}
              <a href="mailto:poststelle@datenschutz.rlp.de">poststelle@datenschutz.rlp.de</a>.
            </p>

            <h2 id="widerspruch">5. Widerspruchsrecht (Art. 21 DSGVO)</h2>
            <p>
              <strong>
                Soweit wir Daten auf Grundlage berechtigter Interessen (Art. 6 Abs. 1 lit. f DSGVO)
                verarbeiten, haben Sie das Recht, aus Gründen, die sich aus Ihrer besonderen
                Situation ergeben, jederzeit Widerspruch einzulegen.
              </strong>{" "}
              Verarbeiten wir Ihre Daten zum Zwecke der Direktwerbung, haben Sie das Recht, jederzeit
              ohne Angabe von Gründen Widerspruch einzulegen; wir verarbeiten die Daten dann nicht
              mehr zu diesen Zwecken.
            </p>

            <h2 id="speicherdauer">6. Speicherdauer & Löschung</h2>
            <p>
              Wir verarbeiten personenbezogene Daten nur so lange, wie es für die jeweiligen Zwecke
              erforderlich ist. Anschließend werden die Daten gelöscht, sofern keine gesetzlichen
              Aufbewahrungspflichten bestehen. Insbesondere gelten:
            </p>
            <ul>
              <li>handels- und steuerrechtliche Aufbewahrung von i. d. R. <strong>6 bzw. 10 Jahren</strong> (§ 257 HGB, § 147 AO);</li>
              <li>geldwäscherechtliche Aufbewahrung von <strong>5 Jahren</strong> (§ 8 GwG, siehe Ziffer 18).</li>
            </ul>

            <h2 id="sicherheit">7. Datensicherheit</h2>
            <p>
              Diese Website nutzt eine SSL-/TLS-Verschlüsselung (erkennbar an „https://"). Wir
              treffen geeignete technische und organisatorische Maßnahmen (Art. 32 DSGVO), um Ihre
              Daten gegen unbefugten Zugriff, Verlust oder Manipulation zu schützen.
            </p>

            <h2 id="hosting">8. Hosting & Server-Logfiles (Vercel)</h2>
            <p>
              Diese Website wird bei der Vercel Inc. (340 S Lemon Ave #4133, Walnut, CA 91789, USA)
              betrieben. Beim Aufruf werden technisch notwendige Daten in Server-Logfiles
              verarbeitet:
            </p>
            <ul>
              <li>gekürzte/anonymisierte IP-Adresse bzw. IP-Adresse;</li>
              <li>Datum und Uhrzeit des Zugriffs;</li>
              <li>aufgerufene Datei/URL, übertragene Datenmenge, HTTP-Statuscode;</li>
              <li>Referrer, verwendeter Browser und Betriebssystem.</li>
            </ul>
            <p>
              Zweck ist der sichere, störungsfreie Betrieb und die Abwehr von Angriffen;
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Zur Übermittlung in die USA siehe
              Ziffer 20; ein Auftragsverarbeitungsvertrag wird geschlossen.
            </p>

            <h2 id="cookies">9. Cookies, lokale Speicherung & Einwilligungsverwaltung</h2>
            <p>
              Wir verwenden keine Tracking- oder Marketing-Cookies. Technisch notwendige
              Informationen speichern wir lokal in Ihrem Browser (Local Storage), insbesondere:
            </p>
            <ul>
              <li>Ihre Merkliste und gespeicherten Suchaufträge;</li>
              <li>bei Anmeldung Ihre Sitzungsinformationen (Login);</li>
              <li>Ihre Einwilligungs-Entscheidung (Consent).</li>
            </ul>
            <p>
              Rechtsgrundlage ist § 25 Abs. 2 TDDDG bzw. Art. 6 Abs. 1 lit. f DSGVO. Nicht
              notwendige externe Dienste (z. B. Kartenkacheln) laden wir erst nach Ihrer Einwilligung
              (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO). Ihre Einwilligung ist jederzeit mit
              Wirkung für die Zukunft widerrufbar.
            </p>

            <h2 id="kontakt">10. Kontaktaufnahme & WhatsApp</h2>
            <p>
              Bei Kontaktaufnahme über das Formular, per E-Mail oder Telefon verarbeiten wir Ihre
              Angaben (Name, Kontaktdaten, Anliegen) zur Bearbeitung Ihrer Anfrage. Rechtsgrundlage
              ist Art. 6 Abs. 1 lit. b DSGVO (vorvertraglich) bzw. lit. f DSGVO (Beantwortung von
              Anfragen). Nutzen Sie unseren WhatsApp-Link, werden Ihre Daten nach den Bedingungen der
              WhatsApp Ireland Ltd./Meta verarbeitet; bitte nutzen Sie WhatsApp nur, wenn Sie damit
              einverstanden sind. Eine Einbettung von WhatsApp auf der Seite erfolgt nicht.
            </p>

            <h2 id="termin">11. Online-Terminbuchung</h2>
            <p>
              Über unser Buchungstool können Sie Anlass, Datum und Uhrzeit eines Termins wählen und
              Ihre Kontaktdaten angeben. Diese Daten verarbeiten wir zur Koordination und Bestätigung
              des Termins (Art. 6 Abs. 1 lit. b DSGVO). Eine Bestätigung kann per E-Mail erfolgen
              (siehe Ziffer 16).
            </p>

            <h2 id="rechner">12. Immobilienbewertung (Rechner)</h2>
            <p>
              Nutzen Sie unseren Bewertungsrechner, verarbeiten wir die eingegebenen Objekt- und
              Adressdaten ausschließlich zur Erstellung einer unverbindlichen, automatisierten
              Sofort-Einschätzung. Die Berechnung erfolgt unmittelbar; eine Übermittlung Ihrer
              Kontaktdaten ist hierfür <strong>nicht</strong> erforderlich. Zur Adressermittlung
              siehe Ziffer 13. Rechtsgrundlage ist unser berechtigtes Interesse an der Funktion bzw.
              Ihre Einwilligung (Art. 6 Abs. 1 lit. f/a DSGVO).
            </p>

            <h2 id="geocoding">13. Adresssuche / Geokodierung (OpenStreetMap Nominatim)</h2>
            <p>
              Für die Adress-Vervollständigung nutzen wir den Dienst „Nominatim" auf Basis von
              OpenStreetMap (OpenStreetMap Foundation, Vereinigtes Königreich). Die von Ihnen
              eingegebene Adresse sowie Ihre IP-Adresse werden zur Ermittlung von Adressvorschlägen
              und Koordinaten an diesen Dienst übermittelt. Rechtsgrundlage ist Ihre Einwilligung
              bzw. unser berechtigtes Interesse (Art. 6 Abs. 1 lit. a/f DSGVO).
            </p>

            <h2 id="karten">14. Kartendarstellung (CARTO & Esri)</h2>
            <p>
              Im Immobilienportal setzen wir Kartenkacheln auf Basis von OpenStreetMap (Vektor-Stil
              via CARTO) ein; für die Satelliten-/Luftbildansicht im Bewertungsrechner verwenden wir
              Kacheln von Esri (World Imagery). Diese Inhalte laden wir <strong>erst nach Ihrer
              Einwilligung</strong> (Klick-Freigabe); dabei wird Ihre IP-Adresse an den jeweiligen
              Anbieter übermittelt (Art. 6 Abs. 1 lit. a DSGVO).
            </p>

            <h2 id="konten">15. Benutzerkonten & Authentifizierung (Supabase)</h2>
            <p>
              Legen Sie ein Konto an, verarbeiten wir Ihre E-Mail-Adresse, ein ausschließlich
              verschlüsselt (gehasht) gespeichertes Passwort sowie Ihre Favoriten und Suchaufträge,
              um diese geräteübergreifend bereitzustellen und Sie auf Wunsch über passende Objekte zu
              benachrichtigen. Hierfür nutzen wir die Infrastruktur der Supabase, Inc.; die Daten
              werden in einem Rechenzentrum innerhalb der <strong>EU (Frankfurt am Main)</strong>
              gespeichert. Rechtsgrundlage ist die Durchführung des Nutzungsverhältnisses sowie Ihre
              Einwilligung (Art. 6 Abs. 1 lit. b und lit. a DSGVO). Sie können Ihr Konto jederzeit
              löschen lassen. Ein Auftragsverarbeitungsvertrag wird geschlossen.
            </p>

            <h2 id="mailversand">16. E-Mail-Versand (Resend)</h2>
            <p>
              Zum Versand von Transaktions- und Bestätigungs-E-Mails (z. B. Eingangsbestätigung einer
              Anfrage oder Terminbuchung, kontobezogene E-Mails) setzen wir den Dienst Resend (Resend,
              Inc., USA) als Auftragsverarbeiter ein. Übermittelt werden die zur Zustellung
              erforderlichen Daten (insb. E-Mail-Adresse, Inhalt). Rechtsgrundlage ist Art. 6 Abs. 1
              lit. b bzw. lit. f DSGVO. Zur Drittlandübermittlung siehe Ziffer 20.
            </p>

            <h2 id="onoffice">17. Immobilien & CRM (onOffice)</h2>
            <p>
              Zur Darstellung von Objekten und zur Bearbeitung von Anfragen setzen wir die
              CRM-Lösung der onOffice GmbH (Charlottenburger Allee 5, 52068 Aachen) ein. Übermittelte
              Anfrage- und Interessentendaten werden dort als Auftragsverarbeiter (Art. 28 DSGVO)
              verarbeitet; ein entsprechender Vertrag wird geschlossen.
            </p>

            <h2 id="makler">18. Maklertätigkeit, Vertragsdurchführung & GwG-Pflichten</h2>
            <p>
              Im Rahmen unserer Tätigkeit als Immobilienmakler verarbeiten wir die zur Anbahnung und
              Durchführung von Makler-, Kauf- oder Mietverträgen erforderlichen Daten von
              Eigentümern, Kauf- und Mietinteressenten (z. B. Identitäts-, Kontakt-, Objekt- und
              Bonitätsangaben). Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
            </p>
            <p>
              Als nach dem Geldwäschegesetz (GwG) Verpflichtete sind wir gehalten, bei Vermittlung
              von Kauf-/Mietverträgen die Vertragsparteien zu identifizieren (u. a. Erhebung und
              Aufbewahrung von Ausweisdaten). Diese Verarbeitung erfolgt zur Erfüllung einer
              rechtlichen Verpflichtung (Art. 6 Abs. 1 lit. c DSGVO i. V. m. GwG); die Aufzeichnungen
              werden fünf Jahre aufbewahrt (§ 8 GwG).
            </p>

            <h2 id="empfaenger">19. Empfänger & Weitergabe von Daten</h2>
            <p>
              Eine Weitergabe Ihrer Daten erfolgt nur, soweit dies erforderlich und rechtlich
              zulässig ist, insbesondere an: von uns eingesetzte Auftragsverarbeiter (siehe oben),
              sowie im Rahmen der Vertragsabwicklung an Notare, finanzierende Banken,
              Eigentümer bzw. Interessenten und — soweit gesetzlich vorgeschrieben — an Behörden.
              Ein Verkauf Ihrer Daten findet nicht statt.
            </p>

            <h2 id="drittland">20. Übermittlung in Drittländer</h2>
            <p>
              Einzelne Dienstleister (insb. Vercel, Resend; Supabase mit EU-Datenhaltung, jedoch
              US-Muttergesellschaft) können Daten in den USA verarbeiten oder darauf zugreifen. Die
              Übermittlung wird durch geeignete Garantien abgesichert, insbesondere
              EU-Standardvertragsklauseln (Art. 46 DSGVO) und — soweit zertifiziert — das
              EU-US Data Privacy Framework. Details stellen wir auf Anfrage bereit.
            </p>

            <h2 id="schriften">21. Schriftarten (self-hosted)</h2>
            <p>
              Alle verwendeten Schriftarten werden lokal von unserem Server ausgeliefert
              (self-hosted). Es findet <strong>keine</strong> Übermittlung an Drittanbieter (z. B.
              Google Fonts oder Adobe Fonts) statt.
            </p>

            <h2 id="social">22. Social-Media-Verlinkung & Reels</h2>
            <p>
              Wir verlinken auf unsere Profile (Instagram, Facebook, YouTube, LinkedIn) ausschließlich
              per einfachem Link. Auch die auf der Seite gezeigte Reels-Übersicht besteht aus
              Vorschaubildern mit Verlinkung — es findet <strong>keine</strong> Einbettung
              (kein iFrame, kein Plug-in) statt. Ein Datenabfluss an die jeweilige Plattform (Meta
              Platforms Ireland Ltd., Google Ireland Ltd., LinkedIn Ireland) erfolgt erst, wenn Sie
              einen Link aktiv anklicken und die Plattform besuchen; dort ist der jeweilige Anbieter
              verantwortlich.
            </p>

            <h2 id="automatisiert">23. Keine automatisierte Entscheidungsfindung</h2>
            <p>
              Eine ausschließlich automatisierte Entscheidungsfindung einschließlich Profiling mit
              rechtlicher Wirkung im Sinne des Art. 22 DSGVO findet nicht statt. Die Online-Bewertung
              ist eine unverbindliche, informatorische Schätzung und keine verbindliche Entscheidung.
            </p>

            <h2 id="minderjaehrige">24. Minderjährige</h2>
            <p>
              Unsere Angebote richten sich an volljährige Personen. Personen unter 16 Jahren sollten
              ohne Zustimmung der Sorgeberechtigten keine personenbezogenen Daten an uns übermitteln.
            </p>

            <h2 id="aenderungen">25. Aktualität & Änderungen dieser Erklärung</h2>
            <p>
              Diese Datenschutzerklärung wird angepasst, sobald Änderungen der Verarbeitung dies
              erforderlich machen. Es gilt die jeweils auf dieser Seite veröffentlichte Fassung.
            </p>

            <p className="pt-6 text-sm text-faint">Stand: 2026.</p>
          </div>
        </Container>
      </section>
    </>
  );
}
