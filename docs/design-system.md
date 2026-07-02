# Design-System – riegel-immobilien.de (Ist-Stand)

Premium, dark, „edel". Luxus = **Disziplin + Handwerk**, nicht Dekoration: Near-Black-Basis, **eine**
Akzentfarbe (**RIEGEL-Blau `#015CFF`**, D17), AKIRA-Display-Headlines + ruhige Grotesk (Inter),
großzügiger Whitespace, echte RIEGEL-Fotografie, langsame, subtile Scroll-Reveals.
Tokens leben in Tailwind v4 `@theme` in `src/app/globals.css`.
Querverweise: [architecture.md](./architecture.md) · [legal-checklist.md](./legal-checklist.md) (BFSG/WCAG) · [RELAUNCH-LOG.md](../RELAUNCH-LOG.md)

---

## 1. Referenzen (was „high-end" liest)

SHVO (zeitloses Monochrom), Williams & Williams, Louise Phillips Forbes (editorial Type + verzögerte Reveals), Millennium Tower, Randy Baruh, Awwwards: Zorge 9 / AIR (Vide Infra), Vaulk, MERSI, ARETÈ Immobiliare.
**Wiederkehrende Premium-Signale:** (1) zurückhaltende Near-Monochrom-Palette mit **max. einem** Akzent; (2) oversized Display-Typo als Gestaltungselement; (3) extremer Whitespace + strenges Grid; (4) Vollbild-Fotografie als Kunst (kein Stock); (5) langsame Scroll-Reveals; (6) Micro-Interactions statt Effekt-Feuerwerk.

---

## 2. Farb-Tokens (real, aus `globals.css` `@theme`)

| Token | Hex | Verwendung |
|---|---|---|
| `--color-bg` | `#0B0B0D` | Basis (Near-Black, **nicht** `#000` → Halation) |
| `--color-surface` | `#141417` | Cards |
| `--color-surface-2` | `#1C1C21` | Raised |
| `--color-border` | `#2A2A30` | dekorative Trennlinie (bewusst sub-3:1, nicht-essentiell) |
| `--color-fg` | `#F4F3F0` | Primärtext (warmes Off-White) — **17,7:1** ✅ |
| `--color-muted` | `#A8A6A0` | Sekundärtext — **8,1:1** ✅ |
| `--color-faint` | `#7C7A75` | Caption — **4,6:1** ✅ (AA Body) |
| `--color-accent` | `#015CFF` | **RIEGEL-Blau** (Marken-Akzent): CTAs, Links, Pins, Active |
| `--color-accent-hover` | `#357DFF` | Hover |
| `--color-accent-strong` | `#6AA1FF` | hellere Tönung: Focus-Ring + Akzent-**Text** auf Dark |
| `--color-on-accent` | `#FFFFFF` | Text auf Blau-Button (**5,3:1** ✅) |

**RIEGEL-Blau ist die EINZIGE Akzentfarbe** (kein Gold — die frühere Champagner-Gold-Idee
`#C9A227` ist mit der Logo-/Brand-Entscheidung obsolet). Wichtig auf Dark: `#015CFF` selbst hat
zu wenig Kontrast für Text → für Akzent-Text/Focus immer `--color-accent-strong` verwenden;
Voll-Blau nur als Fläche (Button) mit weißem Text.

---

## 3. Typografie (real, vollständig self-hosted, DSGVO-clean)

Geladen via `next/font/local` in `src/fonts/index.ts` — **kein externer Font-Request, kein
Adobe-Typekit-Embed** (der frühere Neuzeit-Grotesk-Plan über Adobe Fonts ist verworfen).

- **Inter** (variabel, 100–900, SIL OFL): Body + UI. `--font-sans` / `--font-inter`, `display:swap`.
- **AKIRA Expanded Super Bold** (lizenziert von Alex): große Headlines, **nur sparsam** — Klasse `.akira`
  (uppercase, `line-height: 0.95`).
- **AKIRA Expanded Outline**: Stil-Gimmick für vereinzelte Headlines — Klasse `.akira-outline`.

Regeln: Display-Scale per `clamp()`, Body `line-height: 1.6`, `h1–h3` mit `-0.015em` Tracking und
`text-wrap: balance`. Keine Serif im System.

---

## 4. Spacing / Radius (real)

