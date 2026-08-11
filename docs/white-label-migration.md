# White-Label-Migration — RIEGEL → neuer OnOffice-Makler

> **beuwy-Agency-Brille.** Dieses Repo ist nicht „die RIEGEL-Website", sondern die
> **erste Instanz** eines white-label Makler-Systems. Ziel dieser Doku: einen zweiten
> OnOffice-Makler in **Tagen statt Wochen** aufsetzen und umbranden — reproduzierbar.
>
> **Diese Datei ist immer nachzuziehen.** Wer Branding, Config, Integrationen oder
> Rechtstexte anfasst, aktualisiert hier den betroffenen Touchpoint. Die Regel steht
> auch in `CLAUDE.md`, damit sie in jeder Session gilt.
>
> Basis: vollständige Code-Inventur 08/2026 (140 Touchpoints). Stand-Marker im Code:
> `site.ts`, `docs/supabase-schema.sql`, `docs/onoffice-integration.md`.
>
> **Ausführbarer Teil:** `docs/migration-orchestrator.md` (Fable-5-Orchestrator-Auftrag
> „leeres Repo → umgebrandete Instanz" mit Phasenplan + Abnahme-Kriterien) und
> `docs/migration-intake.md` (Makler-Datenblatt — einzige zulässige Datenquelle für
> Credential-Angaben). Dieses Playbook bleibt die Wissensbasis dahinter.

---

## 1. Mentales Modell: fünf Migrations-Typen

Jeder RIEGEL-spezifische Touchpoint fällt in genau eine Kategorie. Die Reihenfolge im
Runbook (§2) folgt daraus.

| Typ | Bedeutung | Beispiel | Aufwand |
|---|---|---|---|
| **config** | An **einer** Stelle ändern (idealerweise `site.ts`/Env) | Name, Domain, Telefon, Standorte | niedrig |
| **asset** | Datei/URL ersetzen (Logo, Fotos, CDN) | `logo-*.svg`, Bunny-Fotos, PDF-Cover | mittel |
| **regenerieren** | Pro Makler/Region **neu erstellen** (kein Find&Replace) | SEO-Content, Marktdaten, Team | hoch |
| **credential** | **Recht/Konto des neuen Maklers — NIE kopieren** | Impressum, §34c, Awards, API-Keys | — |
| **infra** | Neues externes Projekt/Konto anlegen | OnOffice, Supabase, Resend, Bunny, Vercel | hoch |

**Die wichtigste Unterscheidung:** `credential` sind rechtlich/faktisch fremde Angaben
(Handelsregister, Auszeichnungen, echte Kundenstimmen, Team-Personen). Sie zu kopieren
ist **Wettbewerbsverstoß / Persönlichkeitsrechtsverletzung / Irreführung** — nicht nur
schlechter Stil. Siehe §5 „Die rote Liste".

---

## 2. Runbook — Reihenfolge einer Migration

### Phase A — Infrastruktur (externe Konten, VOR allem anderen)

Diese acht Konten gehören dem neuen Makler und müssen zuerst stehen — der Code kann ohne
sie nicht sinnvoll deployen:

1. **OnOffice-Vertrag + API-Freischaltung** (Token/Secret vom OnOffice-Support). Ohne
   das zeigt die App keinen Objektbestand. → `ONOFFICE_TOKEN`, `ONOFFICE_SECRET`.
2. **Supabase-Projekt** (komplett neu — **niemals** Instanz teilen; Mandantentrennung
   ist Pflicht). Schema aus `docs/supabase-schema.sql` einspielen, RLS prüfen (s. §6).
   → `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PAT`.
3. **Resend-Konto + Versand-Subdomain** (z. B. `m.<makler-domain>.de`) bei Resend
   verifizieren, **SPF/DKIM/DMARC** im DNS setzen (DMARC auf `p=quarantine`→`reject`,
   nicht `p=none`). → `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`.
4. **BunnyCDN Storage-Zone + Pull-Zone** (eigenes Konto/Zone). → `BUNNY_CDN_HOST`,
   `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_HOST`, `BUNNY_STORAGE_ACCESS_KEY`.
5. **Vercel-Projekt** mit der Makler-Domain als **Primary Domain** (treibt canonical,
   og:url, sitemap, robots — s. `site.url`). Region `fra1` bleibt für DE.
6. **BORIS-Abdeckung prüfen** (Bundesland-abhängig!): `boris.ts` deckt **nur RLP +
   Hessen** ab. BW/Bayern/… → amtlicher Bodenrichtwert fehlt, Rechner fällt auf
   Modellwerte zurück. Ggf. neuen Landesdienst anbinden (Muster: Hessen-WFS in
   `boris.ts`) oder bewusst ohne „amtlich"-Badge fahren. Siehe `docs/preisatlas-research.md`.
7. **RLP-VBORIS-Nutzungsbestätigung** (nur falls Region RLP): laut Code-Kommentar
   (`boris.ts:21`) läuft die schriftliche kommerzielle Freigabe des LVermGeo noch —
   klären, ob sie an RIEGEL oder an beuwy als Betreiber gebunden ist.
8. **ADMIN_PASSWORD + CRON_SECRET** neu generieren (pro Deployment eigene Werte).

### Phase B — Zentrale Config (`src/lib/site.ts` + Env)

Der Großteil des „Umbrandens" ist eine Datei. `site.ts` befüllen:
`name`, `legalName` (= Handelsregister-Firmierung, s. §5!), `tagline`, `description`,
`url`, `regions`, `nav` (inkl. Feature-Bild!), `socials`, `phone`, `email`, `whatsapp`
(bei RIEGEL selbst noch offen — für jeden Makler mitnehmen), `locations[]`.

Env setzen (Vercel Project Settings) — siehe §4 für die vollständige Liste mit
Stille-Fallen. **Kritisch:** `INTERN_EMAILS` und `FEEDBACK_TO`/`FEEDBACK_CC` **müssen**
gesetzt werden, sonst greifen Code-Fallbacks, die **Sissy/Alex** eintragen → fremder
Zugriff/Datenleck (s. §4).

### Phase C — Branding-Assets ersetzen

Logos, Farbe, Fotos, PDF-/Mail-Assets — s. §3.2. Achtung Refactor-Debt: Logo-Dateinamen
und die Akzentfarbe kleben an mehreren hartcodierten Stellen (§3.1).

### Phase D — Content regenerieren (der größte Block)

SEO-Content, Marktdaten-Engine, Team, Trust-Elemente — **nicht per Find&Replace**, weil
Stadtnamen, Adressen, USPs, Awards und Personen-Story im Fließtext verschmolzen sind
(s. §3.3). Hier steckt der eigentliche Aufwand jeder Migration.

### Phase E — Recht neu erstellen (Anwalt/Makler liefert Angaben)

Impressum, Datenschutz, Widerruf — komplett aus den echten Daten des neuen Maklers
(s. §5). **Nichts hiervon raten oder kopieren.**

### Phase F — Go-Live-Checks

- [ ] `EMAIL_FROM` gesetzt & Domain bei Resend verifiziert (sonst **stiller** Totalausfall
      aller Kundenmails, s. §4).
- [ ] Test-Report über den Rechner anfordern → Mail kommt an, PDF-Anhang korrekt,
      Absender = Makler-Domain, Fußzeile/Logo = Makler.
- [ ] `INTERN_EMAILS` gesetzt → `/intern` nur für Makler-Team, **nicht** Sissy/Alex.
- [ ] anon-Key-Test gegen Supabase-REST: PII-Tabellen liefern 0 Zeilen (RLS, s. §6).
- [ ] Objektliste zeigt Makler-Objekte aus **dessen** OnOffice, nicht RIEGELs.
- [ ] Kein „RIEGEL"/„Speyer"/„Ludwigshafen"/`riegel.b-cdn.net`/`#015cff` mehr im Build:
      `grep -rniE "riegel|015cff|b-cdn" src/ public/` (außer bewusst generischen Resten).
- [ ] KI-Bild-Labels erscheinen an den neuen KI-Bildern (AI-Act, s. §3.3 → `ki-bilder.ts`).
- [ ] `/impressum`, `/datenschutz`, `/widerruf` tragen ausschließlich Makler-Angaben.
- [ ] Sitemap/robots/OG zeigen die neue Domain; alte URLs ggf. 301 (Slugs ändern sich!).

---

## 3. Touchpoint-Referenz

### 3.1 Refactor-Backlog — Hartcodiertes, das in Config gehört

> Diese Punkte sind **technische Schuld**, die jede Migration teurer macht. Sie einmal zu
> beheben (Werte aus `site.ts`/Env ableiten) macht Makler #2, #3, … deutlich billiger.
> **Empfehlung: vor der zweiten Migration abarbeiten.**

| Was | Ort | Fix |
|---|---|---|
| **Akzentfarbe `#015cff`** ~32× dupliziert (Mail, PDF, OG, Shader, Confetti, Spiel, Karten-Pins) | `email.ts`, `report-pdf.ts` (als `rgb(0.004,0.361,1.0)`), `og-assets.ts`, `wave-shader.tsx`, `confetti.ts`, `components/game/*`, `location-map.tsx`, `portal-map.tsx` | `site.brandColor` (Hex + rgb) einführen; nur `globals.css` hat aktuell das zentrale `--color-accent`. Mail/PDF/OG haben **keinen** CSS-Zugriff → brauchen die Konstante. |
| **CDN-Host `riegel.b-cdn.net`** an ≥3 Stellen hartcodiert | `next.config.ts:16` (build-time, **Code-Änderung nötig**, kein reiner Env-Wechsel!), `photos.ts:5`, `experten.ts:18`, `bunny.ts`-Fallback | Aus `process.env.BUNNY_CDN_HOST` ableiten. Ohne den next.config-Fix schlägt `next/image` für den neuen Host mit 400 fehl. |
| **Logo-Dateinamen** hartcodiert | `email.ts:93` (`/email-logo-riegel-dark.png`), `og-assets.ts` (Base64!), `public/logo-riegel-*.svg` | Logo-Pfade als `site.ts`-Feld; oder gleiche Dateinamen beibehalten (Ersetzen statt Umbenennen). OG-Logo ist Base64 im Code → nach Logo-Tausch **manuell** neu erzeugen (kein Build-Skript!). |
| **Mail-Fußzeile** Adresse/Telefon als String | `email.ts:214` | Aus `site.locations[0]` rendern. |
| **PDF-Cover-Wortmarke „RIEGEL"** | `report-pdf.ts:250-251` (setTitle/Author), Header jede Seite, `:424` Footer | ⚠️ Position/Breite ist für **6 Zeichen** „RIEGEL" berechnet (`textWidthSpaced`) — ein anders langer Name **verschiebt das Layout**. Nicht nur String tauschen, sondern Positionierung dynamisch machen. |
| **ICS-Kalenderexport** „RIEGEL" | `booking-tool.tsx:178,182,191,200,275` (PRODID/SUMMARY/Dateiname) | Auf `site.name`. |
| **Canvas-Text „RIEGEL IMMOBILIEN"** im Spiel | `game/sold-sign.tsx:66` | Auf `site.name`. |
| **WhatsApp-Anredetext** mit Markenname | `ansprechpartner-card.tsx:24-26` | Auf `site.name`. |
| **JSON-LD `RIEGEL Immobilien ${city}`** | `layout.tsx:92` | Auf `${site.name} ${l.city}`. |
| **Rechner-Quellenzeile „RIEGEL-Referenzobjekte"** | `calculator.tsx:277` | Auf `site.name`. |
| **Interne Domain-Ausnahme `@riegel-immobilien.de`** | `report/route.ts:481` | Auf Makler-Firmendomain (sonst greift die Büro-Ausnahme falsch). |
| **`riegel:`-Präfix** bei localStorage/Events | `profile-form.tsx`, `inquiry-form.tsx`, `saved-searches.tsx`, `consent.tsx`, `contact-form.tsx`, `game` (`riegel-blitzverkauf-best`) | ⚠️ **Die Datenschutzerklärung nennt diese Key-Namen wörtlich** — beim Umbenennen auch `datenschutz/page.tsx` nachziehen. |
| **`INTERN_EMAILS`/`FEEDBACK_*`-Code-Fallbacks** nennen Sissy/Alex | `intern-access.ts:33`, `feedback/route.ts:96-97` | Fallback auf neutrale beuwy-Platzhalter oder Fehler statt konkrete Personen (s. §4). |
| **`riegel-stats.ts`** ganzes Modul mit Marketing-Kennzahlen | `lib/riegel-stats.ts` | Eigenes Config-Modul pro Makler; keine `site.ts`-Anbindung heute. |
| **`llms.txt` greift `locations[0]` und `[1]` hart** | `app/llms.txt/route.ts` | Bei nur **einem** Standort **Crash** → defensiv auf `locations.length` prüfen. |
| **theme-color doppelt** | `layout.tsx:47` (`#0b0b0d`) vs. `globals.css` `--color-bg` | Synchron halten oder aus einer Quelle. |

### 3.2 Assets (ersetzen)

- **Logos:** `public/logo-riegel-*.svg` (black/white/mark/short-mono/short-white),
  `public/email-logo-riegel*.png` (dunkle Variante fürs helle Mail-Layout, **e-mail-sicher
  als PNG**, kein SVG/Webfont), `icon.png`/`apple-icon.png` (Next.js-Convention),
  `og-assets.ts` Base64-Logo (nach Tausch **neu generieren**).
- **Bildwelt (~45 Keys + 100+ URLs):** `photos.ts` (`photos`/`engagement`/`portraits`),
  alle `riegel.b-cdn.net/…` — Hero, Sektionen, Standort-Ladenlokale (mit sichtbarem
  RIEGEL-Logo am Gebäude!), Team, Sponsoring. **Alles Original-RIEGEL-Material → neues
  Shooting/KI-Set pro Makler.**
- **PDF-Report-Assets (Base64 im Code!):** `report-assets/cover.ts`, `gallery.ts`,
  `visuals.ts` — Cover-/Broschüre-/Beratungs-/Laden-Fotos fest als Base64 (für
  serverseitiges pdf-lib ohne Netz-Fetch). Ersetzen = Base64 neu erzeugen.
- **Font `Akira Super Bold`** (`report-assets/akira.ts`, Base64): ⚠️ **Lizenz prüfen** —
  ist die Font-Lizenz site-/personengebunden an RIEGEL? Ggf. für den neuen Makler eigene
  Lizenz oder andere Display-Font.
- **Lokale Fotos außerhalb CDN:** `public/images/team/*.jpg` (3 Porträts noch lokal statt
  CDN — Inkonsistenz), `public/images/standorte/*`, `public/images/news/*`,
  `public/images/regio/speyer-dom.svg` (ortsspezifische Landmarke!), `public/images/badges/*`.

### 3.3 Content regenerieren (pro Makler/Region)

- **SEO-Fließtext:** `content/geo-articles.json` (~50 Artikel, 18 Städte + Ratgeber,
  ~700 RIEGEL-Treffer), `content/experten-seiten.json` (30 generierte Objektart-Seiten),
  `lib/experten.ts` (5 **handkuratierte** Flaggschiff-Seiten im TS-Code — Code-Änderung,
  nicht nur Daten). Redaktionsdaten mitziehen: `geo.ts:31-32` (`GEO_CONTENT_PUBLISHED/
  UPDATED`), `experten.ts:103-104`.
- **Marktdaten-/Geo-Engine (Fundament von Rechner + Preisatlas):**
  - `geo-taxonomy.ts:69-122` — 18 Städte mit **echten Koordinaten** + Nachfragefaktoren.
  - `marktdaten.ts` **REGION_BASIS** (€/m² je Kernstadt) — ⚠️ **muss synchron mit
    REGIONS in `valuation.ts` gehalten werden** (zwei Dateien, kein Single-Source!). Beide
    beschreiben den **Median echter Abschlüsse** — `scripts/preisanalyse-onoffice.mts` gibt
    dafür einen fertigen Kalibriervorschlag aus (Lauf mit den OnOffice-Credentials des
    jeweiligen Maklers).
  - **`verkauft-stats.ts` + `/api/marktstats` (Laufzeit-Kalibrierung):** Die Engine deckelt
    Modellwerte am p75 echter Orts-Abschlüsse aus dem OnOffice-Verkauft-Pool und zählt echte
    Vergleichsverkäufe — **kalibriert sich also automatisch am Bestand des jeweiligen
    Mandanten**. Bei einer Migration ist hier NICHTS zu übertragen (weniger als n=5 Abschlüsse
    je Ort ⇒ die Instanz läuft rein modellbasiert, bis eigene Verkäufe auflaufen).
  - `marktdaten.ts:77-107` **STADT_FAKTOR** (Ortsmultiplikatoren) und `:153-169`
    **SPANNE_BELEGT** (reale Preisspannen aus OnOffice-Abschlüssen, `n=…`). Beides an
    RIEGELs eigene Verkaufshistorie gekoppelt → nur durch **eigene** OnOffice-Abschlüsse
    des neuen Maklers ersetzbar (Skript: `scripts/preisanalyse-onoffice.mts`).
  - `kaufseiten.ts` — Slugs `haus-<ort>` erzeugen die Routen `/kaufen/…`; ändern sich mit
    der Region → alte URLs 301, Search-Console-Reindex.
- **Team (an DREI Stellen, alle synchron!):** `app/ueber-uns/page.tsx` (`familie`/`team`/
  `nachwuchs`), **`lib/contacts.ts`** (zweite, getrennte Quelle derselben Personen für
  Objekt-/Kontaktseiten — leicht übersehen!), `layout.tsx:112-122` (JSON-LD founder/
  employee). „Familie X / Vater-Mutter-Tochter-Sohn"-Narrativ passt nur, wenn der neue
  Makler auch Familienbetrieb ist.
- **Trust-Elemente:** `lib/trust-data.ts` — Testimonials (echte Kundennamen → §5!),
  Badges, Plattform-Bewertungen; `reach-chart.tsx` (ImmoScout24-Reichweitenvergleich mit
  realen Konkurrenz-Zahlen — nur **nachprüfbare** Werte, vergleichende Werbung).
- **OG-Images:** `opengraph-image.tsx` (markenspezifischer Claim „Regionale Expertise.
  Alles andere ist Fast Food." — **neu texten**, nicht nur Farbe/Logo), dynamische
  `standorte|ratgeber/[slug]/opengraph-image.tsx`.
- **⚠️ KI-Bild-Compliance-Register `ki-bilder.ts:29-43`** (`KI_FRAGMENTE`): erkennt
  KI-Bilder an Dateinamen-Substrings (`RIEGEL_Rechner-Hero`, …). **Stiller
  Rechts-Fallstrick:** lädt der neue Makler KI-Bilder mit anderen Dateinamen hoch, matcht
  `istKiBild()` nicht → **AI-Act-Label fehlt lautlos**. Fragmente auf die neuen Dateinamen
  anpassen. (Kontext: `docs/…`/AI-Act-Arbeit 08/2026.)
- **OnOffice-Feinjustierung (account-spezifisch):** `onoffice.ts` — `STATUS2_ACTIVE/SKIP`
  (CRM-Statuskeys des RIEGEL-Accounts), `ESTATE_FIELDS` (36 Felder gegen `fields:get` des
  neuen Accounts prüfen), `EXPOSE_TEMPLATES` (exakte PDF-Vorlagen-Titel), `webseite_system`
  (HerkunftKontakt-Key für `address:create`, live verifiziert), `APP_PROMO_KEYWORDS`
  (Regex entfernt RIEGEL-Werbe-Boilerplate — greift bei fremder Boilerplate nicht).

---

## 4. Env-Variablen — Referenz & Stille Fallen

| Variable | Typ | Fallstrick |
|---|---|---|
| `ONOFFICE_TOKEN` / `ONOFFICE_SECRET` | credential | **Nie** RIEGELs — sonst zeigt die App RIEGELs Objekte. Kein Code-Default. |
| `ONOFFICE_API_URL` | config | Default `api.onoffice.de/api/stable/api.php` — i. d. R. unverändert. |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_PAT` | infra/credential | Eigenes Projekt. Service-Role & PAT sind Vollzugriff — nie teilen. |
| `RESEND_API_KEY` | credential | Eigenes Resend-Konto (Domain-Zuordnung + Kontingent hängen dran). |
| `EMAIL_FROM` | **credential** | ⚠️ **Größte Stille-Falle:** fehlt sie in Prod, greift die Resend-Sandbox `onboarding@resend.dev`, die **nur an den Kontoinhaber** zustellt → alle Kundenmails „gehen raus", kommen bei **niemandem** an, kein Fehler. Muss verifizierte Makler-(Sub-)Domain sein. |
| `EMAIL_TO` | credential | Fallback `info@riegel-immobilien.de` (hartcodiert) → **ohne Setzen laufen Kundenanfragen zu RIEGEL** (Datenschutz!). |
| `EMAIL_ASSET_BASE` | asset | Nur nötig, wenn Mail-Assets von anderer Domain kommen; sonst = `site.url`. |
| `NEXT_PUBLIC_SITE_URL` | config | Nur setzen, wenn abweichend von `site.url` — sonst Doppelpflege-Risiko (Env gewinnt über `site.ts`). |
| `INTERN_EMAILS` | **credential** | ⚠️ Ohne Setzen greift Code-Default `["sissy.riegel@…","alex@beuwy.com"]` → **fremder /intern-Zugriff**. Zwingend setzen. |
| `FEEDBACK_TO` / `FEEDBACK_CC` | config | Ohne Setzen CC an `sissy.riegel@riegel-immobilien.de` → **Feedback-Datenleck**. Zwingend setzen. |
| `ADMIN_PASSWORD` | credential | Neu & eindeutig pro Deployment. |
| `CRON_SECRET` | credential | Ohne Setzen ist `/api/matching/run` `503` (fail-closed) — aber Cron braucht den Wert, sonst 401. |
| `BUNNY_CDN_HOST` / `BUNNY_STORAGE_ZONE` / `BUNNY_STORAGE_HOST` / `BUNNY_STORAGE_ACCESS_KEY` | infra | Eigene Zone — sonst landen Uploads (Hero-Bild!) im RIEGEL-Bucket. **Zusätzlich `next.config.ts:16` im Code anpassen** (build-time, s. §3.1). |

---

## 5. Die rote Liste — NIEMALS kopieren

Diese Angaben sind rechtlich/faktisch fremd. Übernahme = Wettbewerbsverstoß,
Persönlichkeitsrechts-/Markenverletzung oder Irreführung.

- **Impressum** (`app/impressum/page.tsx`): Handelsregister **HRA 51804 Sp / AG
  Ludwigshafen**, **§34c-Erlaubnis** + erteilende Behörde (VG Römerberg-Dudenhofen),
  **Aufsichtsbehörde** (Stadt Speyer Abt. 211), **USt-IdNr.** (aktuell bewusst leer —
  neuer Makler ergänzt seine echte), **verantwortliche Person „Sylwia Riegel"** (über **6
  Dateien** verstreut hartcodiert: impressum, datenschutz, widerruf, contacts, layout-JSON-LD).
- **Widerruf** (`app/widerruf/page.tsx`): Muster-Widerrufsbelehrung + -formular mit
  Inhaberin/Adresse. ⚠️ Muss **wortgleich** dem gesetzlichen Muster (Anlage EGBGB)
  entsprechen — höchstes Abmahnrisiko. Trägt bereits einen Warnkommentar im Code.
- **Datenschutz** (`app/datenschutz/page.tsx`): Verantwortlicher-Block (Name/Adresse/Tel),
  GwG-Abschnitt. Adresse ist als Freitext eingetippt (nicht aus `site.locations`).
- **Auszeichnungen & Siegel** (`awards-grid.tsx`, `award-highlight.tsx`, `trust-data.ts`,
  `public/images/badges/*`): ImmoScout24-Partner/Experte (seit 2009/2013-2021), **ImmoAward
  2025 Top 21**, IDA 2022, Bellevue, BVFI-Siegel, Gold-Badge, Logo Metropolregion
  Rhein-Neckar. Jedes bescheinigt eine **RIEGEL-individuelle** Auszeichnung. Neuer Makler
  zeigt **nur, was er selbst hat**.
- **BVFI-Regionaldirektor-Titel** (Manfred Riegel): personengebundene Verbandsfunktion —
  auch bei eigener BVFI-Mitgliedschaft nicht übertragbar.
- **Kundenstimmen** (`trust-data.ts` TESTIMONIALS): echte Namen (Familie Bartmann, Melanie
  Korkmaz, …) + Nennung echter RIEGEL-Mitarbeiter. Personenbezogene Fremddaten; nachgebaute
  Reviews wären Fake-Reviews (Wettbewerbsverstoß).
- **Plattform-Bewertungen** (`trust-data.ts`, `layout.tsx` sameAs): Google 4,8/449,
  ImmoScout24 4,7/148, golocal-URLs — RIEGELs eigene Konten/Profile.
- **Reichweiten-Vergleich** (`reach-chart.tsx`): reale ImmoScout24-Zahlen (416.054 vs.
  Wettbewerber) — nur mit **eigenen nachprüfbaren** Zahlen des neuen Maklers.
- **Team-Personen & Porträts** (Familie Riegel + Team + Azubis): Namen, Rollen, Fotos —
  Persönlichkeitsrecht.
- **Alle API-Keys/Secrets** (OnOffice, Resend, Supabase, Bunny, ADMIN_PASSWORD, CRON_SECRET).

---

## 6. Sicherheit & Mandantentrennung bei Klonen

- **Eigenes Supabase-Projekt pro Makler** — niemals eine Instanz mit anderem Schema
  teilen (die geteilte DB mit `saadi_*` war im Security-Audit 08/2026 genau ein Befund).
  Nutzerkonten, Leads, Favoriten, Reports, `site_settings` (Hero-Bild!) sind mandanten-
  gebunden.
- **RLS-Migrationen mitnehmen:** `supabase/migrations/*` — u. a. das Entfernen der
  permissiven anon-INSERT-Policies (`…drop_anon_insert_policies.sql`) und das
  `expose_confirmations`-Gate (§312j BGB). Nach dem Einspielen: anon-Key-Test (PII-Reads =
  0 Zeilen, anon-Writes = 401).
- **`INTERN_EMAILS`, `EMAIL_FROM`, `EMAIL_TO`, `FEEDBACK_*`** vor Go-Live prüfen (§4) —
  die Code-Fallbacks führen sonst zu RIEGEL/beuwy.

---

## 7. Region-Abhängigkeiten (nicht überall verfügbar)

- **Amtliche Bodenrichtwerte** (`boris.ts`): nur **RLP** (VBORIS-WMS) + **Hessen**
  (BORIS-WFS). Andere Bundesländer → Modellwerte, kein „amtlich"-Badge. BW hat **keinen**
  frei lizenzierten Dienst (Befund in `docs/preisatlas-research.md`); Anbindung nur mit
  schriftlicher ZGG-BW-Zusage. Ein Makler außerhalb RLP/HE braucht hier eine bewusste
  Entscheidung.
- **Marktdaten** (`marktdaten.ts`/`valuation.ts`): Basiswerte und Faktoren sind für die
  Rhein-Neckar-Region kalibriert — für eine neue Region komplett neu erheben.

---

## 8. Was schon gut ist (1:1 übernehmbar)

- `site.ts` als zentrale Config-Quelle (wird von `layout.tsx`, `robots.ts`, `sitemap.ts`,
  `llms.txt`, `email.ts` referenziert).
- Datengetriebene Renderer: `standorte/[slug]/page.tsx`, `verkaufen/[typ]`, Portal, Rechner-
  Engine, PDF-Generator-Gerüst — alle lesen aus Config/Content/OnOffice, kein Hardcoding.
- OnOffice-Integration (`onoffice.ts` + `docs/onoffice-integration.md`), Supabase-Schema
  (`docs/supabase-schema.sql`), Security-Härtung (`supabase/migrations/`), AI-Act-Labels
  (`ki-bilder.ts` + `ki-hinweis.tsx`), Button-Lösung §312j — alles Produkt-Substanz, die
  jeder Makler erbt.
- **Selbstkalibrierende Bewertungs-Engine:** `verkauft-stats.ts` + `/api/marktstats` deckeln
  Modellwerte am p75 echter Abschlüsse **des jeweiligen OnOffice-Mandanten** und liefern echte
  Vergleichszahlen — Makler #2 erbt den Mechanismus ohne Datenübernahme (s. §3.3).
- **Claude-Skills reisen mit:** `.claude/skills/` + `skills-lock.json` sind versioniert —
  16 Design-/UX-/Frontend-Skills (design-taste-frontend, make-interfaces-feel-better,
  transitions-dev, …) laden in jeder Session automatisch aus dem Repo-Root. Ein Klon
  bringt damit auch die Arbeitsumgebung mit, nicht nur den Code.

---

## 9. Vorschlag: Produktisierung (beuwy-Roadmap)

Damit Makler #2..#n **Tage** statt Wochen kosten:

1. **Refactor-Backlog §3.1 abarbeiten** — alle Marken-Literale hinter `site.ts`/Env
   (Farbe, CDN-Host, Logo-Pfade, Namen). Größter Hebel.
2. **`config/branding.ts`-Konvention** — ein einziges Objekt (Name, legalName, Farbe,
   Logo-Pfade, Stats, Region), aus dem UI, Mail, PDF, OG **alle** lesen.
3. **Impressum/Datenschutz/Widerruf datengetrieben** aus einem `legal.ts`-Objekt (Makler
   füllt Felder, Texte werden generiert) statt Fließtext pro Datei.
4. **Setup-Skript** (`scripts/init-broker.mts`): legt Env-Vorlage an, prüft die Go-Live-
   Checkliste (§2 Phase F) automatisch, benennt `package.json`/Repo um.
5. **Content-Pipeline** — die vorhandenen Generatoren (`scripts/build-experten-content.mjs`,
   `preisanalyse-onoffice.mts`, geo-Artikel) als reproduzierbaren „neue Region"-Lauf
   dokumentieren.

---

## 10. Orchestrator-Workflow — Migration per Agent ausführen

Die Migration ist als **agentischer Workflow** ausführbar: ein Fable-5-Orchestrator
bekommt ein leeres Ziel-Repo, dieses Quell-Repo und ein ausgefülltes Intake — und
arbeitet dieses Playbook als Checkliste ab.

- **`docs/migration-orchestrator.md`** — Ablauf aus beuwy-Sicht, der Copy-Paste-Prompt
  für die Orchestrator-Session, Phasenplan 0–9 mit Abnahme-Kriterien pro Phase,
  Pflichtformat des Abschlussreports, Grenzen der Automatisierung.
- **`docs/migration-intake.md`** — das Makler-Datenblatt (`intake.yaml`-Vorlage).
  Credential-Felder (§5) kommen ausschließlich hierüber vom Makler; was fehlt, wird
  sichtbarer `TODO` + Report-Eintrag, nie erfunden.

Wer Touchpoints in diesem Playbook ändert, prüft, ob Orchestrator-Phasenplan (§3 dort)
und Intake-Felder noch dazu passen — die drei Dateien bilden **ein** System.
