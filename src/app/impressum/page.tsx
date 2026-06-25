import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";

export const metadata = { title: "Impressum" };

const prose =
  "mx-auto max-w-3xl space-y-4 text-muted [&_a]:text-accent [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-fg [&_strong]:text-fg";

export default function ImpressumPage() {
  return (
    <>
      <PageIntro eyebrow="Rechtliches" title="Impressum" />
      <section className="py-14">
        <Container>
          <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-accent/40 bg-surface p-4 text-sm text-muted">
            ⚠️ <strong className="text-fg">Entwurf</strong> — vor Veröffentlichung anwaltlich
            prüfen lassen. Mit [eckigen Klammern] markierte Felder (Aufsichtsbehörde,
            USt-IdNr. etc.) müssen von Riegel Immobilien ergänzt/bestätigt werden.
          </div>

          <div className={prose}>
            <h2>Angaben gemäß § 5 DDG</h2>
            <p>
              <strong>RIEGEL Immobilien</strong>
              <br />
              Inhaberin: Sylwia Riegel
              <br />
              Wormser Straße 13
              <br />
              67346 Speyer
            </p>
            <p>
              Zweigstelle:
              <br />
              Kaiser-Wilhelm-Straße 16
              <br />
              67059 Ludwigshafen
            </p>

            <h2>Kontakt</h2>
            <p>
              Telefon Speyer: 06232 100 10 10
              <br />
              Telefon Ludwigshafen: 0621 5200 8800
              <br />
              E-Mail: <a href="mailto:info@riegel-immobilien.de">info@riegel-immobilien.de</a>
            </p>

            <h2>Umsatzsteuer-ID</h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
              <br />
              [USt-IdNr. ergänzen]
            </p>

            <h2>Erlaubnis nach § 34c GewO</h2>
            <p>
              Die Erlaubnis als Immobilienmakler gemäß § 34c Abs. 1 GewO wurde erteilt
              durch: [zuständige Behörde, z. B. Stadt Speyer].
              <br />
              Aufsichtsbehörde: [zuständige Aufsichtsbehörde mit Anschrift ergänzen].
              <br />
              Berufsbezeichnung: Immobilienmakler (verliehen in der Bundesrepublik
              Deutschland).
            </p>
            <p>
              Es gelten die berufsrechtlichen Regelungen der Makler- und
              Bauträgerverordnung (MaBV), einsehbar unter{" "}
              <a href="https://www.gesetze-im-internet.de/mabv/" target="_blank" rel="noopener noreferrer">
                gesetze-im-internet.de/mabv
              </a>
              .
            </p>

            <h2>Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur
              Online-Streitbeilegung (OS) bereit:{" "}
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
                https://ec.europa.eu/consumers/odr/
              </a>
              . Unsere E-Mail-Adresse finden Sie oben. Wir sind nicht verpflichtet und
              nicht bereit, an einem Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>

            <h2>Haftung für Inhalte</h2>
            <p>
              Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf
              diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10
              DDG sind wir jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
              Informationen zu überwachen. Verpflichtungen zur Entfernung oder Sperrung der
              Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon
              unberührt.
            </p>

            <h2>Haftung für Links</h2>
            <p>
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte
              wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets
              der jeweilige Anbieter oder Betreiber verantwortlich. Bei Bekanntwerden von
              Rechtsverletzungen werden wir derartige Links umgehend entfernen.
            </p>

            <h2>Urheberrecht</h2>
            <p>
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
              unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind als solche
              gekennzeichnet. Downloads und Kopien dieser Seite sind nur für den privaten,
              nicht kommerziellen Gebrauch gestattet.
            </p>
          </div>
        </Container>
      </section>
    </>
  );
}
