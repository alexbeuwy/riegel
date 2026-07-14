import { Container } from "@/components/container";
import { BlitzverkaufGame } from "@/components/game/blitzverkauf-game";

export const metadata = {
  title: "Blitzverkauf — das RIEGEL-Spiel",
  description:
    "Nur zum Spaß: Flieg über die Region Rhein-Neckar und verkaufe Häuser aus der Luft. Ein kleines Easter-Egg-Spiel von Riegel Immobilien.",
  alternates: { canonical: "/spiel" },
  robots: { index: false, follow: true },
};

export default function SpielPage() {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
            Easter Egg
          </span>
          <h1 className="akira mt-5 text-3xl leading-[1.05] sm:text-5xl">Blitzverkauf</h1>
          <p className="mt-4 text-muted">
            Ein kleines Spiel, kein Ersatz für eine echte Bewertung — die machen wir lieber
            persönlich. Aber ein bisschen Spaß muss sein.
          </p>
        </div>
        <BlitzverkaufGame />
      </Container>
    </section>
  );
}
