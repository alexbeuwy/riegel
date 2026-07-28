# DNS-Umstellung riegel-immobilien.de auf Vercel

**Übergabedokument für Datenschleifer GmbH, z. Hd. Herrn Mayer**
Stand: 28.07.2026 · Erhoben per öffentlicher DNS-Abfrage (Google Public DNS)

---

## 1. Ziel und Grundprinzip

Die Website `riegel-immobilien.de` zieht auf einen neuen Hoster (Vercel) um.

> **Grundprinzip: Es wird ausschließlich der Web-Traffic umgestellt.
> Die E-Mail-Konfiguration bleibt vollständig unverändert.**

Die Domain nutzt Microsoft 365 für E-Mail. Ein versehentliches Ändern oder
Löschen der Mail-Einträge legt den gesamten Mailverkehr lahm. Deshalb bleiben
die Nameserver bei Hetzner und es werden nur drei Einträge angefasst
(Abschnitt 4).

**Ausdrücklich nicht empfohlen:** ein Wechsel der Nameserver auf Vercel. Dabei
müssten sämtliche Mail-Einträge (MX, SPF, DKIM, DMARC, Autodiscover) neu
angelegt werden. Der Nutzen ist null, das Risiko hoch.

---

## 2. Ist-Zustand (verifiziert)

### Nameserver (bleiben unverändert)

| Nameserver |
|---|
| ns1.your-server.de |
| ns3.second-ns.de |
| ns.second-ns.com |

Die DNS-Zone wird also bei Hetzner verwaltet. Dort erfolgen auch die Änderungen.

### Aktuelle Web-Einträge (werden geändert)

| Name | Typ | Wert | TTL |
|---|---|---|---|
| `riegel-immobilien.de` | A | `185.175.196.97` | 60 |
| `riegel-immobilien.de` | AAAA | `2a00:1c98:60:1131::9231:941e` | 60 |
| `www` | A | `185.175.196.97` | 60 |

Aktueller Webserver: nginx. `www` leitet per 301 auf die Domain ohne `www` um;
die kanonische Adresse ist also `https://riegel-immobilien.de`. Das bleibt so.

### E-Mail und Verifizierung (bleiben unverändert)

| Name | Typ | Wert | TTL |
|---|---|---|---|
| `riegel-immobilien.de` | MX | `100 riegelimmobilien-de01e.mail.protection.outlook.com` | 7200 |
| `riegel-immobilien.de` | TXT | `v=spf1 include:spf.protection.outlook.com include:_spf.onoffice.de -all` | 60 |
| `riegel-immobilien.de` | TXT | `MS=ms52980187` | 60 |
| `_dmarc` | TXT | `v=DMARC1;p=none;sp=none;pct=50;adkim=r;aspf=r;` | 7200 |
| `selector1._domainkey` | CNAME | `selector1-riegelimmobilien-de01e._domainkey.riegelimmobilien.k-v1.dkim.mail.microsoft.com` | 60 |
| `selector2._domainkey` | CNAME | `selector2-riegelimmobilien-de01e._domainkey.riegelimmobilien.k-v1.dkim.mail.microsoft.com` | 60 |
| `autodiscover` | CNAME | `autodiscover.outlook.com` | 60 |

Ein CAA-Eintrag existiert derzeit nicht. Das ist für die Umstellung günstig,
weil die Zertifikatsausstellung dadurch nicht eingeschränkt ist.

---

## 3. Was auf keinen Fall angefasst werden darf

Bitte die folgenden Einträge **unverändert** lassen. Sie haben mit der Website
nichts zu tun, ihr Verlust hätte aber sofortige Auswirkungen:

- **MX** — ohne diesen Eintrag kommt keine E-Mail mehr an.
- **TXT mit `v=spf1 …`** — ohne SPF landen ausgehende Mails im Spam.
- **TXT `MS=ms52980187`** — Domainnachweis gegenüber Microsoft 365.
- **`_dmarc`** — Richtlinie für Mail-Authentifizierung.
- **`selector1._domainkey` und `selector2._domainkey`** — DKIM-Signatur.
- **`autodiscover`** — automatische Postfach-Einrichtung in Outlook.

Auch die **Nameserver-Einträge** bleiben unverändert.

---

## 4. Durchzuführende Änderungen

Es sind genau drei Änderungen nötig:

| # | Name | Typ | Aktion | Neuer Wert |
|---|---|---|---|---|
| 1 | `riegel-immobilien.de` (Root/Apex) | A | **ändern** | `216.198.79.1` |
| 2 | `riegel-immobilien.de` (Root/Apex) | AAAA | **löschen** | — |
| 3 | `www` | A → CNAME | **ersetzen** | `e10ce50ca357aebd.vercel-dns-017.com` |

### Zu Punkt 2: Warum der AAAA-Eintrag gelöscht werden muss

