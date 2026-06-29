import Link from "next/link";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";
import { FooterSocials, type SocialItem } from "@/components/footer-socials";
import { site } from "@/lib/site";

const socialLinks = [
  { key: "instagram", href: site.socials.instagram, label: "Instagram" },
  { key: "facebook", href: site.socials.facebook, label: "Facebook" },
  { key: "youtube", href: site.socials.youtube, label: "YouTube" },
  { key: "linkedin", href: site.socials.linkedin, label: "LinkedIn" },
].filter((s) => Boolean(s.href)) as SocialItem[];

export function SiteFooter() {
  const year = 2026;
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <Container className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-riegel-short-mono.svg"
            alt={site.name}
            className="h-6 w-auto opacity-90"
          />
          <p className="max-w-xs text-sm text-muted">{site.tagline}</p>
          <div className="space-y-4 text-sm text-faint">
            {site.locations.map((l) => (
              <div key={l.city} className="flex gap-2.5">
                <span className="mt-0.5 text-accent">
                  <Icon name="pin" size={16} />
                </span>
                <div>
                  <div className="text-muted">{l.city}</div>
                  <div>
                    {l.street}, {l.zip} {l.city}
                  </div>
                  <a
                    href={`tel:${l.phone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-1.5 hover:text-fg"
                  >
                    <Icon name="phone" size={14} />
                    {l.phone}
                  </a>
                </div>
              </div>
            ))}
            <a
              href={`mailto:${site.email}`}
              className="flex items-center gap-2.5 hover:text-fg"
            >
              <span className="text-accent">
                <Icon name="mail" size={16} />
              </span>
              {site.email}
            </a>
          </div>
        </div>

        <nav aria-label="Footer-Navigation" className="space-y-3">
          <div className="text-xs uppercase tracking-widest text-faint">Navigation</div>
          {site.nav.map((item) => (
            <Link key={item.href} href={item.href} className="block text-sm text-muted hover:text-fg">
              {item.label}
            </Link>
          ))}
          {[
            { href: "/standorte", label: "Standorte" },
            { href: "/ratgeber", label: "Ratgeber" },
            { href: "/termin", label: "Termin" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="block text-sm text-muted hover:text-fg">
              {item.label}
            </Link>
          ))}
        </nav>

        <nav aria-label="Rechtliches" className="space-y-3">
          <div className="text-xs uppercase tracking-widest text-faint">Rechtliches</div>
          {site.legalNav.map((item) => (
            <Link key={item.href} href={item.href} className="block text-sm text-muted hover:text-fg">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="space-y-4">
          <div className="text-xs uppercase tracking-widest text-faint">Folgen</div>
          <FooterSocials links={socialLinks} />
        </div>
      </Container>

      <div className="border-t border-border">
        <Container className="flex flex-col items-center justify-between gap-2 py-6 text-xs text-faint sm:flex-row">
          <span>© {year} {site.legalName}. Alle Rechte vorbehalten.</span>
          <Link href="/widerruf" className="hover:text-fg">
            Widerrufsbelehrung
          </Link>
        </Container>
      </div>
    </footer>
  );
}
