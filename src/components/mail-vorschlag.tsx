"use client";

import { istEmail, mailTippfehler } from "@/lib/validierung";

/**
 * Korrektur-Vorschlag unter einem E-Mail-Feld: „Meinten Sie max@gmail.com?"
 *
 * WARUM: Eine vertippte Domain (`gmial.com`, `gmail.con`) ist syntaktisch
 * einwandfrei — keine Prüfung der Welt weist sie ab. Der Eigentümer wartet
 * dann auf einen Report, der nie ankommt, und meldet sich nicht noch einmal.
 * Das ist der teuerste stille Fehler im ganzen Funnel.
 *
 * Blockiert bewusst NICHTS: ein Vorschlag zum Antippen, mehr nicht. Wer
 * wirklich `max@gmial.com` hat, tippt einfach weiter.
 *
 * Erscheint erst, wenn die Adresse syntaktisch vollständig ist — sonst würde
 * schon beim dritten Buchstaben ein Vorschlag aufblitzen.
 */
export function MailVorschlag({
  email,
  onUebernehmen,
  className = "",
}: {
  email: string;
  onUebernehmen: (neu: string) => void;
  className?: string;
}) {
  const adresse = email.trim().toLowerCase();
  if (!istEmail(adresse)) return null;
  const vorschlag = mailTippfehler(adresse);
  if (!vorschlag) return null;
  return (
    <button
      type="button"
      onClick={() => onUebernehmen(vorschlag)}
      className={`mt-1.5 text-left text-xs text-accent hover:underline ${className}`}
    >
      Meinten Sie <strong>{vorschlag}</strong>?
    </button>
  );
}
