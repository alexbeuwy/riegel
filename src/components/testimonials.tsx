import { Container } from "@/components/container";
import { Reveal } from "@/components/reveal";
import { TiltCard } from "@/components/tilt-card";
import { Icon } from "@/components/icon";
import { TESTIMONIALS, TRUST_PLATFORMS } from "@/lib/trust-data";

/** Echte, öffentlich einsehbare Kundenstimmen (golocal/Google via Trustlocal). */
export function Testimonials() {
  const totalReviews = TRUST_PLATFORMS.reduce((sum, p) => sum + p.count, 0);
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <Reveal className="mb-12 max-w-2xl space-y-4">
          <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
            Was unsere Kunden sagen
          </span>
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Über {totalReviews} echte Bewertungen — von Menschen, die verkauft haben.
          </h2>
          <p className="text-muted">
            Keine Werbetexte, keine ausgewählten Einzelfälle: öffentlich einsehbare
            Stimmen von Trustpilot, golocal und Google.
          </p>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={i} delay={i * 60}>
              <TiltCard cardClassName="flex h-full flex-col border border-border bg-surface p-6">
                {t.sterne ? (
                  <div className="flex text-accent" aria-hidden>
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Icon key={s} name="star" size={14} className={s < t.sterne! ? "" : "text-faint"} />
                    ))}
                  </div>
                ) : (
                  <span className="text-xs uppercase tracking-widest text-faint">Google-Bewertung</span>
                )}
                <p className="mt-4 flex-1 text-[0.95rem] leading-relaxed text-fg/90">
                  „{t.text}&rdquo;
                </p>
                <a
                  href={t.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-5 flex items-center justify-between text-sm text-muted transition-colors hover:text-accent"
                >
                  <span className="font-medium text-fg">{t.autor}</span>
                  <span className="flex items-center gap-1.5 text-xs">
                    {t.plattform}
                    <Icon name="arrowUpRight" size={13} />
                  </span>
                </a>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
