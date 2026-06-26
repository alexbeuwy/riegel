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
          <FavoritesLink />
          <Link
            href="/rechner"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Icon name="calculator" size={17} />
            Immobilie bewerten
          </Link>
        </nav>

        {/* Mobile: Merkliste + Icon-Swap-Menü */}
        <div className="flex items-center gap-1 md:hidden">
          <FavoritesLink />
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}
