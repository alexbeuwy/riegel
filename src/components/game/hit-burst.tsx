"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Trümmer-Burst beim "Verkauf": kleine Würfel fliegen vom Dach radial weg,
 * fallen mit (gedämpfter) Schwerkraft und faden aus. Ein einziges
 * InstancedMesh statt 10–14 Einzel-Meshes — ein Draw-Call pro Burst.
 * Startwerte werden EINMAL in useLayoutEffect gewürfelt (Math.random in der
 * Render-Phase würde die React-Purity-Regel verletzen) und in einem Ref
 * gehalten; useFrame arbeitet nur auf diesen vorab allokierten Arrays und
 * einem geteilten Dummy-Object3D — keine Allokationen pro Frame.
 */

const MIN_COUNT = 10;
const MAX_COUNT = 14;
const LIFETIME = 0.9;
const FADE_START = 0.55;

// Geteilte Scratch-Objekte im Modul-Scope: useFrame läuft single-threaded und
// nutzt sie pro Aufruf vollständig — keine Allokationen pro Frame nötig.
const dummy = new THREE.Object3D();
const scratchColor = new THREE.Color();

// Bewusst gemischt statt einfarbig: Blau-Töne als "RIEGEL-Funken", Surface-2
// als dunkle Bruchstücke — bleibt im Design-System statt Konfetti-bunt.
const DEBRIS_COLORS = ["#015cff", "#1c1c21", "#6aa1ff"];

interface DebrisData {
  count: number;
  positions: Float32Array; // xyz je Instanz, wird pro Frame fortgeschrieben
  velocities: Float32Array;
  rotations: Float32Array;
  angularVel: Float32Array;
  sizes: Float32Array;
}

export function HitBurst({
  position,
  onDone,
}: {
  position: [number, number, number];
  onDone: () => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const dataRef = useRef<DebrisData | null>(null);
  const life = useRef(0);
  const finished = useRef(false);

  // Startwerte würfeln + Instanz-Matrizen/-Farben vor dem ersten gerenderten
  // Frame setzen, sonst blitzen alle Instanzen unskaliert am Ursprung auf.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || dataRef.current) return;

    const count = MIN_COUNT + Math.floor(Math.random() * (MAX_COUNT - MIN_COUNT + 1));
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const rotations = new Float32Array(count * 3);
    const angularVel = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const j = i * 3;
      // leichter Start-Jitter, damit die Würfel nicht aus einem Punkt "platzen"
      positions[j] = (Math.random() - 0.5) * 0.8;
      positions[j + 1] = (Math.random() - 0.5) * 0.4;
      positions[j + 2] = (Math.random() - 0.5) * 0.8;

      // radial nach außen + deutlicher Aufwärts-Impuls — liest sich als
      // "Dach fliegt kurz auf", nicht als Explosion
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      velocities[j] = Math.cos(angle) * speed;
      velocities[j + 1] = 2.2 + Math.random() * 2.6;
      velocities[j + 2] = Math.sin(angle) * speed;

      rotations[j] = Math.random() * Math.PI;
      rotations[j + 1] = Math.random() * Math.PI;
      rotations[j + 2] = Math.random() * Math.PI;
      angularVel[j] = (Math.random() - 0.5) * 12;
      angularVel[j + 1] = (Math.random() - 0.5) * 12;
      angularVel[j + 2] = (Math.random() - 0.5) * 12;

      sizes[i] = 0.12 + Math.random() * 0.13;

      dummy.position.set(positions[j], positions[j + 1], positions[j + 2]);
      dummy.rotation.set(rotations[j], rotations[j + 1], rotations[j + 2]);
      dummy.scale.setScalar(sizes[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, scratchColor.set(DEBRIS_COLORS[Math.floor(Math.random() * DEBRIS_COLORS.length)]));
    }

    // Mesh ist mit MAX_COUNT Kapazität angelegt — .count blendet den Rest aus
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    dataRef.current = { count, positions, velocities, rotations, angularVel, sizes };
  }, []);

  useFrame((_, delta) => {
    if (finished.current) return;
    const mesh = meshRef.current;
    const data = dataRef.current;
    if (!mesh || !data) return;

    life.current += delta;
    if (life.current >= LIFETIME) {
      finished.current = true;
      onDone();
      return;
    }

    const { count, positions, velocities, rotations, angularVel, sizes } = data;
    for (let i = 0; i < count; i++) {
      const j = i * 3;
      velocities[j + 1] -= 9.8 * delta * 0.6; // gedämpfte Schwerkraft — bewusst "spielzeughaft" leicht
      positions[j] += velocities[j] * delta;
      positions[j + 1] += velocities[j + 1] * delta;
      positions[j + 2] += velocities[j + 2] * delta;
      rotations[j] += angularVel[j] * delta;
      rotations[j + 1] += angularVel[j + 1] * delta;
      rotations[j + 2] += angularVel[j + 2] * delta;

      dummy.position.set(positions[j], positions[j + 1], positions[j + 2]);
      dummy.rotation.set(rotations[j], rotations[j + 1], rotations[j + 2]);
      dummy.scale.setScalar(sizes[i]);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    if (matRef.current) {
      matRef.current.opacity = life.current < FADE_START ? 1 : 1 - (life.current - FADE_START) / (LIFETIME - FADE_START);
    }
  });

  return (
    // frustumCulled aus: die Bounding-Sphere des InstancedMesh kennt die
    // wandernden Instanz-Positionen nicht — sonst poppt der Burst am
    // Sichtfeldrand weg. KEIN userData.houseId — sonst fängt der Raycast
    // die Trümmer als Haus.
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_COUNT]} position={position} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial ref={matRef} transparent toneMapped={false} />
    </instancedMesh>
  );
}
