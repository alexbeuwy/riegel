# Preis-Tool / „Immorechner" – Research & Entscheidung

Die große Feature-Frage: **Homeday-Preisatlas-Klon (interaktive Preis-KARTE)** vs. **Premium-RECHNER**.
Querverweise: [RELAUNCH-LOG.md](../RELAUNCH-LOG.md) (D7/D8) · [architecture.md](./architecture.md) · [legal-checklist.md](./legal-checklist.md)

---

## TL;DR – Entscheidung

> **Calculator-first, regionale Karte später (Phased Hybrid).**
> Ein echter Homeday-Preisatlas ist für eine Einzelmaklerin **nicht** machbar. Wir bauen:
> 1. **Phase A** – einen hochwertig designten **Bewertungs-/Schätzrechner** mit Lead-Capture direkt in OnOffice. Wenn Budget/Lizenz da: Engine = lizenziertes AVM (PriceHubble oder Sprengnetter, beide bereits im OnOffice-Marketplace). Sonst: transparenter Schätzer aus freien amtlichen Daten.
> 2. **Phase B (optional, sichtbare „Karte")** – eine **regionale Choropleth-Karte aus FREIEN amtlichen BORIS-RLP-Bodenrichtwerten** (dl-de/by-2.0) auf MapLibre, sauber als Bodenwert gelabelt, mit CTA in den Rechner.

Begründung: ehrlich machbar, rechtlich sauber, deckt Client-Wünsche #6 (Leads in CRM) + #11 (Preis-Tool) ab, und vermeidet die ML-/Scraping-/Lizenz-Sackgasse.

---

## 1. Homeday-Preisatlas – Teardown

**Was er zeigt:** Kostenlose, deutschlandweite interaktive Karte. Quadratmeterpreis (Kauf **und** Miete), getrennt Haus vs. Wohnung. Granularität von Bund → Bundesland/Kreis/Stadt/PLZ/Stadtteil bis runter zum **„Wohnblock"** (per Adresssuche). 3–5-Jahres-Trends, 2000+ Städte.

**Woher die Daten kommen – DAS entscheidende Finding:** Laut Homeday-Engineering-Blog **keine** amtlichen Transaktionsdaten, sondern **~10 Mio.+ ANGEBOTSPREISE** (Listings), gescraped/aggregiert aus 300+ Portalen + Zeitungen (letzte ~5 Jahre), geocodiert via Google, durch ein **Decision-Tree-ML-Modell (AVM)** über ~150 Standort-Features. Sie nutzen **nicht** die notarielle Kaufpreissammlung.

**Methodik:** Decision Trees gewählt (simulieren am ehesten den manuellen Gutachter-Prozess), ~150 Features pro Block, Training auf AWS Batch/EC2-Spot, regelmäßig retrained. Stack-Hinweise: PostgreSQL-Geo, OSM, Google Geocoding.

**Karten-Tech:** Mapbox GL JS **v0.54.0** (aus dem Page-Source bestätigt – alte Version; moderner Rebuild würde MapLibre nutzen).

**IVD-Kritik (Maklerverband):** Es werden **Angebote**, keine verifizierten Verkaufspreise ausgewertet; ob die Angebote zu Verkäufen führten, bleibt unklar. „Hier wird nur mit Wasser gekocht." Der Atlas ist faktisch ein **Lead-Gen-Funnel**. Für exakten Wert braucht es einen Gutachter vor Ort / die amtlichen Gutachterausschüsse.

**Wettbewerber-Sourcing:**
- ImmoScout24 Preisatlas: AVM in Kooperation mit **Sprengnetter** + Deutsche-Post-Direkt-Mikrogeografie.
- Immowelt Price Map: eigene Mio. Listings + Meilleurs-Agents-Cluster-Modell.
- iib: einbettbare Karten auf KGS-Basis (buy-and-embed).
- Sprengnetter / PriceHubble: lizenzierte AVM/MAPS-APIs für Makler.

**Fazit Machbarkeit:** Ein „echter" Preisatlas = entweder (a) Multi-Mio-Listing-Scraping-Pipeline + ML-Team (Homeday-Pfad, **solo nicht machbar**) oder (b) bezahlte AVM-Lizenz. Punkt.

---

## 2. Deutsche Preisdaten-Landschaft (Lizenz / Kosten / Granularität)

| Quelle | Was | Granularität | Lizenz / Kosten | Für uns nutzbar? |
|---|---|---|---|---|
| **BORIS-RLP / VBORIS** (LVermGeo RLP) | Zonale **Bodenrichtwerte** (€/m² **Boden**) ganz RLP inkl. Speyer/Rhein-Pfalz-Kreis | Zone | **FREI**, dl-de/by-2.0, WMS/WFS `geoportal.rlp.de/spatial-objects/548` (GeoJSON-Output), kein Login für Basisdienst | **JA – bestes lokales freies Asset.** Achtung: Bodenwert, **nicht** Wohnungs-€/m². Premiumdienst (~95 €/Bereich/2 J.) nur für Zusatzattribute – brauchen wir nicht. |
| **Gutachterausschuss RLP – LGMB** | Landesgrundstücksmarktbericht (~294 S. PDF, zuletzt 20.03.2025): Indizes, Durchschnittspreise, Bodenrichtwert-Analysen | Region | **FREI** als PDF | JA – als zitierte Benchmark. **Rohe Kaufpreissammlung = NICHT öffentlich.** |
| **GREIX** (IfW Kiel) | Transaktionsbasierter Index (notarielle Verkäufe), hedonisch, ab 1960, quartalsweise | ~21 Städte | **FREI** | Nur als regionaler/nationaler Trend-Benchmark – **Speyer/Ludwigshafen/Mannheim NICHT abgedeckt** (nächste: Karlsruhe/Frankfurt/Wiesbaden). |
| **Destatis / Regionalstatistik GENESIS** | Häuserpreisindex (national, 5 Regionstypen), Baulandpreise, Kaufwerte Bauland | Kreis/Gemeinde-Größenklasse | **FREI**, dl-de/by-2.0, REST-API. **Seit 19.05.2025 Registrierung nötig; ab 27.11.2025 nur REST-POST** | JA – Makro-Kontext + Bauland-€/m² je Kreis. Kein Wohnungs-Level. |
| **vdp-Index** | Transaktionsbasiert (Mitgliedsbanken), Bestand | national/regional in Publikationen | FREI (Report) | Markttrend-Chart. |
| **Europace EPX Hedonic** | hedonisch, monatlich ab 2005, ~20 % der priv. Baufinanzierungen | **national** | FREI mit Attribution „Europace als Quelle" | Trend-Chart. |
| **Sprengnetter AVM-API** | Marktpreis + Range, Miete, Forecast; lernt aus 300k+ Kaufpreisen/Jahr | **Adresse** | Kostenpflichtig, Einstieg ~25–29 €/Monat-Klasse, Enterprise on request | **Phase-2-Option** – günstigster Einstieg. |
| **PriceHubble** | AVM-API + Copy-Paste **Lead-Generator-Widget** | **Adresse** | on request, ~99 €+/Monat-Klasse | **Phase-2-Option** – beste Lead-Gen-UX, **bereits im OnOffice-Marketplace**. |
| **BKG VG250** | Verwaltungsgrenzen (Gemeinde/Kreis, AGS) | Gemeinde | FREI, dl-de/by-2.0 | JA – Choropleth-Geometrien (sauberste Lizenz). |
| **OSM/Geofabrik PLZ-Polygone** | Postleitzahl-Gebiete | PLZ | FREI, **ODbL (Share-Alike)** | JA, aber ODbL-Verkettung beachten → wo möglich VG250 bevorzugen. |
| **Portale scrapen (ImmoScout/Immowelt)** | Angebotspreise | Adresse | — | **NEIN.** §87a-e UrhG (Datenbankherstellerrecht), Portal-AGB/robots.txt (kippt §44b-TDM-Ausnahme), UWG. Nicht verteidigbar. Siehe [legal-checklist.md](./legal-checklist.md). |

**Lokale Preis-Anker (Sanity-Check, 2026):** Speyer Häuser ~4.128 €/m² (Range 2.014–8.256), Wohnungen ~3.464 €/m² (+3,7 % YoY); Ludwigshafen Häuser ~3.324 €/m², Wohnungen ~2.862 €/m² (+0,7 % YoY). Stammt aus Listing-Aggregatoren → starke Varianz zwischen Anbietern ⇒ **jede Einzelzahl als RANGE mit Disclaimer zeigen.**

---

## 3. Karten-Tech-Vergleich

| Option | Kosten | Bemerkung |
|---|---|---|
| **MapLibre GL JS** (MIT) | frei | **Empfehlung.** OSS-Fork von Mapbox GL, keine nutzungsbasierten Map-Load-Gebühren. |
| Mapbox GL JS | nutzungsbasiert | Was Homeday nutzt; Kostenfalle bei Skalierung. Vermeiden. |
| Google Maps | nutzungsbasiert + **DSGVO-Reibung** | US-Transfer, Opt-in-Pflicht. Vermeiden. |
| Tiles | — | MapTiler / Stadia (keyed, free tier) oder self-hosted OSM. **Nie Google-Tiles.** |

Performance: volle RLP-Bodenrichtwert-Polygonsätze sind groß → server-seitig in Supabase/PostGIS normalisieren, `ST_Simplify` + Vector-Tiles oder vereinfachtes GeoJSON, viewport-lazy laden. Sonst leidet LCP.

---

## 4. OnOffice löst das meiste bereits

OnOffice-Marketplace integriert **PriceHubble** (interaktive Wertanalyse: Bewertung, Lageeinschätzung, Vergleichsobjekte, sozioökonomische + Infrastruktur-Daten) **und** **Sprengnetter** (Auto-Bewertung beim Speichern, im CRM kostenlos nutzbar).

**Wichtige Grenze:** Der OnOffice-interne PriceHubble-Report ist **nicht** als auf der Public-Website einbettbar dokumentiert. Für ein öffentliches Widget braucht es PriceHubbles separates **Lead-Generator**-Produkt oder Sprengnetters **MAPS-API**. Leads fließen dann sauber Widget → CRM.

→ **Offene Frage an Sissy/OnOffice:** Welches AVM ist im Tarif enthalten, und erlaubt er Public-Website-Nutzung oder nur In-CRM? (Siehe [RELAUNCH-LOG.md](../RELAUNCH-LOG.md) „Nächste Schritte".)

---

## 5. Empfohlene Pipeline (konkret)

### Phase A – Rechner (Must für „Preis-Tool")
**Variante A1 (wenn AVM-Lizenz für Web vorhanden):** Server-seitiger Call an PriceHubble/Sprengnetter-API aus Next.js Route Handler → **eigenes** Premium-Result-UI (Range, Trend, Vergleichsobjekte) im Dark/edel-CI rendern. Oder: PriceHubble Lead-Generator-Widget, CI-gestyled, hinter Consent-Gate. ~50–200 €/Monat-Klasse, amortisiert sich mit **einem** Mandat.

**Variante A2 (100 % frei, falls kein Budget):** Transparenter Schätzer = User-Inputs (Wohnfläche, Zustand, Baujahr, Lage) × €/m²-Band aus LGMB/GENESIS + Bodenrichtwert als Bodenwert-Anker. Immer als **Range** mit Disclaimer „Richtwert, keine Verkehrswertermittlung nach ImmoWertV".

Beide Varianten: Lead-Capture → Server Action → Supabase `leads` → OnOffice `create address` (siehe [onoffice-integration.md](./onoffice-integration.md)). Framing als kostenlose „Was ist meine Immobilie wert?"-Bewertung (ersetzt das Legacy-`/rechner/` + den Menüpunkt „Kostenlose Immobilienbewertung").

### Phase B – Regionale Karte (optional, „sichtbare Karte")
1. BORIS-RLP Basisdienst-WFS (`geoportal.rlp.de/spatial-objects/548`, GeoJSON) abrufen.
2. Polygone server-seitig in Supabase/PostGIS cachen, `ST_Simplify`, als Vector-Tiles / kompaktes GeoJSON ausliefern.
3. MapLibre-Karte, Choropleth nach Bodenrichtwert + optional eigene AVM-€/m²-Bänder für Speyer/Ludwigshafen/Vorderpfalz.
4. **Pflicht-Attribution** „© GeoBasis-DE / LVermGeo RLP (dl-de/by-2.0)" + OSM/ODbL wo genutzt.
5. Klare Labels „Bodenwert, kein Objektpreis" + „Schätzwerte / keine Verkehrswertermittlung" + CTA in den Rechner.

**Architektur:** alle AVM-/OnOffice-Keys server-seitig; AVM-Responses + BORIS-Daten in Supabase cachen (Kosten/Latenz). Nie eine Einzel-„Hero-Zahl", immer Range. Nie ein verbindlicher Verkehrswert.

---

## 6. Risiken

- **Erwartungs-Management:** Bodenrichtwerte sind Bodenwerte, nicht fertige Wohnungs-€/m². Eine Bodenrichtwert-Karte wirkt „weniger präzise" als Homedays Per-Block-Farben. Sissy muss verstehen: freie amtliche Daten erreichen Homedays scraped-Granularität nicht.
- **Scraping = Haftung** (§87a-e UrhG, AGB, UWG) – Pfad komplett vermeiden.
- **Bewertungs-Haftung:** AVM-Zahl als autoritativ darzustellen kann Verkehrswert-/Beratungshaftung auslösen. Pflicht-Disclaimer + Range mildern; mit Anwalt abstimmen (Wunsch #10).
- **AVM-Genauigkeit** in Mikrolagen Speyer/Ludwigshafen ggf. dünn; Anbieter-Schätzungen variieren stark → über-präzise Zahlen erodieren Vertrauen.
- **DSGVO:** Tool ist Lead-Capture mit Personen-/Objektdaten → Consent, AVV mit AVM-Anbieter, Datenschutzerklärung; Consent-Tool muss Drittanbieter-Widget gaten.
- **Vendor-Lock-in/laufende Kosten** vs. Designkontrolle (Widget = schnell, wenig Kontrolle; API + eigenes UI = mehr Bauaufwand, volle Kontrolle).
- **dl-de/by-2.0 Attributionspflicht** + **ODbL Share-Alike** (PLZ-Polygone) sauber einhalten; VG250 bevorzugen.
- **GENESIS-API-Änderungen** (Registrierung seit 19.05.2025, nur REST-POST ab 27.11.2025) – gegen REST-POST bauen, Key server-seitig.
- **RLP-WFS-Nutzungsbedingungen:** schriftlich bei LVermGeo (`vertrieb-geodienste@vermkv.rlp.de`) bestätigen lassen, dass server-seitiges Caching + öffentliche Wiedergabe unter Attribution für eine kommerzielle Maklerseite abgedeckt ist.

---

## Quellen
- Homeday Preisatlas: <https://www.homeday.de/de/preisatlas>
- Homeday Eng-Blog Teil 1/2: <https://medium.com/homeday/preisatlas-transparent-real-estate-prices-in-germany-part-1-926e22619ea3> · <https://medium.com/homeday/preisatlas-transparent-real-estate-prices-in-germany-part-2-7a24c9ebaefd>
- IVD-Kritik: <https://ivd-plus.de/homeday-preisatlas/>
- ImmoScout24 Preisatlas (Sprengnetter): <https://www.immobilienscout24.de/unternehmen/news-medien/news/default-title/preisatlas-bringt-mehr-transparenz/>
- Sprengnetter AVM-API: <https://www.sprengnetter.de/avm-api/> · Shop: <https://shop.sprengnetter.de/AVM-API/10723>
- PriceHubble Lead-Generator: <https://support.pricehubble.com/hc/de/articles/38271599570833-Lead-Generator-Widget-auf-Webseiten-einbinden>
- OnOffice PriceHubble/Sprengnetter: <https://de.enterprisehilfe.onoffice.com/help_entries/additional-information-for-individual-providers/pricehubble-deutschland-gmbh-interactive-property-value-analysis/?lang=en> · <https://de.enterprisehilfe.onoffice.com/help_entries/additional-information-for-individual-providers/sprengnetter-property-valuation/?lang=en>
- BORIS-RLP WFS: <https://www.geoportal.rlp.de/spatial-objects/548> · Basis-/Premiumdienst: <https://www.geoportal.rlp.de/article/Bodenrichtwerte/> · Open Data: <https://open.rlp.de/de/suchergebnisse/dataset/vboris-rlp-bodenrichtwert-basisdienst>
- LVermGeo Open Data (dl-de/by-2.0): <https://lvermgeo.rlp.de/geodaten-geoshop/open-data>
- Gutachterausschuss RLP / LGMB: <https://gutachterausschuesse.rlp.de/marktdaten/landesgrundstuecksmarktbericht-rheinland-pfalz-lgmb>
- GREIX: <https://greix.de/> · Kiel: <https://www.kielinstitut.de/institute/research-centers/macroeconomics/macrofinance/german-real-estate-index-greix/>
- Destatis GENESIS API: <https://www.destatis.de/DE/Service/OpenData/genesis-api-webservice-oberflaeche.html> · Regionalstatistik: <https://www.regionalstatistik.de/genesis/online>
- Europace EPX: <https://europace.de/epx-hedonic/> · vdp: <https://www.pfandbrief.de/en/vdp-property-price-index/>
- BKG VG250: <https://gdz.bkg.bund.de/index.php/default/verwaltungsgebiete-1-250-000-stand-01-01-vg250-01-01.html>
- OSM PLZ (Geofabrik, ODbL): <https://www.geofabrik.de/de/data/postalcodes.html>
- BORIS-D (national): <https://www.bodenrichtwerte-boris.de/>
- MapLibre: <https://maplibre.org/maplibre-gl-js/docs/>
- Scraping-Recht: <https://www.rechtzweinull.de/screen-scraping-wann-ist-das-auslesen-und-die-veroeffentlichung-fremder-daten-zulaessig/>

---

## Update — HomeDay Preisatlas: Mechanik, Lead-Zahlen, RIEGEL-Positionierung

**Was es ist:** Kostenloses, anmeldefreies Tool (preisatlas.homeday.de) von HomeDay (Berlin, mehrheitlich
Purplebricks/Axel Springer). Adresse rein → straßengenaue €/m² (Kauf/Miete), 5-Jahres-Entwicklung,
Lage-Scores. Datenbasis: Angebotsdaten aus 300+ Portalen, >2.000 Städte. **Der Preisatlas selbst ist
KEIN E-Mail-Gate** — das Lead-Tool ist die separate „kostenlose Immobilienbewertung".

**Funnel:** Stufe 1 (Reichweite/SEO, friktionsfrei, kein Login) → Stufe 2 (Bewertung: erste Online-Schätzung
ohne Anmeldung, dann **E-Mail + Telefon** fürs „genaue" Ergebnis = der Lead) → HomeDay vermittelt an
Partnermakler und nimmt **~35 % der Maklerprovision** bei Abschluss.

**Lead-Zahlen (ehrlich):** HomeDay veröffentlicht **keine** konkreten Lead-/Bewertungszahlen.
Belastbar nur: ~842k Visits/Monat auf homeday.de (Semrush, Nov 2024; ~37 % organisch); „über 30.000
Eigentümer" haben den Bewertungs-Service genutzt (kumulierte, undatierte Marketing-Zahl). Conversion
Lead→Abschluss ist proprietär; jede präzise Zahl wäre Spekulation.

**RIEGEL-Positionierung (eigenes Tool als bessere Alternative):**
1. **Unabhängigkeit** — keine Lead-Weitergabe an Wettbewerber, kein Provisions-Split (~35 % bleiben im Haus).
2. **Datenhoheit/DSGVO** — Leads exklusiv bei RIEGEL, kein fremder Makler ruft an.
3. **Qualität/Transparenz** — aktuelle, nachvollziehbare Methodik statt „Schätzung jetzt, Wahrheit später".
4. **Volle Wertschöpfung & Kundenbeziehung** im Haus.
5. **Markenvertrauen** — „Ihre Bewertung gehört Ihnen, kein Verkaufsdruck".
6. **SEO-Asset im eigenen Besitz** — der Traffic-Hebel arbeitet für RIEGELs Domain, nicht für HomeDay.

**Pitch-Line:** „Eigene Bewertung, eigene Leads, eigene Regeln — statt 35 % Provision an HomeDay und
Eigentümerdaten an fremde Makler."
