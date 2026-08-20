/**
 * Referenzbilder für die Klick-Heatmap in /intern erzeugen.
 *
 * WARUM: Die Heatmap zeichnet Klicks auf x/y-Buckets, die relativ zur
 * DOKUMENTBREITE bzw. -HÖHE gemessen sind. Ein Bild darunter ist deshalb nur
 * dann ehrlich, wenn es exakt dieselbe Ansicht in derselben Dokumenthöhe
 * zeigt. Ein einziges Bild für alle Schritte war der Grund, warum die erste
 * Fassung „keinen Sinn gemacht" hat (Betreiber-Feedback 20.08.2026) — jeder
 * Schritt hat eine andere Seitenlänge.
 *
 * Erzeugt je Ansicht × Gerät ein Vollseiten-Bild:
 *   public/intern/heatmap/<ansicht>-<geraet>.jpg
 *
 * Voraussetzungen:
 *   1. Ein laufender Server mit dem AKTUELLEN Build:
 *        npm run build && npx next start -p 3100
 *      (Dev-Server geht auch, ist aber layout-nah genug nur ohne HMR-Overlay.)
 *   2. Playwright verfügbar (global reicht, ist bewusst KEINE Projekt-
 *      Abhängigkeit — das Skript läuft nur, wenn sich das Rechner-Layout
 *      ändert, und soll CI/Deploy nicht aufblähen).
 *
 * Aufruf:  npx tsx scripts/heatmap-referenz.mts [http://localhost:3100]
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASIS = process.argv[2] ?? "http://localhost:3100";
const ZIEL = path.join(process.cwd(), "public", "intern", "heatmap");

/** Geräte: Breite = Layout-Breite, skalierung = Verkleinerung der BILDdatei.
 *  Das Layout wird also in voller Breite gerendert, die Datei aber kleiner
 *  gespeichert — als Hintergrund muss das Bild nur erkennbar sein, nicht
 *  lesbar, und Vollseiten-Bilder der Ergebnisseite werden sonst megabyteschwer. */
const GERAETE = [
  { key: "desktop", breite: 1280, skalierung: 0.55 },
  { key: "mobil", breite: 390, skalierung: 1 },
] as const;

/** Ansichten exakt wie `Ansicht` in src/lib/track.ts. `analyse` fehlt bewusst:
 *  die Zwischenanimation dauert zwei Sekunden, dort wird praktisch nie
 *  geklickt, und ein Standbild davon wäre irreführend. */
const ANSICHTEN = [
  { key: "objektart", url: "/rechner?demo=wohnung&halt=objektart" },
  { key: "standort", url: "/rechner?demo=wohnung&halt=standort" },
  { key: "eckdaten", url: "/rechner?demo=wohnung&halt=eckdaten" },
  { key: "ergebnis", url: "/rechner?demo=wohnung" },
  // Ergebnisseite MIT aufgeklapptem Report-Formular — die conversion-relevante
  // Ansicht (Betreiber-Hinweis 20.08.2026: „nur die letzte Seite ist relevant,
  // PDF-Report-Anfragen etc."). Das Formular wird unten per Klick geöffnet.
  { key: "ergebnis-formular", url: "/rechner?demo=wohnung", formularOeffnen: true },
] as const;

async function main() {
  // Bewusst über eine Variable importiert: Playwright ist KEINE Projekt-
  // Abhängigkeit (s. Kopf), ein statischer Import würde `tsc --noEmit` in CI
  // brechen. So bleibt der Modulname für TypeScript undurchsichtig.
  const modul = "playwright";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chromium: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pw: any = await import(modul);
    chromium = pw.chromium;
  } catch {
    console.error(
      "Playwright nicht gefunden. Global installieren (npm i -g playwright) oder\n" +
        "das Skript mit NODE_PATH auf eine vorhandene Installation zeigen lassen.",
    );
    process.exit(1);
  }

  await mkdir(ZIEL, { recursive: true });
  const browser = await chromium.launch();
  let n = 0;

  for (const g of GERAETE) {
    for (const a of ANSICHTEN) {
      const page = await browser.newPage({
        viewport: { width: g.breite, height: 900 },
        deviceScaleFactor: g.skalierung,
      });
      await page.goto(BASIS + a.url, { waitUntil: "domcontentloaded", timeout: 120_000 });
      // Auf die jeweilige Ansicht warten statt auf eine feste Zeit.
      const anker =
        a.key === "objektart" || a.key === "standort" || a.key === "eckdaten"
          ? "[data-track-bereich='formular']"
          : "[data-track-bereich='ergebnis']";
      await page.waitForSelector(anker, { timeout: 120_000 });

      if ("formularOeffnen" in a && a.formularOeffnen) {
        // Der CTA unter dem Ergebnis klappt das Report-Formular auf.
        const cta = page.locator("[data-track-bereich='report-formular'] button").first();
        await cta.click({ timeout: 30_000 });
        await page.waitForTimeout(900); // Collapse-Animation
      }

      // Animationen zur Ruhe kommen lassen (Zahlen zählen hoch, Balken wachsen).
      await page.waitForTimeout(2500);
      // Einmal durch die ganze Seite scrollen: sonst bleiben lazy geladene
      // Bilder unterhalb des Sichtbereichs leer, und das Referenzbild zeigt
      // Kästen, die der Nutzer nie so gesehen hat.
      await page.evaluate(async () => {
        const schritt = window.innerHeight * 0.8;
        for (let y = 0; y < document.documentElement.scrollHeight; y += schritt) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 180));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1200);
      // Zwei Aufräum-Schritte vor dem Bild:
      //  * Consent-Overlays/Dialoge würden halbe Ansichten verdecken.
      //  * Klebende Kopfzeilen zeichnet Chromium bei fullPage an der zuletzt
      //    gescrollten Stelle MITTEN ins Bild — im Referenzbild sähe das aus
      //    wie ein Element, das dort gar nicht sitzt.
      await page.evaluate(() => {
        document.querySelectorAll("[data-consent-overlay], [role='dialog']").forEach((el) => el.remove());
        document.querySelectorAll<HTMLElement>("header, [class*='sticky'], [class*='fixed']").forEach((el) => {
          const pos = getComputedStyle(el).position;
          if (pos === "sticky" || pos === "fixed") el.style.position = "absolute";
        });
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(400);

      const datei = path.join(ZIEL, `${a.key}-${g.key}.jpg`);
      await page.screenshot({ path: datei, fullPage: true, type: "jpeg", quality: 72 });
      const hoehe = await page.evaluate(() => document.documentElement.scrollHeight);
      console.log(`✓ ${a.key}-${g.key}.jpg (Dokumenthöhe ${hoehe} px)`);
      n++;
      await page.close();
    }
  }

  await browser.close();
  console.log(`\n${n} Referenzbilder in public/intern/heatmap/.`);
}

await main();
