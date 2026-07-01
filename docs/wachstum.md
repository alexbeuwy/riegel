# RIEGEL — Wachstums- & Monetarisierungsplan (beuwy)

Stand: 2026-07-01. Ergänzt `strategie.md` §7. Nordstern: **Mandate, nicht Klicks.**

## 1. Kernrechnung (rahmt alles)

- Ø-Objekt Vorderpfalz/Rhein-Neckar: ~400–550k €; Provision RLP typ. 7,14 % gesamt (geteilt).
- → **1 Mandat ≈ 15.000–30.000 € Provision.**
- Ziel der Website: **1–2 zusätzliche Mandate pro Quartal** = sechsstellig pro Jahr.
- Budget-Einwand-Antwort: **Ein einziges Mandat bezahlt das gesamte Projekt.**

## 2. Ausbaustufen (priorisiert nach „Makler versteht sofort: das ist Geld")

| # | Baustein | Was | Warum Geld | Status/Aufwand |
|---|---|---|---|---|
| A | **Speed-to-Lead-Alarm** ⭐ | Rechner-Abschluss → <60 s Mail/WhatsApp an Riegel: Adresse, Objekttyp, geschätzter Wert, **Provisionspotenzial**, Rückrufnummer | Anruf in 5 Min statt 24 h vervielfacht Erreichbarkeit/Conversion. Emotionaler Pitch-Moment („Handy vibriert") | klein — Report-/Lead-APIs existieren; **blockiert durch Resend-Account** (Mails aktuell „skipped"), WhatsApp optional später |
| B | **€-Pipeline im Cockpit** ⭐ | Jeder Lead in `/intern`: Wert × Provisionssatz = Potenzial; Dashboard-Summe „Pipeline diesen Monat: X €" | Der Demo-Moment fürs Pitch-Meeting; macht Website-Wert sichtbar | klein — Cockpit mit KPIs/Tabs/CSV + Pipeline-Summe (Ø-Wert) existiert; **fehlt nur Umrechnung in €-Provisionspotenzial** (je Lead + Summe) |
| C | **PDF-Report-Funnel** | Ergebnis bleibt frei (No-Gate-USP!), Report per E-Mail + CTA „kostenlose Vor-Ort-Präzisierung"; anonyme Bewertungen als Nachfrage-Signal ins Cockpit | Kontakt entsteht freiwillig | **live**: `/api/report` erzeugt echtes PDF (pdf-lib) an Kunde + CC RIEGEL, `valuation_requests`-Log. Fehlt: Vor-Ort-/Termin-CTA im Ergebnis + Robustheit (Fehler-UI, Server-Validierung — s. `optimierung.md` P0) |
| D | **Follow-up-Automatik** | Resend-Sequenz: sofort PDF → Tag 3 Ratgeber → Tag 10 Termin-CTA → **quartalsweise „Ihr Immobilienwert-Update {Ort}"** | Verkäufer entscheiden in 6–24 Monaten; kein Regional-Makler macht das; Leads bleiben jahrelang warm | mittel |
| E | **Käufer-Flywheel** | Suchprofile/`early_access` ausbauen; Zahl nach außen: „**X geprüfte Kaufinteressenten vorgemerkt**" (Verkaufen-Seite + Akquise-Gespräch) | Gewinnt Mandate gegen Konkurrenz („wir haben Ihre Käufer schon"), verkürzt Vermarktungszeit | mittel (mit OnOffice) |
| F | **Tippgeber-Programm** | Seite + Formular: „Empfehlen → bis zu 1.000 € Tippgeber-Provision" | Lokales Netzwerk × TSG-Reichweite = billigste Lead-Quelle | klein |

Reihenfolge: **A+B+C zuerst** (wenige Tage, ergeben den kompletten vorführbaren Geld-Kreislauf),
dann D, dann E/F. OnOffice-Import läuft parallel, sobald Keys da sind.

## 3. Ads-Modell (Google Search auf Rechner-/GEO-Landingpages)

Die 28 Ortsseiten zahlen auf den Quality Score ein. Modellrechnung (Annahmen — mit
500–1.000 € Testbudget im ersten Monat validieren, dann skalieren):

| | konservativ | realistisch |
|---|---|---|
| Budget/Monat | 1.000 € | 1.000 € |
| CPC („Haus verkaufen Speyer" etc.) | 4 € | 2,50 € |
| Klicks | 250 | 400 |
| → Bewertungs-Leads (10–15 %) | 25 | 50 |
| → Mandate (5 % der Leads) | 1,25 | 2,5 |
| → Provision (Ø 20k) | ~25.000 €/Mon. | ~50.000 €/Mon. |

Selbst konservativ **:3 geteilt** bleiben ~8.000 € Provision je 1.000 € Spend.
**Kosten/Mandat 500–2.000 € vs. Wert 15–30k €.** Dazu: Meta/IG-Retargeting auf das
Reels-Publikum. Für beuwy: Ads-Betreuung = **monatlicher Retainer** (wiederkehrend, kündbar).

## 4. Messung (ohne Attribution glaubt niemand den ROI)

- Conversion-Events ab Tag 1: Bewertung abgeschlossen, Termin gebucht, Anruf-Klick.
- Lead-Quelle im Cockpit (Ads/SEO/Direkt), Monatsreport an Riegel.
- Consent-konform (TDDDG-Banner existiert; Consent Mode beachten).

## 5. Pitch & De-Risking (Kontext: 2× verbrannt durch Vorgänger-Dienstleister)

Vertrauensproblem, kein Budgetproblem. Antwort: **Beweis + De-Risking statt Rabatt.**

1. **Demo schlägt Argumente**: 15 Min live — Adresse → Rechner → Satellit → Lead im
   Cockpit → Alarm aufs Handy → Pipeline-Zahl in €. Unterschied zu den Vorgängern:
   es existiert jetzt schon Klickbares (Vercel).
2. **Milestone-Zahlung** statt Vorkasse: Raten an sichtbare, klickbare Meilensteine.
3. Optional **Erfolgskomponente** (Bonus je qualifiziertem Lead/Mandat) — nur mit
   sauberem Tracking anbieten.
4. **Pitchdeck** (`pitchdeck/deck.html`): „Rechnung"-Slide ergänzen (Tabelle aus §3 +
   „1 Mandat = Projekt bezahlt").
