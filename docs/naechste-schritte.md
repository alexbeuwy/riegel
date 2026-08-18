# Nächste Schritte & Bottleneck-Analyse

Stand: 18.08.2026. Erhoben unter unlazy-Disziplin (4 parallele Code-Analysen mit
Beleg-Pflicht + eigene Live-Messungen gegen Produktion, jeder Top-Befund adversarial
nachgeprüft). Jede Zahl unten ist in diesem Lauf gemessen, nicht geschätzt.

---

## 1. Ausgangslage in Zahlen

**Lead-Volumen (Supabase, Stand 18.08. 19:00 UTC)**

| Kennzahl | Wert |
|---|---|
| Report-Anfragen (`valuation_requests`) | 37 gesamt · 32 in 30 Tagen · **8 in 7 Tagen** |
| Anfragen/Leads (`leads`) | 46 gesamt · **18 in 7 Tagen** |
| Empfänger für Objekt-Mails | 9 (2 Suchaufträge mit notify + 7 Konto-Profile) |
| Bisher verschickte Matching-Mails | **0** (`matching_sent` leer) |

**Rechner-Funnel (erster Messtag, 18.08. 10:22–17:41 UTC, `rechner_events`)**

260 Ereignisse: 7 Sessions „Start", 4× Report-Formular geöffnet (3× über den CTA,
1× über das orange Badge), **1 PDF angefordert**, 248 Klicks aus 15 Sessions.
n ist noch viel zu klein für Schlüsse — aber der Kanal misst jetzt.

**Das Wichtigste an diesen Zahlen:** Bei ~8 Report-Leads pro Woche ist jeder einzelne
zusätzliche Lead spürbar. Eine Conversion-Verbesserung von +25 % sind ~2 Leads/Woche —
bei Maklerprovisionen die mit Abstand rentabelste Arbeit an diesem System.

---

## 2. In diesem Lauf bereits behoben und deployt

### Der Funnel maß seine eigene Mitte nicht (war: kritisch, jetzt: erledigt)
**Beleg:** `src/lib/track.ts:21-28` definiert 7 Ereignisse, `api/intern/conversion/route.ts:27-31`
baut 8 Trichterstufen darauf — aber `grep "track(" calculator.tsx` fand nur 2 Aufrufe.
`rechner_step`, `rechner_analyse` und `rechner_ergebnis` wurden **nie** ausgelöst.
**Wirkung:** Die Stufen „Schritt 1–3", „Analyse gestartet", „Ergebnis gesehen" standen
dauerhaft auf 0. Der Trichter las sich wie ein Totalabbruch nach dem Start, und genau
die Frage „wo springen die Leute ab" war unbeantwortbar — das erklärte Ziel des Tabs.
**Zusätzlich:** `rechner_start` hing allein am Objektart-Klick. Da „Wohnung" vorbelegt ist
und Hero-Einsteiger mit fertiger Adresse keine Kachel anklicken, war der Nenner zu klein
und die PDF-Quote zu hoch.
**Erledigt:** Commits `627a14d` + `8d45d17` — alle Stufen feuern, Nenner korrigiert.
Ab jetzt zeigt der Conversion-Tab echte Absprungpunkte.

---

## 3. Welle 1 — vor dem ersten echten Mail-Versand (morgen 6:00 UTC)

Der Matching-Cron verschickt morgen früh die **allerersten** automatischen Werbe-Mails
(Objekt 12305 ist aus `matching_seen` entfernt, 9 mögliche Empfänger). Diese drei Punkte
sollten vorher stehen — sonst geht die erste Massenmail mit vermeidbaren Mängeln raus.

### 1.1 Kein Abmeldeweg in den automatischen Objekt-Mails — Aufwand: S
**Beleg:** `src/lib/email.ts:203-221` (Footer) enthält nur Name/Adresse/Telefon; kein
Abmeldelink, kein `List-Unsubscribe`-Header in `sendMail()`. Abbestellen geht heute nur
über Login → `/konto` → Toggle je Suche. Eigene Prüfung: `grep -ci "abmeld|unsubscribe"
src/lib/email.ts` = **0**.
**Warum:** Automatische Objekt-Mails sind Direktwerbung. Ein fehlender Ein-Klick-Abmeldeweg
ist ein klassischer Abmahnpunkt — und praktisch: wer sich nicht abmelden kann, markiert als
Spam, was die Zustellbarkeit **aller** RIEGEL-Mails beschädigt (auch der Report-Mails).
**Fix:** Token-Link „Diese Benachrichtigungen abbestellen" im Footer (setzt `notify=false`)
plus `List-Unsubscribe`-Header.

