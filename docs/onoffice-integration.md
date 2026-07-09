# OnOffice API – Integrations-Spezifikation

Server-seitige Anbindung der OnOffice JSON-API für Immobilien, Bilder und Lead-Anlage.
Querverweise: [architecture.md](./architecture.md) · [legal-checklist.md](./legal-checklist.md) (AVV) · [RELAUNCH-LOG.md](../RELAUNCH-LOG.md)

> ✅ **Verifizierungs-Status (aktualisiert 09.07.2026):** HMAC-Recipe, Endpoint und Feldnamen sind mittlerweile **live gegen die API verifiziert** (siehe §9), nicht mehr nur Synthese-Wissen aus `apidoc.onoffice.de`. `fields:get` liefert 251 Felder für den RIEGEL-Account — die unten verwendeten Feldnamen (`objektart`/`objekttyp`, `vermarktungsart`, Preis-/Flächen-/Energiefelder etc.) sind bestätigt vorhanden. Ausnahme: `breitengrad`, `laengengrad` und `veroeffentlichen` sind **Systemfelder außerhalb von `fields:get`** — sie tauchen nicht in der Feldliste auf, werden von der API in `data`/`filter` aber anstandslos akzeptiert; im Code entsprechend anfordern, ihr Fehlen aber tolerieren. Offen ist aktuell keine Spezifikationsfrage mehr, sondern die **Rechtevergabe** des API-Users (siehe §9).

> **Grundregel:** Das HMAC-Secret **ist** der API-Key. Jeder Call läuft in einem Route Handler /
> Server Action mit `ONOFFICE_TOKEN` + `ONOFFICE_SECRET` aus Vercel-Server-Env. **Nie** `NEXT_PUBLIC`,
> nie signierte Payloads loggen, nie ins Client-Bundle.

---

## 1. HMAC-v2 Signatur-Recipe

Endpoint: `POST https://api.onoffice.de/api/stable/api.php`

Signatur (hmac_version **2**):

```
hmac = base64( HMAC_SHA256( key = secret, message = timestamp + token + resourcetype + actionid ) )
```

- Die vier Werte werden **ohne Trennzeichen** konkateniert.
- HMAC-SHA256, keyed mit dem API-**Secret**, dann base64-encoded.
- `timestamp` = Unix-Sekunden (gleicher Wert muss in der Action stehen wie in der Signatur).

TypeScript (`lib/onoffice/hmac.ts`):

```ts
import { createHmac } from "node:crypto";

export function signActionV2(opts: {
  secret: string;
  timestamp: number;
  token: string;
  resourcetype: string;
  actionid: string;
}): string {
  const { secret, timestamp, token, resourcetype, actionid } = opts;
  const message = `${timestamp}${token}${resourcetype}${actionid}`;
  return createHmac("sha256", secret).update(message).digest("base64");
}
```

Request-Envelope:

```jsonc
{
  "token": "<ONOFFICE_TOKEN>",
  "request": {
    "actions": [
      {
        "actionid": "urn:onoffice-de-ns:smart:2.5:smartml:action:read",
        "resourceid": "",
        "resourcetype": "estate",
        "identifier": "",
        "timestamp": 1750000000,
        "hmac": "<base64-hmac>",
        "hmac_version": "2",
        "parameters": { /* siehe unten */ }
      }
    ]
  }
}
```

---

## 2. Immobilien lesen (read estate) mit Filtern

- `actionid`: `...:action:read`
- `resourcetype`: `estate`
- `parameters`:
  - `data`: Feldliste, z. B. `["Id","kaufpreis","kaltmiete","wohnflaeche","anzahl_zimmer","ort","plz","objekttyp","vermarktungsart","objekttitel","breitengrad","laengengrad"]`
  - `filter`: serverseitige Filter, gemappt aus den URL-searchParams der `/immobilien`-Liste:
    - `vermarktungsart` → `typ` (kauf/miete)
    - `kaufpreis`/`kaltmiete` → `{ ">=": minPreis, "<=": maxPreis }`
    - `ort` / `plz` → `ort`
    - `anzahl_zimmer` → `{ ">=": zimmer }`
    - `wohnflaeche` → `{ ">=": flaeche }`
  - `listlimit`, `listoffset` (Pagination)
  - `sortby` (z. B. `kaufpreis`), `sortorder`
  - `estatelanguage`: `"DEU"`

