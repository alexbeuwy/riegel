"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/modal";
import { InquiryForm } from "@/components/inquiry-form";
import { site, whatsappHref } from "@/lib/site";

export function RequestViewingButton({ title, objektId }: { title: string; objektId?: string }) {
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
        <div className="mt-4">
          <InquiryForm objektTitel={title} objektId={objektId ?? ""} />
        </div>
        <div className="mt-5 flex flex-col gap-3 border-t border-border pt-5">
          <p className="text-xs text-faint">Oder direkt:</p>
          <Link
            href={`/termin?objekt=${encodeURIComponent(title)}`}
            onClick={() => setOpen(false)}
            className="rounded-full border border-border px-5 py-2.5 text-center text-sm text-fg transition-colors hover:border-accent hover:text-accent"
          >
            Termin online buchen
          </Link>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-border px-5 py-2.5 text-center text-sm text-fg transition-colors hover:border-accent hover:text-accent"
            >
              Per WhatsApp anfragen
            </a>
          )}
          <Link
            href={`/kontakt?objekt=${encodeURIComponent(title)}`}
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
