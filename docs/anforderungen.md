# RIEGEL — Anforderungen & Arbeitsweise (Daueraufträge)

> Dieses Dokument hält die **wiederkehrenden Wünsche & Standards** von Alex fest.
> Bei **jeder** Aufgabe mitdenken — nicht nur wenn explizit genannt.
> Neue Anforderungen hier ergänzen und in `fortschritt.md` dokumentieren.

## 1) Motion & Interaktion — IMMER
- **transitions-dev**: Für jede animierbare UI die Bibliothek aufrufen und die passenden
  Patterns/Tokens wiren (`.t-*` in `globals.css`: `t-tabs`/Segmented, `t-collapse`,
  `t-success-check`, `t-num-d`, `t-input`-Shake, `t-badge`, `t-modal`, `t-dropdown`,
  `t-tilt`, `t-tt` Tooltip, `press`). Keine ad-hoc Durations — Motion-Tokens nutzen
  (`--duration-*`, `--ease-*`).
- **make-interfaces-feel-better**: Sofort-Feedback, Lade-/Busy-States mit Spinner,
  optische Ausrichtung, tabellarische Ziffern, Hover/Focus-Ringe, sinnvolle Defaults,
  `aria-pressed`/Tastaturbedienung, `prefers-reduced-motion` respektieren.
- Wertig, nie verspielt. Dark-first, ruhig, schnell.

## 2) Copywriting — Headlines mit Haltung
- Stil-Anker: **„Regionale Expertise. Alles andere ist Fast Food."** (Anspielung auf den
  Spitznamen „McMakler" für Discount-Makler). Kurz, selbstbewusst, Antithese/Wortspiel.
- Wiederkehrende Motive: **„gefunden werden"** (Google **und** KI), **„die Erben von morgen"**
  (online-suchende Zielgruppe), klare Abgrenzung zu Discount-Plattformen/Portalen.
- Lieber eine starke Aussage als ein generischer Claim.

## 3) Trust durch gewohnte Wordings
- Vertraute deutsche Formulierungen bauen Vertrauen auf
  (z. B. **„Ich freue mich auf Ihre Anfrage"**, „Persönlich für Sie da", „Unverbindlich & kostenlos").
- **Ansprechpartner mit Avatar-Foto + Kontaktdaten** überall, wo es um Kontakt/Anfrage geht
  (Objektdetail, Kontaktbox, Termin). Portal soll sich anfühlen wie die großen Portale —
  „gewohnte" Muster (Anbieter-Block, Energieausweis, Umgebung, ähnliche Objekte …).

## 4) Tools statt generischer CTAs
- Nicht „Beratung anfragen", sondern **konkreter Mehrwert**: z. B. **PDF-Report** mit allen
  Eckdaten anfordern (Bewertung). Report geht an Kunde **und** als CC/Backend an RIEGEL.
- **Nachvollziehbarkeit**: recherchierte Adressen/Anfragen speichern (wer prüft welches Objekt).
- Eigene Tools als attraktive Alternative zu Fremdlösungen pitchen (z. B. vs. HomeDay Preisatlas).

## 5) Marke & Design
- **RIEGEL-Blau `#015CFF`**, Dark-first, **Akira**-Headlines, eigenes Icon-System,
  Bento-Layouts, 3D-Shader-Akzente. Konsistent über Web, Mobil, E-Mail, PDF.

## 6) Arbeitsweise
- **Ultracode**: in großen Blöcken **autonom** weiterarbeiten, ohne unnötige Rückfragen.
- **Schritt für Schritt**, nichts vergessen, **kontinuierlich committen & pushen** (Branch + `main`).
- **Dokumentieren**: `fortschritt.md` pflegen, neue Anforderungen hier festhalten.
- Original-Assets von RIEGEL sauber wiederverwenden, wo möglich.
- DISCOVER → PLAN → EXECUTE → VERIFY → ITERATE.
