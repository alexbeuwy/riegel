import type { DomainBefund } from "@/lib/validierung";

/**
 * Serverseitiger Teil der Eingabeprüfung. Bewusst eine EIGENE Datei:
 * `node:dns` darf in keinem Client-Bundle landen, und ein Import in
 * lib/validierung.ts würde genau das riskieren — die Formulare importieren
 * dieses Modul im Browser.
 */

/**
 * Prüft per DNS, ob hinter der Domain überhaupt ein Mailserver stehen kann.
 * Fängt genau die Fälle, die keine Regex je fängt: `asdf@asdf.asdf`,
 * `hallo@hallo.hallo`, `max@gmial.com` (existiert nicht).
 *
 * DREI ERGEBNISSE, drei sehr unterschiedliche Konsequenzen:
 *  - `existiert-nicht`: weder MX noch A/AAAA — die Mail KANN nicht ankommen.
 *    Nur das ist ein Abweisungsgrund.
 *  - `kein-mx`: kein MX, aber die Domain existiert. Mailversand über den
 *    A-Record ist historisch erlaubt und kommt bei kleinen Firmen vor →
 *    durchlassen, nur markieren.
 *  - `ungeprueft`: DNS langsam, kaputt oder nicht erreichbar. FAIL-OPEN.
 *    Ein DNS-Aussetzer darf niemals einen echten Lead kosten.
 */
export async function domainZustellbar(email: string, timeoutMs = 2500): Promise<DomainBefund> {
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  if (!domain) return "ungeprueft";
  try {
    const dns = await import("node:dns/promises");
    const auflösung = (async (): Promise<DomainBefund> => {
      try {
        const mx = await dns.resolveMx(domain);
        if (mx.length > 0) return "ok";
      } catch {
        /* kein MX — unten weiter mit A/AAAA */
      }
      try {
        await dns.lookup(domain);
        return "kein-mx";
      } catch {
        return "existiert-nicht";
      }
    })();
    // Eigener Timeout: dns.promises kennt keinen, und ein hängendes DNS würde
    // sonst das Absenden des Formulars blockieren.
    const abbruch = new Promise<DomainBefund>((r) => setTimeout(() => r("ungeprueft"), timeoutMs));
    return await Promise.race([auflösung, abbruch]);
  } catch {
    return "ungeprueft";
  }
}

