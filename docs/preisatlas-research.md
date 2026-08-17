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


---

## Bodenrichtwerte Baden-Württemberg (Mannheim/Heidelberg/Weinheim) — Befund & Entscheidung gegen Anbindung

**Frage:** Gibt es für BW einen zu VBORIS-RLP vergleichbar freien, loginfreien, dokumentierten
Bodenrichtwert-Dienst (WMS/WFS/API)? Geprüft: BORIS-BW (`gutachterausschuesse-bw.de/borisbw`),
`geoportal-bw.de`, LGL-BW Open GeoData (`opengeodata.lgl-bw.de`), `owsproxy.lgl-bw.de`.

**Technischer Befund (per curl verifiziert, 2026-07-02):** BORIS-BW ist eine map.apps-Anwendung
(con terra), die clientseitig einen ArcGIS-REST-MapServer unter
`https://www.gis.nrw.de/arcgis/rest/services/immobilien/boris_bw_bodenrichtwerte_current/MapServer`
abfragt — betrieben von IT.NRW, offenbar als Whitelabel-Backend für mehrere Bundesländer (dieselbe
Infrastruktur hostet auch BORIS-NRW-Layer im selben Service-Ordner). Mit einem `Referer`-Header
(`https://www.gutachterausschuesse-bw.de/borisbw/`) liefert die `identify`-Operation saubere,
strukturierte JSON-Treffer (`BRW`, `STAG`, `GENA`, `NUTA`, `GESL` …) — technisch sogar einfacher
parsebar als RLPs HTML-Tabelle.

- **Test 1 — Mannheim** (lat 49.4875, lng 8.4660): Treffer, `BRW: 5600 €/m²`, `NUTA: MK`, Stichtag
  01.01.2025, `JAHR: 2026`. Funktioniert.
- **Test 2 — Heidelberg** (Bahnstadt, lat 49.3988, lng 8.6724) und **Weinheim** (lat 49.5490,
  lng 8.6720) im `_current`-Dienst: **beide liefern `brw_available: false`** — der jeweils
  zuständige (dezentrale) Gutachterausschuss hat für den aktuellen Jahrgang schlicht noch nichts
  veröffentlicht. Erst im historischen Dienst (`boris_bw_bodenrichtwerte`, ohne `_current`) taucht
  für die Heidelberg-Zone überhaupt ein Wert auf — aber nur für die Jahrgänge 2022 und 2024;
  2016–2021, 2023, 2025 und 2026 sind für exakt diese Zone als „nicht verfügbar" markiert.

**Warum das trotz technisch funktionierendem Zugriff NICHT übernommen wird:**

1. **Kein dokumentierter API-Vertrag.** Einzige „Zugangskontrolle" ist ein trivial spoofbarer
   `Referer`-Header — der Endpunkt ist nirgends als Integrationsschnittstelle für Dritte beworben
   oder dokumentiert, anders als VBORIS-RLP (explizit als Open-Data-WMS mit fester URL und
   dl-de/by-2.0-Lizenz veröffentlicht, s. LVermGeo Open Data). Der `Nutzungsbedingungen`-Link der
   BORIS-BW-App selbst war per direktem Abruf nicht auflösbar (404) — keine belastbare
   Lizenzzusage für maschinellen/kommerziellen Zugriff auffindbar.
2. **Fragmentierte, unzuverlässige Abdeckung statt einer zentralen Landesstelle.** RLP hat mit
   LVermGeo eine zentrale Stelle mit einheitlichem Jahrgang. BW organisiert Bodenrichtwerte über
   **~44 unabhängige, dezentrale Gutachterausschüsse**, jeder mit eigenem Veröffentlichungsturnus.
   Das zeigt sich exakt an der für uns relevanten RLP-Grenze: Mannheim aktuell verfügbar,
   Heidelberg/Weinheim nicht. Ein Produktionsdienst müsste pro Koordinate über mehrere
   Jahrgangs-Layer/-Services raten und hätte trotzdem keine Garantie, überhaupt einen Wert zu
   finden — das ist kein amtlicher Flächen-Layer, sondern ein löchriger Reverse-Engineering-Zugriff
   auf einer fremden Landes-IT-Infrastruktur (IT.NRW statt LGL-BW/ZGG-BW).
3. **Bricht ohne Vorwarnung.** Da der Zugriffsweg nirgends öffentlich spezifiziert ist, kann sich
   Format, Pfad oder Zugriffsschutz jederzeit ändern, ohne dass wir es vorher erfahren — anders als
   bei einem publizierten Open-Data-Endpunkt.

