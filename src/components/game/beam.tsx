"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Kurzer, sich auflösender Laser-Blitz vom "Kanonen"-Punkt zum Trefferpunkt —
 * v1-Schuss-Feedback. Wird im Premium-Ausbau durch echte Würfel-Projektile
 * ersetzt/ergänzt.
 */
export function Beam({
  start,
  end,
  onDone,
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  onDone: () => void;
}) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const life = useRef(0);
  const DURATION = 0.18;

  const mid = start.clone().add(end).multiplyScalar(0.5);
  const dir = end.clone().sub(start);
  const length = dir.length();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize(),
  );

  useFrame((_, delta) => {
    life.current += delta;
    if (matRef.current) {
      matRef.current.opacity = Math.max(0, 1 - life.current / DURATION);
    }
    if (life.current >= DURATION) onDone();
  });

  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[0.04, 0.04, length, 6]} />
      <meshBasicMaterial ref={matRef} color="#6aa1ff" transparent opacity={1} />
    </mesh>
  );
}
