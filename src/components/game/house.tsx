"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GameHouse } from "@/lib/game-houses";
import { SoldSign } from "@/components/game/sold-sign";
import { HitBurst } from "@/components/game/hit-burst";

/**
 * Stilisiertes "Würfel-Haus" — bewusst blockig/low-poly statt realistisch.
 * Body+Dach+Fenster-Glow, RIEGEL-Blau als Dach- und Verkauft-Farbe. Beim
 * Treffer bleibt das Haus STEHEN (verkauft ≠ abgerissen): kurzer
 * Emissive-Blitz mit Rest-Glühen, Squash-&-Stretch-Bounce, Fenster dimmen
 * ("Bewohner ziehen ein") — und davor federt ein VERKAUFT-Makler-Schild ein,
 * begleitet von einem kleinen Trümmer-Burst vom Dach.
 */

const EMISSIVE_REST = 0.15; // Rest-Glühen als dauerhaftes "verkauft"-Signal
const WINDOW_DIM = 0.3;
const BOUNCE_DURATION = 0.5; // inkl. Ausschwingen — Kernbewegung liegt in ~0.4s

/** Squash & Stretch mit Überschwingen: 0.88 → 1.12 → gedämpft zurück auf 1.
    Analytisch aus t berechnet statt integriert — framerate-unabhängig und
    ohne Zustand pro Frame. */
function bounceScaleY(t: number): number {
  if (t < 0.12) {
    // Anlauf: aus dem Squash in den Stretch (smoothstep statt linear,
    // damit der Richtungswechsel nicht hart wirkt)
    const p = t / 0.12;
    const e = p * p * (3 - 2 * p);
    return 0.88 + e * 0.24;
  }
  // gedämpftes Ausschwingen um 1 — das kurze Unterschwingen (~0.975) ist
  // gewollt, es verkauft den "Boing"-Charakter
  const t2 = t - 0.12;
  return 1 + 0.12 * Math.cos(t2 * 18) * Math.exp(-t2 * 9);
}

