import Link from "next/link";
import { Container } from "@/components/container";
import { MobileMenu } from "@/components/mobile-menu";
import { FavoritesLink } from "@/components/favorites";
import { Icon } from "@/components/icon";
import { site } from "@/lib/site";

function Wordmark() {
  return (
    <Link href="/" className="flex items-center" aria-label={`${site.name} – Startseite`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-riegel-white.svg" alt={site.name} className="h-6 w-auto sm:h-7" />
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <Container className="flex h-20 items-center justify-between gap-6">
        <Wordmark />

        {/* Desktop-Navigation */}
        <nav className="hidden items-center gap-6 lg:gap-7 md:flex" aria-label="Hauptnavigation">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-sm tracking-wide text-muted transition-colors hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
          <FavoritesLink />
          <Link
            href="/konto"
            aria-label="Konto / Anmelden"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:text-fg"
          >
            <Icon name="users" size={20} />
          </Link>
          <Link
            href="/rechner"
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Icon name="calculator" size={17} />
            Immobilie bewerten
          </Link>
        </nav>

        {/* Mobile: Konto + Merkliste + Icon-Swap-Menü */}
        <div className="flex items-center gap-1 md:hidden">
          <Link
            href="/konto"
            aria-label="Konto / Anmelden"
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:text-fg"
          >
            <Icon name="users" size={20} />
          </Link>
          <FavoritesLink />
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}
