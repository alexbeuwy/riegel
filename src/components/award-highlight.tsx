import Image from "next/image";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";

/** ImmoAward 2025 — echte Auszeichnung als Trust-Element. */
export function AwardHighlight() {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <div className="grid items-stretch gap-6 overflow-hidden rounded-3xl border border-border bg-surface lg:grid-cols-2">
          <div className="order-2 flex flex-col justify-center p-8 sm:p-12 lg:order-1">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.25em] text-accent">
              <Icon name="star" size={18} />
              ImmoAward 2025 · ImmoScout24
            </div>
            <h2 className="mt-5 text-2xl font-semibold sm:text-3xl">
              Top 21 von über 25.000 Maklern bundesweit
            </h2>
            <p className="mt-4 text-muted">
              Beim ImmoAward 2025 von ImmoScout24 haben wir uns unter mehr als
              <span className="text-fg"> 25.000 Makler:innen deutschlandweit</span> durchgesetzt:
              in der Rubrik „Makler des Jahres" national in die <span className="text-fg">Top 21</span> und im
              Raum Frankfurt &amp; Umgebung in die <span className="text-fg">Top 3</span>.
            </p>
            <p className="mt-4 text-muted">
              Auch wenn es mit dem Pokal nicht geklappt hat — für uns als Familie
              Riegel ist der größte Dank an unser Team gerichtet. Im nächsten Jahr
              greifen wir neu an.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {["Top 21 national", "Top 3 Raum Frankfurt", "Makler des Jahres"].map((b) => (
                <span
                  key={b}
                  className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-sm text-accent-strong"
                >
                  <Icon name="check" size={15} />
                  {b}
                </span>
              ))}
            </div>
          </div>
          <div className="relative order-1 min-h-[260px] overflow-hidden lg:order-2">
            <Image
              src="/images/news/event.jpg"
              alt="Riegel Immobilien beim ImmoAward 2025"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface/60 to-transparent lg:bg-gradient-to-l" />
          </div>
        </div>
      </Container>
    </section>
  );
}
