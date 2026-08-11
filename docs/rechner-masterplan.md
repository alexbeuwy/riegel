# Rechner-Masterplan — „Der beste Immorechner Deutschlands" (white-label)

> **Auftrag Alex (11.08.2026):** Engine + Rechner so planen, dass beuwy das System
> unabhängig von RIEGEL an alle deutschen OnOffice-Makler verkaufen kann — mit den
> echten Abschlussdaten des jeweiligen Maklers, aber robust für Makler, deren
> Abschlusszahl klein ist (n zu gering).
>
> Grundlagen: `preisatlas-research.md` (§1 Homeday-Teardown, §7 Quellen-Strategie),
> `bewertungsreport.md` (Engine-Stand), Fall „Landauer Warte" (`fortschritt.md`).

---

## 1. Positionierung: Was „bester" konkret heißt

Homeday/Portale gewinnen bei **Abdeckung** (jede Adresse, sofort). Dort schlagen wir
sie nicht — wir schlagen sie bei **Ehrlichkeit und lokaler Präzision**:

1. **Transaktions-verankert statt Angebots-Fantasie:** Der Rechner kennt echte
   notarielle Abschlüsse (Makler-Pool + künftig beuwy-Pool + GAA-Berichte) — genau
   die Daten, die Homeday laut eigenem Engineering-Blog NICHT hat (nur Listings).
2. **Transparent statt Blackbox:** Faktor-Zerlegung, `annahmen[]`, sichtbarer
   Plausibilitäts-Deckel, ehrliche Konfidenz. Der Eigentümer versteht, WARUM.
   (Seit 11.08.2026 produktiv — kein Wettbewerber macht das.)
