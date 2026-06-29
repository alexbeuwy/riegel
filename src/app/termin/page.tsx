import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { Icon, type IconName } from "@/components/icon";
import { BookingTool } from "@/components/booking-tool";

export const metadata = {
  title: "Termin vereinbaren",
  description:
    "Besichtigung oder Beratung bei Riegel Immobilien online buchen — Anlass, Datum und Uhrzeit wählen, wir bestätigen kurzfristig.",
};

const ablauf: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "calendar",
    title: "Termin anfragen",
    text: "Sie wählen Anlass, Datum und Uhrzeit — wir bestätigen kurzfristig, persönlich oder digital.",
  },
  {
    icon: "doc",
    title: "Vorbereitung",
    text: "Wir stellen Exposé, Grundrisse und alle Unterlagen bereit, damit nichts offen bleibt.",
  },
  {
    icon: "home",
    title: "Besichtigung vor Ort",
    text: "Persönliche Führung durch die Immobilie — in Ruhe, mit Zeit für alle Ihre Fragen.",
  },
  {
    icon: "handshake",
    title: "Nachgespräch",
    text: "Ehrliches Feedback, nächste Schritte und auf Wunsch direkt das weitere Vorgehen.",
  },
];

export default function TerminPage() {
  return (
    <>
      <PageIntro eyebrow="Termin" title="Besichtigung & Beratung buchen">
        Wählen Sie Anlass, Datum und Uhrzeit — wir bestätigen Ihren Wunschtermin
        kurzfristig, persönlich oder digital.
      </PageIntro>

      {/* Buchungstool zuerst */}
      <section className="pt-4 pb-16">
        <Container>
          <BookingTool />
        </Container>
      </section>

      {/* So läuft eine Besichtigung — darunter */}
      <section className="border-t border-border py-16 sm:py-20">
        <Container>
          <Reveal className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-semibold sm:text-3xl">So läuft eine Besichtigung ab</h2>
            <p className="mt-3 text-muted">
              Transparent von der Anfrage bis zum Nachgespräch — Sie wissen
              jederzeit, was als Nächstes kommt.
            </p>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ablauf.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <div className="group h-full overflow-hidden rounded-2xl border border-border bg-surface">
                  {/* Bild-Platzhalter — echte Besichtigungsfotos kommen hier rein */}
                  <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-surface-2 to-bg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/wave-2.svg"
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-8 bottom-0 h-[150%] w-auto opacity-[0.12] mix-blend-screen"
                    />
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg/40 text-accent backdrop-blur">
                      <Icon name={s.icon} size={26} />
                    </span>
                    <span className="absolute left-3 top-3 akira text-lg text-faint">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="space-y-2 p-5">
                    <h3 className="text-lg font-semibold text-fg">{s.title}</h3>
                    <p className="text-sm text-muted">{s.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-4 text-xs text-faint">
            Bild-Platzhalter — echte Impressionen Ihrer Besichtigung folgen.
          </p>
        </Container>
      </section>
    </>
  );
}
