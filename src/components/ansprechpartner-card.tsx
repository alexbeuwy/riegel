import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { whatsappHref } from "@/lib/site";
import type { Contact } from "@/lib/contacts";

/**
 * Ansprechpartner-Block (Avatar + Name + Rolle + Trust-Wording + Kontaktwege).
 * „Gewohntes" Portal-Muster wie bei den großen Anbietern → schafft Vertrauen.
 */
export function AnsprechpartnerCard({
  contact,
  context,
  heading = "Ihr persönlicher Ansprechpartner",
  className = "",
}: {
  contact: Contact;
  /** z. B. Objekttitel — fließt in die WhatsApp-Nachricht ein. */
  context?: string;
  heading?: string;
  className?: string;
}) {
  const wa = whatsappHref(
    context
      ? `Hallo Riegel Immobilien, ich interessiere mich für: ${context}`
      : "Hallo Riegel Immobilien, ich habe eine Anfrage.",
  );
  const telHref = `tel:${contact.phone.replace(/\s+/g, "")}`;

  return (
    <div className={`rounded-2xl border border-border bg-surface p-6 ${className}`}>
      <div className="text-xs uppercase tracking-widest text-faint">{heading}</div>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative shrink-0">
          <Image
            src={contact.image}
            alt={contact.name}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-accent/30"
          />
          {/* „Erreichbar"-Indikator für Lebendigkeit */}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface bg-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-on-accent" />
          </span>
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-fg">{contact.name}</div>
          <div className="truncate text-sm text-muted">{contact.role}</div>
          <div className="mt-0.5 text-sm text-accent">{contact.greeting}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-2.5">
        <a
          href={telHref}
          className="press inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
        >
          <Icon name="phone" size={16} />
          {contact.phone}
        </a>
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/termin"
            className="press inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
          >
            <Icon name="calendar" size={15} />
            Termin
          </Link>
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
            >
              <Icon name="whatsapp" size={15} />
              WhatsApp
            </a>
          ) : (
            <a
              href={`mailto:${contact.email}`}
              className="press inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
            >
              <Icon name="mail" size={15} />
              E-Mail
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
