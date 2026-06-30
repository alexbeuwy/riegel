# HomeDay Preisatlas — Analyse & RIEGEL-Alternative

Ziel: Den HomeDay Preisatlas verstehen und das eigene RIEGEL-Bewertungstool als
**attraktivere, unabhängige Alternative** positionieren (Pitch + Argumente).

## Was ist der Preisatlas?

`preisatlas.homeday.de` — ein kostenloses, deutschlandweites Karten-Tool, das
Quadratmeter-Preise für Wohnungen/Häuser bis auf Straßenabschnitts-Ebene anzeigt.
Es ist eines der reichweitenstärksten **Lead-Magnete** im deutschen Immobilienmarkt.

**Funnel-Mechanik (so entstehen Leads):**
1. Nutzer sucht „Immobilienpreise {Ort}" → landet via SEO auf einer Preisatlas-Seite.
2. Karte zeigt grobe €/m²-Spannen kostenlos an (Top-of-Funnel, hohe Reichweite).
3. Für die **konkrete Bewertung der eigenen Immobilie** muss man Objektdaten +
   **E-Mail/Telefon** hinterlassen (Gate).
4. Der so erzeugte **Verkäufer-Lead** wird an HomeDay bzw. **Partner-Makler**
   weitergegeben — der Lead ist das eigentliche Produkt.

## Lead-Volumen — ehrliche Einordnung

Konkrete Lead-Zahlen des Preisatlas sind **nicht öffentlich** (HomeDay nennt keine
belastbaren Funnel-Zahlen). Was sich belegen lässt / einordnen lässt:

- HomeDay wurde als Tech-Makler mit zweistelligen Millionen-Investments aufgebaut
  und 2021 mehrheitlich von **Engel & Völkers** übernommen — der Preisatlas ist
  bewusst als **SEO-Reichweiten- und Lead-Maschine** konzipiert.
- Solche bundesweiten Preis-Tools erzeugen typischerweise **hohe fünf- bis
  sechsstellige** Bewertungs-/Lead-Mengen pro Jahr (Branchen-Größenordnung,
  keine offizielle HomeDay-Zahl).
- Für einen **regionalen** Makler wie RIEGEL ist nicht die bundesweite Masse
  relevant, sondern der **Anteil in Speyer/Ludwigshafen/Vorderpfalz** — und genau
  dort sind die Leads bei HomeDay **nicht exklusiv** und gehen an wechselnde Partner.

> Quellenlage: exakte Preisatlas-Lead-Zahlen sind nicht publiziert; obige Aussagen
> sind als belegbare Einordnung markiert, nicht als HomeDay-Statistik.

## Warum ein eigenes RIEGEL-Tool die bessere Wahl ist

| Dimension | HomeDay Preisatlas | RIEGEL-Rechner (eigenes Tool) |
|---|---|---|
| Lead-Eigentum | Lead geht an HomeDay / wechselnde Partner | **100 % RIEGEL** — kein Teilen mit Wettbewerbern |
| Marke | HomeDay-Marke, RIEGEL unsichtbar | **RIEGEL** vom ersten Klick bis zum Report |
| Regionale Präzision | bundesweites Modell | Vorderpfalz-Daten, Bodenrichtwerte, lokale Vergleichsobjekte |
| Datenhoheit/DSGVO | Daten bei Dritt-Plattform | Daten in **eigener** Supabase (EU), volle Kontrolle |
| Folge-Conversion | generische Makler-Vermittlung | direkter Funnel → **PDF-Report + Vor-Ort-Termin** bei RIEGEL |
| Kosten | indirekt (Lead-Abhängigkeit / Provisionslogik) | einmalig gebaut, dann **laufend kostenlos** im eigenen Haus |

## Pitch (Copy)

**Headline:** „Warum HomeDay Ihre Leads bekommt — und nicht Sie?"

**Subline:** Der RIEGEL-Rechner liefert dieselbe Sofort-Bewertung wie der Preisatlas
— nur landet die Anfrage direkt bei Ihnen, in Ihrer Marke, mit Ihren Daten. Kein
Umweg über eine Plattform, die denselben Lead morgen an den Wettbewerber gibt.

**Drei Punkte fürs Deck / Verkaufsgespräch:**
1. **Eigener Lead-Magnet statt fremder.** Jede Adresse, die geprüft wird, ist ein
   RIEGEL-Lead — protokolliert in `valuation_requests`, nachvollziehbar im Backend.
2. **Report als Türöffner.** Statt nur einer Zahl: ein gebrandeter PDF-Marktwert-
   Report an den Kunden (und als CC an RIEGEL) → natürlicher Anlass für den Vor-Ort-Termin.
3. **Regional schlägt bundesweit.** Vorderpfalz-Vergleichsdaten + persönlicher
   Ansprechpartner schaffen mehr Vertrauen als ein anonymes Deutschland-Modell.

## Umsetzungsstand bei RIEGEL

- ✅ Sofort-Bewertung im Rechner (große Zahl + Spanne + €/m², ohne Kontakt-Gate vorab)
- ✅ Report-Funnel: **PDF-Report** an Kunde **und** interne CC an RIEGEL (`/api/report`)
- ✅ Lead-Protokoll in Supabase `valuation_requests` (wer prüft welches Objekt)
- ✅ Internes Lead-Dashboard `/intern`
- 🔜 Optional: Heatmap-/Preiskarten-Ansicht als sichtbares „Preisatlas"-Pendant
