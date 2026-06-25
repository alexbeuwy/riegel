# OnOffice API – Integrations-Spezifikation

Server-seitige Anbindung der OnOffice JSON-API für Immobilien, Bilder und Lead-Anlage.
Querverweise: [architecture.md](./architecture.md) · [legal-checklist.md](./legal-checklist.md) (AVV) · [RELAUNCH-LOG.md](../RELAUNCH-LOG.md)

> ⚠️ **Verifizierungs-Status:** Im Foundation-Run lieferte die dedizierte `onoffice`-Research-Lens nur ein Dummy-Ergebnis; dieses Dokument basiert auf Synthese-Wissen + echten `apidoc.onoffice.de`-Quellen (unten). HMAC-Recipe, exakte Feldnamen (`objekttyp`/`objektart`, Filtersyntax) und Bild-Endpunkte sind **vor der Implementierung des Clients gegen die Live-Doku zu verifizieren**. Eine dedizierte Re-Research-Phase ist eingeplant.

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

## Quellen
- API-Struktur/Envelope: <https://apidoc.onoffice.de/onoffice-api-request/aufbau/>
- Erste Schritte (HMAC-v2 PHP-Beispiel, Endpoint): <https://apidoc.onoffice.de/erste-schritte/>
- Read Estates: <https://apidoc.onoffice.de/actions/datensatz-lesen/objekte/>
- Estate-Bilder (estatepictures): <https://apidoc.onoffice.de/actions/informationen-abfragen/auf-homepage-veroeffentlichte-objektbilder/>
- Create Addresses: <https://apidoc.onoffice.de/actions/datensatz-anlegen/adressen/>
- Execute Webhooks: <https://apidoc.onoffice.de/actions/aktionen-ausfuehren/execute-webhooks/>
- Marketplace Integration: <https://www.marketplacedoc.onoffice.de/en/integration/>
- OnOffice AVV (P-dDE-2001): <https://onoffice.com/app/uploads/2024/07/P-dDE-2001-Datenverarbeitungsvereinbarung.pdf>
