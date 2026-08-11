# Marktwert-Report (PDF) — Blueprint & Umsetzung

> Recherche-Basis: McMakler, HomeDay, Sprengnetter, ImmoScout24, PriceHubble.
> Ziel: Der Rechner-CTA fordert **keinen** generischen „Beratungstermin", sondern
> einen **persönlichen Marktwert-Report** an. Report geht an den Kunden **und** als
> CC/Backend an RIEGEL. Jede recherchierte Adresse wird gespeichert (Nachvollziehbarkeit).
>
> **Status: Der PDF-Anhang ist LIVE** (`/api/report` + `src/lib/report-pdf.ts`, 5 Seiten).
> Die früher hier beschriebene HTML-Report-Seite `/report/...` ist **entfallen** — es gibt
> keine solche Route; der Report wird direkt als PDF per Mail zugestellt.
> Die 11 Abschnitte unten sind das **Zielbild/Blueprint** für den weiteren Ausbau.

## Report-Abschnitte (Blueprint — Zielbild, Reihenfolge im Dokument)
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

## Umsetzung (Ist-Stand) ✅

- **Anfrage-Flow (live)**: Rechner (`/rechner`, Wizard) → CTA „Persönlichen Report anfordern" →
  `POST /api/report`: (1) Esri-World-Imagery-Luftbild der eingegebenen Koordinaten holen,
  (2) PDF bauen, (3) Mail an den Kunden **mit PDF-Anhang** + interne Kopie an RIEGEL
  (`EMAIL_TO`, ebenfalls mit PDF), (4) Insert in Supabase `valuation_requests`. Jeder Schritt
  fehlertolerant (ohne `RESEND_API_KEY` wird der Versand „geskippt", das Logging bleibt).
- **Datenhaltung (live)**: Supabase-Tabelle `valuation_requests` — Adresse+Geo, Objektdaten,
  Wertspanne, Kontaktdaten, Zeitpunkt. Lesen nur per `service_role` (Auswertung über `/intern`).
  Schema in `supabase-schema.sql`.
- ~~Report-Ausgabe als HTML-Seite `/report/...`~~ **entfallen** — direkt serverseitiges
  PDF-Attachment via pdf-lib (kein Playwright/`@react-pdf` nötig, serverless-tauglich).
- **Datenquellen (später)**: Bodenrichtwerte, reale Vergleichsdaten/Transaktionen, Energiedaten —
  aktuell transparente Schätzlogik mit klarem Disclaimer.

### `src/lib/valuation.ts` — Bewertungs-Engine (client-seitig)

Heuristische Engine v2: regionale €/m²-Basiswerte für 8 Regionen (Speyer, Ludwigshafen,
Schifferstadt, Frankenthal, Neustadt, Mannheim, Heidelberg, Vorderpfalz + Default) je Objektart
(Wohnung/Haus/Gewerbe) plus Bodenrichtwert. Der Mittelwert entsteht aus Fläche × €/m², multipliziert
mit Faktoren für Zustand, Ausstattungsqualität, Baujahr, Energieklasse, Ausstattungs-Bonus
(max. +8 %) und — bei Wohnungen — einem **Hausgeld-Abschlag** (ab 3,50 €/m²/Monat, bis −12 %);
bei Häusern kommt anteilig Bodenwert fürs Grundstück dazu.

**Erdung an echten Daten (11.08.2026, Fall Manfred „Landauer Warte"):**

- Basiswerte beschreiben den **Median echter Abschlüsse** (Speyer per
  OnOffice-Vergleichsverkäufen rekalibriert; alle Orte:
  `scripts/preisanalyse-onoffice.mts` gibt einen REGIONS-Kalibriervorschlag aus).
- „Neuwertig" bei Baujahr < 1995 zählt nur **mit Kernsanierungs-Angabe** voll, sonst wie
  „gepflegt"; fehlende Energieklasse bei Baujahr < 1980 → konservative Annahme E. Beides wird als
  `annahmen[]` in UI und PDF offen ausgewiesen (Erwartungsmanagement).
- Der BRW-Mikrolagefaktor ist für Städte mit eigener Basis nach oben auf +6 % geklemmt
  (Stadt-Lage steckt schon in der Basis — keine Doppelzählung); nach unten bleibt −28 % für alle.
- **Plausibilitäts-Deckel:** liegt der Modell-€/m² über dem p75 der echten Orts-Abschlüsse
  (`src/lib/verkauft-stats.ts` aus dem OnOffice-Verkauft-Pool; Client via `/api/marktstats`,
  Server direkt), wird auf p75 gekappt — transparent als Faktor-Zeile + `plausibilisierung`.
- **Kennzahlen sind deterministisch** (kein `Math.random` mehr): Vergleichsobjekte = Zahl echter
  Orts-Abschlüsse (0 → „–"/„Modellwert"), Konfidenz = benannter Datenlage-Score (max. 92),
  Trend = dieselbe Hash-Mechanik wie der Preisatlas, Mikrolage aus dem BRW-Verhältnis,
  Rendite aus dem Regionalmodell.

Ergebnis ist eine Spanne (−7 %/+11 % um den Mittelwert), €/m², Kennzahlen und die Einzelfaktoren
mit %-Wirkung. Klar als Schätzung deklariert — **kein** Verkehrswertgutachten. Regressionsschutz:
`scripts/valuation-battery.mts` (inkl. Fall „Landauer Warte" als F15 und Determinismus-Anker F16).

### `src/lib/report-pdf.ts` — PDF-Generator (serverseitig)

Baut mit **pdf-lib + @pdf-lib/fontkit** einen 5-seitigen, markenkonformen A4-Report (dark):
Deckblatt mit Luftbild des Objekts, Bewertungsseite (Wert-Hero, Objekt-/Kennzahlen), Preis-Faktoren,
Vermarktungszeit & Markttrend, Endblatt mit Rechtlichem/Disclaimer und Ansprechpartner. AKIRA wird
per fontkit eingebettet, Logo/Cover/Grafiken liegen als Base64 in `src/lib/report-assets/`
(akira, mark, cover, visuals) — dadurch pure-JS ohne Dateisystem-/Browser-Abhängigkeit und
Vercel-serverless-tauglich. Rückgabe ist Base64, das `/api/report` als Resend-Attachment
(Buffer) verschickt. Kontaktdaten/Links im PDF zeigen auf riegel-immobilien.de
(beim Domain-Cutover prüfen, siehe [betrieb.md](./betrieb.md)).

## Benchmarks
Sprengnetter (Management-Summary, ImmoWertV/BelWertV/EBA), PriceHubble (AVM-Dossier, KI-Effizienzklasse,
Big-4-Prüfung), ImmoScout24 (kostenloses PDF, Vergleichsobjekte), HomeDay (5-Jahres-Kurven Wohnlage vs.
Stadt), McMakler (breitere Spanne bei Sondermerkmalen, „Orientierung").
