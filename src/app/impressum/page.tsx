import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { site } from "@/lib/site";

export const metadata = {
  title: "Impressum",
  description:
    "Impressum von Riegel Immobilien e.K., Speyer und Ludwigshafen: Anbieterkennzeichnung nach § 5 DDG, Handelsregister, Erlaubnis nach § 34c GewO und Verantwortlichkeit für die Inhalte.",
  alternates: { canonical: "/impressum" },
};

const prose =
  "mx-auto max-w-3xl space-y-4 text-muted [&_a]:text-accent [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-fg [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-fg [&_strong]:text-fg";

/**
 * Impressum (Anbieterkennzeichnung nach § 5 DDG).
 *
 * Datenherkunft: Die Firmen-, Register- und Behördenangaben stammen aus dem
 * bisherigen Impressum von RIEGEL auf der OnOffice-Smartsite. Alex hat sie
 * übermittelt und dazu gesagt, dass die Seite sehr alt ist. Gegengeprüft wurde
 * anschließend gegen 23 archivierte Fassungen des alten Impressums (2015 bis
 * 2026), gegen Handelsregister-Auswertungen und gegen die heutigen Angaben der
 * beteiligten Behörden.
 *
 * ZWEI STELLEN sind daraufhin gegenüber der Vorlage KORRIGIERT worden:
 *  - Die Stadt Speyer führt das Ordnungswesen heute als Abteilung 211
 *    (Allgemeines Ordnungswesen), nicht mehr als Abteilung 210. Die alte
 *    Faxnummer 14-2458 stimmt ebenfalls nicht mehr.
 *  - Der Verantwortliche nach § 18 Abs. 2 MStV steht mit der Anschrift der
 *    Hauptniederlassung Harthausen, so wie es das alte Impressum auch hatte.
 *
 * OFFEN und von RIEGEL zu klären (bewusst nicht geraten):
 *  - Der im Handelsregister eingetragene Firmenwortlaut. Die eigene Angabe
 *    lautet seit über zehn Jahren durchgehend "Riegel Immobilien e.K.",
 *    mehrere aus Registerbekanntmachungen gespeiste Verzeichnisse führen
 *    dagegen "Riegel Immobilien Management e.K.". Hier steht die Eigenangabe,
 *    weil sie von RIEGEL selbst stammt; Gewissheit bringt nur ein aktueller
 *    Auszug beim Amtsgericht Ludwigshafen zu HRA 51804.
 *  - Ob die Ludwigshafener Anschrift eine im Register eingetragene
 *    Zweigniederlassung ist. In allen Quellen taucht registerrechtlich nur
 *    Speyer auf, deshalb steht Ludwigshafen hier als weiterer Standort.
 *
 * BEWUSST NICHT ÜBERNOMMEN, jeweils mit Grund:
 *
 *  - Die dort als „USt.-IdNr." geführte Nummer "DE 41/138/7230/6" ist keine.
 *    Eine deutsche Umsatzsteuer-Identifikationsnummer besteht aus "DE" und
 *    GENAU NEUN Ziffern; hier sind es zehn, und das Format entspricht einer
 *    rheinland-pfälzischen Steuernummer (xx/xxx/xxxxx). Eine Steuernummer
 *    verlangt § 5 DDG nicht, sie gehört auch nicht auf eine öffentliche Seite.
 *    Sobald die echte USt-IdNr. vorliegt, kommt der Abschnitt hier hinein.
 *
 *  - Der Verweis auf die OS-Plattform der EU-Kommission und auf Art. 14 Abs. 1
 *    ODR-VO. Die Plattform ist zum 20. Juli 2025 eingestellt worden, die
 *    ODR-Verordnung wurde durch die Verordnung (EU) 2024/3228 aufgehoben
 *    (geprüft an der offiziellen Mitteilung der Kommission, die alte Adresse
 *    leitet nur noch auf einen Einstellungshinweis). Ein Impressum, das
 *    dorthin verweist, nennt ein Verfahren, das es nicht mehr gibt. Geblieben
 *    ist die Erklärung nach § 36 VSBG.
 *
 *  - Der Absatz „Schutzrechtsverletzung" mit dem Hinweis, eine anwaltliche
 *    Abmahnung entspreche nicht dem Willen des Anbieters. Das ist ein
 *    bekannter Impressums-Mythos ohne Rechtswirkung, er verhindert keine
 *    Abmahnung und liest sich defensiv. Stattdessen steht unten ein
 *    sachlicher Hinweis, wie man eine Rechtsverletzung meldet.
 */