Vercel stellt für die Apex-Domain keinen IPv6-Eintrag bereit. Bleibt der
bestehende AAAA-Eintrag stehen, rufen alle Besucher mit IPv6-Anschluss
weiterhin den **alten Server** auf, während IPv4-Besucher die neue Seite
sehen. Das Ergebnis wäre ein schwer auffindbarer Zustand, in dem die
Umstellung „bei manchen funktioniert und bei manchen nicht".

### Zu Punkt 3: `www` von A auf CNAME

Der bestehende A-Eintrag für `www` wird gelöscht und durch einen CNAME
ersetzt. A und CNAME dürfen für denselben Namen nicht gleichzeitig existieren.

### Die beiden Vercel-Zielwerte

Die Domain ist im Vercel-Projekt bereits hinterlegt, die projektspezifischen
Zielwerte liegen damit vor:

| Name | Typ | Wert |
|---|---|---|
| `@` (Root/Apex) | A | `216.198.79.1` |
| `www` | CNAME | `e10ce50ca357aebd.vercel-dns-017.com` |

> **Hinweis zum CNAME:** Der Hostname ist **projektspezifisch** und gilt nur
> für dieses Projekt. Er darf nicht durch einen Wert aus einer allgemeinen
> Vercel-Anleitung ersetzt werden (`cname.vercel-dns.com` o. Ä.), sonst zeigt
> `www` ins Leere.

Der abschließende Punkt (`…vercel-dns-017.com.`) gehört zur vollqualifizierten
Schreibweise. Ob er mit eingetragen wird, hängt von der Eingabemaske ab:
Manche Oberflächen erwarten ihn, andere ergänzen ihn selbst. Beides ist
richtig, solange am Ende nicht versehentlich die eigene Domain angehängt wird
(also **nicht** `e10ce50ca357aebd.vercel-dns-017.com.riegel-immobilien.de`).

Ein zusätzlicher Verifizierungs-Eintrag (TXT auf `_vercel`) wird für diese
Domain **nicht** benötigt.

### Empfohlene TTL

Für die drei Web-Einträge: **60 Sekunden** (wie bisher). Nach erfolgreicher
Umstellung und einigen Tagen stabilem Betrieb kann auf 3600 erhöht werden.

---

## 5. Ablauf der Umstellung

| Schritt | Wer | Aktion |
|---|---|---|
| 1 | RIEGEL/Agentur | Domain im Vercel-Projekt hinterlegen, Zielwerte ablesen — **erledigt** |
| 2 | Datenschleifer | TTL der drei Web-Einträge auf 60 s prüfen (ist bereits so) |
| 3 | **Umschaltung** | A ändern, AAAA löschen, `www` auf CNAME umstellen |
| 4 | RIEGEL/Agentur | Zertifikatsausstellung und Erreichbarkeit prüfen (Abschnitt 7) |

Der eigentliche Umschaltmoment ist Schritt 3 und dauert wenige Minuten.
Da die TTL bei 60 Sekunden liegt, ist die Umstellung schnell wirksam.

**Empfohlenes Zeitfenster:** vormittags an einem Werktag, damit bei einer
Rückfrage alle Beteiligten erreichbar sind. Nicht Freitagnachmittag.

---

## 6. Wichtiger Hinweis zu HSTS

Die Domain liefert derzeit folgenden Header aus:

```
strict-transport-security: max-age=63072000; includeSubDomains; preload
```

Das bedeutet: Browser, die die Seite schon einmal besucht haben, verbinden
sich **ausschließlich über HTTPS** und lassen sich bei einem Zertifikatsfehler
**nicht durchklicken**. Daraus folgt:

- Zwischen dem Umstellen der DNS-Einträge und dem Ausstellen des neuen
  Zertifikats darf kein längeres Fenster liegen. Vercel stellt das Zertifikat
  in der Regel innerhalb weniger Minuten nach der DNS-Umstellung automatisch
  aus.
- Direkt nach Schritt 3 muss geprüft werden, ob HTTPS sauber funktioniert
  (Abschnitt 7). Falls nicht: sofort Rollback (Abschnitt 8).
- `includeSubDomains` gilt für alle Subdomains. Es darf keine Subdomain ohne
  gültiges Zertifikat neu angelegt werden.

Bitte zusätzlich prüfen, ob die Domain auf der HSTS-Preload-Liste steht
(`hstspreload.org`). Falls ja, ist ein Rollback auf HTTP nicht möglich; der
Betrieb muss dann zwingend über HTTPS erfolgen, was bei Vercel der Fall ist.

---

## 7. Kontrolle nach der Umstellung

**Sofort nach Schritt 3:**

1. `https://riegel-immobilien.de` im Browser aufrufen, neue Seite muss
   erscheinen, Schloss-Symbol ohne Warnung.
2. `https://www.riegel-immobilien.de` aufrufen, muss auf die Adresse ohne
   `www` weiterleiten.
3. Auflösung prüfen:
   ```
   dig +short A    riegel-immobilien.de
   dig +short AAAA riegel-immobilien.de     # muss LEER sein
   dig +short CNAME www.riegel-immobilien.de
   ```

**E-Mail-Kontrolle (wichtig, auch wenn nichts geändert wurde):**

