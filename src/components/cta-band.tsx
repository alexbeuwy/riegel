"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/container";
import { Icon } from "@/components/icon";

// Auf reinen Conversion-/Rechtsseiten würde der Band nur doppeln → ausblenden.
const HIDE_ON = ["/rechner", "/termin", "/kontakt", "/merkliste", "/impressum", "/datenschutz", "/widerruf"];

/**
 * Sitewide Pre-Footer-CTA — kräftiger Abschluss mit Waves-Motiv & RIEGEL-Blau.
 * Bewusst dezent gehalten (Akzent-Tönung statt Vollflächen-Blau), damit es
 * auf jeder Seite funktioniert.
 */
export function CtaBand() {
  const pathname = usePathname();
  if (HIDE_ON.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

  return (
    <section className="relative overflow-hidden border-t border-border bg-surface">
      {/* Akzent-Glow + Waves */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/2 h-[28rem] w-[28rem] -translate-y-1/2 rounded-full bg-accent/10 blur-3xl"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/wave-2.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 bottom-0 hidden h-[120%] w-auto opacity-[0.12] mix-blend-screen lg:block"
      />
      <Container className="relative py-20 sm:py-28">
        <div className="max-w-2xl">
          <span className="inline-block rounded-full border border-border px-3 py-1 text-[0.65rem] uppercase tracking-[0.25em] text-muted">
            Nächster Schritt
          </span>
          <h2 className="mt-6 akira text-3xl leading-[0.95] sm:text-5xl">
            Bereit, Ihre Immobilie
            <br />
            <span className="text-accent">in beste Hände</span> zu geben?
          </h2>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Ob Sofort-Bewertung, persönliche Beratung oder ein erster
            unverbindlicher Austausch — wir sind für Sie da.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/rechner"
              className="group inline-flex items-center gap-2.5 rounded-full bg-accent px-6 py-3 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              <Icon name="calculator" size={18} />
              Immobilie bewerten
              <Icon
                name="arrowRight"
                size={18}
                className="transition-transform duration-300 group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/termin"
              className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
            >
              <Icon name="calendar" size={18} />
              Termin vereinbaren
            </Link>
            <Link
              href="/kontakt"
              className="inline-flex items-center gap-2 rounded-full px-2 py-3 text-sm text-muted transition-colors hover:text-fg"
            >
              <Icon name="mail" size={18} />
              Kontakt aufnehmen
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
