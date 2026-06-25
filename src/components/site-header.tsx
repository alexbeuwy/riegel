import Link from "next/link";
import { Container } from "@/components/container";
import { MobileMenu } from "@/components/mobile-menu";
import { site } from "@/lib/site";

function Wordmark() {
  return (
    <Link href="/" className="group flex flex-col leading-none" aria-label={`${site.name} – Startseite`}>
      <span className="text-lg font-semibold tracking-[0.22em] text-fg transition-colors group-hover:text-accent">
        RIEGEL
      </span>
      <span className="text-[0.58rem] font-medium tracking-[0.42em] text-muted">
        IMMOBILIEN
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <Container className="flex h-20 items-center justify-between gap-6">
        <Wordmark />

        {/* Desktop-Navigation */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Hauptnavigation">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm tracking-wide text-muted transition-colors hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/rechner"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            Immobilie bewerten
          </Link>
        </nav>

        {/* Mobile-Navigation: Icon-Swap (Hamburger ↔ X) + Dropdown */}
        <MobileMenu />
      </Container>
    </header>
  );
}
