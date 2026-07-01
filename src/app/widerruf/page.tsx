import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";

export const metadata = { title: "Widerrufsbelehrung", alternates: { canonical: "/widerruf" } };

const prose =
  "mx-auto max-w-3xl space-y-4 text-muted [&_a]:text-accent [&_a]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-fg [&_strong]:text-fg";

export default function WiderrufPage() {
  return (
    <>
      <PageIntro eyebrow="Verbraucherrecht" title="Widerrufsbelehrung">
        Verbraucherinnen und Verbraucher haben bei im Fernabsatz geschlossenen
        Maklerverträgen ein gesetzliches Widerrufsrecht.
      </PageIntro>
      <section className="py-14">
        <Container>
          <div className="mx-auto mb-8 max-w-3xl rounded-xl border border-accent/40 bg-surface p-4 text-sm text-muted">
            ⚠️ <strong className="text-fg">Entwurf</strong> — die Widerrufsbelehrung und das
            Muster-Widerrufsformular müssen <strong className="text-fg">wortgleich</strong> der
            gesetzlichen Muster (Anlage 1 und 2 zu Art. 246a EGBGB) entsprechen und vor
            Verwendung anwaltlich geprüft werden. Höchstes kommerzielles Risiko für den
            Provisionsanspruch bei Fehlern.
          </div>

          <div className={prose}>
            <h2>Widerrufsrecht</h2>
            <p>
              Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen
              Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des
              Vertragsabschlusses.
            </p>
            <p>
              Um Ihr Widerrufsrecht auszuüben, müssen Sie uns
            </p>
            <p>
              <strong>RIEGEL Immobilien</strong>, Inhaberin Sylwia Riegel, Wormser Straße 13,
              67346 Speyer, E-Mail:{" "}
              <a href="mailto:info@riegel-immobilien.de">info@riegel-immobilien.de</a>,
              Telefon: 06232 100 10 10
            </p>
            <p>
              mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief
              oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen,
              informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden,
              das jedoch nicht vorgeschrieben ist.
            </p>
            <p>
              Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die
              Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
            </p>

            <h2>Folgen des Widerrufs</h2>
            <p>
              Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von
              Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem
              Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags
              bei uns eingegangen ist.
            </p>
            <p>
              Haben Sie verlangt, dass die Dienstleistungen während der Widerrufsfrist
              beginnen sollen, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem
              Anteil der bis zu dem Zeitpunkt, zu dem Sie uns von der Ausübung des
              Widerrufsrechts unterrichten, bereits erbrachten Dienstleistungen im Vergleich
              zum Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.
            </p>
            <p>
              <strong>Vorzeitiges Erlöschen des Widerrufsrechts:</strong> Ihr Widerrufsrecht
              erlischt bei einem Vertrag über die Erbringung von Dienstleistungen, wenn wir
              die Dienstleistung vollständig erbracht haben und mit der Ausführung erst
              begonnen haben, nachdem Sie dazu Ihre ausdrückliche Zustimmung gegeben und
              gleichzeitig Ihre Kenntnis davon bestätigt haben, dass Sie Ihr Widerrufsrecht
              bei vollständiger Vertragserfüllung verlieren.
            </p>

            <h2>Muster-Widerrufsformular</h2>
            <p className="text-sm text-faint">
              (Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus
              und senden Sie es zurück.)
            </p>
            <div className="rounded-xl border border-border bg-surface p-5 text-sm">
              <p>An RIEGEL Immobilien, Inhaberin Sylwia Riegel, Wormser Straße 13, 67346 Speyer, info@riegel-immobilien.de:</p>
              <p className="mt-3">
                Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag
                über die Erbringung der folgenden Dienstleistung (*):
              </p>
              <p className="mt-3">— Bestellt am (*)/erhalten am (*):</p>
              <p>— Name des/der Verbraucher(s):</p>
              <p>— Anschrift des/der Verbraucher(s):</p>
              <p>— Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):</p>
              <p>— Datum:</p>
              <p className="mt-3 text-faint">(*) Unzutreffendes streichen.</p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
