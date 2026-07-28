import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";

/**
 * Datenschutzerklärung. Bewusst NICHT aus einem Generator, sondern aus einer
 * vollständigen Bestandsaufnahme des Repositorys: jede API-Route, jede
 * Supabase-Tabelle, jeder localStorage-Schlüssel und jeder ausgehende
 * Request an einen Dritten wurde einzeln erfasst und hier abgebildet.
 *
 * Bei Änderungen an Formularen, Tabellen, externen Diensten oder
 * Speicherorten MUSS dieses Dokument mitgezogen werden. Prüfpunkte:
 *   - neue Route unter src/app/api/**        → Abschnitt „Funktionen"
 *   - neue Supabase-Tabelle (.from("…"))      → Abschnitt 6 + Funktion
 *   - neuer localStorage-Schlüssel            → Tabelle in Abschnitt 9
 *   - neuer externer Host (fetch/Bild/Skript) → Abschnitt 30 + Drittland
 */
export const metadata = {
  title: "Datenschutzerklärung",
  description:
    "Datenschutzerklärung von RIEGEL Immobilien: vollständige Informationen nach Art. 13, 14 DSGVO und § 25 TDDDG zu allen Verarbeitungen auf dieser Website und im Rahmen unserer Maklertätigkeit.",
  alternates: { canonical: "/datenschutz" },
};

const prose =
  "mx-auto max-w-3xl space-y-4 text-muted [&_a]:text-accent [&_a]:underline [&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-fg [&_h3]:mt-7 [&_h3]:font-medium [&_h3]:text-fg [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_strong]:text-fg [&_p]:leading-relaxed";

const toc: { id: string; label: string }[] = [
  { id: "verantwortlicher", label: "1. Verantwortlicher & Kontakt" },
  { id: "ueberblick", label: "2. Überblick der Verarbeitungen" },
  { id: "begriffe", label: "3. Grundlagen & Begriffe" },
  { id: "rechtsgrundlagen", label: "4. Rechtsgrundlagen" },
  { id: "rechte", label: "5. Ihre Rechte" },
  { id: "widerspruch", label: "6. Widerspruchsrecht (Art. 21)" },
  { id: "speicherdauer", label: "7. Speicherdauer & Löschfristen" },
  { id: "sicherheit", label: "8. Datensicherheit" },
  { id: "hosting", label: "9. Hosting & Server-Logfiles" },
  { id: "cookies", label: "10. Lokale Speicherung & Einwilligung" },
  { id: "kontakt", label: "11. Kontaktaufnahme, Telefon & WhatsApp" },
  { id: "termin", label: "12. Online-Terminbuchung" },
  { id: "rechner", label: "13. Immobilienbewertung & Wertreport" },
  { id: "bodenrichtwert", label: "14. Bodenrichtwerte (BORIS/LVermGeo)" },
  { id: "geocoding", label: "15. Adresssuche (Photon/OpenStreetMap)" },
  { id: "karten", label: "16. Karten & Luftbilder (CARTO, Esri)" },
  { id: "anfragen", label: "17. Objektanfragen" },
  { id: "expose", label: "18. Exposé, Nachweis & Provision" },
  { id: "konten", label: "19. Benutzerkonto" },
  { id: "merkliste", label: "20. Merkliste" },
  { id: "suchauftrag", label: "21. Suchauftrag & Benachrichtigungen" },
  { id: "spiel", label: "22. Blitzverkauf-Spiel & Bestenliste" },
  { id: "feedback", label: "23. Feedback-Funktion" },
  { id: "mailversand", label: "24. E-Mail-Versand (Resend)" },
  { id: "onoffice", label: "25. Immobilien & CRM (onOffice)" },
  { id: "cdn", label: "26. Bilder & Videos (BunnyCDN)" },
  { id: "makler", label: "27. Maklertätigkeit & GwG-Pflichten" },
  { id: "ki", label: "28. KI-gestützte Funktionen" },
  { id: "missbrauch", label: "29. Schutz vor Missbrauch" },
  { id: "empfaenger", label: "30. Empfänger & Auftragsverarbeiter" },
  { id: "drittland", label: "31. Drittlandübermittlung" },
  { id: "schriften", label: "32. Schriftarten & Icons" },
  { id: "social", label: "33. Social Media, Reels & Bewertungen" },
  { id: "bewerbung", label: "34. Bewerbungen" },
  { id: "minderjaehrige", label: "35. Minderjährige" },
  { id: "aenderungen", label: "36. Änderungen dieser Erklärung" },
];

