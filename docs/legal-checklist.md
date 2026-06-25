# Rechtliche Checkliste – riegel-immobilien.de

Anwalts-fertige Checkliste für den Relaunch (Sylwia „Sissy" Riegel, B2C-Immobilienmaklerin, Speyer/Ludwigshafen).

> **⚠️ KEINE RECHTSBERATUNG.** Dieses Dokument ist eine technische/organisatorische Aufstellung für die
> Abstimmung mit einer Anwältin/einem Anwalt. Verbindliche Bewertung und alle Pflichttexte (Impressum,
> Datenschutzerklärung, Widerrufsbelehrung + Muster-Widerrufsformular) müssen anwaltlich erstellt/geprüft werden.

Querverweise: [architecture.md](./architecture.md) · [onoffice-integration.md](./onoffice-integration.md) · [design-system.md](./design-system.md) (A11y) · [RELAUNCH-LOG.md](../RELAUNCH-LOG.md)

---

## Die eine Schlüsselfrage zuerst

**BFSG-Kleinstunternehmer-Ausnahme (§3 Abs.3 BFSG):** „Absatz 1 gilt nicht für Kleinstunternehmen, die
Dienstleistungen anbieten oder erbringen." Kleinstunternehmen = **< 10 Mitarbeiter UND ≤ 2 Mio. €**
Umsatz **oder** Bilanzsumme. Eine Maklerin ist Dienstleistungserbringerin → eine Solo-/Kleinmaklerin ist
**wahrscheinlich vollständig befreit** von den BFSG-Barrierefreiheitspflichten und der
Barrierefreiheitserklärung. **Muss schriftlich vom Mandanten/Anwalt bestätigt werden** – die Bewertung
erfolgt auf Gesamtunternehmensebene. Bei Wachstum über die Schwelle: Pflicht **sofort**, ohne
Übergangsfrist für Websites, Bußgeld bis 100.000 € (§37 BFSG).

→ **Empfehlung unabhängig davon:** WCAG 2.1 AA bauen (günstige Versicherung + GEO/SEO-Vorteil, Wunsch #8).

---

## Checkliste

| Thema | Anforderung | Risiko | technisch / juristisch | Zuständig |
|---|---|---|---|---|
| **Consent / CMP** | Echtes Opt-in vor allen nicht-essentiellen Cookies/Embeds (Maps, WhatsApp, Booking-Embed, Analytics, externe Fonts). Gleichwertiger „Alles ablehnen"-Button auf **erster Ebene** neben „Alle akzeptieren", granular, Widerruf jederzeit, Consent-Logs, Re-Prompt ≥12 Monate. CMP **blockt Laden bis Einwilligung** (Two-Click/Placeholder für Maps/Social). Kein IAB TCF 2.0. (DSGVO + §25 TDDDG) | **HOCH** | technisch (Tool) + juristisch (Texte/Kategorien) | Alex (Implementierung) + Anwalt (Prüfung) |
| **Google Fonts / externe Fonts** | **Self-hosten** (next/font self-hostet automatisch). Externes Laden = IP-Transfer in die USA ohne Einwilligung → Abmahnrisiko. | HOCH | technisch | Alex |
| **Karten** | OpenStreetMap/MapLibre statt Google Maps (kein US-Transfer, weniger Consent-Reibung). Falls doch Google: Opt-in + Zwei-Klick. | MITTEL | technisch | Alex |
| **Impressum (§5 DDG, ex-TMG)** | Name + ladungsfähige Anschrift (kein Postfach), Tel + E-Mail, USt-IdNr falls vorhanden, Register falls vorhanden. **Makler-spezifisch:** (a) zuständige **Aufsichtsbehörde** für §34c-GewO-Erlaubnis benennen, (b) Berufsbezeichnung „Immobilienmakler" + Verleihstaat, (c) berufsrechtliche Regelungen = §34c GewO + **MaBV** mit Link. §18 Abs.2 MStV Verantwortlicher, OS-Plattform/VSBG-Hinweis. Aus jeder Seite erreichbar (Footer). | HOCH | juristisch (Inhalt) + technisch (Footer-Link) | Anwalt + Alex |
| **Datenschutzerklärung (Art. 13 DSGVO)** | Verantwortlicher, Zwecke + Rechtsgrundlagen (Kontakt/Booking = Art. 6(1)(b)/(a); Maklervermittlung = Vertrag), **Empfänger (OnOffice als Prozessor, Vercel-Hosting, Map-Provider, Resend)**, Drittlandtransfers + Garantien (SCC), Speicherfristen, Betroffenenrechte + Beschwerderecht, Booking-Tool-Datenerhebung. TLS auf allen Formularen. | HOCH | juristisch (Text) + technisch (TLS, Datenflüsse) | Anwalt + Alex |
| **Widerrufsbelehrung + Muster-Widerrufsformular** | Fernabsatz-Maklerverträge (E-Mail/Web/WhatsApp/Telefon) = 14-Tage-Widerrufsrecht (§355 BGB), Belehrung nach §312d + Art. 246a EGBGB **plus** Muster-Widerrufsformular (Anlage 2 EGBGB, **wortgleich**). Fehlerhafte/fehlende Belehrung → Frist 1 Jahr + 14 Tage; BGH: schon kleine Abweichungen vom Muster verwirken die Privilegierung → **Provisionsanspruch gefährdet**. Sichtbarer Widerruf-Zugang (Footer + eigene `/widerruf`-Seite) + Download des Musters. | **HOCH** | juristisch (Text wortgleich) + technisch (Seite/Flow) | Anwalt + Alex |
| **Widerruf-Button (NEU, ab 19.06.2026)** | Für online geschlossene Fernabsatzverträge: zweistufiger Button – prominenter „Vertrag widerrufen" → Formular (Name, Vertragsbezeichnung, elektronischer Kontakt) → „Widerruf bestätigen". Makler explizit betroffen. **Jetzt bauen** (front-runs Deadline, Wunsch #9). | MITTEL (HOCH ab 06/2026) | technisch + juristisch (Flow-Wording) | Alex + Anwalt |
| **Maklerrecht §656a-d BGB** | §656a Textform für Maklervertrag (Wohnung/EFH an Verbraucher) – Web-Form-Flow muss Textform abbilden. §656c/d Provisionsteilung ≥50/50, Käufer nicht mehr als Verkäufer, Zahlung erst nach Nachweis. Provisionsangaben auf der Seite konsistent. | MITTEL | juristisch (Text) + technisch (Form-Flow) | Anwalt + Alex |
| **OnOffice AVV (Art. 28 DSGVO)** | Vor Go-Live unterschriebener AVV mit OnOffice (P-dDE-2001 + Anlagen), Sub-Prozessor-/Drittlandprüfung dokumentieren. Fehlend → Bußgeld bis 10 Mio. € / 2 % Umsatz. Gilt analog für Vercel + Supabase + Resend. | HOCH | juristisch (Vertrag) + technisch (Doku) | Anwalt/Sissy + Alex |
| **EU-Region / Secrets** | Supabase + Vercel auf **EU-Region** pinnen; OnOffice-Token+Secret strikt server-seitig. US-Default-Region oder Client-Leak = Transfer- + Security-Problem. | HOCH | technisch | Alex |
| **BFSG / WCAG 2.1 AA** | Falls **nicht** befreit: WCAG 2.1 AA via EN 301 549 **+ Barrierefreiheitserklärung** (Pflichtinhalte Anlage 3, nennt MLBF Magdeburg), Footer-Link, sofort gültig, Bußgeld bis 100.000 €. Falls befreit: freiwillig bauen (empfohlen). Dark-Design: Kontraste ≥4,5:1 prüfen (siehe [design-system.md](./design-system.md)). | MITTEL (HOCH falls nicht befreit) | technisch + juristisch (Status + ggf. Erklärung) | Alex + Anwalt |
| **Chatbot** | Gestrichen (D4) → keine Aktion. Falls später: eigene Einwilligung + AVV mit LLM-Anbieter + Hinweis. | n/a | — | — |
| **Booking-Tool (Datenfluss)** | Eigenbau → Personendaten-Prozessor-Flow: Datenschutzhinweis am Erhebungspunkt, Consent falls externes Embed, Datenpfad in OnOffice durch AVV gedeckt, EU-Supabase, Datenminimierung, Retention. Kein Calendly = kein US-Prozessor. | MITTEL | technisch + juristisch (Hinweistext) | Alex + Anwalt |

---

## Empfehlung in zwei Stufen

**Tier 1 – zwingend, blockiert Go-Live:**
(a) Echte Opt-in-CMP (Usercentrics/Cookiebot/Consentmanager oder selbstgebaute, anwaltlich geprüfte Banner-Lösung), blockt alle externen Embeds bis granularer Einwilligung, „Alles ablehnen" auf erster Ebene, Widerruf, Consent-Logging, 12-Monats-Re-Prompt.
(b) Fonts self-hosten (next/font), OSM/MapLibre statt Google Maps.
(c) Anwalt erstellt/prüft: §5-DDG-Impressum, Art.-13-Datenschutzerklärung, Widerrufsbelehrung + wortgleiches Muster-Widerrufsformular, §656a-d-Provisionstexte.
(d) OnOffice-AVV unterschreiben + EU/US-Transferkette dokumentieren (Vercel + Supabase EU, OnOffice-Secret server-seitig).
(e) Global erreichbarer Kontakt- + Widerruf-Zugang (Footer-Links + eigene Seiten).

**Tier 2 – Barrierefreiheit:** BFSG-Status **schriftlich bestätigen**. Befreit → WCAG 2.1 AA freiwillig (für Wunsch #8 + GEO/SEO). Nicht befreit → WCAG 2.1 AA + Barrierefreiheitserklärung (MLBF) Pflicht, keine Übergangsfrist, bis 100.000 € Bußgeld. So oder so: barrierefreien Code bauen.

---

## Offene Fragen an Mandantin/Anwalt
- Exakte Mitarbeiterzahl + Umsatz/Bilanz (BFSG-Schwelle)?
- Werden Maklerverträge typischerweise im Fernabsatz geschlossen (→ Widerruf-Button-Flow zwingend) oder auch vor Ort?
- Welche Aufsichtsbehörde hat die §34c-GewO-Erlaubnis erteilt (vermutlich IHK/Ordnungsamt Speyer/Ludwigshafen)? Wortlaut fürs Impressum.
- Käufer-Provision auf Wohnung/EFH? 50/50-Split (§656c/d) überall konsistent dargestellt?
- OnOffice-AVV bereits unterschrieben? Drittland-Sub-Prozessoren?
- DPO benannt? Verzeichnis von Verarbeitungstätigkeiten (Art. 30)?
- Freiwillige Barrierefreiheitserklärung gewünscht (Anwalt: bindende Zusicherung?)?

---

## Quellen
- §3 BFSG: <https://www.gesetze-im-internet.de/bfsg/__3.html> · activeMind Guide: <https://www.activemind.legal/de/guides/bfsg/> · Bundesfachstelle FAQ: <https://www.bundesfachstelle-barrierefreiheit.de/DE/Fachwissen/Produkte-und-Dienstleistungen/Barrierefreiheitsstaerkungsgesetz/FAQ/faq_node.html>
- §14 BFSG / Erklärung: <https://bfsg-gesetz.de/14-bfsg/> · <https://bfsg-gesetz.de/erklaerung-zur-barrierefreiheit/> · BFSG für Makler: <https://www.immoprofessional.com/de/bfsg/>
- Cookie-Banner 2025: <https://easyrechtssicher.de/blog/cookie-banner-abmahnung-2025> · Google Maps DSGVO: <https://cortina-consult.com/web-compliance/wissen/google-maps-dsgvo/> · TDDDG §25: <https://cortina-consult.com/web-compliance/wissen/tdddg/> · EinwV: <https://usercentrics.com/knowledge-hub/cookie-flood-control-consent-management-ordinance-tdddg/>
- Google Fonts self-host: <https://www.dr-datenschutz.de/wie-google-fonts-dsgvo-konform-werden/>
- Impressum Makler: <https://www.e-recht24.de/impressum/7906-impressum-immobilienmakler.html> · IHK Rhein-Neckar §34c: <https://www.ihk.de/rhein-neckar/wirtschaftsstandort/branchen/dienstleistungen/immobilienwirtschaft/erlaubnispflichtige-gewerbe-gemaess-34c/internetimpressum-4352104>
- Widerruf Maklervertrag: <https://kanzlei-franz.com/ratgeber-kaufrecht/widerrufsrecht-beim-maklervertrag/> · BGH Muster: <https://www.haufe.de/immobilien/entwicklung-vermarktung/marktanalysen/bgh-keine-privilegierung-bei-aenderung-von-muster-widerruf_84324_629908.html> · Widerruf-Button 19.06.2026: <https://www.haufe.de/immobilien/wirtschaft-politik/widerrufsbutton-pflicht-fuer-online-vertraege_84342_689588.html>
- §656c BGB: <https://www.gesetze-im-internet.de/bgb/__656c.html> · IHK Frankfurt Maklerkosten: <https://www.frankfurt-main.ihk.de/recht/uebersicht-alle-rechtsthemen/neuer-inhalt-5811944>
- OnOffice AVV: <https://onoffice.com/app/uploads/2024/07/P-dDE-2001-Datenverarbeitungsvereinbarung.pdf>
- Datenschutz Makler: <https://www.datenschutz-janolaw.de/info-faq/informationen/immobilie/immobilienmakler.html> · Art.13 DSGVO: <https://dsgvo-gesetz.de/art-13-dsgvo/>