### 1.2 Pflichtangaben nach §37a HGB fehlen im Mail-Footer — Aufwand: S
**Beleg:** Impressum weist RIEGEL als eingetragenen Kaufmann aus (e.K., HRA-Nummer,
Amtsgericht Ludwigshafen — `src/app/impressum/page.tsx`). Der Mail-Footer (`email.ts:220`)
nennt weder Rechtsform noch Registergericht noch HRA-Nummer.
**Warum:** Geschäftliche E-Mails gelten als Geschäftsbriefe. Betrifft jede Mail, die das
System verschickt — nicht nur die Matching-Mails.
**Achtung rote Liste:** Impressumsangaben sind laut `CLAUDE.md` credential — die exakten
Werte müssen von Alex/Sissy bestätigt werden, nicht aus dem Code übernommen.

### 1.3 `matching_seen` wird geschrieben, BEVOR die Mails raus sind — Aufwand: M
**Beleg:** `src/lib/matching.ts:328-333` schreibt die Baseline sofort; danach können
`saved_searches` (:347), `profiles` (:367) und `matching_sent` (:392) den Lauf mit `ok:false`
abbrechen — die Objekte gelten dann aber schon als „gesehen". Der Kommentar in Zeile 406
(„nächster Lauf versucht es erneut") stimmt deshalb nicht: `neue` filtert sie ab dem
nächsten Lauf dauerhaft weg.
**Warum:** Ein einziger transienter Fehler (Supabase-Hänger, Resend-Ausfall) lässt die
Neuzugänge dieses Tages **für immer** aus dem Matching fallen — lautlos. Genau so hat der
dokumentierte Resend-Vorfall (`email.ts:32-37`, „zwei Tage lang kam kein Report an, ohne
dass es sichtbar wurde") zugeschlagen. Der erste echte Lauf ist morgen.
**Fix:** Baseline erst nach erfolgreicher Verarbeitung schreiben, oder „gesehen" und
„ausgewertet" trennen.

> **Notausgang, falls Welle 1 nicht rechtzeitig fertig wird:** Cron in `vercel.json`
> für einen Tag deaktivieren. Ein verschobener Versand kostet nichts, eine
> Werbemail ohne Abmeldeweg an echte Kunden schon.

---

## 4. Welle 2 — diese Woche: Conversion-Reibung entfernen

Reihenfolge nach Hebel ÷ Aufwand. Alle Belege gegen den heutigen Code geprüft.

### 2.1 Dezimalzahlen sind auf dem Handy nicht eintippbar — Aufwand: S
**Beleg:** `inputMode="numeric"` an **14** Stellen in `calculator.tsx`, `inputMode="decimal"`
an **0** (eigene Messung). Die eigene Fehlermeldung lädt aber aktiv zum Komma ein
(„z. B. 120 oder 92,5"), und `parse-de-zahl.ts` wurde eigens für den Kundenfall „32,35 m²"
gebaut. Numerische Tastaturen auf iOS/Android zeigen kein Komma.
**Warum:** Mobil ist bei Immobilienrechnern die Mehrheit. Betroffene müssen runden oder
die Tastatur wechseln — mitten im Formular, direkt vor dem Ziel.
**Fix:** Ein Attribut, 14 Stellen.

### 2.2 Adress-Autocomplete ohne Fallback = Sackgasse an Schritt 1 — Aufwand: M
**Beleg:** `calculator.tsx:710`: `if (s === 1 && !f.address) return "Bitte eine Adresse aus
den Vorschlägen wählen."` — es gibt keinen manuellen Weg. Findet der Geocoder nichts
(Neubaugebiet, Tippfehler), endet der Rechner wortlos.
**Warum:** Trifft ganz am Anfang, bevor jemand Mühe investiert hat — stiller Lead-Verlust,
und ausgerechnet Neubau-Eigentümer (fehlen oft in OpenStreetMap) sind eine attraktive
Zielgruppe. Ab sofort ist das dank Welle 0 auch **messbar**.
**Fix:** Nach erfolgloser Suche „Adresse nicht dabei? Mit Ort/PLZ weiter" anbieten.

### 2.3 Enter im Adressfeld übernimmt keinen Vorschlag — Aufwand: S
**Beleg:** `calculator.tsx:1059`: `else if (e.key === "Enter" && activeIdx >= 0 && …` —
`activeIdx` startet bei -1, also tut die Enter-/„Los"-Taste ohne vorherige Pfeiltaste nichts.
**Fix:** Ohne aktive Auswahl auf den ersten Vorschlag zurückfallen.

### 2.4 Zurück-Geste und Reload löschen alle Eingaben — Aufwand: M
**Beleg:** Formularstand lebt nur in `useState`; `grep "sessionStorage" calculator.tsx` = **0**,
kein `popstate`/`pushState`-Handling. Auf Mobil ist die Zurück-Wischgeste alltäglich.
**Fix:** Stand debounced in `sessionStorage` spiegeln (TTL ~30 min) und Schritte in die
History eintragen, damit „Zurück" einen Schritt zurückgeht statt die Seite zu verlassen.

### 2.5 Kein Weg zurück vom Ergebnis außer Komplett-Reset — Aufwand: S
**Beleg:** `grep "Angaben anpassen" calculator.tsx` = **0**; einziger Ausweg ist „Neue
Bewertung" mit vollem State-Reset inklusive Adresse.
**Warum:** Wer nur das Baujahr korrigieren will, muss alles neu eingeben — direkt vor dem
Report-CTA, dem teuersten Abbruchpunkt der Strecke.
**Fix:** Link „Angaben anpassen", der `phase` zurücksetzt und `f` behält.

### 2.6 Fast fertiger Lead scheitert in einer aussichtslosen Wiederholschleife — Aufwand: S
**Beleg:** Client prüft nur auf Vorhandensein/Parsebarkeit, Server erzwingt Mindestwerte
(`api/report/route.ts:150-151`, `bounded(...,10/20,...)`), was bei Unterschreitung zu
`mid <= 0` → 422 führt. Der Nutzer sieht nur „Senden fehlgeschlagen — bitte erneut
versuchen" (`report-request.tsx:199`) — ein Retry kann nie klappen.
**Fix:** Dieselben Mindestwerte schon im Formular prüfen.

### 2.7 Unlesbare Eingaben verschwinden lautlos aus der Bewertung — Aufwand: S
**Beleg:** `validateStep` prüft nur Wohn-/Grundfläche auf Parsebarkeit; Baujahr, Zimmer,
Hausgeld & Co. gehen über `parseDeZahl(...)` als `undefined` in die Engine (`calculator.tsx:776-812`).
**Warum:** Ein vertipptes Baujahr wird ignoriert, das Ergebnis wirkt präziser als es ist.

---

## 5. Welle 3 — nächste zwei Wochen: Ehrlichkeit und Substanz der Engine

### 3.1 Beste Datenquelle wird von der schwächeren verdeckt (Karlsruhe) — Aufwand: S
**Beleg + eigene Messung:** `valuation.ts:737-738` — `fallbackOrt = !bekannteRegion &&
ortsFaktorTabelle === 1`. Steht ein Ort in **beiden** Tabellen, wird die Stadt-Niveau-Zeile
nie erreicht. Live gerechnet: Karlsruhe-Haus ergibt **3.694 €/m² bei 64 % Konfidenz**,
obwohl `stadt-niveau.ts:51` mit **3.450 €/m² aus GAA-Transaktionsdaten** (amtliche
Kaufpreissammlung — die beste Quelle im ganzen System) hinterlegt ist: **+7,1 % zu hoch**,
und die Konfidenz fällt in die „keine lokale Kalibrierung"-Stufe. Gegenprobe Freiburg
(nur in einer Tabelle): korrekt 3.929 €/m² bei 70 %.
**Umfang heute:** genau **1** Stadt betroffen (Überschneidung der Tabellen: 27 vs. 20 Orte).
Also klein — aber eine strukturelle Falle, die bei jedem weiteren Tabelleneintrag erneut
zuschlägt, und Karlsruhe ist ein realer RIEGEL-Markt.
**Fix:** Stadt-Niveau-Lookup von `fallbackOrt` entkoppeln (Schicht 1 vor Schicht 2).

### 3.2 Unkalibrierte Regionen bekommen denselben Konfidenz-Bonus wie kalibrierte — Aufwand: S
**Beleg:** `valuation.ts:308-327` dokumentiert selbst: nur Speyer, Ludwigshafen und
Schifferstadt sind an echten Abschlüssen kalibriert, „Frankenthal/Neustadt/Mannheim/
Heidelberg/Vorderpfalz: keine belastbare eigene Fallzahl (n < 20) — Modellwerte".
Trotzdem gilt `:1210` `if (bekannteRegion) confidence += 8;` für alle acht — und weil
`bekannteRegion` zutrifft, unterbleibt auch der Warnhinweis „Modellwert ohne lokale
Kalibrierung".
**Warum:** Mannheim und Heidelberg sind aktive Märkte. Dort tritt der Rechner mit
unverdienter Sicherheit auf — das Gegenteil des Alleinstellungsmerkmals „ehrlich
degradierend", und genau die Situation, in der sich der Makler im Termin blamiert.
**Fix:** `kalibriert`-Flag je Region; Konfidenzbonus und Annahmen-Text daran koppeln.

### 3.3 Der Backtest prüft ausgerechnet die bundesweiten Mechanismen nicht — Aufwand: M
**Beleg:** `scripts/backtest-engine.mts:17-21` rechnet ohne amtlichen Bodenrichtwert
(„keine Koordinaten → Lagefaktor 1") und mit fixer Annahme `zustand: "gepflegt"` (:82).
Damit sind Mikrolage-Faktor, BRW-Ableitung und Stadt-Niveau-Tabelle empirisch **ungetestet** —
validiert werden sie nur durch selbst gesetzte Battery-Bänder.
**Warum:** Das ist der Beweis für das zentrale Verkaufsargument („echte Abschlüsse statt
Angebotspreise"). Aktuell ist er zirkulär.
**Fix:** Verkauft-Adressen geokodieren, BORIS live dazuholen, zweite Messspalte im Backtest.

### 3.4 Datenstände verrotten ohne Erinnerung — Aufwand: S–M
**Beleg:** `marktdaten.ts:37`: `export const MARKT_STAND = "Q3 2026";` — ein Handstring,
der in Report und Seiten ausgegeben wird. REGIONS/BRW-Fit/Stadt-Niveau tragen Stichtage in
Kommentaren („Lauf 11.08.2026", „Stand Q4 2025–Q2 2026"), aber nichts erinnert an die
Wiederholung.
**Warum:** Beide bisherigen Fehlbewertungs-Fälle (Landauer Warte, Bad Vilbel) fielen durch
Zufall auf, nicht durch Kontrolle.
**Fix:** Alterswarnung analog `boris-live-check.mts`, aber für die Kalibrierdaten.

---

## 6. Welle 4 — vor Makler #2 (White-Label-Reife)

### 4.1 Kein CI — jeder Push geht ungeprüft nach Produktion — Aufwand: S
**Beleg:** Eigene Messung: **0** Workflow-Dateien in `.github/workflows/`. `docs/betrieb.md:41`
sagt es selbst: „Kein CI/Test-Gate". Regressionsskripte existieren, laufen aber nur, wenn
jemand daran denkt.
**Warum:** Push auf `main` = sofortiges Live-Deployment. Bei mehreren Mandanten
multipliziert sich jeder ungeprüfte Fehler.
**Fix:** Ein Workflow mit `npm run build`, `eslint`, `valuation-battery.mts` als Pflicht-Check.

### 4.2 Kein Monitoring — Ausfälle sind unsichtbar — Aufwand: S–M
**Beleg:** Keine Fehler-/Uptime-Überwachung im Dependency-Baum. OnOffice-Ausfall fällt
still auf gecachte oder Beispieldaten zurück (`estates.ts:56-65`); der Matching-Cron meldet
Fehler nur als HTTP-500 an niemanden.
**Warum:** Der Präzedenzfall steht im eigenen Code (`email.ts:32-37`): zwei Tage kein
Mail-Versand, unbemerkt. Zusammen mit 1.3 bedeutet ein stiller Fehltag dauerhaften Lead-Verlust.
**Fix:** `/api/health` + externer Ping; Cron meldet Ergebnis (Erfolg wie Fehler) per Mail;
System-Kachel im `/intern`.

### 4.3 `matching_seen`/`matching_sent` existieren nur in Produktion — Aufwand: S
**Beleg:** Eigene Messung: **0** Treffer in `supabase/migrations/`. Beide Tabellen wurden
live angelegt.
**Warum:** Verstößt gegen die eigene Repo-Regel und blockiert jeden Klon: Der Cron scheitert
dort täglich mit „relation does not exist" — unbemerkt (siehe 4.2).
**Fix:** Schema als Migration nachziehen und im Playbook als Touchpoint eintragen.

### 4.4 Das Playbook untertreibt die hartkodierten Werte deutlich — Aufwand: S
**Beleg (eigene Messungen):** `b-cdn.net` in **12 Dateien / 152 Treffern** (Playbook §3.1
nennt 4 Orte); `015cff` in **16 Dateien / 36 Treffern**; `06232` in **11 Dateien /
48 Treffern**, obwohl `site.ts` die Nummer zentral führt.
**Warum:** Ein Klon, der sich streng ans Playbook hält, übersieht Award-Bilder, ein Video,
das Report-Visual, mehrere Mail-Farben und die Telefonnummer in Login-Fehlermeldungen und
im PDF-Footer — Makler #2 zeigt dann still RIEGEL-Inhalte.
**Fix:** Zahlen im Playbook korrigieren; Komponenten auf `site.ts`/Env umstellen; als
CI-Grep absichern (koppelt an 4.1).

### 4.5 Produktions-Fallbacks zeigen auf RIEGEL-Personen — Aufwand: S
**Beleg:** `intern-access.ts:29` fällt ohne `INTERN_EMAILS` auf Sissy und Alex zurück;
`email.ts:73` auf `info@riegel-immobilien.de`.
**Warum:** Vergisst ein Klon die Variable, bekommen Fremde `/intern`-Zugriff bzw. fremde
Kundenanfragen landen bei RIEGEL — ein Datenschutzvorfall, den nichts im Code verhindert.
**Fix:** In Produktion ohne gesetzte Variable laut scheitern statt still auf Personen fallen.

### 4.6 Geteiltes Supabase-Projekt mit einer Fremd-App — Aufwand: L
**Beleg:** Migration `20260810204917` dokumentiert `public.saadi_contacts` als fremde
Anwendung im selben Projekt; Playbook §6 nennt es einen Audit-Befund.
**Warum:** Verletzt die eigene Doktrin „eigenes Supabase-Projekt pro Makler" bereits bei
Instanz #1. Sollte getrennt sein, bevor Mandant #2 startet.

---

## 7. Bewusst NICHT jetzt

- **Baden-Württemberg / Bayern bei den Bodenrichtwerten** — lizenz- bzw. kostenpflichtig,
  bereits recherchiert und abgelehnt. Stattdessen ehrliches Erwartungsmanagement in der
  Außendarstellung: amtlich gestützt sind ~80 % der Bevölkerung, nicht „ganz Deutschland".
- **Zustands-Faktor empirisch validieren** — größter unvalidierter Hebel der Engine
  (`valuation.ts:420-424`), aber das CRM pflegt den Zustand bei Verkäufen nicht. Das ist
  eine Datenerhebungs-Entscheidung für Manfred/Sissy, kein Code-Thema.
- **Masterplan P1–P3** (Shrinkage, GAA-Kreistabelle, Zeit-Indexierung, beuwy-Pool) — die
  strukturelle Lösung des Kleine-n-Problems. Richtig und wichtig, aber erst nachdem die
  Messbarkeit (Welle 0) und die Ehrlichkeit (Welle 3) stehen.
- **CSP und verteiltes Rate-Limit** — beide im Code bewusst als späterer Ausbau vermerkt;
  bei aktuellem Traffic kein akutes Risiko.

---

## 8. Methodik dieses Laufs

Vier unabhängige Analysen (Conversion/Rechner, Lead-Pipeline, Engine/Daten,
Betrieb/White-Label) mit Pflicht zu Datei:Zeile-Belegen, dazu eigene Messungen gegen
Produktions-Supabase und die laufende Engine. Jeder Befund, der es in diesen Plan geschafft
hat, wurde vom Orchestrator gegengeprüft — zwei Beispiele für die Korrektur durch
Nachmessen: Der Karlsruhe-Bias wurde mit „+10,4 %" gemeldet (Basiswert), gemessen am
tatsächlichen Ausgabewert sind es **+7,1 %**; und die Zahl betroffener Städte wurde nicht
geschätzt, sondern ausgezählt (**1**, nicht „viele").