4. Testmail von außen an `info@riegel-immobilien.de` senden, muss ankommen.
5. Testmail von `info@riegel-immobilien.de` nach außen senden, muss ankommen
   und darf nicht im Spam landen.
6. MX und SPF gegenprüfen:
   ```
   dig +short MX  riegel-immobilien.de
   dig +short TXT riegel-immobilien.de
   ```

---

## 8. Rollback

Falls etwas nicht funktioniert, werden die drei Einträge auf den Ist-Zustand
aus Abschnitt 2 zurückgesetzt:

| Name | Typ | Wert |
|---|---|---|
| `riegel-immobilien.de` | A | `185.175.196.97` |
| `riegel-immobilien.de` | AAAA | `2a00:1c98:60:1131::9231:941e` |
| `www` | A | `185.175.196.97` |

Der CNAME auf `www` wird dabei gelöscht. Wegen der TTL von 60 Sekunden ist der
alte Zustand innerhalb weniger Minuten wieder aktiv. Der alte Server sollte
deshalb noch mindestens **zwei Wochen** nach der Umstellung erreichbar bleiben
und erst danach abgeschaltet werden.

---

## 9. Offene Punkte auf RIEGEL-Seite

Diese Punkte betreffen nicht Datenschleifer, sind aber für den Betrieb der
neuen Seite relevant und sollten vor oder kurz nach der Umstellung geklärt
werden:

### 9.1 Versand von Website-E-Mails (SPF)

Die neue Website verschickt E-Mails (Terminbestätigungen, Wertreports,
Objektanfragen) über den Dienst **Resend**. Der aktuelle SPF-Eintrag lautet:

```
v=spf1 include:spf.protection.outlook.com include:_spf.onoffice.de -all
```

Resend ist darin **nicht enthalten**, und das abschließende `-all` weist alle
nicht gelisteten Absender hart ab. Sobald als Absenderadresse eine Adresse
`@riegel-immobilien.de` verwendet wird, werden diese Mails an der
SPF-Prüfung scheitern.

Zwei mögliche Wege:

- **Empfohlen:** eine eigene Subdomain für den Versand einrichten (z. B.
  `mail.riegel-immobilien.de`) und dort die von Resend vorgegebenen
  SPF- und DKIM-Einträge setzen. Der Haupt-SPF bleibt unangetastet.
- **Alternative:** `include:_spf.resend.com` in den bestehenden SPF-Eintrag
  aufnehmen. Achtung: Ein SPF-Eintrag darf maximal 10 DNS-Abfragen auslösen;
  mit drei Includes ist noch Luft, die Grenze sollte aber im Blick bleiben.

Ohne eine dieser Maßnahmen bleibt es beim bisherigen Absender und die Mails
kommen weiterhin durch, wirken für Empfänger aber weniger professionell.

### 9.2 DMARC-Richtlinie

Aktuell gilt `p=none; pct=50`. Das bedeutet: Es wird nur beobachtet, nicht
durchgesetzt, und das auch nur für die Hälfte der Mails. Nach einer Phase
stabilen Betriebs empfiehlt sich eine Verschärfung auf `p=quarantine` und
später `p=reject`, ergänzt um eine `rua=`-Adresse für Auswertungsberichte.
Das ist ein eigener Vorgang und sollte **nicht** zusammen mit der
Web-Umstellung erfolgen.

### 9.3 CAA-Eintrag

Derzeit ist kein CAA-Eintrag gesetzt, jede Zertifizierungsstelle darf also
ausstellen. Das ist für die Umstellung praktisch. Wer die Ausstellung später
einschränken möchte, muss die von Vercel genutzte Stelle (Let's Encrypt)
zulassen, sonst schlägt die Zertifikatserneuerung fehl.

### 9.4 Weiterleitungen der alten Seite

Falls die bestehende Website Adressen verwendet, die es auf der neuen Seite
nicht mehr gibt, sollten dafür Weiterleitungen eingerichtet werden, damit
Google-Rankings und bestehende Links erhalten bleiben. Diese Liste wird
separat erstellt und ist unabhängig von der DNS-Umstellung.

---

## 10. Kurzfassung für die Umsetzung

```
ÄNDERN:
  @      A       185.175.196.97      →  216.198.79.1                            TTL 60
  @      AAAA    2a00:1c98:60:...    →  LÖSCHEN
  www    A       185.175.196.97      →  LÖSCHEN
  www    CNAME   —                   →  e10ce50ca357aebd.vercel-dns-017.com     TTL 60

UNVERÄNDERT LASSEN:
  MX, TXT (SPF), TXT (MS=...), _dmarc,
  selector1._domainkey, selector2._domainkey, autodiscover,
  Nameserver
```

Endzustand der Web-Einträge:

| Name | Typ | Wert |
|---|---|---|
| `@` | A | `216.198.79.1` |
| `www` | CNAME | `e10ce50ca357aebd.vercel-dns-017.com` |

Kein AAAA-Eintrag, kein A-Eintrag auf `www`.

Rückfragen jederzeit an die RIEGEL-Projektbetreuung.
