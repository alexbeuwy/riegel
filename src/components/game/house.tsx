"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { GameHouse } from "@/lib/game-houses";

/**
 * Stilisiertes "Würfel-Haus" — bewusst blockig/low-poly statt realistisch.
 * Body+Dach+Fenster-Glow, RIEGEL-Blau als Dach- und Verkauft-Farbe. Wird beim
 * Treffer per sold-Flag von außen "verkauft": kurzer Blitz (Emissive), dann
 * sinkt/schrumpft es weg statt hart zu verschwinden.
 */
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
  const [phase, setPhase] = useState<"idle" | "popping" | "gone">("idle");
  const started = useRef(false);
  const bodyMatRef = useRef<THREE.MeshStandardMaterial>(null);

  useEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    onRegister(house.id, g);
    return () => onUnregister(house.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [house.id]);

  useEffect(() => {
    if (sold && !started.current) {
      started.current = true;
      setPhase("popping");
    }
  }, [sold]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    if (phase === "popping") {
      const shrink = Math.min(1, delta * 5);
      g.scale.setScalar(Math.max(0, g.scale.x - shrink));
      g.position.y -= delta * 2.2;
      if (bodyMatRef.current) {
        bodyMatRef.current.emissiveIntensity = Math.max(0, bodyMatRef.current.emissiveIntensity - delta * 3);
      }
      if (g.scale.x <= 0.02) setPhase("gone");
    }
  });

  if (phase === "gone") return null;

  const roofHeight = 0.9 + house.variant * 0.15;
  const bodyHeight = 1.8 + house.variant * 0.25;

  return (
    <group ref={groupRef} position={[house.lane, 0, house.z]} userData={{ houseId: house.id }}>
      <mesh position={[0, bodyHeight / 2, 0]} userData={{ houseId: house.id }} castShadow>
        <boxGeometry args={[2.1, bodyHeight, 2.1]} />
        <meshStandardMaterial
          ref={bodyMatRef}
          color="#1c1c21"
          emissive="#015cff"
          emissiveIntensity={sold ? 2 : 0}
          roughness={0.7}
        />
      </mesh>
      <mesh
        position={[0, bodyHeight + roofHeight / 2 - 0.05, 0]}
        rotation={[0, Math.PI / 4, 0]}
        userData={{ houseId: house.id }}
      >
        <coneGeometry args={[1.65, roofHeight, 4]} />
        <meshStandardMaterial color="#015cff" roughness={0.4} />
      </mesh>
      {/* Fenster-Glow — zwei Seiten, damit aus mehreren Anflugwinkeln etwas zu sehen ist */}
      <mesh position={[0, bodyHeight * 0.55, 1.06]} userData={{ houseId: house.id }}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshStandardMaterial color="#f4f3f0" emissive="#f4f3f0" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[1.06, bodyHeight * 0.55, 0]} rotation={[0, Math.PI / 2, 0]} userData={{ houseId: house.id }}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshStandardMaterial color="#f4f3f0" emissive="#f4f3f0" emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
}
