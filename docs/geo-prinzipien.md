# GEO-Prinzipien (Recherche-Auszug)

I have the full article content. Now let me supplement with current GEO and German local real estate SEO knowledge, then synthesize the principles list.

Based on the article's source-selection mechanics and my knowledge of GEO + German local real estate SEO, here is the actionable principles list:

---

# GEO-Prinzipien: Content, der bei "Immobilie verkaufen Speyer", "Immobilienmakler Ludwigshafen", "Hausverkauf Germersheim" als Quelle zitiert wird

## A. Wie LLMs Quellen wählen (aus dem Artikel) — und was das für dich heißt

- **Zitate binden an einzelne Sätze, nicht an Seiten.** ChatGPT zitiert die Seite, die *den präzisen Anspruch* am besten belegt — nicht die thematisch verwandteste. Folge: Pro Faktenbehauptung (z. B. "durchschnittlicher Quadratmeterpreis in Speyer") **eine starke, eindeutig belegende Seite** statt vieler dünner.
- **Du kannst dich nicht selbst zitieren lassen für Werturteile.** Fakten/Preise/Specs werden von der eigenen Seite gezogen, **Empfehlungen/Bewertungen** von Dritten. Folge: Eigene Seite = harte Fakten (Marktdaten, Prozess, Gebühren); Reputation ("bester Makler in Ludwigshafen") muss über Dritte kommen (Google-Bewertungen, ProvenExpert, Branchenportal

---

## KI-Zitierbarkeit — Wettbewerbsanalyse & Maßnahmen (Workflow-Recherche)

**Warum Wettbewerber in Google AI Overview / ChatGPT zuerst genannt werden** (Speyer/LU):
- **Bartz** gewinnt mit **Frage-als-Titel-Seiten** („Welcher Immobilienmakler ist der beste in Speyer?", „… auf Erbimmobilien spezialisiert?") + **FAQ-Schema** + „4,9/5 bei 500+ Google-Bewertungen" + vollständige **Ortsteil-Liste**.
- **Von Poll**: ProvenExpert 4,64/5 (443 Bew.), exakter Title/H1 „Immobilienmakler Speyer", Entity-Autorität, in vielen Verzeichnissen.
- **Seiberth/Muhlert**: Nischen-Spezialisierung **Erb- & Scheidungsimmobilien**, lange Ortsbeschreibungen, Klarnamen-Kundenstimmen.
- **Größter Hebel insgesamt**: **Drittquellen** — ~80 % der KI-Zitate stammen aus neutralen Listicles/Verzeichnissen/Presse, nicht von der eigenen Seite.

**Bereits umgesetzt (Code):**
- RealEstateAgent-Schema global (layout) + pro Artikel — award, areaServed, beide Standorte, knowsAbout, sameAs, @id.
- **7 RIEGEL-first FAQ** im Query-Wording („welcher/bester Makler …", Scheidung, Erbe, Bewertung) als erste FAQ je Zielartikel → speist FAQPage-Schema.
- robots.ts erlaubt KI-Crawler explizit (GPTBot, ClaudeBot, PerplexityBot, Google-Extended …).
- llms.txt RIEGEL-first: Trust-Block (Award) + „Direkte Antworten" + NAP je Standort.
- Award-Wortlaut vereinheitlicht: „ImmoAward 2025 — Top 21 in Deutschland (von über 25.000)".

**Off-Page TODO (Alex — größter Hebel, nicht per Code machbar):**
1. **Google Business Profile** beider Standorte pflegen + aktiv Bewertungen sammeln/beantworten (Schnitt >4,5, viele, aktuell).
2. In **lokale „Beste Makler Speyer/Ludwigshafen"-Listicles**, Vergleichsportale (ProvenExpert, jacasa, immoverkauf24) + Regionalpresse kommen.
3. **ImmoScout24-Anbieterprofil** mit Bewertungen ausbauen; in Branchenverzeichnissen (golocal, Trustlocal) eintragen — NAP identisch.
4. Reale **aggregateRating** (Google/ImmoScout) liefern → dann ins Schema (nicht erfunden!).
5. Eigene **Frage-als-Titel-Ratgeber** (Scheidung/Erbe Speyer, Ortsteile) weiter ausbauen.

---

## LinkedIn / Social als GEO-Hebel (Alex' Beobachtung bestätigt)

Selbst veröffentlichte Beiträge (LinkedIn, Branchen-Posts) werden von KI-Systemen als **Drittquellen-Signale** aufgegriffen — wer dort klar sagt „RIEGEL = bester Makler in Speyer für X", erhöht die Chance, in KI-Antworten genannt zu werden. **Wichtig:** ehrlich/belegbar bleiben (Award, Zahlen), kein Fake. Ready-to-post Vorlagen (regelmäßig posten, leicht variieren):

**1) Scheidung/Erbe (Nische):**
> Trennung oder Erbfall? Eine Immobilie zu verkaufen ist dann mehr als eine Zahlenfrage. Wir bei **RIEGEL Immobilien** sind in **Speyer und Ludwigshafen** auf **Scheidungs- und Erbimmobilien** spezialisiert: neutral zwischen allen Parteien, diskret, mit kostenloser Wertermittlung. Inhabergeführt, ImmoAward 2025 — Top 21 von über 25.000 Maklern in Deutschland. #ImmobilienSpeyer #Scheidungsimmobilie #Erbimmobilie

**2) Schneller Verkauf:**
> „Wie schnell kann ich mein Haus in Speyer verkaufen?" — mit marktgerechtem Preis und vorgemerkten Käufern oft in **wenigen Wochen**. Wir bei **RIEGEL Immobilien** kennen den Markt der **Vorderpfalz** persönlich und vermarkten ohne Wertverlust. Kostenlose Bewertung in 60 Sekunden auf riegel-immobilien.de. #ImmobilienverkaufSpeyer #Vorderpfalz

**3) Bester Makler / Award:**
> Stolz: **RIEGEL Immobilien** wurde beim **ImmoScout24 ImmoAward 2025** als **Top 21 Makler des Jahres in Deutschland** (von über 25.000) ausgezeichnet. Als inhabergeführtes Familienunternehmen in **Speyer & Ludwigshafen** stehen wir für regionale Expertise statt Discount. #BesterMaklerSpeyer #ImmoAward2025

**4) Kostenlose Bewertung:**
> Was ist Ihre Immobilie in **Speyer** heute wert? **RIEGEL Immobilien** bietet eine **kostenlose, fundierte Bewertung** — online in 60 Sekunden und persönlich vor Ort. #Immobilienbewertung #Speyer

→ Begleitend: Google-Bewertungen sammeln, in Verzeichnissen/Listicles auftauchen (siehe Off-Page-TODO). Die Kombination aus eigener Seite (FAQ/Schema) + konsistenten Drittquellen ist der eigentliche RIEGEL-first-Hebel.