/** Kleine Tabelle im Fließtext, damit Speicherorte/Fristen prüfbar bleiben. */
function Tabelle({ kopf, zeilen }: { kopf: string[]; zeilen: string[][] }) {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-surface-2">
            {kopf.map((k) => (
              <th key={k} className="px-4 py-2.5 font-medium text-fg">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z, i) => (
            <tr key={i} className="border-t border-border align-top">
              {z.map((c, j) => (
                <td key={j} className="px-4 py-2.5 text-muted">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DatenschutzPage() {
  return (
    <>
      <PageIntro eyebrow="Rechtliches" title="Datenschutzerklärung" />
      <section className="py-14">
        <Container>
          <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-accent/40 bg-surface p-4 text-sm text-muted">
            <strong className="text-fg">Stand dieser Fassung:</strong> Juli 2026. Diese Erklärung
            beschreibt jede einzelne Verarbeitung, die auf dieser Website tatsächlich stattfindet,
            einschließlich der konkret gespeicherten Datenfelder, Speicherorte und Löschfristen.
            Die abschließende rechtliche Prüfung erfolgt durch unsere Rechtsberatung; mit allen
            eingesetzten Dienstleistern werden Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO
            geschlossen.
          </div>

          <nav
            aria-label="Inhaltsübersicht"
            className="mx-auto mb-12 max-w-3xl rounded-xl border border-border bg-surface p-6"
          >
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
              Der Schutz Ihrer personenbezogenen Daten ist uns wichtig. Nachfolgend informieren wir
              Sie nach Art. 13 und 14 der Datenschutz-Grundverordnung (DSGVO) sowie nach dem
              Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz (TDDDG) darüber, welche Daten
              wir auf dieser Website und im Rahmen unserer Maklertätigkeit verarbeiten, zu welchem
              Zweck, auf welcher Rechtsgrundlage, wie lange wir sie speichern und welche Rechte
              Ihnen zustehen.
            </p>
            <p>
              Diese Erklärung ist bewusst detailliert gehalten. Sie können über die
              Inhaltsübersicht gezielt zu der Funktion springen, die Sie interessiert.
            </p>

            {/* 1 */}
            <h2 id="verantwortlicher">1. Verantwortlicher &amp; Kontakt</h2>
            <p>
              Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO für die Verarbeitung
              personenbezogener Daten auf dieser Website ist:
            </p>
            <p>
              <strong>RIEGEL Immobilien e.K.</strong>
              <br />
              Wormser Straße 13, 67346 Speyer
              <br />
              Weiterer Standort: Kaiser-Wilhelm-Straße 16, 67059 Ludwigshafen am Rhein
              <br />
              Telefon: <a href="tel:+4962321001010">06232 100 10 10</a>
              <br />
              E-Mail: <a href="mailto:info@riegel-immobilien.de">info@riegel-immobilien.de</a>
            </p>
            <p>
              Die vollständigen Angaben nach § 5 DDG einschließlich Handelsregister,
              Umsatzsteuer-Identifikationsnummer und Erlaubnis nach § 34c GewO finden Sie in
              unserem <a href="/impressum">Impressum</a>.
            </p>
            <h3>Datenschutzbeauftragter</h3>
            <p>
              Für Fragen zum Datenschutz, zur Ausübung Ihrer Betroffenenrechte oder zum Widerruf
              einer Einwilligung erreichen Sie uns unter den oben genannten Kontaktdaten, gerne
              mit dem Betreff „Datenschutz“. Sofern wir gesetzlich zur Benennung eines
              Datenschutzbeauftragten nach § 38 BDSG verpflichtet sind oder freiwillig eine
              zuständige Stelle benannt haben, finden Sie deren Kontaktdaten ebenfalls im
              Impressum.
            </p>

            {/* 2 */}
            <h2 id="ueberblick">2. Überblick der Verarbeitungen</h2>
            <p>
              Sie können unsere Website nutzen, ohne personenbezogene Daten aktiv anzugeben. In
              diesem Fall werden nur die technisch erforderlichen Server-Logfiles verarbeitet
              (Abschnitt 9). Personenbezogene Daten darüber hinaus verarbeiten wir ausschließlich,
              wenn Sie eine der folgenden Funktionen aktiv nutzen:
            </p>
            <ul>
              <li>Kontaktformular, Telefon, E-Mail oder WhatsApp (Abschnitt 11)</li>
              <li>Online-Terminbuchung (Abschnitt 12)</li>
              <li>Immobilienbewertung und Anforderung des PDF-Wertreports (Abschnitt 13)</li>
              <li>Anfrage zu einem konkreten Objekt (Abschnitt 17)</li>
              <li>Anforderung eines Exposés (Abschnitt 18)</li>
              <li>Anlage eines Benutzerkontos, Merkliste, Suchauftrag (Abschnitte 19 bis 21)</li>
              <li>Teilnahme am Blitzverkauf-Spiel mit Eintrag in die Bestenliste (Abschnitt 22)</li>
            </ul>
            <p>
              <strong>Wir setzen keine Analyse-, Tracking- oder Werbedienste ein.</strong> Auf
              dieser Website befinden sich weder Google Analytics noch Meta-Pixel,
              Conversion-Tracking, Heatmaps, A/B-Test-Werkzeuge oder vergleichbare Dienste. Es
              findet kein geräteübergreifendes Wiedererkennen statt und es werden keine
              Nutzungsprofile gebildet. Die einzige einwilligungspflichtige Einbindung Dritter
              sind die Karten- und Luftbilddienste (Abschnitt 16), die ohne Ihre Einwilligung
              nicht geladen werden.
            </p>

            {/* 3 */}
            <h2 id="begriffe">3. Grundlagen &amp; Begriffe</h2>
            <p>
              <strong>Personenbezogene Daten</strong> sind alle Informationen, die sich auf eine
              identifizierte oder identifizierbare natürliche Person beziehen (Art. 4 Nr. 1
              DSGVO), etwa Name, Anschrift, E-Mail-Adresse, Telefonnummer oder IP-Adresse.
            </p>
            <p>
              <strong>Verarbeitung</strong> ist jeder Vorgang im Zusammenhang mit solchen Daten,
              insbesondere das Erheben, Speichern, Verwenden, Übermitteln und Löschen (Art. 4
              Nr. 2 DSGVO).
            </p>
            <p>
              <strong>Auftragsverarbeiter</strong> sind Dienstleister, die Daten weisungsgebunden
              für uns verarbeiten, etwa unser Hosting-Anbieter. Sie dürfen die Daten nicht für
              eigene Zwecke nutzen und sind vertraglich nach Art. 28 DSGVO gebunden.
            </p>

            {/* 4 */}
            <h2 id="rechtsgrundlagen">4. Rechtsgrundlagen</h2>
            <p>Wir verarbeiten personenbezogene Daten auf folgenden Rechtsgrundlagen:</p>
            <ul>
              <li>
                <strong>Art. 6 Abs. 1 lit. a DSGVO (Einwilligung):</strong> etwa für das Laden der
                Kartendienste, für Benachrichtigungen zu Suchaufträgen und für den Eintrag in die
                Bestenliste des Spiels. Eine erteilte Einwilligung können Sie jederzeit mit
                Wirkung für die Zukunft widerrufen.
              </li>
              <li>
                <strong>Art. 6 Abs. 1 lit. b DSGVO (Vertrag und vorvertragliche Maßnahmen):</strong>{" "}
                für die Bearbeitung Ihrer Anfragen, die Terminvereinbarung, die Bereitstellung von
                Exposés, die Führung Ihres Benutzerkontos und die Durchführung des Maklervertrags.
              </li>
              <li>
                <strong>Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung):</strong> für
                handels- und steuerrechtliche Aufbewahrungspflichten sowie für Identifizierungs-
                und Aufzeichnungspflichten nach dem Geldwäschegesetz (Abschnitt 27).
              </li>
              <li>
                <strong>Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse):</strong> für den
                sicheren und stabilen Betrieb der Website, die Abwehr von Missbrauch und Spam
                sowie für die Geltendmachung und Verteidigung von Rechtsansprüchen.
              </li>
              <li>
                <strong>§ 25 Abs. 1 TDDDG:</strong> für das Speichern von Informationen auf Ihrem
                Endgerät, soweit dieses nicht unbedingt erforderlich ist. Unbedingt erforderliche
                Speicherungen stützen sich auf § 25 Abs. 2 Nr. 2 TDDDG.
              </li>
            </ul>

            {/* 5 */}
            <h2 id="rechte">5. Ihre Rechte als betroffene Person</h2>
            <p>Ihnen stehen gegenüber uns die folgenden Rechte zu:</p>
            <ul>
              <li>
                <strong>Auskunft (Art. 15 DSGVO):</strong> Sie können Auskunft darüber verlangen,
                ob und welche Daten wir zu Ihnen verarbeiten, sowie eine Kopie dieser Daten
                erhalten.
              </li>
              <li>
                <strong>Berichtigung (Art. 16 DSGVO):</strong> Sie können die Berichtigung
                unrichtiger und die Vervollständigung unvollständiger Daten verlangen.
              </li>
              <li>
                <strong>Löschung (Art. 17 DSGVO):</strong> Sie können die Löschung Ihrer Daten
                verlangen, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
              </li>
              <li>
                <strong>Einschränkung (Art. 18 DSGVO):</strong> Sie können verlangen, dass Ihre
                Daten nur noch eingeschränkt verarbeitet werden.
              </li>
              <li>
                <strong>Datenübertragbarkeit (Art. 20 DSGVO):</strong> Sie können die Herausgabe
                der von Ihnen bereitgestellten Daten in einem gängigen, maschinenlesbaren Format
                verlangen.
              </li>
              <li>
                <strong>Widerspruch (Art. 21 DSGVO):</strong> siehe Abschnitt 6.
              </li>
              <li>
                <strong>Widerruf von Einwilligungen (Art. 7 Abs. 3 DSGVO):</strong> jederzeit mit
                Wirkung für die Zukunft. Die Rechtmäßigkeit der bis zum Widerruf erfolgten
                Verarbeitung bleibt unberührt.
              </li>
              <li>
                <strong>Beschwerde (Art. 77 DSGVO):</strong> Sie können sich bei einer
                Aufsichtsbehörde beschweren, insbesondere beim{" "}
                <a
                  href="https://www.datenschutz.rlp.de"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Landesbeauftragten für den Datenschutz und die Informationsfreiheit
                  Rheinland-Pfalz
                </a>
                , Hintere Bleiche 34, 55116 Mainz.
              </li>
            </ul>
            <p>
              Zur Ausübung dieser Rechte genügt eine formlose Nachricht an{" "}
              <a href="mailto:info@riegel-immobilien.de">info@riegel-immobilien.de</a>. Zum Schutz
              Ihrer Daten müssen wir uns in Zweifelsfällen von Ihrer Identität überzeugen.
            </p>

            {/* 6 */}
            <h2 id="widerspruch">6. Widerspruchsrecht (Art. 21 DSGVO)</h2>
            <p>
              <strong>
                Sie haben das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben,
                jederzeit gegen die Verarbeitung Sie betreffender personenbezogener Daten, die
                aufgrund von Art. 6 Abs. 1 lit. f DSGVO erfolgt, Widerspruch einzulegen.
              </strong>{" "}
              Wir verarbeiten die Daten dann nicht mehr, es sei denn, wir können zwingende
              schutzwürdige Gründe nachweisen, die Ihre Interessen, Rechte und Freiheiten
              überwiegen, oder die Verarbeitung dient der Geltendmachung, Ausübung oder
              Verteidigung von Rechtsansprüchen.
            </p>
            <p>
              Werden Ihre Daten für Direktwerbung verarbeitet, können Sie dem jederzeit ohne
              Angabe von Gründen widersprechen; die Daten werden dann für diesen Zweck nicht mehr
              verarbeitet.
            </p>

            {/* 7 */}
            <h2 id="speicherdauer">7. Speicherdauer &amp; Löschfristen</h2>
            <p>
              Wir speichern personenbezogene Daten nur so lange, wie es für den jeweiligen Zweck
              erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen. Konkret:
            </p>
            <Tabelle
              kopf={["Datenkategorie", "Speicherdauer"]}
              zeilen={[
                [
                  "Server-Logfiles",
                  "nach Vorgabe unseres Hosting-Anbieters, regelmäßig wenige Tage, längstens 30 Tage",
                ],
                [
                  "Anfragen ohne Vertragsanbahnung (Kontakt, Objektanfrage)",
                  "Löschung, sobald der Vorgang abgeschlossen ist, spätestens nach 12 Monaten",
                ],
                [
                  "Bewertungsanfragen und Wertreports",
                  "bis zu 3 Jahre ab dem Ende des Jahres der Anfrage (Verjährung), sofern kein Vertrag zustande kommt",
                ],
                [
                  "Terminbuchungen",
                  "Löschung nach Abschluss des Termins, sofern keine Vertragsanbahnung folgt",
                ],
                [
                  "Benutzerkonto mit Merkliste und Suchaufträgen",
                  "bis zur Löschung durch Sie; die Löschung ist im Konto selbst jederzeit möglich",
                ],
                [
                  "Exposé-Anforderungen mit Nachweisdaten",
                  "bis zu 3 Jahre, bei Zustandekommen eines Maklervertrags entsprechend länger (Nachweis des Provisionsanspruchs)",
                ],
                [
                  "Eintrag in die Bestenliste des Spiels",
                  "bis zum Widerruf, längstens 24 Monate",
                ],
                [
                  "Vertrags-, Rechnungs- und Buchungsunterlagen",
                  "6 bzw. 10 Jahre nach § 257 HGB und § 147 AO",
                ],
                [
                  "Aufzeichnungen und Kopien nach dem Geldwäschegesetz",
                  "5 Jahre nach § 8 Abs. 4 GwG, längstens 10 Jahre",
                ],
              ]}
            />
            <p>
              Sind Daten für den ursprünglichen Zweck nicht mehr erforderlich, unterliegen aber
              einer Aufbewahrungspflicht, schränken wir die Verarbeitung ein: Die Daten werden
              gesperrt und ausschließlich zur Erfüllung dieser Pflicht vorgehalten.
            </p>

            {/* 8 */}
            <h2 id="sicherheit">8. Datensicherheit</h2>
            <p>
              Diese Website wird ausschließlich über eine verschlüsselte Verbindung (TLS/HTTPS)
              ausgeliefert; erkennbar am Schloss-Symbol in Ihrem Browser. Ergänzend setzen wir
              Sicherheitsmaßnahmen auf Ebene der HTTP-Header ein, unter anderem gegen das
              Einbetten unserer Seiten in fremde Rahmen und gegen die Fehlinterpretation von
              Dateitypen.
            </p>
            <p>
              Der Zugang zu unserem internen Bereich, in dem Anfragen und Bewertungen bearbeitet
              werden, ist passwortgeschützt und auf einen namentlich hinterlegten Personenkreis
              beschränkt. Zugangsdaten zu Diensten Dritter werden ausschließlich serverseitig
              vorgehalten und gelangen zu keinem Zeitpunkt in Ihren Browser.
            </p>

            {/* 9 */}
            <h2 id="hosting">9. Hosting &amp; Server-Logfiles</h2>
            <p>
              Diese Website wird bei der <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133,
              Covina, CA 91723, USA, gehostet. Die Auslieferung der dynamischen Inhalte erfolgt
              nach unserer Konfiguration über die Region <strong>Frankfurt am Main (fra1)</strong>.
              Mit Vercel besteht ein Vertrag zur Auftragsverarbeitung; zur Übermittlung in
              Drittländer siehe Abschnitt 31.
            </p>
            <p>
              Beim Aufruf jeder Seite werden automatisch Informationen erfasst, die Ihr Browser
              übermittelt und die technisch erforderlich sind, um die Seite auszuliefern:
            </p>
            <ul>
              <li>IP-Adresse des anfragenden Geräts</li>
              <li>Datum und Uhrzeit des Zugriffs</li>
              <li>aufgerufene Adresse und übertragene Datenmenge</li>
              <li>Statusmeldung über den Erfolg des Abrufs</li>
              <li>Browsertyp, Browserversion und Betriebssystem</li>
              <li>gegebenenfalls die zuvor besuchte Seite (Referrer)</li>
            </ul>
            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse liegt
              in der technischen Bereitstellung, der Stabilität und der Sicherheit der Website.
              Eine Zusammenführung dieser Daten mit anderen Datenquellen oder eine Auswertung zu
              Marketingzwecken findet nicht statt.
            </p>

            <h3>Reichweitenmessung (Vercel Web Analytics)</h3>
            <p>
              Zur Ermittlung der Reichweite unserer Seiten nutzen wir{" "}
              <strong>Vercel Web Analytics</strong>, einen Dienst unseres Hosters Vercel Inc. Der
              Dienst erfasst ausschließlich aggregierte Angaben darüber, welche Seiten wie oft
              aufgerufen werden, aus welchem Land der Aufruf erfolgt sowie die grobe Geräteklasse
              und den Browsertyp.
            </p>
            <p>
              <strong>
                Es werden dabei keine Cookies gesetzt und es wird nicht auf im Endgerät
                gespeicherte Informationen zugegriffen.
              </strong>{" "}
              Eine Einwilligung nach § 25 Abs. 1 TDDDG ist deshalb nicht erforderlich. Zur
              Unterscheidung wiederkehrender Aufrufe bildet Vercel serverseitig einen Kennwert aus
              IP-Adresse und Browserkennung, der arbeitstäglich wechselt und nicht zurückgerechnet
              werden kann. Die IP-Adresse selbst wird nicht gespeichert. Es entstehen weder
              geräteübergreifende Profile noch eine Wiedererkennung über mehrere Tage hinweg, und
              es findet keine Weitergabe an Werbenetzwerke statt.
            </p>
            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse liegt
              darin, zu erkennen, welche Inhalte nachgefragt werden, und unser Angebot darauf
              auszurichten. Sie können der Verarbeitung nach Art. 21 DSGVO widersprechen; nutzen
              Sie dafür die in Abschnitt 5 genannten Kontaktwege. Auftragsverarbeitung und
              Drittlandübermittlung richten sich nach denselben Vereinbarungen wie das Hosting
              (Abschnitte 30 und 31).
            </p>

            {/* 10 */}
            <h2 id="cookies">10. Lokale Speicherung &amp; Einwilligungsverwaltung</h2>
            <p>
              <strong>Wir setzen keine Tracking-Cookies und keine Cookies von Dritten ein.</strong>{" "}
              Wir verwenden ausschließlich den lokalen Speicher Ihres Browsers (Local Storage) für
              Funktionen, die Sie selbst auslösen. Diese Daten verbleiben auf Ihrem Gerät und
              werden nicht automatisch an uns übertragen. Sie können sie jederzeit über die
              Einstellungen Ihres Browsers löschen.
            </p>
            <Tabelle
              kopf={["Schlüssel", "Zweck", "Grundlage"]}
              zeilen={[
                [
                  "riegel:consent",
                  "Ihre Entscheidung zu den Kartendiensten samt Zeitpunkt und Textversion",
                  "§ 25 Abs. 2 Nr. 2 TDDDG (erforderlich, um Ihre Wahl zu respektieren)",
                ],
                [
                  "riegel:favorites",
                  "Merkliste vorgemerkter Objekte",
                  "§ 25 Abs. 2 Nr. 2 TDDDG, von Ihnen angeforderte Funktion",
                ],
                [
                  "riegel:searches",
                  "gespeicherte Suchen und Filter",
                  "§ 25 Abs. 2 Nr. 2 TDDDG, von Ihnen angeforderte Funktion",
                ],
                [
                  "riegel:profile",
                  "Ihr Suchprofil im Konto (Ort, Umkreis, Preisrahmen)",
                  "§ 25 Abs. 2 Nr. 2 TDDDG, von Ihnen angeforderte Funktion",
                ],
                [
                  "riegel:reports, riegel:contacts, riegel:inquiries, riegel:bookings",
                  "Kopien Ihrer eigenen Anfragen zur Anzeige im Konto",
                  "§ 25 Abs. 2 Nr. 2 TDDDG, von Ihnen angeforderte Funktion",
                ],
                [
                  "riegel:portal-result-count",
                  "zuletzt gewählte Anzahl angezeigter Objekte",
                  "§ 25 Abs. 2 Nr. 2 TDDDG, reine Anzeigeeinstellung",
                ],
                [
                  "riegel:feedback",
                  "nur für unsere Mitarbeitenden: aktiviert die interne Kommentarfunktion",
                  "§ 25 Abs. 2 Nr. 2 TDDDG, für Besucher ohne Wirkung",
                ],
              ]}
            />
            <p>
              Sind Sie angemeldet, werden Merkliste und Suchaufträge zusätzlich in Ihrem
              Benutzerkonto gespeichert, damit sie auf allen Geräten verfügbar sind (Abschnitte 20
              und 21).
            </p>
            <h3>Einwilligung und Widerruf</h3>
            <p>
              Beim ersten Besuch fragen wir Ihre Einwilligung für die Karten- und Luftbilddienste
              ab. Sie haben dabei drei gleichwertige Möglichkeiten: alle akzeptieren, nur
              notwendige zulassen oder die Einstellungen im Einzelnen öffnen. Ohne Ihre
              Einwilligung wird kein Request an die Anbieter dieser Dienste gesendet; an den
              betreffenden Stellen erscheint stattdessen ein Platzhalter.
            </p>
            <p>
              Ihre Entscheidung können Sie jederzeit ändern: Der Link{" "}
              <strong>Datenschutz-Einstellungen</strong> im Fußbereich jeder Seite öffnet denselben
              Dialog. Ein Widerruf ist damit genauso einfach wie die Erteilung (Art. 7 Abs. 3
              DSGVO). Gespeichert werden neben Ihrer Auswahl auch der Zeitpunkt und die Version
              der Hinweistexte, damit nachvollziehbar bleibt, worauf sich Ihre Einwilligung bezog.
            </p>

            {/* 11 */}
            <h2 id="kontakt">11. Kontaktaufnahme, Telefon &amp; WhatsApp</h2>
            <p>
              Über unser Kontaktformular verarbeiten wir die von Ihnen angegebenen Daten:{" "}
              <strong>Name, E-Mail-Adresse, optional Telefonnummer, Anliegen und
              Nachrichtentext</strong>. Die Angaben werden per E-Mail an unser Postfach übermittelt
              und dort bearbeitet.
            </p>
            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, wenn Ihre Anfrage auf einen Vertrag
              gerichtet ist, sonst Art. 6 Abs. 1 lit. f DSGVO aufgrund unseres berechtigten
              Interesses an der Beantwortung von Anfragen. Pflichtangaben sind nur Name und
              E-Mail-Adresse, da wir Ihnen sonst nicht antworten können.
            </p>
            <p>
              Kontaktieren Sie uns per Telefon, E-Mail oder Post, verarbeiten wir Ihre Angaben
              ebenfalls ausschließlich zur Bearbeitung Ihres Anliegens.
            </p>
            <h3>WhatsApp</h3>
            <p>
              Auf unserer Website finden Sie eine Schaltfläche, die einen Chat über WhatsApp
              vorbereitet. Es handelt sich um einen <strong>reinen Verweis</strong>: Erst wenn Sie
              darauf klicken, öffnet sich WhatsApp. Es werden keine Inhalte von WhatsApp in unsere
              Seite eingebettet und ohne Ihren Klick keine Daten an den Anbieter übermittelt.
            </p>
            <p>
              Nehmen Sie über WhatsApp Kontakt auf, verarbeitet der Anbieter (WhatsApp Ireland
              Ltd., Merrion Road, Dublin 4, Irland) Ihre Daten eigenverantwortlich nach seinen
              eigenen Bestimmungen, insbesondere Ihre Mobilfunknummer und Ihre Nachrichteninhalte.
              Wir haben darauf keinen Einfluss. Wenn Sie das vermeiden möchten, nutzen Sie bitte
              Telefon, E-Mail oder unser Kontaktformular. Über WhatsApp übermittelte Nachrichten
              verarbeiten wir nur zur Beantwortung Ihres Anliegens.
            </p>

            {/* 12 */}
            <h2 id="termin">12. Online-Terminbuchung</h2>
            <p>
              Für die Vereinbarung eines Beratungs- oder Besichtigungstermins verarbeiten wir:{" "}
              <strong>Name, E-Mail-Adresse, Telefonnummer, gewünschter Termin und Uhrzeit, Dauer,
              Terminart, Standort oder Wunsch nach einem Videotermin sowie Ihre Nachricht</strong>.
              Sie erhalten eine Bestätigung per E-Mail, parallel geht eine Benachrichtigung an
              unser Team.
            </p>
            <p>
              Die Buchung erfolgt über unsere eigene Anwendung; ein externer Kalenderdienst wird
              nicht eingebunden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO
              (vorvertragliche Maßnahme).
            </p>

            {/* 13 */}
            <h2 id="rechner">13. Immobilienbewertung &amp; Wertreport</h2>
            <p>
              Unser Online-Rechner ermittelt eine unverbindliche Ersteinschätzung des Marktwerts.
              Dabei verarbeiten wir die von Ihnen eingegebenen <strong>Objektdaten</strong>:
              Adresse mit Postleitzahl, Ort und Koordinaten, Objektart, Wohn- und
              Grundstücksfläche, Zimmer- und Badezimmerzahl, Baujahr, Zustand,
              Ausstattungsqualität, Energieeffizienzklasse und Ausstattungsmerkmale. Bei
              Mehrfamilienhäusern zusätzlich Jahresnettokaltmiete, Wohn- und Gewerbeeinheiten
              sowie Angaben zum Vermietungsstand.
            </p>
            <p>
              Die reine Berechnung findet in Ihrem Browser statt. Personenbezogene Daten
              übermitteln Sie erst, wenn Sie den ausführlichen PDF-Wertreport anfordern. Dann
              verarbeiten wir zusätzlich <strong>Name, E-Mail-Adresse, optional Telefonnummer und
              Ihre Nachricht</strong>.
            </p>
            <p>Bei Anforderung des Reports geschieht Folgendes:</p>
            <ul>
              <li>
                Der Wert wird auf unserem Server nachgerechnet, damit der Report nicht
                manipulierbar ist.
              </li>
              <li>
                Für die angegebenen Koordinaten rufen wir den amtlichen Bodenrichtwert ab
                (Abschnitt 14) und ein Luftbild des Grundstücks (Abschnitt 16).
              </li>
              <li>
                Der Report wird als PDF erzeugt und an Ihre E-Mail-Adresse versendet; eine Kopie
                erhält unser Team.
              </li>
              <li>
                Anfrage und Ergebnis werden in unserer Datenbank gespeichert, damit wir Ihr
                Anliegen nachvollziehbar bearbeiten können.
              </li>
            </ul>
            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, da die Bewertung auf die Anbahnung
              eines Maklervertrags gerichtet ist. Zur Einordnung der Ergebnisse als
              unverbindliche Schätzung siehe Abschnitt 28.
            </p>

            {/* 14 */}
            <h2 id="bodenrichtwert">14. Bodenrichtwerte (BORIS Rheinland-Pfalz)</h2>
            <p>
              Um die Bewertung auf eine amtliche Grundlage zu stellen, fragen wir den
              Bodenrichtwert für die Koordinaten des Objekts beim Geodatendienst des{" "}
              <strong>Landesamts für Vermessung und Geobasisinformation Rheinland-Pfalz
              (LVermGeo, BORIS-RLP)</strong> ab.
            </p>
            <p>
              Diese Abfrage erfolgt <strong>serverseitig</strong>: Die Anfrage geht von unserem
              Server aus, nicht von Ihrem Browser. Ihre IP-Adresse wird dabei nicht an die
              Behörde übermittelt. Übermittelt werden ausschließlich die Koordinaten des
              bewerteten Grundstücks, die ohne weitere Angaben keinen Rückschluss auf Ihre Person
              zulassen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
            </p>

            {/* 15 */}
            <h2 id="geocoding">15. Adresssuche (Photon / OpenStreetMap)</h2>
            <p>
              Für die Adressvervollständigung im Rechner und in der Ortssuche nutzen wir den
              Dienst <strong>Photon</strong> der Komoot GmbH, der auf Daten von OpenStreetMap
              beruht. Die Suchanfrage wird über unseren Server weitergeleitet, sodass Ihre
              IP-Adresse dem Anbieter nicht offengelegt wird. Übermittelt wird der von Ihnen
              eingegebene Suchbegriff, also in der Regel eine Adresse.
            </p>
            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO in Verbindung mit Art. 6 Abs. 1
              lit. f DSGVO; unser berechtigtes Interesse liegt in einer korrekten und
              fehlerarmen Adresserfassung.
            </p>

            {/* 16 */}
            <h2 id="karten">16. Karten &amp; Luftbilder (CARTO, Esri)</h2>
            <p>
              Für interaktive Karten binden wir Kartenkacheln von <strong>CARTO</strong> (CARTO
              DB Inc.) ein, für Luftbilder Material von <strong>Esri</strong> (Environmental
              Systems Research Institute, Inc.) über den Dienst World Imagery. Beim Laden dieser
              Inhalte wird Ihre <strong>IP-Adresse</strong> an den jeweiligen Anbieter
              übermittelt; das ist technisch unvermeidbar, da die Bilddaten direkt von deren
              Servern abgerufen werden.
            </p>
            <p>
              <strong>
                Diese Dienste werden ausschließlich nach Ihrer ausdrücklichen Einwilligung
                geladen.
              </strong>{" "}
              Ohne Einwilligung sehen Sie an den betreffenden Stellen einen Platzhalter, und es
              wird kein Request an CARTO oder Esri gesendet. Rechtsgrundlage ist Art. 6 Abs. 1
              lit. a DSGVO und § 25 Abs. 1 TDDDG. Ihre Einwilligung können Sie jederzeit über die
              Datenschutz-Einstellungen im Fußbereich widerrufen (Abschnitt 10).
            </p>
            <p>
              Klicken Sie an einer Karte auf die Schaltfläche zum Laden, gilt dies ebenfalls als
              Einwilligung für diese Dienste. Auch sie ist über die Datenschutz-Einstellungen
              widerrufbar.
            </p>
            <p>
              Im PDF-Wertreport ist ein Luftbild des bewerteten Grundstücks enthalten. Dieses
              rufen wir <strong>serverseitig</strong> ab, sodass dabei keine IP-Adresse von Ihnen
              an Esri übermittelt wird.
            </p>

            {/* 17 */}
            <h2 id="anfragen">17. Objektanfragen</h2>
            <p>
              Fragen Sie ein konkretes Objekt an, verarbeiten wir{" "}
              <strong>Name, E-Mail-Adresse, optional Telefonnummer, Ihre Nachricht sowie die
              Kennung und Bezeichnung des Objekts</strong>. Die Anfrage geht per E-Mail an das
              zuständige Team; Sie erhalten eine Eingangsbestätigung.
            </p>
            <p>
              Zur Bearbeitung übertragen wir Ihre Anfrage in unsere Maklersoftware (Abschnitt 25),
              damit sie dem Objekt und der zuständigen Ansprechperson zugeordnet werden kann.
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
            </p>

            {/* 18 */}
            <h2 id="expose">18. Exposé-Anforderung, Nachweis &amp; Provisionshinweis</h2>
            <p>
              Für den Download eines Exposés benötigen wir Angaben, die im Maklergeschäft üblich
              und für den Nachweis der Vermittlungstätigkeit erforderlich sind:{" "}
              <strong>Vor- und Nachname, Straße und Hausnummer, Postleitzahl, Ort,
              E-Mail-Adresse und Telefonnummer</strong>. Zusätzlich bestätigen Sie vor dem
              Download ausdrücklich die Kenntnisnahme des Provisionshinweises.
            </p>
            <p>
              Diese Daten dienen zwei Zwecken: der Zusendung der angeforderten Unterlagen und der
              Dokumentation, wem gegenüber wir ein Objekt nachgewiesen haben. Letzteres ist
              Grundlage eines möglichen Provisionsanspruchs und liegt zugleich in Ihrem Interesse
              an klaren Verhältnissen. Wir speichern daher <strong>Zeitpunkt, angefordertes
              Objekt, Ihre Angaben und Ihre Bestätigung</strong>.
            </p>
            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (vorvertragliche Maßnahme) sowie
              Art. 6 Abs. 1 lit. f DSGVO für die Nachweisdokumentation; unser berechtigtes
              Interesse liegt in der Sicherung und Nachvollziehbarkeit unseres
              Vergütungsanspruchs.
            </p>

            {/* 19 */}
            <h2 id="konten">19. Benutzerkonto</h2>
            <p>
              Sie können ein Konto anlegen, um Objekte vorzumerken, Suchaufträge zu speichern und
              Exposés bequemer anzufordern. Für die Registrierung verarbeiten wir Ihre{" "}
              <strong>E-Mail-Adresse und Ihr Passwort</strong> sowie die im Rahmen der
              Registrierung angegebenen Stammdaten (Name, Anschrift, Telefonnummer).
            </p>
            <p>
              Die Authentifizierung und die Datenhaltung erfolgen über <strong>Supabase</strong>{" "}
              (Supabase Inc.) als Auftragsverarbeiter. Ihr Passwort wird ausschließlich als
              kryptografischer Hash gespeichert; im Klartext ist es weder für uns noch für den
              Dienstleister einsehbar. Zum Serverstandort und zur Übermittlung in Drittländer
              siehe Abschnitt 31.
            </p>
            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Sie können Ihr Konto jederzeit
              selbst löschen; die zugehörigen Daten einschließlich Merkliste und Suchaufträge
              werden dabei entfernt, soweit keine gesetzliche Aufbewahrungspflicht besteht.
            </p>

            {/* 20 */}
            <h2 id="merkliste">20. Merkliste</h2>
            <p>
              Ohne Anmeldung wird Ihre Merkliste ausschließlich lokal in Ihrem Browser gespeichert
              (Abschnitt 10). Sind Sie angemeldet, speichern wir zusätzlich die Zuordnung{" "}
              <strong>Konto-Kennung und Objekt-Kennung</strong> in unserer Datenbank, damit die
              Merkliste auf allen Ihren Geräten verfügbar ist.
            </p>
            <p>
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Entfernen Sie ein Objekt aus der
              Merkliste, wird auch der Eintrag gelöscht.
            </p>

            {/* 21 */}
            <h2 id="suchauftrag">21. Suchauftrag &amp; Benachrichtigungen</h2>
            <p>
              Sie können eine Suche speichern und sich benachrichtigen lassen, sobald ein passendes
              Objekt in unser Angebot aufgenommen wird. Dazu speichern wir{" "}
              <strong>Ihre Konto-Kennung, die Bezeichnung des Suchauftrags, die Suchkriterien
              (etwa Ort, Umkreis, Preisrahmen, Objektart) und Ihre Benachrichtigungseinstellung</strong>.
            </p>
            <p>
              Ein automatisierter Abgleich prüft regelmäßig, welche Objekte neu veröffentlicht
              wurden, und gleicht sie mit den gespeicherten Suchaufträgen ab. Passt ein Objekt,
              erhalten Sie eine E-Mail. Um Mehrfachversand zu vermeiden, speichern wir zusätzlich,
              welches Objekt Ihnen bereits gemeldet wurde.
            </p>
            <p>
              <strong>Rechtsgrundlage ist Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO</strong>,
              die Sie durch das Aktivieren der Benachrichtigung erteilen. Sie können sie jederzeit
              widerrufen, indem Sie die Benachrichtigung im Konto deaktivieren oder den
              Suchauftrag löschen. Der Widerruf wirkt für die Zukunft.
            </p>

            {/* 22 */}
            <h2 id="spiel">22. Blitzverkauf-Spiel &amp; Bestenliste</h2>
            <p>
              Auf unserer Website finden Sie ein kleines Geschicklichkeitsspiel. Das Spiel selbst
              läuft vollständig in Ihrem Browser und erfordert keine Angaben. Entscheiden Sie sich,
              Ihr Ergebnis in die Bestenliste einzutragen, verarbeiten wir den von Ihnen
              gewählten <strong>Anzeigenamen, das Ergebnis und den Zeitpunkt</strong>; optional
              eine E-Mail-Adresse und, falls Sie angemeldet sind, die Zuordnung zu Ihrem Konto.
            </p>
            <p>
              <strong>Bitte beachten Sie:</strong> Der Anzeigename und das Ergebnis sind in der
              Bestenliste für alle Besucher der Website sichtbar. Sie sind daher frei in der Wahl
              des Namens und müssen keinen Klarnamen angeben. Eine hinterlegte E-Mail-Adresse wird
              nicht veröffentlicht.
            </p>
            <p>
              Rechtsgrundlage ist Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO, die Sie durch
              das Absenden des Eintrags erteilen. Sie können die Löschung Ihres Eintrags jederzeit
              formlos verlangen.
            </p>

            {/* 23 */}
            <h2 id="feedback">23. Feedback-Funktion (interne Nutzung)</h2>
            <p>
              Für die Qualitätssicherung verfügt diese Website über eine Kommentarfunktion, mit der
              unsere Mitarbeitenden Hinweise zu einzelnen Seitenbereichen hinterlassen können. Die
              Funktion ist <strong>für normale Besucherinnen und Besucher ohne jede Wirkung</strong>{" "}
              und nur nach ausdrücklicher Aktivierung auf dem jeweiligen Gerät sichtbar.
            </p>
            <p>
              Gespeichert werden dabei der Kommentartext, die betreffende Seite und die markierte
              Stelle. Personenbezug besteht nur mittelbar über die kommentierende Person aus
              unserem Team. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes
              Interesse liegt in der Verbesserung unseres Angebots.
            </p>

            {/* 24 */}
            <h2 id="mailversand">24. E-Mail-Versand (Resend)</h2>
            <p>
              Für den technischen Versand von Bestätigungen, Wertreports und Benachrichtigungen
              nutzen wir den Dienst <strong>Resend</strong> (Resend, Inc.). Verarbeitet werden{" "}
              <strong>Empfängeradresse, Betreff, Inhalt der Nachricht und Versandzeitpunkt</strong>
              sowie technische Zustellinformationen.
            </p>
            <p>
              Der Anbieter verarbeitet die Daten weisungsgebunden als Auftragsverarbeiter. Ein
              Öffnungs- oder Klick-Tracking unserer E-Mails findet nicht statt. Rechtsgrundlage
              ist Art. 6 Abs. 1 lit. b DSGVO beziehungsweise Art. 6 Abs. 1 lit. f DSGVO an einer
              zuverlässigen Zustellung.
            </p>

            {/* 25 */}
            <h2 id="onoffice">25. Immobilien &amp; CRM (onOffice)</h2>
            <p>
              Zur Verwaltung unserer Objekte und Kundenbeziehungen setzen wir die Maklersoftware{" "}
              <strong>onOffice</strong> (onOffice GmbH, Charlottenburger Allee 5, 52068 Aachen)
              ein. Die auf dieser Website dargestellten Objektdaten und Objektfotos werden über
              eine Schnittstelle aus diesem System abgerufen.
            </p>
            <p>
              Ihre Anfragen zu Objekten, Bewertungsanfragen und Exposé-Anforderungen übertragen wir
              in dieses System, um sie zu bearbeiten und dem Vorgang zuzuordnen. Der Anbieter
              verarbeitet die Daten als Auftragsverarbeiter auf Servern in Deutschland.
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, ergänzend Art. 6 Abs. 1 lit. f DSGVO
              an einer geordneten Vorgangsbearbeitung.
            </p>

            {/* 26 */}
            <h2 id="cdn">26. Bilder &amp; Videos (BunnyCDN)</h2>
            <p>
              Bilder und kurze Videos unserer Website liefern wir über das Content Delivery Network{" "}
              <strong>Bunny.net</strong> (BunnyWay d.o.o., Slowenien, Europäische Union) aus. Beim
              Abruf dieser Inhalte wird Ihre <strong>IP-Adresse</strong> technisch bedingt an den
              Anbieter übermittelt, damit die Datei ausgeliefert werden kann.
            </p>
            <p>
              Es handelt sich dabei um <strong>eigene Inhalte auf unserem eigenen Speicherbereich</strong>,
              nicht um Inhalte Dritter, und es werden hierfür keine Cookies gesetzt. Der Anbieter
              ist Auftragsverarbeiter mit Sitz in der Europäischen Union. Da ein
              Content Delivery Network Inhalte über ein weltweites Netz von Auslieferungsstandorten
              bereitstellt, kann die Auslieferung im Einzelfall auch über einen Standort außerhalb
              der Europäischen Union erfolgen; hierfür gilt Abschnitt 31. Rechtsgrundlage ist
              Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in einer schnellen
              und stabilen Auslieferung.
            </p>

            {/* 27 */}
            <h2 id="makler">27. Maklertätigkeit, Vertragsdurchführung &amp; GwG-Pflichten</h2>
            <p>
              Im Rahmen eines Makler- oder Vermittlungsvertrags verarbeiten wir die zur
              Durchführung erforderlichen Daten, insbesondere{" "}
              <strong>Stammdaten, Kontaktdaten, Objektdaten, Unterlagen zum Objekt sowie
              Angaben zu Ihrer Bonität oder Finanzierungsbestätigung</strong>, soweit dies für die
              Vermittlung erforderlich und angemessen ist. Rechtsgrundlage ist Art. 6 Abs. 1
              lit. b DSGVO.
            </p>
            <h3>Pflichten nach dem Geldwäschegesetz</h3>
            <p>
              Als Immobilienmakler unterliegen wir dem Geldwäschegesetz (GwG). Bei Vorliegen der
              gesetzlichen Voraussetzungen sind wir verpflichtet, Vertragsparteien zu
              identifizieren. Dazu erheben wir <strong>Name, Geburtsdatum, Geburtsort,
              Staatsangehörigkeit, Anschrift sowie Art, Nummer und ausstellende Behörde des
              Ausweisdokuments</strong> und fertigen hiervon eine Kopie an (§§ 10 ff. GwG).
            </p>
            <p>
              Diese Verarbeitung beruht auf Art. 6 Abs. 1 lit. c DSGVO. Die Angaben sind
              gesetzlich vorgeschrieben; ohne sie dürfen wir die Geschäftsbeziehung nicht
              begründen oder fortsetzen. Die Aufzeichnungen bewahren wir fünf Jahre auf (§ 8
              Abs. 4 GwG) und löschen sie anschließend, längstens nach zehn Jahren. In gesetzlich
              geregelten Fällen sind wir zur Meldung an die Zentralstelle für
              Finanztransaktionsuntersuchungen (FIU) verpflichtet; über eine solche Meldung dürfen
              wir Sie nicht informieren.
            </p>

            {/* 28 */}
            <h2 id="ki">28. KI-gestützte Funktionen &amp; automatisierte Verarbeitung</h2>
            <p>
              Einzelne Funktionen dieser Website, insbesondere der Online-Preisrechner und die
              automatisch erzeugten Wertreports, nutzen algorithmische und KI-gestützte Verfahren.
              Sie verarbeiten die von Ihnen eingegebenen Objektdaten sowie öffentlich verfügbare
              Marktdaten und amtliche Bodenrichtwerte.
            </p>
            <p>
              <strong>
                Die Ergebnisse sind automatisiert erzeugte, unverbindliche Einschätzungen.
              </strong>{" "}
              Sie stellen keine Wertermittlung nach § 194 BauGB und kein Gutachten dar und
              ersetzen keine persönliche Beratung. Wir weisen hierauf im Sinne der
              Transparenzanforderungen der Verordnung (EU) 2024/1689 (KI-Verordnung) hin.
            </p>
            <p>
              Eine <strong>automatisierte Entscheidung im Einzelfall einschließlich Profiling</strong>{" "}
              nach Art. 22 DSGVO, die Ihnen gegenüber rechtliche Wirkung entfaltet oder Sie in
              ähnlicher Weise erheblich beeinträchtigt, findet nicht statt. Über die Aufnahme
              einer Geschäftsbeziehung und über konkrete Vermarktungsschritte entscheiden stets
              Menschen.
            </p>

            {/* 29 */}
            <h2 id="missbrauch">29. Schutz vor Missbrauch</h2>
            <p>
              Um unsere Formulare vor automatisierten Massenzusendungen zu schützen, setzen wir
              zwei Maßnahmen ohne Einbindung Dritter ein:
            </p>
            <ul>
              <li>
                <strong>Verborgenes Prüffeld:</strong> Unsere Formulare enthalten ein für Menschen
                unsichtbares Feld. Wird es ausgefüllt, verwerfen wir die Übermittlung, weil sie
                mit hoher Wahrscheinlichkeit von einem automatisierten Programm stammt.
              </li>
              <li>
                <strong>Begrenzung der Anfragehäufigkeit:</strong> Wir begrenzen, wie oft ein
                Formular in einem Zeitraum abgesendet werden kann. Dazu wird die IP-Adresse
                kurzzeitig im Arbeitsspeicher gezählt, nicht dauerhaft gespeichert und nicht
                protokolliert.
              </li>
            </ul>
            <p>
              Wir setzen <strong>kein externes CAPTCHA</strong> ein; es findet insoweit keine
              Datenübermittlung an Dritte statt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
              mit unserem berechtigten Interesse an der Abwehr von Missbrauch.
            </p>

            {/* 30 */}
            <h2 id="empfaenger">30. Empfänger &amp; Auftragsverarbeiter</h2>
            <p>
              Wir geben Ihre Daten nur weiter, wenn dies für den jeweiligen Zweck erforderlich ist,
              Sie eingewilligt haben oder eine gesetzliche Verpflichtung besteht. Eine Weitergabe
              zu Werbezwecken an Dritte findet nicht statt. Folgende Dienstleister sind
              eingebunden:
            </p>
            <Tabelle
              kopf={["Dienstleister", "Funktion", "Ort der Verarbeitung"]}
              zeilen={[
                ["Vercel Inc.", "Hosting, Auslieferung der Website und cookiefreie Reichweitenmessung", "EU (Frankfurt), Unternehmen mit Sitz in den USA"],
                ["Supabase Inc.", "Datenbank, Benutzerkonten, Authentifizierung", "Unternehmen mit Sitz in den USA, siehe Abschnitt 31"],
                ["onOffice GmbH", "Maklersoftware, Objekt- und Kundenverwaltung", "Deutschland"],
                ["Resend, Inc.", "technischer E-Mail-Versand", "Unternehmen mit Sitz in den USA, siehe Abschnitt 31"],
                ["BunnyWay d.o.o. (Bunny.net)", "Auslieferung eigener Bilder und Videos", "Unternehmen mit Sitz in der EU, weltweites Auslieferungsnetz"],
                ["CARTO DB Inc., Esri Inc.", "Kartenkacheln und Luftbilder, nur nach Einwilligung", "USA, siehe Abschnitt 31"],
                ["Komoot GmbH (Photon)", "Adresssuche, über unseren Server vermittelt", "Europäische Union"],
                ["LVermGeo Rheinland-Pfalz", "amtliche Bodenrichtwerte, serverseitig abgefragt", "Deutschland"],
              ]}
            />
            <p>
              Darüber hinaus können Daten an Steuerberatung, Wirtschaftsprüfung, Rechtsberatung,
              Notariate, finanzierende Kreditinstitute sowie an Behörden übermittelt werden, soweit
              dies zur Vertragsdurchführung erforderlich oder gesetzlich vorgeschrieben ist.
            </p>

            {/* 31 */}
            <h2 id="drittland">31. Übermittlung in Drittländer</h2>
            <p>
              Soweit Daten außerhalb der Europäischen Union verarbeitet werden, stellen wir ein
              angemessenes Schutzniveau sicher. Bei Anbietern mit Sitz in den USA stützen wir die
              Übermittlung auf einen Angemessenheitsbeschluss der Europäischen Kommission, soweit
              der Anbieter unter dem EU-US Data Privacy Framework zertifiziert ist, andernfalls
              auf die Standardvertragsklauseln der Europäischen Kommission nach Art. 46 Abs. 2
              lit. c DSGVO in Verbindung mit ergänzenden Schutzmaßnahmen.
            </p>
            <p>
              Wir weisen darauf hin, dass in den USA nach derzeitiger Rechtslage ein Zugriff
              staatlicher Stellen auf personenbezogene Daten nicht vollständig ausgeschlossen
              werden kann und Betroffenenrechte gegebenenfalls nicht in gleichem Umfang
              durchsetzbar sind wie innerhalb der Europäischen Union. Bei den einwilligungspflichtigen
              Kartendiensten (Abschnitt 16) beruht die Übermittlung zusätzlich auf Ihrer
              ausdrücklichen Einwilligung nach Art. 49 Abs. 1 lit. a DSGVO.
            </p>

            {/* 32 */}
            <h2 id="schriften">32. Schriftarten &amp; Icons</h2>
            <p>
              Alle verwendeten Schriftarten werden <strong>lokal von unserem eigenen Server
              ausgeliefert</strong>. Eine Verbindung zu Google Fonts oder einem vergleichbaren
              externen Dienst besteht nicht; es wird insoweit keine IP-Adresse an Dritte
              übermittelt. Auch die verwendeten Symbole sind Bestandteil unserer Anwendung und
              werden nicht extern nachgeladen.
            </p>

            {/* 33 */}
            <h2 id="social">33. Social Media, Reels &amp; Bewertungsportale</h2>
            <p>
              Die Verweise auf unsere Profile bei Instagram, Facebook, YouTube und LinkedIn sowie
              auf Bewertungsportale sind <strong>einfache Links</strong>. Es werden keine Inhalte
              dieser Anbieter in unsere Seite eingebettet und keine Skripte geladen. Eine
              Datenübermittlung findet erst statt, wenn Sie den Link aktiv anklicken; anschließend
              gelten die Bestimmungen des jeweiligen Anbieters.
            </p>
            <p>
              Die auf unserer Startseite gezeigten kurzen Videos liegen auf{" "}
              <strong>unserem eigenen Speicherbereich</strong> (Abschnitt 26) und werden nicht von
              Instagram oder einer anderen Plattform nachgeladen. Ebenso sind die dargestellten
              Bewertungszahlen von uns gepflegte Angaben und keine eingebetteten Widgets der
              Portale.
            </p>

            {/* 34 */}
            <h2 id="bewerbung">34. Bewerbungen</h2>
            <p>
              Senden Sie uns eine Bewerbung, verarbeiten wir die darin enthaltenen Daten
              ausschließlich zur Durchführung des Bewerbungsverfahrens. Rechtsgrundlage ist § 26
              Abs. 1 BDSG in Verbindung mit Art. 88 DSGVO sowie Art. 6 Abs. 1 lit. b DSGVO.
            </p>
            <p>
              Kommt kein Beschäftigungsverhältnis zustande, löschen wir die Unterlagen
              grundsätzlich sechs Monate nach Abschluss des Verfahrens, um Ansprüche nach dem
              Allgemeinen Gleichbehandlungsgesetz abwehren zu können. Möchten Sie, dass wir Ihre
              Unterlagen für künftige Positionen aufbewahren, benötigen wir dafür Ihre gesonderte
              Einwilligung.
            </p>

            {/* 35 */}
            <h2 id="minderjaehrige">35. Minderjährige</h2>
            <p>
              Unsere Angebote richten sich an volljährige Personen. Wir erheben wissentlich keine
              Daten von Kindern und Jugendlichen unter 16 Jahren. Sollten wir Kenntnis davon
              erlangen, dass uns solche Daten ohne Einwilligung der Sorgeberechtigten übermittelt
              wurden, löschen wir sie unverzüglich.
            </p>

            {/* 36 */}
            <h2 id="aenderungen">36. Änderungen dieser Erklärung</h2>
            <p>
              Wir passen diese Datenschutzerklärung an, sobald sich die zugrunde liegenden
              Verarbeitungen ändern, etwa weil eine neue Funktion hinzukommt oder ein
              Dienstleister wechselt, oder wenn Rechtsprechung und Gesetzgebung dies erfordern.
              Für Ihren erneuten Besuch gilt jeweils die hier abrufbare aktuelle Fassung.
            </p>
            <p className="pt-4 text-sm text-faint">Stand: Juli 2026</p>
          </div>
        </Container>
      </section>
    </>
  );
}
