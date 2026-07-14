# Feedback-Widget „Auf der Seite kommentieren"

Ein internes On-Page-Kommentar-Werkzeug: ein schwebender Button, mit dem eine
(auch nicht-technische) Person direkt auf der Live-Seite Kommentare an einzelne
Stellen hängen kann. Jeder Kommentar geht **best effort in eine Supabase-Tabelle
UND immer als gebrandete Mail** an ein Team-Postfach. Für normale Besucher ist
das Widget **komplett unsichtbar** (Gate über einen lokalen Flag).

Diese Doku beschreibt das Feature so, dass es sich **1:1 in ein anderes
Next.js-Projekt (App Router)** übertragen lässt.

---

## 1. Dateien & Rollen

| Datei | Rolle |
|---|---|
| `src/components/feedback-widget.tsx` | Client-Komponente: Button, „Stelle wählen"-Modus, Popover/Bottom-Sheet, POST. Kern des Features. |
| `src/app/api/feedback/route.ts` | POST-Route: Rate-Limit, Validierung, Supabase-Insert (best effort), Mail (immer). |
| `src/app/layout.tsx` | Hängt `<FeedbackWidget />` global ein (einmal, im Root-Layout). |
| `src/app/globals.css` | CSS-Abschnitt „Feedback-Widget" (`.feedback-picking`, `.t-feedback-pop`) + wiederverwendete Klassen. |
| `src/lib/email.ts` | `sendMail` (mit `cc`), `emailLayout`, `emailRows`, `emailTargets`. |
| `docs/supabase-schema.sql` | SQL der `feedback`-Tabelle. |

---

## 2. Datenfluss (Ende zu Ende)

1. **Gate:** Beim Mount liest das Widget `?feedback=1` / `?feedback=0` aus der URL
   und setzt/löscht `localStorage["riegel:feedback"]`. Ohne den Flag `"on"` rendert
   die Komponente `null` (kein Effekt, keine UI). Bewusst **kein** `useSearchParams`
   (der würde die Seite auf dynamisches Rendering zwingen) — es wird `window.location`
   einmalig gelesen, was für den Lesezeichen-Fall (echter Seitenaufruf) genügt.
2. **Aktiv:** schwebender Button unten rechts → „picking"-Modus: ein Capture-Klick-
   Listener auf `document` fängt den nächsten Klick (`preventDefault`), erfasst das
   getroffene Element und dessen Kontext (`area`: Tag + Text-Ausschnitt + grober
   CSS-Pfad + Klickposition in %). `Esc` = allgemeiner Kommentar ohne Stelle.
3. **Composing:** Desktop = Popover nahe der Klickstelle, Mobil (<640px) = Bottom-Sheet
   (`.t-sheet-*`). Textarea + Senden.
4. **POST** `/api/feedback` mit `{ comment, pageUrl, area? }`.
5. **Route:** Rate-Limit (30/h/IP) → Validierung → Supabase-Insert (best effort) →
   `sendMail` an `FEEDBACK_TO` mit `FEEDBACK_CC` im CC, gebrandete Mail mit Link
   „Seite öffnen" (absolute URL aus `emailTargets.ASSET_BASE + pageUrl`).
6. Antwort immer `{ ok: true, logged, delivered }` — **nie 500** wegen fehlender
   Infra. Widget zeigt Erfolgstoast; mehrfach nacheinander kommentieren möglich.

---

## 3. Abhängigkeiten & was beim Portieren zu tun ist

