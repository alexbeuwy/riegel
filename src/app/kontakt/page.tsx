import Link from "next/link";
import Image from "next/image";
import { PageIntro } from "@/components/page-intro";
import { Container } from "@/components/container";
import { ContactForm } from "@/components/contact-form";
import { AnsprechpartnerCard } from "@/components/ansprechpartner-card";
import { Icon } from "@/components/icon";
import { contacts } from "@/lib/contacts";
import { site, whatsappHref } from "@/lib/site";

export const metadata = { title: "Kontakt", alternates: { canonical: "/kontakt" } };

export default function KontaktPage() {
  const wa = whatsappHref();
  const contact = contacts.find((c) => c.name === "Sissy Riegel") ?? contacts[0];
  return (
    <>
      <PageIntro eyebrow="Kontakt" title="Sprechen wir über Ihre Immobilie">
        Ob Verkauf, Bewertung oder Besichtigung — wir freuen uns auf Ihre
        Nachricht und melden uns in der Regel innerhalb eines Werktages.
      </PageIntro>
      <section className="py-20">
        <Container>
          <div className="mb-10 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
            <ContactForm />
            <AnsprechpartnerCard
              contact={contact}
              heading="Ich freue mich auf Ihre Anfrage"
              className="lg:sticky lg:top-24"
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-faint">
                <Icon name="phone" size={16} className="text-accent" />
                Telefon
              </div>
              <div className="mt-3 text-lg text-fg">
                {site.phone ? (
                  <a
                    href={`tel:+49${site.phone.replace(/\D/g, "").replace(/^0/, "")}`}
                    className="hover:text-accent"
                  >
                    {site.phone}
                  </a>
                ) : (
                  "wird in Kürze ergänzt"
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-faint">
                <Icon name="mail" size={16} className="text-accent" />
                E-Mail
              </div>
              <div className="mt-3 text-lg text-fg">
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
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-faint">
                <Icon name="whatsapp" size={16} className="text-accent" />
                WhatsApp
              </div>
              <div className="mt-3 text-lg text-fg">
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
          {/* Unsere Büros — echte Standortfotos */}
          <div className="mt-12">
            <h2 className="text-xl font-semibold">Unsere Büros</h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2">
              {site.locations.map((l, i) => (
                <div key={l.city} className="group overflow-hidden rounded-2xl border border-border bg-surface">
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <Image
                      src={i === 0 ? "/images/standorte/speyer.jpg" : "/images/standorte/ludwigshafen.jpg"}
                      alt={`Riegel Immobilien Büro ${l.city}`}
                      fill
                      sizes="(max-width: 640px) 100vw, 45vw"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/85 to-transparent p-4">
                      <div className="flex items-center gap-2 text-fg">
                        <Icon name="pin" size={16} className="text-accent" />
                        <span className="font-semibold">{l.city}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 p-5 text-sm">
                    <div className="text-muted">
                      {l.street}<br />
                      {l.zip} {l.city}
                    </div>
                    <a href={`tel:${l.phone.replace(/\s+/g, "")}`} className="press inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-fg transition-colors hover:border-accent hover:text-accent">
                      <Icon name="phone" size={14} /> {l.phone}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/termin"
              className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              Termin online vereinbaren
            </Link>
            <Link
              href="/rechner"
              className="rounded-full border border-border px-6 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
            >
              Immobilie bewerten
            </Link>
          </div>
          <p className="mt-8 text-sm text-faint">
            Direkte Übergabe der Anfragen an unser OnOffice-CRM folgt mit der
            Live-Anbindung.
          </p>
        </Container>
      </section>
    </>
  );
}