3. **Ehrlich degradierend:** Wo Daten dünn sind, sagt der Rechner das („Modellwert")
   statt Pseudo-Präzision zu zeigen. Konfidenz ist ein benannter Datenlage-Score.
4. **Makler-Interesse statt Portal-Interesse:** Der Wert soll zum ABSCHLUSS führen
   (Vorgabe Inhaberseite: lieber leicht konservativ), nicht zur Lead-Maximierung
   durch Wunschpreise — das ist das strukturelle Alleinstellungsmerkmal gegenüber
   jedem Portal-Rechner, dessen Geschäftsmodell hohe Zahlen belohnt.

**Messbar wird „bester" über die Backtesting-KPI (s. §5):** medianer absoluter
Fehler gegen echte Abschlüsse im Kerngebiet < 10 % — Homeday-Klasse liegt öffentlich
bei „±10–20 % wenn es gut läuft" (IVD-Kritik, s. Research §1).

---

## 2. Daten-Architektur: fünf Schichten, ein Wasserfall

Jede Bewertung zieht die beste verfügbare Schicht; jede Schicht kennt ihr
Vertrauensgewicht. Nichts wird verworfen, alles wird gewichtet (s. §3).

| Schicht | Quelle | Deckt ab | Status |
|---|---|---|---|
| **S1 Makler-Abschlüsse** | OnOffice-Verkauft-Pool des Mandanten (`verkauft-stats.ts`) | Kerngebiet des Maklers | ✅ produktiv (p75-Deckel, Basis-Kalibrierung, MFH-Filter) |
| **S2 beuwy-Pool** | anonymisierte Abschluss-**Aggregate** ALLER white-label-Instanzen (Ort × Objektart × Quartal) | Kerngebiete aller Kunden — **wächst mit jedem Makler** | 🔲 P2 — der Netzwerk-Effekt und das eigentliche Daten-Asset von beuwy |
| **S3 Amtlich** | BORIS-Bodenrichtwerte (RLP/HE live, weitere Länder nach Zugang); **GAA-Marktberichte** als jährliche Kalibriertabelle (Kreis-Ebene, echte Kaufpreise, bundesweit) | flächendeckend, grob | ✅ BORIS · 🔲 P1 GAA-Tabelle |
| **S4 Lizenzierte Angebotsdaten** | Sprengnetter-API (enthält 2 Mio.+ Kaufpreise) ODER VALUE Marktdaten (Rohdaten, REST-API) — **× gemessener Angebots→Abschluss-Abschlag** | jede Adresse Deutschlands | 🔲 P3 — kostenpflichtig, je Instanz durchreichbar |
| **S5 Regionalmodell** | heutige REGIONS/STADT_FAKTOR, generalisiert auf Kreis-Typologie (Destatis/GREIX-Trends) | Fallback überall | ✅ vorhanden, wird P1 indexiert |

**Der Abschlags-Anker (Alleinstellung, 0 €):** Angebots- UND Abschlusspreis liegen im
eigenen OnOffice-Bestand nebeneinander — der Angebots→Abschluss-Abschlag wird je
Objektart/Region GEMESSEN statt geschätzt (Skript analog `preisanalyse-onoffice.mts`).
Damit werden Angebotsdaten (S4) seriös auf Verkaufsniveau umgerechnet — methodisch
das Homeday-Modell, nur mit ehrlicher Abschlagsbasis. Mit S2 wird der Abschlag je
Region über alle Makler robuster.

---

## 3. Das Kleine-n-Problem: Shrinkage statt Schwellen

**Problem:** RIEGEL hat 774 Verkäufe — ein neuer Makler vielleicht 30, verteilt auf
8 Orte. Harte Schwellen (heute: Deckel ab n≥5, Basis ab n≥20) lassen dünne Daten
komplett ungenutzt.

**Lösung: hierarchisches Schrumpfen (empirical Bayes)** — der Orts-Schätzwert ist
immer ein gewichteter Mix über die Hierarchie *Ort → Nachbarorte → Kreis → Land*:

```
schätzer(ort) = w₁·median(makler, ort)            n eigene Abschlüsse im Ort
              + w₂·median(pool, ort)              N Pool-Abschlüsse (S2)
              + w₃·median(nachbarorte, distanz-gewichtet)   geo-distance.ts existiert
              + w₄·kreiswert(GAA/S4)              flächendeckende Schicht
mit wᵢ ∝ nᵢ/(nᵢ+k)   (k = Schrumpf-Konstante je Ebene, aus Backtesting kalibriert)
```

Eigenschaften, die genau unser Problem lösen:

- **n=3 ist nicht mehr wertlos:** drei eigene Abschlüsse verschieben den Kreiswert
  spürbar in die richtige Richtung, dominieren ihn aber nicht.
- **n=79 (RIEGEL Speyer) verhält sich wie heute:** Eigenanteil dominiert.
- **Kein Klippen-Effekt** an Schwellen; die Konfidenz-Anzeige folgt denselben
  Gewichten (w₁+w₂ hoch = „auf echten Abschlüssen", w₄ dominiert = „Modellwert").
- **Zeit-Decay statt Wegwerfen:** alte Abschlüsse werden mit dem Trend-Index
  (GAA/GREIX/vdp) auf heute indexiert und mit Altersgewicht versehen — wichtig für
  kleine Makler, deren 30 Verkäufe über 8 Jahre verteilt sind.

Der heutige p75-**Deckel** bleibt als Sicherung obendrauf (Deckelquelle = dieselbe
gemischte Verteilung), die Faktor-Kette (Zustand/Baujahr/Energie/Hausgeld/…) bleibt
unverändert — Shrinkage ersetzt nur die BASIS-Herkunft, nicht die Objekt-Logik.

---

## 4. Produkt-Architektur: zentraler beuwy-Marktdaten-Dienst

Heute rechnet jede Instanz für sich. Ab P2 gibt es **einen zentralen Dienst**
(eigenes Supabase/PostGIS-Projekt der beuwy agency, strikt getrennt von den
Mandanten-DBs):

```
Makler-Instanz A ──┐  (Cron: eigene Abschluss-AGGREGATE hochmelden, opt-in)
Makler-Instanz B ──┼──▶  beuwy-Marktdaten-Dienst  ──▶  GET /marktstats?ort=…
Makler-Instanz C ──┘     (Pool S2 + GAA S3 + Lizenz S4 + Abschläge)   ▲
                                                jede Instanz fragt ihn│ statt selbst zu rechnen
```

- **Datenschutz/Recht by design:** hochgemeldet werden ausschließlich Aggregate
  (Ort × Objektart × Quartal: n, Median, p25, p75, Abschlag) — keine Adressen,
  keine Einzelpreise, kein Personenbezug. Vertragsklausel im white-label-Vertrag:
  Makler liefert Aggregate, erhält dafür den Pool-Vorteil aller. (Gleiche Logik
  wie `verkauft-stats.ts` heute, nur eine Ebene höher.)
- **Wettbewerbs-Sensibilität:** Ein Makler sieht nie die Aggregate eines einzelnen
  anderen Maklers — nur den Pool-Mix (min. 2 Quellen je Zelle, sonst fällt die
  Zelle auf S3/S4 zurück).
- **Ein Integrationspunkt für S4:** Die Sprengnetter-/VALUE-Lizenz wird EINMAL
  zentral angebunden; Instanzen zahlen anteilig (Pay-per-Use durchgereicht) —
  statt n Verträgen je Makler.
- Die Instanz-Seite existiert schon: `/api/marktstats` muss nur den zentralen
  Dienst befragen statt (nur) den lokalen Pool — Fallback bleibt lokal (fail-soft).

---

## 5. Qualitätssicherung: „bester" muss messbar sein

- **Backtesting-Harness (P1/P2, Pflicht vor jedem Engine-Release):** Für jeden
  echten Abschluss des Pools: Engine mit den damaligen Objektdaten rechnen lassen
  (leave-one-out — der Abschluss selbst fliegt aus der Kalibrierung) und gegen den
  notariellen Preis messen. KPIs je Segment (Ort × Objektart): **MdAPE** (Median-
  Fehler), Trefferquote „Verkaufspreis in [low, high]", Konfidenz-Kalibrierung
  (hohe Konfidenz ⇒ kleiner Fehler?). Ergebnis als Tabelle in `fortschritt.md` je
  Release; Zielmarke Kerngebiet: MdAPE < 10 %, Spannen-Trefferquote > 80 %.
- **`valuation-battery.mts`** bleibt der schnelle Regressionsschutz (F15 „Landauer
  Warte" etc.); das Backtesting ist die inhaltliche Wahrheit.
- **Feedback-Schleife Makler:** Manne-Fälle („Kunde ist Vollhorst :)") sind
  Gold — jeder gemeldete Ausreißer wird Battery-Fixture (Prozess: Report-PDF +
  Soll-Wert an beuwy, wir fixieren ihn als Fn).
- **ML erst, wenn die Daten es tragen:** Entscheidungsbäume à la Homeday ergeben
  erst Sinn ab zehntausenden eigenen+lizenzierten Datenpunkten (P4). Vorher schlägt
  das transparente Faktor-Modell + Shrinkage jedes untertrainierte ML — und bleibt
  erklärbar (unser Verkaufsargument).

---

## 6. Roadmap mit Abnahme-Kriterien

| Phase | Inhalt | Abnahme |
|---|---|---|
| **P0 ✅ (11.08.2026)** | Deterministische, geerdete, selbst-kalibrierende Engine je Makler (Deckel, Annahmen, Hausgeld, Kernsaniert, echte Kennzahlen) | Battery grün, Fall Manfred 300 T€ |
| **P1 — Daten härten (0 €)** | ① Abschlags-Skript (Angebot vs. Abschluss aus OnOffice) ② GAA-Kalibriertabelle RLP/BW/HE (jährlicher Parse, Kreis-Ebene) ③ Shrinkage-Mix statt harter n-Schwellen ④ Zeit-Indexierung alter Abschlüsse | Backtesting-Harness läuft; MdAPE Kerngebiet gemessen und < Vorher-Wert |
| **P2 — beuwy-Pool** | Zentraler Marktdaten-Dienst (Aggregate-Upload per Cron, Pool-Mix-API, Mindest-2-Quellen-Regel); Instanz-`/api/marktstats` andocken; Vertragsklausel-Muster | Zwei Instanzen (RIEGEL + Testklon) speisen & lesen den Pool; Doku im Migrations-Playbook |
| **P3 — Bundesweite Abdeckung** | Sprengnetter-API (erste Wahl: OnOffice-Nähe, echte Kaufpreise, Pay-per-Use) zentral anbinden; Angebotsdaten × gemessener Abschlag als S4; Preisatlas-Ausbau auf beliebige Regionen | Beliebige deutsche Adresse liefert Wert + ehrliche Konfidenz; Kosten je Bewertung bekannt & durchreichbar |
| **P4 — Kür** | Mikrolagen-Features (OSM: Lärm/ÖPNV/POI), Vergleichsobjekte im Web-Ergebnis (heute nur PDF), ggf. ML-Layer auf dem dann großen Datenbestand | Backtesting-KPI schlägt P3-Stand signifikant |

**Nicht tun (bewusst):** Portale crawlen (Research §7.1 — rechtlich nicht
verteidigbar, und lizenzierbar für Geld); BW-BORIS ohne schriftliche Zusage;
ML vor ausreichender Datenbasis; Präzisions-Theater (Kennzahlen ohne Datenbasis).

---

## 7. Warum das als Produkt funktioniert (beuwy-Brille)

- **Netzwerk-Effekt als Burggraben:** Jeder neue Makler verbessert den Pool aller —
  das kann kein Einzelmakler-Tool und kein Portal-Widget nachbauen; Wechselkosten
  steigen mit jedem Quartal Poolbeitrag.
- **Ehrlichkeit als Marketing:** „Rechner, der mit echten notariellen Abschlüssen
  Ihres Maklers rechnet — und Ihnen sagt, was er annimmt" ist eine Story gegen
  jeden Homeday-Klon; die IVD-Kritik an Homeday ist unsere Verkaufsfolie.
- **Kostenstruktur:** P1 kostet Arbeitszeit, P2 eine kleine zentrale Infrastruktur,
  erst P3 laufende Lizenzkosten — die pro Instanz durchgereicht werden können.
- **Migration:** Alles hier ist mandanten-neutral gebaut (s. Playbook §3.3/§8) —
  neue Instanzen erben Engine + Pool-Anschluss ohne Datenübernahme.