### `feedback-widget.tsx`
| Import / Nutzung | Beim Portieren |
|---|---|
| `@/components/icon` (`Icon`, Namen `doc`, `check`, `close`) | Durch eigenes Icon-Set ersetzen (Phosphor/Lucide/…). |
| `@/components/consent` (`useConsent().decided`) | **Optional.** Verhindert nur, dass der Button hinter einem noch offenen Cookie-Banner liegt. Ohne Consent-Banner: Zeile entfernen, Button immer zeigen wenn `enabled`. |
| Tailwind-Utilities mit Design-Tokens: `bg-accent`, `text-on-accent`, `bg-surface`, `bg-surface-2`, `text-fg`, `text-muted`, `text-faint`, `border-border`, `border-accent`, `text-accent`, `hover:bg-accent-hover` | Diese Klassen setzen die CSS-Variablen aus §5 voraus. Tokens im Zielprojekt anlegen **oder** die Klassen auf die dortigen Farb-Utilities umschreiben. |
| CSS-Klassen `.press`, `.t-input-wrap`/`.t-input`/`.t-error-msg`, `.t-sheet-backdrop`/`.t-sheet-panel` | Mitnehmen oder durch Äquivalente ersetzen (siehe §5). `.press` = Tap-Feedback; `.t-sheet-*` = mobiles Bottom-Sheet; `.t-input*` = Textarea-/Fehler-Styling. |
| `.feedback-picking`, `.t-feedback-pop`, `--ease-smooth-out` | **Immer mitnehmen** (§5). Feature-spezifisch. |

### `api/feedback/route.ts`
| Import | Beim Portieren |
|---|---|
| `@/lib/email` → `sendMail`, `emailLayout`, `emailRows`, `emailTargets` | Eigener Mail-Helfer. Minimal-Vertrag: `sendMail({ to, cc?, subject, html })`. `emailLayout/emailRows` nur für die Optik — notfalls simples HTML. `emailTargets.ASSET_BASE` = erreichbare Basis-URL für den Link in der Mail. |
| `@/lib/supabase-server` → `supabaseServer` (Service-Role-Client) | **Optional.** Fehlt er (`null`), wird nur gemailt. Für Persistenz: Service-Role-Client bereitstellen. |
| `@/lib/rate-limit` → `clientIp`, `rateLimit` | Eigener Rate-Limiter oder simpel inline. |

---

## 4. Env-Variablen

| Variable | Zweck | Pflicht? |
|---|---|---|
| `RESEND_API_KEY` | Mailversand (Resend). Ohne → Mail wird sauber übersprungen. | für Mail |
| `EMAIL_FROM` | Absender, z. B. `RIEGEL Immobilien <mail@…>` | empfohlen |
| `EMAIL_ASSET_BASE` | Erreichbare Basis-URL für Links/Logo in der Mail (Default im Code: die Vercel-URL) | empfohlen |
| `FEEDBACK_TO` | Empfänger der Kommentar-Mails (Default im Code gesetzt) | optional |
| `FEEDBACK_CC` | CC der Kommentar-Mails (Default im Code gesetzt) | optional |
| `SUPABASE_SERVICE_ROLE_KEY` | Persistenz-Insert (server-seitig) | für DB |
| `NEXT_PUBLIC_SUPABASE_URL` / `…ANON_KEY` | Supabase-Client-Basis | für DB |

---

## 5. CSS (mitnehmen)

**Feature-spezifisch — immer kopieren** (aus `globals.css`, braucht `--ease-smooth-out`):

```css
:root { --feedback-pop-open-dur: 200ms; --feedback-pop-close-dur: 150ms; }
.feedback-picking, .feedback-picking * { cursor: crosshair !important; }
.feedback-picking [data-feedback-ui], .feedback-picking [data-feedback-ui] * { cursor: default !important; }
.feedback-picking [data-feedback-ui] button { cursor: pointer !important; }
.t-feedback-pop {
  opacity: 0; transform: scale(0.96) translateY(4px);
  transition: opacity var(--feedback-pop-close-dur) var(--ease-smooth-out),
              transform var(--feedback-pop-close-dur) var(--ease-smooth-out);
  will-change: transform, opacity;
}
.t-feedback-pop.is-open {
  opacity: 1; transform: none;
  transition-duration: var(--feedback-pop-open-dur);
}
@media (prefers-reduced-motion: reduce) { .t-feedback-pop { transition: none; } }
```