export default function ImpressumPage() {
  return (
    <>
      <PageIntro eyebrow="Rechtliches" title="Impressum">
        Anbieterkennzeichnung nach § 5 Digitale-Dienste-Gesetz (DDG) und Angaben zur
        Verantwortlichkeit nach § 18 Abs. 2 Medienstaatsvertrag (MStV).
      </PageIntro>

      {/* Strukturierte Daten. Der Organisationsknoten trägt bewusst DIESELBE @id
          wie der im Root-Layout, damit Suchmaschinen und KI-Systeme beide zu
          EINER Entität zusammenführen statt zwei konkurrierende Firmen zu sehen.
          Ergänzt werden hier nur die Angaben, die es sonst nirgends gibt: der
          Registereintrag und die Gewerbeerlaubnis. Genau solche amtlichen
          Kennungen sind für die Zuordnung einer Marke zu einem realen
          Unternehmen der stärkste Beleg, den eine Website liefern kann. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                "@id": `${site.url}/impressum#webpage`,
                url: `${site.url}/impressum`,
                name: "Impressum",
                description: metadata.description,
                inLanguage: "de-DE",
                about: { "@id": `${site.url}/#organization` },
                publisher: { "@id": `${site.url}/#organization` },
                breadcrumb: {
                  "@type": "BreadcrumbList",
                  itemListElement: [
                    { "@type": "ListItem", position: 1, name: "Startseite", item: site.url },
                    { "@type": "ListItem", position: 2, name: "Impressum" },
                  ],
                },
              },
              {
                "@type": "RealEstateAgent",
                "@id": `${site.url}/#organization`,
                name: site.name,
                legalName: site.legalName,
                identifier: [
                  {
                    "@type": "PropertyValue",
                    name: "Handelsregisternummer",
                    value: "HRA 51804 Sp",
                  },
                  {
                    "@type": "PropertyValue",
                    name: "Registergericht",
                    value: "Amtsgericht Ludwigshafen am Rhein",
                  },
                ],
                // Erlaubnispflichtiges Gewerbe: die Erlaubnis ist ein echtes,
                // von einer Behörde vergebenes Merkmal und damit ein
                // belastbares Vertrauenssignal.
                hasCredential: {
                  "@type": "EducationalOccupationalCredential",
                  credentialCategory: "license",
                  name: "Erlaubnis als Immobilienmakler nach § 34c Abs. 1 Satz 1 Nr. 1 GewO",
                  recognizedBy: {
                    "@type": "GovernmentOrganization",
                    name: "Verbandsgemeindeverwaltung Römerberg-Dudenhofen",
                    address: {
                      "@type": "PostalAddress",
                      streetAddress: "Konrad-Adenauer-Platz 6",
                      postalCode: "67373",
                      addressLocality: "Dudenhofen",
                      addressCountry: "DE",
                    },
                  },
                },
              },
            ],
          }),
        }}
      />

      <section className="py-14">
        <Container>
          <div className={prose}>
            {/* Ein Satz, der die Entität vollständig beschreibt. Genau so eine
                Zeile zitieren KI-Antwortsysteme, wenn sie erklären sollen, wer
                hinter einer Domain steht. */}
            <p>
              <strong>Riegel Immobilien e.K.</strong> ist ein inhabergeführtes
              Immobilienmaklerunternehmen mit Hauptniederlassung in Harthausen und Büros in
              Speyer und Ludwigshafen am Rhein. Das Unternehmen ist im Handelsregister des
              Amtsgerichts Ludwigshafen am Rhein unter HRA 51804 Sp eingetragen und verfügt
              über die Erlaubnis als Immobilienmakler nach § 34c Abs. 1 Satz 1 Nr. 1 GewO.
            </p>

            <h2>Anbieter</h2>
            <p>
              <strong>Riegel Immobilien e.K.</strong>
              <br />
              Inhaberin: Sylwia Riegel
            </p>

            <h3>Hauptniederlassung</h3>
            <p>
              Im Sand 42
              <br />
              67376 Harthausen
            </p>

            <h3>Zweigniederlassung</h3>
            <p>
              Wormser Straße 13
              <br />
              67346 Speyer
            </p>

            <h3>Weiterer Standort</h3>
            <p>
              Kaiser-Wilhelm-Straße 16
              <br />
              67059 Ludwigshafen am Rhein
            </p>

            <h2>Kontakt</h2>
            <p>
              Telefon Speyer: <a href="tel:+4962321001010">+49 6232 100 10 10</a>
              <br />
              Telefon Ludwigshafen: <a href="tel:+4962152008800">+49 621 5200 8800</a>
              <br />
              Telefax: +49 6232 100 10 110
              <br />
              E-Mail: <a href="mailto:info@riegel-immobilien.de">info@riegel-immobilien.de</a>
              <br />
              Internet:{" "}
              <a href={site.url} rel="noopener">
                riegel-immobilien.de
              </a>
            </p>

            <h2>Registereintrag</h2>
            <p>
              Eingetragen im Handelsregister
              <br />
              Registergericht: Amtsgericht Ludwigshafen am Rhein
              <br />
              Registernummer: HRA 51804 Sp
            </p>
            <p>
              Anschrift des Registergerichts: Wittelsbachstraße 10, 67061 Ludwigshafen am
              Rhein.
            </p>

            <h2>Erlaubnis und Aufsicht nach § 34c GewO</h2>
            <p>
              <strong>Berufsbezeichnung:</strong> Immobilienmakler, verliehen in der
              Bundesrepublik Deutschland.
            </p>
            <p>
              <strong>Erlaubnis nach § 34c Abs. 1 Satz 1 Nr. 1 GewO,</strong> erteilt durch:
              <br />
              Verbandsgemeindeverwaltung Römerberg-Dudenhofen
              <br />
              Konrad-Adenauer-Platz 6, 67373 Dudenhofen
              <br />
              Telefon: <a href="tel:+4962326560">06232 656-0</a> · E-Mail:{" "}
              <a href="mailto:info@vgrd.de">info@vgrd.de</a>
            </p>
            <p>
              <strong>Zuständige Aufsichtsbehörde:</strong>
              <br />
              Stadt Speyer, Abteilung 211, Allgemeines Ordnungswesen
              <br />
              Große Himmelsgasse 10, 67346 Speyer
              <br />
              Telefon: <a href="tel:+4962321442469">06232 14-2469</a> · E-Mail:{" "}
              <a href="mailto:ordnungswesen@stadt-speyer.de">ordnungswesen@stadt-speyer.de</a>
            </p>
            <p>
              <strong>Berufsrechtliche Regelungen:</strong> Es gelten § 34c Gewerbeordnung
              (GewO) und die Verordnung über die Pflichten der Immobilienmakler,
              Darlehensvermittler, Bauträger, Baubetreuer und Wohnimmobilienverwalter
              (Makler- und Bauträgerverordnung, MaBV). Beide sind einsehbar unter{" "}
              <a
                href="https://www.gesetze-im-internet.de/gewo/__34c.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                gesetze-im-internet.de/gewo
              </a>{" "}
              und{" "}
              <a
                href="https://www.gesetze-im-internet.de/mabv/"
                target="_blank"
                rel="noopener noreferrer"
              >
                gesetze-im-internet.de/mabv
              </a>
              .
            </p>
{/* KEINE Aussage zur Weiterbildungspflicht.
    Am Gesetzestext geprüft: § 34c Abs. 2a GewO nennt ausdrücklich nur
    "Gewerbetreibende nach Absatz 1 Satz 1 Nummer 4", und Nummer 4 sind die
    Wohnimmobilienverwalter. Immobilienmakler stehen in Nummer 1 und sind von
    dieser Pflicht nicht erfasst. Eine Behauptung, man erfülle eine Pflicht,
    die es für den eigenen Beruf gar nicht gibt, ist selbst angreifbar. Ebenso
    ist bewusst keine Berufshaftpflicht genannt: § 34c Abs. 2 Nr. 3 GewO
    verlangt sie ebenfalls nur für Nummer 4, und ob RIEGEL eine hat, ist hier
    nicht belegt. Beides kann als freiwillige Angabe zurückkommen, sobald
    RIEGEL es bestätigt. */}

            <h2>Verantwortlich für den Inhalt</h2>
            <p>
              Verantwortlich für journalistisch-redaktionell gestaltete Inhalte nach § 18
              Abs. 2 MStV sowie redaktionell verantwortlich:
              <br />
              <strong>Sylwia Riegel</strong>
              <br />
              Riegel Immobilien e.K., Im Sand 42, 67376 Harthausen
            </p>

            <h2>Verbraucherstreitbeilegung</h2>
            <p>
              Wir sind nicht verpflichtet und nicht bereit, an einem
              Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle im Sinne des
              Verbraucherstreitbeilegungsgesetzes (VSBG) teilzunehmen (§ 36 Abs. 1 Nr. 1
              VSBG).
            </p>
            <p>
              Die frühere Plattform der Europäischen Kommission zur Online-Streitbeilegung
              ist zum <strong>20. Juli 2025 eingestellt</strong> worden; die zugrunde
              liegende Verordnung (EU) Nr. 524/2013 wurde durch die Verordnung (EU)
              2024/3228 aufgehoben. Ein Verweis darauf entfällt deshalb. Eine Übersicht der
              anerkannten Streitbeilegungsstellen führt die Europäische Kommission unter{" "}
              <a
                href="https://consumer-redress.ec.europa.eu/"
                target="_blank"
                rel="noopener noreferrer"
              >
                consumer-redress.ec.europa.eu
              </a>
              .
            </p>

            <h2>Haftung für Inhalte</h2>
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf
              diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach den §§ 8 bis
              10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte
              oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu
              forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur
              Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen
              Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch
              erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich.
              Bei Bekanntwerden entsprechender Rechtsverletzungen entfernen wir diese
              Inhalte umgehend.
            </p>
            <p>
              Alle Angaben zu Immobilien beruhen auf Informationen der jeweiligen
              Eigentümerschaft. Preisangaben, Marktdaten und Ergebnisse unseres
              Online-Preisrechners sind unverbindliche Orientierungswerte ohne Gewähr; sie
              ersetzen weder ein Verkehrswertgutachten noch eine Rechts-, Steuer- oder
              Finanzberatung. Zwischenverkauf bleibt vorbehalten.
            </p>

            <h2>Haftung für Links</h2>
            <p>
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte
              wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch
              keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der
              jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten
              Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße
              überprüft, rechtswidrige Inhalte waren nicht erkennbar. Eine permanente
              inhaltliche Kontrolle der verlinkten Seiten ist ohne konkrete Anhaltspunkte
              einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von
              Rechtsverletzungen entfernen wir derartige Links umgehend.
            </p>

            <h2>Urheberrecht und Bildnachweise</h2>
            <p>
              Die durch die Seitenbetreiberin erstellten Inhalte und Werke auf diesen Seiten
              unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung,
              Verbreitung und jede Art der Verwertung außerhalb der Grenzen des
              Urheberrechts bedürfen der schriftlichen Zustimmung. Downloads und Kopien
              dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch
              gestattet.
            </p>
            <p>
              Objektfotos, Grundrisse und Objektbeschreibungen stammen aus unserer eigenen
              Vermarktung oder wurden uns von der Eigentümerschaft zur Verfügung gestellt.
              Eine Übernahme, auch auszugsweise, ist ohne unsere vorherige schriftliche
              Zustimmung nicht gestattet. Soweit Inhalte auf dieser Seite nicht von uns
              erstellt wurden, werden die Urheberrechte Dritter beachtet und solche Inhalte
              als solche gekennzeichnet.
            </p>

            <h2>Hinweis auf Rechtsverletzungen</h2>
            <p>
              Sollten Sie den Eindruck haben, dass über diese Website ein Recht von Ihnen
              verletzt wird, teilen Sie uns das bitte kurz per E-Mail an{" "}
              <a href="mailto:info@riegel-immobilien.de">info@riegel-immobilien.de</a> mit.
              Wir prüfen jeden Hinweis und schaffen berechtigten Beanstandungen umgehend
              Abhilfe.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
