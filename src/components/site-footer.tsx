import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { ConsentSettingsLink } from "@/components/consent";
import { FooterSocials, type SocialItem } from "@/components/footer-socials";
import { GeoTeaser } from "@/components/geo-teaser";
import { site } from "@/lib/site";

const socialLinks = [
  { key: "instagram", href: site.socials.instagram, label: "Instagram" },
  { key: "facebook", href: site.socials.facebook, label: "Facebook" },
  { key: "youtube", href: site.socials.youtube, label: "YouTube" },
  { key: "linkedin", href: site.socials.linkedin, label: "LinkedIn" },
].filter((s) => Boolean(s.href)) as SocialItem[];

/** Footer-Link mit „underline grows from left"-Hover — high-end, ohne Layout-Shift. */
function FootLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative inline-block w-fit text-sm text-muted transition-colors duration-200 hover:text-fg"
    >
      {children}
      <span
        aria-hidden
        className="absolute -bottom-0.5 left-0 h-px w-0 bg-accent/70 transition-all duration-300 ease-out group-hover:w-full"
      />
    </Link>
  );
}

export function SiteFooter() {
  const year = 2026;
  return (
    <footer className="mt-auto bg-bg">
      <GeoTeaser />

      {/* Full-bleed, randlos — kein „hellgrauer Kasten", blendet edge-to-edge. */}
      <div className="relative border-t border-border/80">
        {/* Signatur-Hairline: feiner Akzent, zu den Rändern ausgeblendet */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"
        />
        {/* Dezenter Tiefen-Glow oben — gibt dem Footer Präsenz ohne Box */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-48"
          style={{ background: "radial-gradient(70% 120% at 50% 0%, rgba(1,92,255,0.10), transparent 72%)" }}
        />

        <Container className="relative grid gap-x-10 gap-y-12 py-16 sm:grid-cols-2 sm:py-20 lg:grid-cols-4">
          {/* Marke + Standorte */}
          <div className="space-y-6 sm:col-span-2 lg:col-span-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-riegel-short-mono.svg" alt={site.name} className="h-7 w-auto opacity-95" />
            <p className="max-w-xs text-sm leading-relaxed text-muted">{site.tagline}</p>
            <div className="space-y-5 text-sm">
              {site.locations.map((l) => (
                <div key={l.city} className="flex gap-3">
                  <span className="mt-0.5 text-accent">
                    <Icon name="pin" size={16} />
                  </span>
                  <div className="space-y-0.5">
                    <div className="font-medium text-fg">{l.city}</div>
                    <div className="text-faint">
                      {l.street}, {l.zip} {l.city}
                    </div>
                    <a
                      href={`tel:${l.phone.replace(/\s/g, "")}`}
                      className="inline-flex items-center gap-1.5 text-faint transition-colors hover:text-fg"
                    >
                      <Icon name="phone" size={13} />
                      {l.phone}
                    </a>
                  </div>
                </div>
              ))}
              <a
                href={`mailto:${site.email}`}
                className="inline-flex items-center gap-2.5 text-faint transition-colors hover:text-fg"
              >
                <span className="text-accent">
                  <Icon name="mail" size={16} />
                </span>
                {site.email}
              </a>
            </div>
          </div>

          {/* Navigation */}
          <nav aria-label="Footer-Navigation" className="flex flex-col gap-3.5">
            <div className="text-[0.65rem] uppercase tracking-[0.25em] text-faint">Navigation</div>
            {site.nav.map((item) => (
              <FootLink key={item.href} href={item.href}>
                {item.label}
              </FootLink>
            ))}
            {[
              { href: "/preisatlas", label: "Preisatlas" },
              { href: "/standorte", label: "Standorte" },
              { href: "/ratgeber", label: "Ratgeber" },
              { href: "/termin", label: "Termin" },
              { href: "/spiel", label: "Blitzverkauf (Spiel)" },
            ].map((item) => (
              <FootLink key={item.href} href={item.href}>
                {item.label}
              </FootLink>
            ))}
          </nav>

          {/* Rechtliches */}
          <nav aria-label="Rechtliches" className="flex flex-col gap-3.5">
            <div className="text-[0.65rem] uppercase tracking-[0.25em] text-faint">Rechtliches</div>
            {site.legalNav.map((item) => (
              <FootLink key={item.href} href={item.href}>
                {item.label}
              </FootLink>
            ))}
          </nav>

          {/* Folgen */}
          <div className="space-y-4">
            <div className="text-[0.65rem] uppercase tracking-[0.25em] text-faint">Folgen</div>
            <FooterSocials links={socialLinks} />
            <p className="max-w-[14rem] text-xs leading-relaxed text-muted">
              Einblicke, neue Objekte und Marktwissen aus der Metropolregion Rhein-Neckar.
            </p>
          </div>
        </Container>

        {/* Rechtshinweise (Sissy/T14): Haftung, KI-Transparenz (EU-KI-Verordnung),
            Barrierefreiheit, Urheberrecht. Formulierungen bewusst zurückhaltend,
            die finale anwaltliche Abstimmung übernimmt das RIEGEL-Team.
            Der Urheberrechtshinweis ist die Antwort auf die Kopierschutz-Frage
            (Manfred): technisch lässt sich Text im Web nicht schützen, ohne
            Google und Screenreader auszusperren — rechtlich schon. */}
        <div className="border-t border-border/60">
          <Container className="grid gap-4 py-6 text-[0.7rem] leading-relaxed text-faint md:grid-cols-2 lg:grid-cols-4">
            <p>
              <span className="font-medium text-muted">Hinweis:</span> Alle Inhalte dieser
              Website dienen der allgemeinen Information und stellen keine Rechts-, Steuer-
              oder Finanzberatung dar. Preisangaben, Marktdaten und Bewertungsergebnisse
              sind unverbindliche Orientierungswerte ohne Gewähr.
            </p>
            <p>
              <span className="font-medium text-muted">KI-Hinweis:</span> Einzelne Funktionen
              dieser Website, etwa der Online-Preisrechner und automatisch erstellte
              Wertreports, nutzen KI-gestützte Systeme. Deren Ergebnisse sind automatisiert
              erzeugte, unverbindliche Einschätzungen und ersetzen weder ein Gutachten noch
              eine persönliche Beratung (Transparenzhinweis nach der Verordnung (EU)
              2024/1689, KI-Verordnung).
            </p>
            <p>
              <span className="font-medium text-muted">Barrierefreiheit:</span> Wir arbeiten
              fortlaufend daran, diese Website möglichst barrierearm zu gestalten. Wenn Sie
              auf Barrieren stoßen, freuen wir uns über einen Hinweis an{" "}
              <a href={`mailto:${site.email}`} className="underline decoration-border underline-offset-2 transition-colors hover:text-fg">
                {site.email}
              </a>
              .
            </p>
            <p>
              <span className="font-medium text-muted">Urheberrecht:</span> Alle Texte, Fotos,
              Grundrisse, Marktdaten und Objektbeschreibungen dieser Website sind
              urheberrechtlich geschützt. Eine Übernahme, Vervielfältigung oder
              Weiterverwendung – auch in Auszügen und auch durch automatisierte
              Auswertung – ist ohne unsere vorherige schriftliche Zustimmung nicht
              gestattet. Objektfotos dürfen ausschließlich im Rahmen der
              Vermarktung durch {site.legalName} verwendet werden.
            </p>
          </Container>
        </div>

        {/* Schlussleiste */}
        <div className="border-t border-border/60">
          <Container className="flex flex-col items-center justify-between gap-3 py-6 text-xs text-faint sm:flex-row">
            <span>
              © {year} {site.legalName}. Alle Rechte vorbehalten.
            </span>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="hidden text-faint sm:inline">Speyer · Ludwigshafen · Rhein-Neckar</span>
              {/* Widerruf der Cookie-/Karten-Einwilligung muss dauerhaft
                  erreichbar sein (Art. 7 Abs. 3 DSGVO) — öffnet denselben
                  Dialog wie „Einstellungen" im Einwilligungsbanner. */}
              <ConsentSettingsLink className="transition-colors hover:text-fg" />
              <Link href="/widerruf" className="transition-colors hover:text-fg">
                Widerrufsbelehrung
              </Link>
              {/* Agentur-Credit (Vorgabe: wie saadi-ag.vercel.app) — externes
                  SVG-Logo bewusst als <img>, next/image optimiert kein SVG. */}
              <a
                href="https://beuwy.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 opacity-70 transition-opacity hover:opacity-100"
              >
                Brand and website made by
                {/* eslint-disable-next-line @next/next/no-img-element -- externes SVG-Logo, keine Optimierung nötig */}
                <img
                  src="https://beuwy.b-cdn.net/wp-content/uploads/2025/11/beuwy_logo_2026_final_hell.svg"
                  alt="beuwy"
                  className="h-3.5 w-auto"
                />
              </a>
            </div>
          </Container>
        </div>
      </div>
    </footer>
  );
}