**Wiederverwendet** (im RIEGEL-Projekt vorhanden — im Zielprojekt kopieren oder ersetzen):
`.press` (Tap-Feedback), `.t-sheet-backdrop`/`.t-sheet-panel` (mobiles Bottom-Sheet),
`.t-input-wrap`/`.t-input`/`.t-error-msg` (Textarea + Fehlerzeile).

**Design-Tokens** (im `:root` des Zielprojekts erwartet — Werte anpassen):
`--color-bg`, `--color-surface`, `--color-surface-2`, `--color-border`, `--color-fg`,
`--color-muted`, `--color-faint`, `--color-accent`, `--color-accent-hover`,
`--color-accent-strong`, `--color-on-accent`.

---

## 6. Supabase-Tabelle

```sql
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  page_url text,
  comment text not null,
  area text,
  user_agent text
);
alter table public.feedback enable row level security;
-- Bewusst OHNE public-Policy: der Insert läuft ausschließlich über den
-- service_role-Client der API-Route (RLS blockt anon/authenticated).
```

---

## 7. Aktivierung (Gate)

- **Einschalten:** einmal `https://DEINE-DOMAIN/?feedback=1` öffnen (echter Seitenaufruf,
  z. B. als Lesezeichen) → Flag in `localStorage`, Button danach auf jeder Seite.
- **Ausschalten:** `?feedback=0` oder „Feedback ausblenden" im Widget.
- Der Flag-Key ist `riegel:feedback` (in `feedback-widget.tsx`, Konstante `STORAGE_KEY`).

> Sicherheit: Das Gate ist **client-seitig** (Flag + geheimer Query-Param), keine echte
> Auth. Für internes Feedback ausreichend; die Route ist zusätzlich rate-limitiert und
> validiert. Wer stärkeres Gating will, ersetzt das Flag durch einen echten Admin-Login-Check.

---

## 8. 1:1-Migration — Checkliste

1. `feedback-widget.tsx` und `api/feedback/route.ts` ins Zielprojekt kopieren.
2. Imports anpassen: Icon-Set, (optional) Consent-Hook entfernen, Mail-Helfer,
   Supabase-Server-Client, Rate-Limiter (§3).
3. CSS aus §5 in die globale Stylesheet übernehmen; fehlende Design-Tokens im `:root`
   ergänzen oder Klassen umschreiben.
4. `<FeedbackWidget />` **einmal** im Root-Layout einhängen.
5. Env-Variablen setzen (§4); `FEEDBACK_TO`/`FEEDBACK_CC` auf die gewünschten Adressen
   (im Code als Default hinterlegt, per Env überschreibbar).
6. SQL aus §6 im Supabase-SQL-Editor ausführen (Mail geht auch ohne Tabelle).
7. `?feedback=1` öffnen, Test-Kommentar absenden, Mail + DB-Eintrag prüfen.

---

## 9. Anpassungspunkte

- **Empfänger:** `to`/`cc` in `route.ts` bzw. `FEEDBACK_TO`/`FEEDBACK_CC`.
- **Erfasste Felder:** `describeTarget()`/`cssPath()` im Widget (aktuell Tag + Text +
  CSS-Pfad + Position). Screenshot bewusst NICHT erfasst (Client-Screenshots sind
  schwer/schwergewichtig) — bei Bedarf via `getDisplayMedia` oder html2canvas nachrüsten.
- **Gating:** Flag-Mechanik in `feedback-widget.tsx` (Abschnitt „A) Sichtbarkeits-Gate").
- **Optik:** `.t-feedback-pop`, Button-Position (`fabPosition`), Popover-Breite (`w-[22rem]`).

---

## 10. Grenzen / Hinweise

- Gate = client-seitig (kein echter Schutz, aber unsichtbar für normale Besucher).
- Der Aktivierungs-Link braucht einen **echten Seitenaufruf** (kein `next/link`-Klick),
  weil der Flag nur beim Mount aus der URL gelesen wird — für den Lesezeichen-Fall genau richtig.
- Persistenz und Mail sind **entkoppelt**: fällt eines aus, geht der Kommentar über das
  andere trotzdem durch; die Route antwortet nie mit 500 wegen fehlender Infra.
