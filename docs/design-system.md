# Design-System – riegel-immobilien.de

Premium, dark, „edel". Luxus = **Disziplin + Handwerk**, nicht Dekoration: Near-Black-Basis, **eine**
Akzentfarbe (Champagner-Gold), editorial Display-Serif + ruhiger Grotesque, großzügiger Whitespace,
cinematische Vollbild-Fotografie, langsame, subtile Scroll-Reveals.
Querverweise: [architecture.md](./architecture.md) · [legal-checklist.md](./legal-checklist.md) (BFSG/WCAG) · [RELAUNCH-LOG.md](../RELAUNCH-LOG.md)

---

## 1. Referenzen (was „high-end" liest)

SHVO (zeitloses Monochrom), Williams & Williams (Schwarz + Gold), Louise Phillips Forbes (editorial Type + verzögerte Reveals), Millennium Tower, Randy Baruh (Vollbild-Listing-Carousel), Awwwards: Zorge 9 / AIR (Vide Infra), Vaulk, MERSI, ARETÈ Immobiliare.
**Wiederkehrende Premium-Signale:** (1) zurückhaltende Near-Monochrom-Palette mit **max. einem** Metallic-Akzent; (2) oversized editorial Display-Serif als Gestaltungselement; (3) extremer Whitespace + strenges Spalten-Grid; (4) Vollbild, farbkorrigierte Fotografie als Kunst (kein Stock); (5) langsame Scroll-Reveals + Sticky-Nav, die zur Suchleiste morpht; (6) Micro-Interactions statt Effekt-Feuerwerk.

---

## 2. Farb-Tokens (Dark, WCAG-AA verifiziert)

Direkt in Tailwind v4 `@theme` in `globals.css`. Ratios gegen `--color-bg` berechnet.

| Token | Hex | Verwendung | Kontrast |
|---|---|---|---|
| `--color-bg` | `#0B0B0D` | Basis (Near-Black, **nicht** `#000` → Halation) | — |
| `--color-surface` | `#141417` | Cards | — |
| `--color-surface-2` | `#1C1C21` | Raised | — |
| `--color-border` | `#2A2A30` | dekorative Trennlinie | 1,38:1 (bewusst sub-3:1, nicht-essentiell – erlaubt) |
| `--color-text` | `#F4F3F0` | Primärtext (warmes Off-White, nicht `#fff`) | **17,7:1** ✅ |
| `--color-muted` | `#A8A6A0` | Sekundärtext | **8,1:1** ✅ |
| `--color-faint` | `#7C7A75` | Caption | **4,6:1** ✅ (AA Body) |
| `--color-accent` | `#C9A227` | Champagner-Gold: Links, CTAs, Keylines, Active | **8,1:1** ✅ |
| `--color-accent-hover` | `#D9BE6A` | Hover | ✅ |
| `--color-accent-strong` | `#E6D08A` | Display/Focus-Ring | ✅ |
| `--color-on-accent` | `#0B0B0D` | Text auf Gold-Button | **8,1:1** ✅ |

**Gold ist die EINZIGE Akzentfarbe.** Kein zweiter Akzent. Jedes Theme separat testen (gleicher Hue kann auf Weiß bestehen, auf Dark fallen).

---

## 3. Typografie (Marke zuerst, DSGVO-clean self-hostbar)

