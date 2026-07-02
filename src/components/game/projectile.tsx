"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Würfel-Projektil der Kanone. Bewusst KEINE Physik-Engine: Hit/Miss ist beim
 * Abschuss bereits per Raycast entschieden, der Würfel fliegt rein visuell
 * eine deterministische Parabel von der Mündung zu genau dem vorberechneten
 * Zielpunkt. Dadurch kann der Einschlag nie "danebengehen" und das Spiel
 * bleibt fair — die Ballistik ist Show, nicht Simulation.
 *
 * Treffer: onImpact feuert exakt beim Aufschlag (Punkte/Popup entstehen dort,
 * nicht schon beim Klick), danach kurzer expandierender Impact-Blitz.
 * Fehlschuss: Würfel fliegt zum Fernpunkt und blendet auf den letzten ~30%
 * der Strecke aus — kein Blitz, damit Misses sich klar anders anfühlen.
 */

const FLIGHT_TIME = 0.35; // Sekunden bis zum Einschlag
const FLIGHT_TIME_REDUCED = 0.12; // reduced motion: kurz und geradlinig statt Bogen
const ARC_HEIGHT = 2.4; // Scheitelpunkt-Überhöhung der Parabel
const IMPACT_TIME = 0.26; // Lebensdauer des Impact-Blitzes
const IMPACT_TIME_REDUCED = 0.14;
const MISS_FADE_PORTION = 0.3; // letzter Streckenanteil, über den Miss-Würfel ausfaden

// Geometrien einmal pro Modul statt pro Schuss — Materialien brauchen dagegen
// eigene Instanzen (per-Projektil-Opacity), deshalb bleiben die im JSX.
const CUBE_GEO = new THREE.BoxGeometry(0.35, 0.35, 0.35);
const FLASH_GEO = new THREE.SphereGeometry(0.5, 12, 12);

export function Projectile({
  start,
  end,
  isHit,
  onImpact,
  onDone,
  reduceMotion,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  isHit: boolean;
  onImpact?: () => void;
  onDone: () => void;
  reduceMotion: boolean;
}) {
  const cubeRef = useRef<THREE.Mesh>(null);
  const cubeMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const flashMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const t = useRef(0); // normalisierter Flugfortschritt 0..1
  const impactT = useRef(0);
  const impacted = useRef(false);
  const done = useRef(false); // onDone darf nur einmal feuern (Unmount kommt erst im nächsten Commit)
  const tmp = useRef(new THREE.Vector3());

  const flightTime = reduceMotion ? FLIGHT_TIME_REDUCED : FLIGHT_TIME;
  const impactTime = reduceMotion ? IMPACT_TIME_REDUCED : IMPACT_TIME;

  // R3F-Kernmuster: Flugbahn und Blitz-Skalierung werden pro Frame direkt auf den
  // three.js-Objekten mutiert (siehe Begründung in game-canvas.tsx) — React-State
  // pro Frame wäre hier 60 Re-Renders/Sekunde pro Projektil.
  useFrame((_, delta) => {
    if (done.current) return;

    if (!impacted.current) {
      t.current += delta / flightTime;
      const k = Math.min(1, t.current);
      const cube = cubeRef.current;
      if (cube) {
        // Parabel: linearer Lerp + Überhöhung 4·k·(1−k) (max. ARC_HEIGHT am Scheitel)
        tmp.current.copy(start).lerp(end, k);
        if (!reduceMotion) {
          tmp.current.y += ARC_HEIGHT * 4 * k * (1 - k);
          cube.rotation.x += delta * 9;
          cube.rotation.y += delta * 6;
        }
        cube.position.copy(tmp.current);
      }
      if (!isHit && cubeMatRef.current) {
        cubeMatRef.current.opacity = Math.min(1, (1 - k) / MISS_FADE_PORTION);
      }

      if (k >= 1) {
        impacted.current = true;
        if (isHit) {
          onImpact?.();
          if (cube) cube.visible = false;
          if (flashRef.current) flashRef.current.visible = true;
        } else {
          done.current = true;
          onDone();
        }
      }
      return;
    }

    // Impact-Blitz (nur Treffer): expandierende, ausblendende Sphere — bewusst
    // ohne PointLight, damit pro Einschlag keine Shader-Rekompilierung/Lichtkosten anfallen.
    impactT.current += delta;
    const p = Math.min(1, impactT.current / impactTime);
    const flash = flashRef.current;
    if (flash) {
      // reduced motion: nur Ausblenden, keine Expansions-Animation
      flash.scale.setScalar(reduceMotion ? 1 : 0.35 + p * 1.5);
      if (flashMatRef.current) flashMatRef.current.opacity = 0.85 * (1 - p);
    }
    if (p >= 1) {
      done.current = true;
      onDone();
    }
  });

  return (
    <>
      <mesh ref={cubeRef} geometry={CUBE_GEO} position={start}>
        <meshStandardMaterial
          ref={cubeMatRef}
          color="#015cff"
          emissive="#015cff"
          emissiveIntensity={0.55}
          roughness={0.35}
          metalness={0.2}
          transparent
          opacity={1}
        />
      </mesh>
      <mesh ref={flashRef} geometry={FLASH_GEO} position={end} scale={0.35} visible={false}>
        <meshBasicMaterial ref={flashMatRef} color="#6aa1ff" transparent opacity={0.85} depthWrite={false} />
      </mesh>
    </>
  );
}