export function House({
  house,
  sold,
  onRegister,
  onUnregister,
}: {
  house: GameHouse;
  sold: boolean;
  onRegister: (id: string, obj: THREE.Object3D) => void;
  onUnregister: (id: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const bounceRef = useRef<THREE.Group>(null);
  const bodyMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const winMatARef = useRef<THREE.MeshStandardMaterial>(null);
  const winMatBRef = useRef<THREE.MeshStandardMaterial>(null);
  const soldT = useRef(0);
  const restDone = useRef(false);
  // Burst-Ende als State statt Effekt-Trigger: der Mount leitet sich direkt
  // aus sold ab, onDone (aus useFrame, kein Effekt) hängt ihn wieder aus
  const [burstDone, setBurstDone] = useState(false);

  // House-Props sind eingefroren (kein reduceMotion-Prop) — daher lokal
  // dieselbe Abfrage wie in game-canvas.tsx.
  const reduceMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    onRegister(house.id, g);
    return () => onUnregister(house.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [house.id]);

  useFrame((_, delta) => {
    if (!sold || restDone.current) return;
    soldT.current += delta;
    const t = soldT.current;

    // (a) Emissive-Blitz: von 2 in ~0.5s auf Rest-Glühen abklingen
    if (bodyMatRef.current) {
      bodyMatRef.current.emissiveIntensity = Math.max(EMISSIVE_REST, bodyMatRef.current.emissiveIntensity - delta * 3.7);
    }
    // (c) Fenster dimmen — Licht aus, Bewohner ziehen ein
    if (winMatARef.current) {
      winMatARef.current.emissiveIntensity = Math.max(WINDOW_DIM, winMatARef.current.emissiveIntensity - delta * 1.2);
    }
    if (winMatBRef.current) {
      winMatBRef.current.emissiveIntensity = Math.max(WINDOW_DIM, winMatBRef.current.emissiveIntensity - delta * 1.2);
    }
    // (b) vertikaler Bounce des Korpus — Pivot am Boden (Gruppe steht auf y=0)
    if (!reduceMotion && bounceRef.current) {
      if (t < BOUNCE_DURATION) {
        const sy = bounceScaleY(t);
        // Gegenphase in der Breite (angenäherte Volumenerhaltung) macht aus
        // "skaliert" erst "federt"
        const sxz = 1 - (sy - 1) * 0.6;
        bounceRef.current.scale.set(sxz, sy, sxz);
      } else {
        bounceRef.current.scale.setScalar(1);
      }
    }
    // alles ausgeklungen → Ruhewerte exakt setzen und Frame-Arbeit beenden
    if (t > 0.8) {
      if (bodyMatRef.current) bodyMatRef.current.emissiveIntensity = EMISSIVE_REST;
      if (winMatARef.current) winMatARef.current.emissiveIntensity = WINDOW_DIM;
      if (winMatBRef.current) winMatBRef.current.emissiveIntensity = WINDOW_DIM;
      if (bounceRef.current) bounceRef.current.scale.setScalar(1);
      restDone.current = true;
    }
  });

  const roofHeight = 0.9 + house.variant * 0.15;
  const bodyHeight = 1.8 + house.variant * 0.25;
  // Konkurrenz-Ladenhüter: entsättigt/grau statt RIEGEL-Blau, Fenster fast
  // dunkel (steht ja seit 379 Tagen leer) — klar erkennbares Beute-Schema.
  const kk = house.konkurrenz;
  const windowIntensity = kk ? 0.25 : 0.9;

  return (
    <group ref={groupRef} position={[house.lane, 0, house.z]} userData={{ houseId: house.id }}>
      {/* Bounce nur auf dem Korpus — Schild & Trümmer sind Geschwister,
          damit sie nicht mitgestaucht werden */}
      <group ref={bounceRef}>
        <mesh position={[0, bodyHeight / 2, 0]} userData={{ houseId: house.id }} castShadow>
          <boxGeometry args={[2.1, bodyHeight, 2.1]} />
          <meshStandardMaterial
            ref={bodyMatRef}
            color={kk ? "#232327" : "#1c1c21"}
            emissive="#015cff"
            emissiveIntensity={sold ? 2 : 0}
            roughness={kk ? 0.9 : 0.7}
          />
        </mesh>
        <mesh
          position={[0, bodyHeight + roofHeight / 2 - 0.05, 0]}
          rotation={[0, Math.PI / 4, 0]}
          userData={{ houseId: house.id }}
        >
          <coneGeometry args={[1.65, roofHeight, 4]} />
          {/* Nach dem Treffer wird auch das Konkurrenz-Dach RIEGEL-blau — übernommen. */}
          <meshStandardMaterial color={kk && !sold ? "#3a3a41" : "#015cff"} roughness={0.4} />
        </mesh>
        {/* Fenster-Glow — zwei Seiten, damit aus mehreren Anflugwinkeln etwas zu sehen ist */}
        <mesh position={[0, bodyHeight * 0.55, 1.06]} userData={{ houseId: house.id }}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshStandardMaterial ref={winMatARef} color="#f4f3f0" emissive="#f4f3f0" emissiveIntensity={windowIntensity} />
        </mesh>
        <mesh position={[1.06, bodyHeight * 0.55, 0]} rotation={[0, Math.PI / 2, 0]} userData={{ houseId: house.id }}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshStandardMaterial ref={winMatBRef} color="#f4f3f0" emissive="#f4f3f0" emissiveIntensity={windowIntensity} />
        </mesh>
      </group>
      {/* Schild & Trümmer tragen bewusst KEIN userData.houseId — der Raycast
          in game-canvas.tsx darf sie nicht als Haus einsammeln */}
      {kk && !sold && (
        // Ladenhüter-Schild steht von Anfang an schief im Vorgarten — die
        // Pointe: nach dem Treffer ersetzt es das frische RIEGEL-Schild.
        <SoldSign position={[0.95, 0, 1.8]} reduceMotion={reduceMotion} variant="konkurrenz" static />
      )}
      {sold && (
        // seitlich versetzt vor der Front (+z = Kamera-Richtung), damit das
        // Schild nicht direkt vor dem Fenster steht — wie ein echtes
        // Makler-Schild im Vorgarten
        <SoldSign position={[0.95, 0, 1.8]} reduceMotion={reduceMotion} />
      )}
      {sold && !reduceMotion && !burstDone && (
        <HitBurst position={[0, bodyHeight + roofHeight * 0.4, 0]} onDone={() => setBurstDone(true)} />
      )}
    </group>
  );
}