**Primär-Schrift = `Neuzeit Grotesk`** — die bestehende Markenschrift der Live-Seite („das Besondere", lt. Alex behalten). Aktuell via Adobe Fonts / Typekit-Kit `atg2aop` (4 Schnitte) eingebunden. Geometrische Grotesk; trägt Wordmark, Body und UI.

**Hosting-Entscheidung (Lizenz-relevant!):**
- **Adobe Fonts beibehalten:** schnellster Weg, aber externer Embed → DSGVO-Consent nötig (CMP) + Adobe-ToS verbietet Self-Hosting. Schlechter für CWV/Privacy.
- **Empfohlen — Webfont-Lizenz kaufen** (Neuzeit Grotesk bei Monotype/MyFonts) → **self-hosted via `next/font/local`**, kein externer Call, DSGVO-clean, schnellstes LCP. Einmal-/Lizenzkosten klären.
- **Dev-Platzhalter bis Lizenz da:** freie geometrische Grotesk (z. B. Space Grotesk / Archivo, SIL OFL, self-hosted) — klar als Platzhalter markiert, **kein** Adobe-Embed im Repo.

**Optionale Display-Serif (Designvorschlag, Entscheidung offen):** Für den „edel/editorial"-Look kann eine high-contrast Display-Serif (**Fraunces**, variabel `opsz`/`wght`, SIL OFL, self-hostbar via `@fontsource-variable`) NUR für große Headlines/Hero ergänzt werden — Neuzeit Grotesk bleibt dann Body/UI. Sissy/Alex entscheiden: **reine Grotesk** (puristisch, markentreu) vs. **Grotesk + Serif-Display** (luxuriös-editorial).

- **Subset** latin + latin-ext (ä ö ü ß), nur benötigte Weights, Hero-Weight preloaden.
- Display-Scale: `clamp()` ~2,5rem → ~6rem im Hero, enges Tracking; Body 1.6 line-height.
- Serif (falls genutzt) **nie** unter ~20px (Umlaut-Lesbarkeit bei hohem Kontrast).

---

## 4. Spacing / Radius

- **Spacing-Scale (4px-Basis):** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128. Section-Padding 96–128px Desktop.
- **Radius (zurückhaltend, eher eckig = Luxus):** `--radius-sm` 4px, `--radius-md` 8px, `--radius-lg` 12px. Kein „Pill-everything".
- 1px-Gold/Border-Keylines statt schwerer Boxen.

---

## 5. Front-end Component-Stack

- **Next.js 16 App Router + TS + Tailwind v4** (CSS-first, kein `tailwind.config.ts`) + **shadcn/ui** (auf Tokens oben gethemed; `tailwindcss-animate` ist in v4 deprecated → v4-kompatible Animation-Utilities).
- **Motion** (`motion/react`, `motion/react-client` an RSC-Grenzen) für Scroll-Reveals + Sticky-Nav→Searchbar-Morph. Client-Components klein halten, Listing-Grids server-seitig (SEO/CWV).
- **next/image** AVIF→WebP, responsive `sizes`, `priority` + Blur-Placeholder am Hero.
- **Lucide** (UI) + **simple-icons** (WhatsApp/IG/FB/LinkedIn/YouTube).
- Ecosystem-Churn beachten: Versionen pinnen, ggf. pnpm/bun + `--legacy-peer-deps`.

---

## 6. Barrierefreiheit auf Dark (ab Tag 1 in Tokens/Components)

Bedient die BFSG/WCAG-2.1-AA-Anforderung (siehe [legal-checklist.md](./legal-checklist.md)):
1. **Nie** pures `#000`/`#fff` (Halation).
2. Akzente entsättigt (Gold ist gedämpftes Champagner, kein Neon).
3. **Focus-Ring nicht nur über Farbe:** 2px Gold (`#E6D08A`) Outline + 2px Offset, ≥3:1 zur Nachbarfläche (WCAG 2.2 SC 1.4.11 + 2.4.13), global via `:focus-visible`.
4. **Motion no-motion-first:** alle Animationen hinter `@media (prefers-reduced-motion: no-preference)`; für Reduced-Motion nur Opacity-Fades statt Transforms/Parallax (WCAG 2.3.3). **Enforced auf Token/Component-Layer, nicht nachträglich.**
5. Hover/Active/Disabled je eigener Token, Text ≥4,5:1, UI ≥3:1.
6. Hit-Targets ≥24px (2.5.8).

---

## 7. Fotografie (der größte Hebel für „edel")

Professionelle, einheitlich farbkorrigierte Objekt-/Lifestyle-Aufnahmen mit subtilem dunklem Grade, Vollbild. **Mit Stock/Placeholder kollabiert die Premium-Wirkung** – harte Abhängigkeit (Client-Wunsch #3). Budget-Frage + ob OnOffice-Bilder in Auflösung/Qualität reichen → siehe [RELAUNCH-LOG.md](../RELAUNCH-LOG.md) „Nächste Schritte".

---

## 8. Offene Design-Entscheidungen
- **Light-Theme:** dark-only vs. dark-default + barrierefreier Light-Toggle? Toggle ist stärkste A11y-Absicherung, verdoppelt aber Token/QA-Aufwand. **Vor Token-Finalisierung entscheiden.**
- **Akzent:** Champagner-Gold vs. kühler (Bronze/Taupe) vs. rein monochrom (à la SHVO)? Hängt an Logo/Brand-Assets.
- ~~Logo/Wordmark vorhanden?~~ **GEKLÄRT:** Logo liegt als SVG vor (`assets/brand/`, ~850 KB → für Web re-exportieren/optimieren). Markenschrift = Neuzeit Grotesk (§3). Gold-Akzent final gegen Logo prüfen.
- **Serif ja/nein:** reine Neuzeit Grotesk vs. + Fraunces-Display für Headlines (§3) — vor Token-Finalisierung entscheiden.
- **Motion-Intensität:** Vollbild-Autoplay-Video vs. Stills + Reveal? Video = CWV/LCP + Pause-Control/Reduced-Motion.

---

## Quellen
- Luxury RE Design: <https://www.agentimage.com/blog/best-luxury-real-estate-website-design/> · <https://mediaboom.com/news/luxury-real-estate-website-design/> · Awwwards: <https://www.awwwards.com/websites/real-estate/>
- Inclusive Dark Mode: <https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes/> · WCAG 2.2 AA Kontrast: <https://www.makethingsaccessible.com/guides/contrast-requirements-for-wcag-2-2-level-aa/>
- prefers-reduced-motion: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion> · SC 2.3.3: <https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html>
- shadcn Tailwind v4: <https://ui.shadcn.com/docs/tailwind-v4> · Next install: <https://ui.shadcn.com/docs/installation/next>
- Motion: <https://motion.dev/docs/react-motion-component> · next/image: <https://nextjs.org/docs/app/api-reference/components/image>
- Fraunces: <https://github.com/undercasetype/Fraunces> · <https://www.npmjs.com/package/@fontsource-variable/fraunces> · Hanken Grotesk: <https://fontsource.org/fonts/hanken-grotesk> · Fontsource: <https://github.com/fontsource/fontsource>