- **Spacing:** 4px-Basis; `--spacing-section: 7rem` als Section-Rhythmus.
- **Radius (zurückhaltend):** `--radius-sm` 4px, `--radius-md` 8px, `--radius-lg` 12px; Pills nur
  gezielt (Buttons, Karten-Pins).
- 1px-Border-Keylines (`--color-border`, akzentuiert Blau) statt schwerer Boxen.

---

## 5. Front-end Component-Stack (real)

- **Next.js 16 App Router + TS + Tailwind v4** (CSS-first `@theme`, kein `tailwind.config.ts`).
  **Kein shadcn/ui** — eigene Komponenten in `src/components/` (Modal, Segmented, Bento, PortalCard,
  TiltCard, Reveal, …).
- **Motion per CSS**: transitions-dev-Tokens + Snippets in `globals.css` (Dropdown, Modal, Icon-Swap,
  Tilt, Tooltip, Success-Check, Shake, Badge, Tabs, Collapse, `.press`), alle mit
  `prefers-reduced-motion`-Guard. **Keine Motion/Framer-Motion-Dependency.**
- **Eigenes Icon-System** (`src/components/icon.tsx`, Inline-SVG) — keine Icon-Library.
- **next/image** AVIF→WebP, responsive `sizes`, `priority` am LCP-Hero; Assets via BunnyCDN.
- **MapLibre GL** (dark) für Portal-Karte + GEO-Explorer, client-only + Consent-Gate.

---

## 6. Barrierefreiheit auf Dark (in Tokens/Components verankert)

1. **Nie** pures `#000`/`#fff` als Fläche/Text-Paar (Halation).
2. **Focus-Ring nicht nur über Farbe:** 2px Outline in `--color-accent-strong` (`#6AA1FF`) + 2px
   Offset, global via `:focus-visible` (WCAG 2.2 SC 1.4.11 + 2.4.13).
3. **Motion no-motion-first:** globaler `prefers-reduced-motion: reduce`-Kill-Switch in
   `globals.css`; Animationen nur unter `no-preference` (WCAG 2.3.3).
4. Text ≥4,5:1, UI ≥3:1 — Akzent-Text deshalb `accent-strong`, nie `#015CFF` direkt auf `bg`.
5. Hit-Targets ≥24px; `aria-pressed`/Labels auf Toggles (z. B. Reels-Mute, Favoriten).

---

## 7. Fotografie (der größte Hebel für „edel")

Echte RIEGEL-Assets sind im Einsatz (Team-/Beratungsfotos, Objekt-Reels als MP4) — gehostet auf
BunnyCDN (`riegel.b-cdn.net`) bzw. `riegel.b-cdn.net/` (siehe [bunny-cdn.md](./bunny-cdn.md) ·
[foto-assets.md](./foto-assets.md)). Für Listings gilt weiter: professionelle, einheitlich
farbkorrigierte Objektfotografie ist harte Abhängigkeit (Wunsch #3, Blocker B6).

---

## 8. Design-Entscheidungen — Stand

- ✅ **Akzent = RIEGEL-Blau `#015CFF`** (aus Logo/Brand abgeleitet; Gold verworfen).
- ✅ **Dark-first, kein Light-Theme** (D17): `color-scheme: dark`, `theme-color #0b0b0d`.
- ✅ **Type-System: AKIRA (Headlines, sparsam) + Inter (Body)**, beide self-hosted (D15,
  aktualisiert: Adobe/Neuzeit-Grotesk-Embed entfernt → DSGVO-clean).
- ✅ Logo als optimiertes SVG (weiß) im Einsatz; Wave-Motiv als Deko-Element.
- Offen: optionaler A11y-Light-Toggle (bewusst zurückgestellt).

---

## Quellen
- Luxury RE Design: <https://www.agentimage.com/blog/best-luxury-real-estate-website-design/> · <https://mediaboom.com/news/luxury-real-estate-website-design/> · Awwwards: <https://www.awwwards.com/websites/real-estate/>
- Inclusive Dark Mode: <https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/> · WCAG 2.2 AA Kontrast: <https://www.makethingsaccessible.com/guides/contrast-requirements-for-wcag-2-2-level-aa/>
- prefers-reduced-motion: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion> · SC 2.3.3: <https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html>
- Tailwind v4 Theme: <https://tailwindcss.com/docs/theme> · next/font: <https://nextjs.org/docs/app/api-reference/components/font> · next/image: <https://nextjs.org/docs/app/api-reference/components/image>
