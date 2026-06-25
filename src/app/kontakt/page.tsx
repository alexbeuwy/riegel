import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { site, whatsappHref } from "@/lib/site";

export const metadata = { title: "Kontakt" };

export default function KontaktPage() {
  const wa = whatsappHref();
  return (
    <>
      <PageIntro eyebrow="Kontakt" title="Sprechen wir über Ihre Immobilie">
        Ob Verkauf, Bewertung oder Besichtigung — wir freuen uns auf Ihre
        Nachricht und melden uns in der Regel innerhalb eines Werktages.
      </PageIntro>
      <section className="py-20">
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="text-xs uppercase tracking-widest text-faint">
                Telefon
              </div>
              <div className="mt-2 text-lg text-fg">
                {site.phone || "wird in Kürze ergänzt"}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="text-xs uppercase tracking-widest text-faint">
                E-Mail
              </div>
              <div className="mt-2 text-lg text-fg">
                {site.email ? (
                  <a href={`mailto:${site.email}`} className="hover:text-accent">
                    {site.email}
                  </a>
                ) : (
                  "wird in Kürze ergänzt"
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="text-xs uppercase tracking-widest text-faint">
                WhatsApp
              </div>
              <div className="mt-2 text-lg text-fg">
                {wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-accent"
                  >
                    Chat starten
                  </a>
                ) : (
                  "wird in Kürze ergänzt"
                )}
              </div>
            </div>
          </div>
          <p className="mt-8 text-sm text-faint">
            Ein komfortables Kontaktformular mit direkter Übergabe an unser CRM
            ist in Vorbereitung.
          </p>
        </Container>
      </section>
    </>
  );
}