Mapping-Tabelle der searchParams → OnOffice-Felder lebt in `lib/validation/filters.ts` + `lib/onoffice/estates.ts`.

---

## 3. Bilder (estatepictures)

- `resourcetype`: `estatepictures`
- `parameters`:
  - `estateids`: `[<id>, ...]`
  - `categories`: z. B. `["Foto","Titelbild","Grundriss"]`
  - `size`: z. B. `"500x500"` oder `"original"`
  - `language`: `"DEU"`
- Rückgabe: **persistente OnOffice-CDN-URLs**, Muster
  `https://image.onoffice.de/smart.../Objekte/<customer>/<estateid>/<file>.jpg`

`next.config` – Host registrieren, damit `next/image` optimieren darf:

```ts
images: {
  formats: ["image/avif", "image/webp"],
  minimumCacheTTL: 60 * 60 * 24 * 30, // Bilder ändern selten
  remotePatterns: [
    { protocol: "https", hostname: "image.onoffice.de", pathname: "/smart**/Objekte/<customer>/**" },
  ],
}
```

---

## 4. Lead anlegen (create address)

- `actionid`: `...:action:create`
- `resourcetype`: `address`
- `parameters` (Auszug): `Vorname`, `Name`, `Email`, `Telefon1`, `Bemerkung` (Freitext/Nachricht), `HerkunftKontakt` = `"Website"`, `checkDuplicate: true`
- Optional: Estate-Relation, wenn die Anfrage zu einem Listing gehört (Verknüpfung Adresse↔Estate).
- Ergebnis-`address_id` zurück nach Supabase `leads.onoffice_address_id` schreiben, `onoffice_synced=true`.

**Reihenfolge (siehe [architecture.md](./architecture.md) §3):** Supabase-Insert **zuerst** (durable), dann OnOffice-Call. Bei Fehler: `onoffice_synced=false` + Retry-Queue, damit kein Lead verloren geht.

---

## 5. Webhooks (Freshness)

- OnOffice Marketplace-Webhooks feuern bei estate create/update/delete (`module=estate`).
- `app/api/webhooks/onoffice/route.ts` (POST): Shared-Secret (`ONOFFICE_WEBHOOK_SECRET`) verifizieren → `revalidateTag('estate-${id}')` + `revalidateTag('estate-list')` + `revalidatePath('/sitemap.xml')` → schnell 200.
- **Fallback:** zeitbasierte ISR (`revalidate: 3600`) auf Detailseiten, falls ein Webhook verpasst wird.

---

## 6. Caching-Strategie

- Liste: `fetch(..., { next: { tags: ["estate-list"], revalidate: 300 } })` – kurzer TTL, server-rendered.
- Detail: getaggt `estate-${id}`, ISR + Webhook-Invalidierung.
- `estate_cache`-Tabelle in Supabase **optional** – erst einführen, wenn OnOffice-Latenz/Rate-Limits messbar wehtun (Next.js-Fetch-Cache + ISR reichen i. d. R.).

---

## 7. Anzufordernde Credentials / Config (von Sissy / OnOffice)

| Item | Zweck |
|---|---|
| `ONOFFICE_TOKEN` + `ONOFFICE_SECRET` | API-Zugang (Least-Privilege-User: read `estate` + `estatepictures`, create `address`). |
| Bestätigung **Write-Access** (create address) im Vertrag | Lead-Sync ins CRM. |
| Bestätigung **Marketplace-Webhooks** verfügbar | On-demand-Revalidation. |
| `ONOFFICE_WEBHOOK_SECRET` (Shared) | Webhook-Verifikation. |
| **Rate-Limits** (dokumentiert?) | Entscheidet, ob SSR-on-every-request auf der Liste tragfähig ist. |
| OnOffice-Image-CDN-Host + Customer-Pfad | exakte `remotePatterns`. |
| **Unterschriebener Art. 28 AVV** + Sub-Prozessor-/Drittlandliste | DSGVO, vor erstem Live-Lead. Siehe [legal-checklist.md](./legal-checklist.md). |
| AVM-Tarif-Info (PriceHubble/Sprengnetter im Plan? Public-Web erlaubt?) | Preis-Tool-Engine, siehe [preisatlas-research.md](./preisatlas-research.md). |

---