**Entscheidung:** Kein Code geändert. `boris.ts` / `route.ts` bleiben strikt auf RLP (VBORIS)
begrenzt (`RLP_BBOX`); BW-Koordinaten laufen weiterhin durch den Modell-Fallback des Rechners. Für
den Kunden reicht das ausdrücklich („Annäherung reicht, vor Ort wird exakt bewertet") — eine
fragile, undokumentierte Abhängigkeit von einer fremden Landes-IT-Infrastruktur mit lückenhafter
BW-Abdeckung wäre das falsche Aufwand/Nutzen/Risiko-Verhältnis für ein Feature, das ohnehin nur eine
Näherung liefern soll.

**Falls sich das später ändert:** Bei schriftlicher Nutzungszusage von LGL-BW/ZGG-BW für
programmatischen Zugriff und belastbar vollständiger BW-Abdeckung ließe sich dieselbe fail-soft-
Architektur wie in `boris.ts` (Cache, Timeout, `confirmed`-Flag, `warnOnce`) um einen zweiten,
per BBox gerouteten Provider erweitern.

**Quellen:**
- BORIS-BW (Anwendung): <https://www.gutachterausschuesse-bw.de/borisbw/>
- ArcGIS REST (technisch, undokumentiert, per curl verifiziert): <https://www.gis.nrw.de/arcgis/rest/services/immobilien/boris_bw_bodenrichtwerte_current/MapServer>
- LGL-BW Open Data: <https://www.lgl-bw.de/Produkte/Open-Data/index.html> · <https://opengeodata.lgl-bw.de/>
- ZGG-BW (Zentrale Geschäftsstelle Gutachterausschüsse BW): <https://www.zgg-bw.de/BORIS-BW/index.html>

---

## Bodenrichtwerte Hessen (Lampertheim/Viernheim/Bürstadt) — Befund & Anbindung (2026-08-08)

**Anlass:** Kundin mit Bungalow in Lampertheim (Fall Manfred) — Hessen-Teil der Metropolregion
lief komplett über Modellwerte. Wunsch Alex: BW und Hessen anbinden.

**Befund Hessen: bester Dienst aller drei Länder.** Die HVBG veröffentlicht die zonalen
Bodenrichtwerte als dokumentierten Open-Data-**WFS 2.0** (nicht nur WMS wie RLP):
`https://www.gds.hessen.de/wfs2/boris/cgi-bin/brw/{stichtagsjahr}/wfs`, Jahrgänge alle zwei
Jahre (2020/2022/2024 verifiziert; 2026 bei Anbindung noch 404 — Discovery mit Fallback
eingebaut). Die Capabilities erklären den automatisierten, kostenfreien Abruf inkl. Einbindung
in **kommerzielle** Produkte ausdrücklich für erlaubt (§ 1 Abs. 2 GAKostG, § 17 Abs. 4
BauGB-AV). Punktabfrage per WFS-Intersects auf `adv:position` (EPSG:25832; WGS84→UTM32-
Umrechnung in lib/boris.ts), Feature `boris:BR_BodenrichtwertZonal`, strukturierte
GML-Attribute (bodenrichtwert, stichtag, art, ergaenzung, entwicklungszustand …).

**Besonderheit überlappende Zonen:** Hessen führt teils deckungsgleiche W-Zonen je Bebauungsart
(Lampertheim: 260 €/m² EFH vs. 490 €/m² MFH). Die Zonenwahl nutzt deshalb einen
Objektart-Hint (wohnen/mfh/gewerbe), der vom Rechner bis in die Report-Routen durchgereicht
wird und Teil aller Cache-Keys ist.

**Anbindung:** lib/boris.ts als Zwei-Provider-Dispatcher (RLP-WMS zuerst, dann Hessen-WFS;
BBoxen überlappen am Rhein, das jeweils andere Land antwortet leer). Gleiche
fail-soft-Garantien wie RLP (Timeout 6 s, warnOnce, confirmed-Flag, gemeinsamer Cache).
Quellenvermerk je Dienst (BORIS_QUELLEN), Badge im Rechner und PDF-Rechtstext quellen-bewusst.

**BW erneut geprüft (2026-08-08), Entscheidung gegen Anbindung BESTÄTIGT:** Abdeckung im
IT.NRW-Backend inzwischen besser (Weinheim 01.01.2026, Hockenheim/Schwetzingen/Brühl
01.01.2025; Heidelberg weiterhin leer), aber der Endpunkt antwortet ohne gefälschten
Referer-Header mit 403 — die Zugangsbeschränkung ist gewollt, ein produktiver Umgehungszugriff
für eine kommerzielle Maklerseite bleibt rechtlich nicht vertretbar. LGL-BW Open Data führt
weiterhin keine Bodenrichtwerte; BORIS-BW bleibt reiner Viewer. Sauberer Weg: schriftliche
Nutzungszusage von ZGG-BW/LGL-BW einholen (Kontakt s. oben) — die Provider-Architektur nimmt
einen dritten Dienst dann ohne Umbau auf.

---

## 7. Quellen-Strategie „200 km um Speyer" (11.08.2026, Frage Alex)

**Frage:** Woher realistische VERKAUFS-Preise für alle Standorte im 200-km-Radius
(RLP + BW + Hessen + Saarland + Ränder Bayern/NRW)? Kann man Homeday/Portale
crawlen und Abschläge rechnen?

### 7.1 Crawlen bleibt die falsche Antwort — auch mit Abschlag

Homeday kann das, WEIL sie ein VC-finanziertes Tech-Unternehmen mit eigener
Rechtsabteilung sind (10 Mio.+ Listings, 300+ Quellen, ML-Team — s. §1). Für
beuwy/RIEGEL gilt unverändert §2: **Portal-Scraping ist nicht verteidigbar**
(§87a–e UrhG Datenbankherstellerrecht, AGB/robots.txt kippen die
§44b-TDM-Ausnahme, UWG) — und es wäre auch fachlich nur die zweitbeste Quelle,
denn Portale kennen **Angebots**-, keine Verkaufspreise (IVD-Kritik an Homeday).
Ein „realistischer Abschlag" auf illegal beschaffte Angebotsdaten bleibt illegal
beschafft. **Die gute Nachricht: man kann genau dieselben Daten LEGAL kaufen (7.3).**

### 7.2 Die einzigen echten VERKAUFS-Preisquellen (Kaufpreissammlungen)

Notarielle Kaufverträge laufen per Gesetz an die **Gutachterausschüsse** — das
ist die Quelle, die Homeday NICHT hat:

| Quelle | Radius-Abdeckung | Zugang |
|---|---|---|
| **Immobilienmarktberichte der GAA** (RLP: Landesbericht; BW/Hessen/Saarland: je GAA bzw. Zentrale Geschäftsstelle) | flächendeckend, Kreis-/Stadt-Ebene, echte Median-/Durchschnittspreise je Teilmarkt | PDF, frei bzw. kleiner Schutzbetrag — **jährlich parsen → Kalibriertabelle** (gleiche Übernahme-Regeln wie preisanalyse-onoffice) |
| **GREIX** (IfW Kiel, notarielle Transaktionen) | im Radius: **Karlsruhe, Frankfurt, Wiesbaden**, Stuttgart | frei — Trend-Anker für die BW-/Hessen-Flanke |
| **Einzelauskunft aus der Kaufpreissammlung** | punktuell | als Makler mit berechtigtem Interesse je Anfrage — für Einzelbewertungen, nicht für Flächendaten |
| **Eigener OnOffice-Pool** (seit 11.08.2026 produktiv) | dort, wo der Makler verkauft (n≥5) | Laufzeit-p75-Deckel + Basiskalibrierung — **wächst mit jedem Abschluss und jedem neuen white-label-Makler** |

### 7.3 Angebotsdaten LEGAL: lizenzieren statt crawlen

Das „Crawlen + Abschlag"-Modell gibt es fertig und rechtssauber zu kaufen —
genau davon leben diese Anbieter:

- **VALUE Marktdaten** (ehem. empirica-systeme): deutschlandweite
  Angebotsdatenbank (~350k Mietdatenpunkte/Quartal, Kauf + Miete, alle
  Objektarten), **REST-API**; Kreis-Ebene über empirica regio. DER Weg zu
  flächendeckenden €/m² für jeden Ort im Radius.
- **Sprengnetter** (bereits im OnOffice-Marketplace!): AVM-/REPORT-/MAPS-API —
  kombiniert 10 Mio.+ Angebotspreise mit **2 Mio.+ echten Kaufpreisen**
  (löst das Abschlag-Problem gleich mit), Pay-per-Use.
- **PriceHubble** (OnOffice-Marketplace): AVM + Lead-Widget, s. §4.
- **iib / IS24-Marktdaten**: Embed-Karten bzw. Datenprodukte, zweite Wahl.

### 7.4 Der eigene Abschlags-Anker (Alleinstellung, kostenlos)

Den Angebots→Abschluss-Abschlag muss niemand schätzen: **der eigene
OnOffice-Bestand enthält beides** (Erstangebotspreis + notarieller Kaufpreis je
Objekt, `priceReduced` existiert bereits im Estate-Modell). Ein Skript analog
`preisanalyse-onoffice.mts` kann den echten RIEGEL-Abschlag je Objektart/Ort
messen — damit lassen sich lizenzierte ANGEBOTSdaten (7.3) seriös auf
VERKAUFSniveau umrechnen: „Angebotsdaten × eigener, gemessener Abschlag" ist
methodisch genau das, was die Großen tun, nur mit ehrlicherer Abschlags-Basis.

### 7.5 Empfehlung (Reihenfolge)

1. **Jetzt, 0 €:** GAA-Marktberichte (RLP/BW/Hessen) einmal jährlich in eine
   Kalibriertabelle übernehmen (erweitert REGIONS über die OnOffice-Orte
   hinaus); GREIX als Trend-Anker; Abschlags-Skript (7.4) bauen.
2. **Produkt-Layer, bezahlt:** Sprengnetter-API als erste Wahl (OnOffice-Nähe,
   echte Kaufpreise im Modell, Pay-per-Use skaliert mit Makler-Instanzen —
   Kosten je white-label-Kunde durchreichbar). Alternativ VALUE Marktdaten,
   wenn wir die Rohdaten selbst modellieren wollen.
3. **Nicht tun:** Portale/Homeday crawlen (7.1); BW-BORIS ohne schriftliche
   Zusage (s. §6).

Quellen: [VALUE Marktdaten / empirica-systeme-Integration](https://value.ag/pressemitteilung-erfolgreiche-integration-aus-empirica-systeme-wird-value-marktdaten/),
[VALUE Wohnungsmarktdaten](https://www.value-marktdaten.de/en/portfolio/immobilienmarktdaten/wohnungsmarktdaten/),
[VALUE REST-API](https://www.value-marktdaten.de/tag/rest-api-fuer-immobilienmarktdaten/),
[Sprengnetter AVM-API](https://www.sprengnetter.de/avm-api/),
[Sprengnetter API-Shop](https://shop.sprengnetter.de/Software/API-Loesungen/).

---

## 8. Stadt-Niveau-Tabelle Deutschland (Leaf-B-Recherche, 12.08.2026)

**Anlass „Bad Vilbel":** Rechner nannte 2.143 €/m² (Rhein-Neckar-Default), real ~4.400 €.
Recherche mit Quellenpflicht für 20 Städte außerhalb der Vorderpfalz — übernommen in
`src/lib/stadt-niveau.ts` mit zwei dokumentierten Transformationen (Angebot × 0,95;
Haus-Gebäudeanteil × 0,78, da die Engine den Boden separat staffelt).

| Stadt | Wohnung €/m² (roh) | Haus €/m² (roh) | Typ | Stand |
|---|---|---|---|---|
| München | 8.250 | 9.250 | Angebot (WohnBarometer) | Q4 25/Q1 26 |
| Frankfurt a. M. | 5.700 | 5.000 | Angebot | Q2 26 |
| Stuttgart | 4.700 | 4.450 (abgeleitet) | Angebot | Q4 25 |
| Karlsruhe | 4.000 | 4.400 | **Transaktion (GAA 2025)** | 2025 |
| Wiesbaden | 4.200 | 4.900 | Angebot | Q1/Q2 26 |
| Mainz | 4.400 | 4.700 | Angebot | Q1 26 |
| Darmstadt | 4.650 | 4.900 | Angebot | Q1 26 |
| Bad Vilbel | 4.550 | 4.900 | Angebot | Q1 26 |
| Berlin | 4.900 | 4.850 | Angebot | Q4 25 |
| Hamburg | 5.600 | 5.200 | Angebot | Q1 26 |
| Köln | 4.550 | 5.050 | Angebot | Q2 26 |
| Kaiserslautern | 2.550 | 2.600 | Angebot | Q2 26 |
| Bonn | 4.300 | 4.500 | Angebot | Q2 26 |
| Freiburg i. Br. | 5.150 | 5.450 | Angebot | Q1 26 |
| Würzburg | 4.200 | 4.300 | Angebot | Q2 26 |
| Saarbrücken | 2.400 | 2.150 | Angebot | Q1 26 |
| Trier | 3.350 | 3.050 | Angebot | Q2 26 |
| Koblenz | 3.500 | 3.150 | Angebot | Q2 26 |
| Offenbach a. M. | 4.000 | 4.100 | Angebot | Q1 26 |
| Aschaffenburg | 3.750 | 3.650 | Angebot | Q2 26 |

Quellen: ImmoScout24 WohnBarometer Q4 2025 (presseportal.de/pm/31321/6192423),
Homeday-Preisatlas je Stadt (homeday.de/de/preisatlas/<stadt>), GAA Karlsruhe
Immobilienmarktbericht 2025 (karlsruhe.de, Transaktionen), IfW-Kiel/GREIX-Kontext.
Auffälligkeiten (Frankfurt-Streuung 5.100–6.550, Stuttgart-Hauswert widersprüchlich →
Ableitungsregel Haus ≈ Wohnung × 0,95 Metropole / × 1,05–1,15 Umland, Freiburg-Ausreißer
verworfen): Original-Recherchebericht der Session, Kernpunkte hier.
**Pflege:** Werte jährlich aktualisieren (gleiche Quellen); Städte, in denen ein
white-label-Makler startet, wandern per Kalibrierlauf in REGIONS um.
