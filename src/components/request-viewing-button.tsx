"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/modal";
import { site, whatsappHref } from "@/lib/site";

export function RequestViewingButton({ title }: { title: string }) {
  const [open, setOpen] = useState(false);
  const wa = whatsappHref(
    `Hallo ${site.name}, ich interessiere mich für: ${title}`,
  );
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-full bg-accent px-6 py-3 text-center text-sm font-medium text-on-accent transition-[background-color,transform] duration-300 hover:bg-accent-hover active:scale-[0.98]"
      >
        Besichtigung anfragen
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Besichtigung anfragen">
        <p className="text-sm">
          Objekt: <span className="text-fg">{title}</span>
        </p>
        <p className="mt-3 text-sm">
          Hinterlassen Sie uns eine Nachricht — wir melden uns in der Regel
          innerhalb eines Werktages. Das vollständige Anfrageformular mit
          direkter Übergabe an OnOffice ist in Vorbereitung.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-accent px-5 py-2.5 text-center text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              Per WhatsApp anfragen
            </a>
          )}
          <Link
            href="/kontakt"
            onClick={() => setOpen(false)}
            className="rounded-full border border-border px-5 py-2.5 text-center text-sm text-fg transition-colors hover:border-accent hover:text-accent"
          >
            Zum Kontakt
          </Link>
        </div>
      </Modal>
    </>
  );
}