## 8. Voller Import aller ~108 Objekte — kurz: JA, sauber.

**Frage:** Sobald die API-Keys da sind, ziehen wir alle 108 Objekte sauber in unser System?
**Antwort:** Ja. 108 Datensätze sind trivial — ein paginierter `read estate`-Pull plus
ein `estatepictures`-Pull. Konkreter Ablauf:

1. **Pull:** `read estate` mit `listlimit` (z. B. 100) + `listoffset` über 2 Seiten → alle aktiven
   Objekte mit allen benötigten Feldern in einem Lauf.
2. **Mapping** OnOffice → unser bestehendes `Estate`-Modell (`src/lib/mock-estates.ts`), das Portal,
   Filter, Karte und Detailseite bereits vollständig bedienen:

   | OnOffice-Feld | Unser `Estate` |
   |---|---|
   | `Id` | `id` / `slug` (aus Titel + Id) |
   | `objekttitel` | `title` |
   | `vermarktungsart` | `marketingType` (kauf/miete) |
   | `objektart`/`objekttyp` | `category` / `objectType` |
   | `kaufpreis` / `kaltmiete` | `price` |
   | `anzahl_zimmer` | `rooms` |
   | `wohnflaeche` / `grundstuecksflaeche` | `livingArea` / `plotArea` |
   | `ort` / `plz` / `regionaler_zusatz` | `city` / `postcode` / `district` |
   | `breitengrad` / `laengengrad` | `geo {lat,lng}` |
   | `energietraeger`/`energieausweistyp`/`endenergiebedarf`/`energieeffizienzklasse` | `energy` |
   | `courtage`/`provisionspflichtig` | `provision` |
   | `objektbeschreibung`/`lage`/`ausstatt_beschr` | `description`/`locationDescription`/`features` |
   | `estatepictures`-URLs | `images[]` |

3. **Speichern:** Upsert in eine Supabase-Tabelle `estates` (Single Source für das Portal) — schnelle
   Filter/Suche, entkoppelt von OnOffice-Rate-Limits. Das Portal liest dann aus Supabase statt aus
   `mockEstates`. **Die UI ändert sich nicht** (gleiches `Estate`-Modell).
4. **Aktualität:** Marketplace-Webhooks (§5) → bei Änderung gezielt einzelnes Objekt neu ziehen;
   zusätzlich nächtlicher Voll-Resync als Sicherheitsnetz.
5. **Bilder:** OnOffice-CDN-URLs direkt nutzen (`remotePatterns` in `next.config`, §3) — optional später
   spiegeln. Energieausweis + Provision (Pflichtangaben) kommen aus den Feldern oben → bereits gerendert.

**Was wir dafür brauchen:** `ONOFFICE_TOKEN` + `ONOFFICE_SECRET` (Server-Env, nie ins Bundle) und
die Bestätigung, dass der **API-Zugang** (onOffice Marketplace/„API") für das Konto aktiv ist
(Lese-Rechte `estate` + `estatepictures`). Danach: Mapping-Modul + Sync-Job bauen (~0,5–1 Tag),
`mockEstates` als Datenquelle gegen den Supabase-`estates`-Reader tauschen, fertig. Bei 108 Pins
lohnt sich dann auch das **Karten-Clustering** (bisher bewusst zurückgestellt).

---

## 9. Live-Status (Probe 09.07.2026)

- Credentials (`ONOFFICE_TOKEN`/`ONOFFICE_SECRET`) von Sissy erhalten und gegen die Live-API
  verifiziert (Werte selbst stehen ausschließlich in `process.env`, nirgends in diesem
  Repo/dieser Doku).
- **Auth/HMAC v2 funktioniert**: alle getesteten Calls kommen mit `errorcode 0` zurück — das
  Signatur-Recipe aus §1 und der Request-Envelope sind damit bestätigt korrekt.
- **`fields:get`**: liefert 251 Felder — Grundlage der Feldliste/des Mappings in §8.
- **`estate` `read`**: liefert aktuell **0 Records** (`cntabsolute: 0`), obwohl die
  Authentifizierung erfolgreich ist → dem API-Benutzer fehlt das Recht, Immobilien-Datensätze
  überhaupt zu **sehen** (Sichtbarkeit, nicht der API-Zugriff an sich).
- **`estatepictures` `get`**: `errorcode 170` „No read permission for this user" (im Body
  mitgeliefertes HTTP-Status-Feld: 500) → kein Leserecht für Objektbilder.
