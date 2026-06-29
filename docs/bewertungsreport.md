# Marktwert-Report (PDF) — Blueprint & Umsetzung

> Recherche-Basis: McMakler, HomeDay, Sprengnetter, ImmoScout24, PriceHubble.
> Ziel: Der Rechner-CTA fordert **keinen** generischen „Beratungstermin", sondern
> einen **persönlichen Marktwert-Report** an. Report geht an den Kunden **und** als
> CC/Backend an RIEGEL. Jede recherchierte Adresse wird gespeichert (Nachvollziehbarkeit).

## Report-Abschnitte (Reihenfolge im Dokument)
1. **Deckblatt** — RIEGEL-Logo (Akira), „Sofort-Marktwertbericht", Objektadresse, Hero-Visual
   (Objektfoto/Kartenmotiv), Erstellungsdatum + Referenznummer, „Erstellt für [Name]", Stichtag.
2. **Management Summary** — Punktschätzung (EUR), Wertspanne von–bis, €/m² + Regionsvergleich,
   Konfidenz (hoch/mittel/niedrig), geschätzte Vermarktungsdauer, optional Marktmiete/Rendite.
3. **Objektsteckbrief** — Typ, Wohn-/Grundstücksfläche, Baujahr, Zimmer, Bäder, Zustand,
   Ausstattungsstandard, Merkmale (Balkon, Keller, Stellplatz, Heizung …), Nutzung.
4. **Lage & Mikrolage (Karte)** — Karte mit Pin, Makro-/Mikrolage, POI-Distanzen (Schule, ÖPNV,
   Einkauf, Ärzte), Bodenrichtwert, Lage-Score.
5. **Marktwert: Spanne + Punktschätzung** — Range-Bar mit Blau-Marker, €/m² Objekt vs. Spanne,
   Erklärung der Spannenbreite (Sondermerkmale → breiter), optional Mietwertspanne.
6. **Vergleichsobjekte** — 3–8 Comparables (Adresse/Distanz, Fläche, Baujahr, Zustand, €/m²),
   Korrekturfaktoren, Mini-Karte, Datenquelle + Stichtag, Anzahl Vergleichsfälle.
7. **Markt- & Preisentwicklung** — Linie ~5 Jahre (Wohnlage Blau vs. Stadt grau gestrichelt),
   aktuelles Niveau + Trendpfeil, Miet-/Nachfrageindikatoren, Vermarktungsdauer-Trend.
8. **Energie & Nachhaltigkeit** — Effizienzklasse, Ausweistyp + Kennwert, Heizungsart,
   Sanierungspotenzial; transparent ob gemessen oder (KI-)geschätzt.
9. **Annahmen, Methodik & Datengrundlage** — Verfahren (Vergleichs-/Sach-/Ertragswert nach ImmoWertV),
   Datenquellen/-aktualität, Annahmen, Stichtag, Konfidenz.
10. **Disclaimer** — automatisierte Einschätzung, **kein** Verkehrswertgutachten, kein Vor-Ort-Termin,
    Haftungsausschluss, Empfehlung Sachverständiger bei Sondermerkmalen, Stichtagsbindung.
11. **Ansprechpartner / CTA** — Berater (Foto, Name, Funktion, Tel/E-Mail, Termin-Link),
    CTA „Genaue Vor-Ort-Bewertung anfordern", Trust-Signale.

## Design (Premium, dark)
- Hintergrund tiefes Anthrazit (#0B0E14 / #10141C), Cards eine Stufe heller (#161B26) + 1px-Border.
- **RIEGEL-Blau nur als ein Akzent**: Headline-Zahl, Punktschätzungs-Marker, CTA, Diagramm-Highlight.
- Text nie reines Weiß (#E6EAF2 / #9AA4B2). **Akira** nur für Cover/Kapitel/große Wertzahl;
  Body in Inter. **tabular-nums** für alle Geldbeträge.
- 12-Spalten-Raster, Bento-Cards für Kennzahlen, Kapitelnummern 01–11 in Akira.
- Range-Bar für Wertspanne, Linien-Chart für Trend, dunkles Map-Theme mit blauem Pin, Donut für Konfidenz.

## Umsetzung (Stufen)
- **Datenhaltung**: Supabase-Tabelle `valuation_requests` — jede Adress-Recherche + Report-Anfrage
  wird gespeichert (Adresse, Geo, Objektdaten, Wertspanne, Name/E-Mail/Tel, Zeitpunkt, user_id).
  → Nachvollziehbar „wer prüft welches Objekt". Schema in `supabase-schema.sql`.
- **Anfrage-Flow**: Rechner-CTA „Persönlichen Report anfordern" → `/api/report`:
  (1) speichert in Supabase, (2) Mail an Kunde + **CC an RIEGEL** (EMAIL_TO), (3) Report-Link.
- **Report-Ausgabe**: server-gerenderte Premium-Report-Seite (`/report/...`), die der Kunde als
  PDF speichern/drucken kann (print-CSS). Echtes server-seitiges PDF-Attachment (z. B. via Worker
  mit Playwright oder `@react-pdf`) ist als spätere Ausbaustufe vorgesehen.
- **Datenquellen (später)**: Bodenrichtwerte, reale Vergleichsdaten/Transaktionen, Energiedaten —
  zunächst transparente Schätzlogik mit klarem Disclaimer.

## Benchmarks
Sprengnetter (Management-Summary, ImmoWertV/BelWertV/EBA), PriceHubble (AVM-Dossier, KI-Effizienzklasse,
Big-4-Prüfung), ImmoScout24 (kostenloses PDF, Vergleichsobjekte), HomeDay (5-Jahres-Kurven Wohnlage vs.
Stadt), McMakler (breitere Spanne bei Sondermerkmalen, „Orientierung").
