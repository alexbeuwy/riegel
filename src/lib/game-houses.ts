import { alleMarktorte } from "@/lib/marktdaten";

/**
 * Häuser-Generator für "Blitzverkauf" (/spiel). Bewusst mit Math.random (anders
 * als marktdaten.ts) — hier gibt es keine SSG/Determinismus-Anforderung, das
 * Spiel läuft rein clientseitig pro Session. Werte sind aus den ECHTEN
 * regionalen €/m²-Spannen (marktdaten.ts) abgeleitet, damit sich das Spiel
 * trotzdem "echt" anfühlt statt komplett erfunden zu sein.
 */
export interface GameHouse {
  id: string;
  ort: string;
  value: number;
  lane: number;
  z: number;
  variant: 0 | 1 | 2;
}

/** Kamera-Fluggeschwindigkeit in Einheiten/Sekunde — bewusst die EINZIGE Quelle:
    blitzverkauf-game leitet daraus die Länge des Häuserfelds ab, game-canvas den
    tatsächlichen Kameraflug. Zwei getrennte Konstanten würden Strecke und
    Häuserfeld bei einem späteren Edit lautlos auseinanderlaufen lassen. */
export const FLIGHT_SPEED = 13;

const LANES = [-7, -3.5, 0, 3.5, 7];

export function generateHouses(durationSec: number, flightSpeed: number, rowSpacing = 16): GameHouse[] {
  const orte = alleMarktorte();
  if (!orte.length) return [];
  const totalDistance = flightSpeed * durationSec;
  const rowCount = Math.ceil(totalDistance / rowSpacing);
  const houses: GameHouse[] = [];
  let id = 0;

  for (let row = 0; row < rowCount; row++) {
    // erste Reihen mit Abstand — Anlaufzeit, damit Spieler sich orientieren kann
    const z = -(row + 3) * rowSpacing;
    const houseCountInRow = 1 + Math.floor(Math.random() * 3); // 1–3 Häuser je Reihe
    const usedLanes = new Set<number>();
    for (let i = 0; i < houseCountInRow; i++) {
      let laneIdx = Math.floor(Math.random() * LANES.length);
      let attempts = 0;
      while (usedLanes.has(laneIdx) && attempts < LANES.length) {
        laneIdx = (laneIdx + 1) % LANES.length;
        attempts++;
      }
      if (usedLanes.has(laneIdx)) continue;
      usedLanes.add(laneIdx);

      const ort = orte[Math.floor(Math.random() * orte.length)];
      const qm = 90 + Math.random() * 140;
      const preisProQm = ort.haus.min + Math.random() * (ort.haus.max - ort.haus.min);
      const value = Math.max(150_000, Math.round((qm * preisProQm) / 5000) * 5000);

      houses.push({
        id: `h${id++}`,
        ort: ort.name,
        value,
        lane: LANES[laneIdx] + (Math.random() - 0.5) * 1.2,
        z,
        variant: Math.floor(Math.random() * 3) as 0 | 1 | 2,
      });
    }
  }
  return houses;
}

export const fmtEuro = (n: number) => `${n.toLocaleString("de-DE")} €`;
