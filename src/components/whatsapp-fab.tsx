import { site, whatsappHref } from "@/lib/site";
import { WhatsappIcon } from "@/components/social-icons";

/**
 * Floating WhatsApp-Button (Click-to-Chat, Wunsch #7).
 * Rendert nur, wenn eine Nummer konfiguriert ist. Reiner Link (kein externes
 * Widget) → kein Consent-Gate nötig, da erst beim Klick zu WhatsApp gewechselt wird.
 */
export function WhatsappFab() {
  const href = whatsappHref(
    `Hallo ${site.name}, ich interessiere mich für eine Immobilie.`,
  );
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Per WhatsApp Kontakt aufnehmen"
      className="press fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-on-accent shadow-lg transition-colors hover:bg-accent-hover"
    >
      <WhatsappIcon width={26} height={26} />
    </a>
  );
}