- **`address` `read`** funktioniert dagegen anstandslos — **über 40.000 Datensätze sichtbar**.
  Hinweis fürs Least-Privilege-Prinzip aus §7: das ist deutlich mehr Zugriff, als die Integration
  aktuell braucht (nur Lead-**Anlage**, kein Adress-Lesen) — sollte entzogen werden, sobald die
  Objekt-Rechte stehen.

### To-do für Sissy in onOffice enterprise

1. **API-Benutzer → Rechte → Immobilien**: „alle Datensätze sehen" aktivieren (mindestens die
   veröffentlichten Objekte) — ohne dieses Recht bleibt `estate read` bei 0 Treffern, unabhängig
   von Filtern oder angefragten Feldern.
2. **API-Recht `estatepictures` (read)** aktivieren — aktuell explizit verweigert
   (`errorcode 170`).
3. **Optional**: Adress-**Leserecht** entziehen (Least-Privilege) — für die Lead-Anlage genügt
   später das **create**-Recht auf `address`, ein Leserecht auf >40.000 fremden Datensätzen ist
   dafür nicht nötig.

### Code-Stand

Das Portal verhält sich bereits so, wie es sich verhalten soll, solange diese Rechte fehlen:
`fetchOnOfficeEstates()` liefert `null`, sobald 0 Objekte sichtbar sind (aktuell der Fall) oder
ein API-/Netzwerkfehler auftritt, und `getEstateData()`/`getEstateBySlug()`/
`getFeaturedEstates()` fallen dann sauber auf die Mock-Objekte zurück (`source: "mock"`).
Sobald Sissy die Rechte oben freischaltet, braucht es **kein Deploy** — der nächste Seitenaufruf
nach Ablauf des Caches (`unstable_cache`, 300 s / Tag `estates`) liefert dann automatisch die
echten Objekte.

### E2E-verifiziert (09.07.2026)

Der komplette Live-Pfad wurde per Playwright gegen einen lokalen Mock der OnOffice-API
(exakte Envelope-Shape) durchgespielt — 27/27 Checks grün: Mapping (Preise/Warmmiete-Label/
Energie/Provision/Features/Umlaut-Slugs), Status-Filterung (`in_akquise` & Co. erscheinen NIE,
Reserviert mit Badge, Featured nur aktiv), Bild-Host-Filter (Fremd-Hosts verworfen →
„Fotos folgen"-Platzhalter), Id-Suffix-Slug-Match bei Titeländerung, Live-Sitemap, robots-Umschaltung.
Dafür gibt es den Test-Hebel `ONOFFICE_API_URL` (überschreibt den Endpoint; produktiv ungesetzt).
Betriebs-Hinweise: (1) `unstable_cache` persistiert in `.next/cache` über Dev-Server-Neustarts —
nach lokalen Mock-Tests `.next` löschen, sonst klebt Testdaten-Cache bis zum TTL-Ablauf.
(2) Unbekannte Slugs liefern wegen `loading.tsx`-Streaming einen Soft-404 (HTTP 200, aber
Next rendert die 404-UI **mit `noindex`-Meta**) — SEO-seitig unbedenklich.

---

## Quellen
- API-Struktur/Envelope: <https://apidoc.onoffice.de/onoffice-api-request/aufbau/>
- Erste Schritte (HMAC-v2 PHP-Beispiel, Endpoint): <https://apidoc.onoffice.de/erste-schritte/>
- Read Estates: <https://apidoc.onoffice.de/actions/datensatz-lesen/objekte/>
- Estate-Bilder (estatepictures): <https://apidoc.onoffice.de/actions/informationen-abfragen/auf-homepage-veroeffentlichte-objektbilder/>
- Create Addresses: <https://apidoc.onoffice.de/actions/datensatz-anlegen/adressen/>
- Execute Webhooks: <https://apidoc.onoffice.de/actions/aktionen-ausfuehren/execute-webhooks/>
- Marketplace Integration: <https://www.marketplacedoc.onoffice.de/en/integration/>
- OnOffice AVV (P-dDE-2001): <https://onoffice.com/app/uploads/2024/07/P-dDE-2001-Datenverarbeitungsvereinbarung.pdf>
