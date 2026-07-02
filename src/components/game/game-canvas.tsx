"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Ground } from "@/components/game/ground";
import { Environment } from "@/components/game/environment";
import { House } from "@/components/game/house";
import { Beam } from "@/components/game/beam";
import type { GameHouse } from "@/lib/game-houses";

const FLIGHT_SPEED = 13; // Einheiten/Sekunde
const REVEAL_DISTANCE = 130; // Häuser werden erst innerhalb dieser Sichtweite gerendert
const CANNON_OFFSET = new THREE.Vector3(0, -0.8, -3); // relativ zur Kamera

export interface FireRequest {
  ndcX: number;
  ndcY: number;
  seq: number;
}

interface HitInfo {
  x: number;
  y: number;
  house: GameHouse;
}

function projectToScreen(pos: THREE.Vector3, camera: THREE.Camera, size: { width: number; height: number }) {
  const p = pos.clone().project(camera);
  return {
    x: (p.x * 0.5 + 0.5) * size.width,
    y: (1 - (p.y * 0.5 + 0.5)) * size.height,
  };
}

/** Läuft INNERHALB des Canvas — hat Zugriff auf Kamera/Renderer via useThree/useFrame. */
function SceneContents({
  houses,
  running,
  fireRequest,
  onHit,
  onMiss,
  onTimeUp,
  durationSec,
  reduceMotion,
}: {
  houses: GameHouse[];
  running: boolean;
  fireRequest: FireRequest | null;
  onHit: (info: HitInfo) => void;
  onMiss: () => void;
  onTimeUp: () => void;
  durationSec: number;
  reduceMotion: boolean;
}) {
  const { camera, size } = useThree();
  const houseObjects = useRef(new Map<string, THREE.Object3D>());
  const [soldIds, setSoldIds] = useState<Set<string>>(() => new Set());
  const [beams, setBeams] = useState<{ id: number; start: THREE.Vector3; end: THREE.Vector3 }[]>([]);
  const lastSeq = useRef(0);
  const beamId = useRef(0);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const elapsed = useRef(0);
  const finished = useRef(false);
  const bobT = useRef(0);

  const flightLength = FLIGHT_SPEED * durationSec + REVEAL_DISTANCE + 40;

  const register = (id: string, obj: THREE.Object3D) => {
    houseObjects.current.set(id, obj);
  };
  const unregister = (id: string) => {
    houseObjects.current.delete(id);
  };

  /* eslint-disable react-hooks/immutability --
     R3F-Kernmuster: useFrame läuft in der requestAnimationFrame-Schleife AUSSERHALB von
     Reacts Render-Phase. Die Kamera hier über React-State zu steuern würde 60 Re-Renders/
     Sekunde bedeuten — direktes Mutieren von camera.position/.rotation in useFrame ist der
     von R3F selbst dokumentierte, performante Weg. Block-Disable statt Einzelzeilen, weil
     der React-Compiler-Linter die Verletzung am umschließenden useFrame-Callback meldet. */
  useFrame((_, delta) => {
    if (!running || finished.current) return;

    elapsed.current += delta;
    if (elapsed.current >= durationSec) {
      finished.current = true;
      onTimeUp();
      return;
    }

    camera.position.z -= FLIGHT_SPEED * delta;

    if (!reduceMotion) {
      bobT.current += delta;
      camera.position.y = 9 + Math.sin(bobT.current * 0.8) * 0.25;
      camera.rotation.z = Math.sin(bobT.current * 0.6) * 0.01;
    }
    camera.lookAt(0, 0, camera.position.z - 22);

    if (fireRequest && fireRequest.seq !== lastSeq.current) {
      lastSeq.current = fireRequest.seq;
      raycaster.setFromCamera(new THREE.Vector2(fireRequest.ndcX, fireRequest.ndcY), camera);
      const targets = Array.from(houseObjects.current.values());
      const hits = targets.length ? raycaster.intersectObjects(targets, true) : [];
      const hit = hits.find((h) => {
        const id = h.object.userData?.houseId as string | undefined;
        return id && !soldIds.has(id);
      });

      const cannonOrigin = camera.position.clone().add(CANNON_OFFSET.clone().applyQuaternion(camera.quaternion));

      if (hit) {
        const houseId = hit.object.userData.houseId as string;
        const house = houses.find((h) => h.id === houseId);
        if (house) {
          setSoldIds((prev) => {
            const next = new Set(prev);
            next.add(houseId);
            return next;
          });
          const screen = projectToScreen(hit.point, camera, size);
          onHit({ x: screen.x, y: screen.y, house });
          setBeams((prev) => [...prev, { id: beamId.current++, start: cannonOrigin, end: hit.point.clone() }]);
        }
      } else {
        onMiss();
        const farPoint = raycaster.ray.at(40, new THREE.Vector3());
        setBeams((prev) => [...prev, { id: beamId.current++, start: cannonOrigin, end: farPoint }]);
      }
    }
  });
  /* eslint-enable react-hooks/immutability */

  const visibleHouses = houses.filter((h) => {
    const dz = h.z - camera.position.z;
    return dz < 6 && dz > -REVEAL_DISTANCE;
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[10, 20, 6]} intensity={0.9} color="#f4f3f0" />
      <fog attach="fog" args={["#0b0b0d", 40, 145]} />
      <Ground length={flightLength} reduceMotion={reduceMotion} />
      <Environment length={flightLength} reduceMotion={reduceMotion} />
      {visibleHouses.map((h) => (
        <House key={h.id} house={h} sold={soldIds.has(h.id)} onRegister={register} onUnregister={unregister} />
      ))}
      {beams.map((b) => (
        <Beam
          key={b.id}
          start={b.start}
          end={b.end}
          onDone={() => setBeams((prev) => prev.filter((x) => x.id !== b.id))}
        />
      ))}
    </>
  );
}

export function GameCanvas({
  houses,
  running,
  fireRequest,
  onHit,
  onMiss,
  onTimeUp,
  durationSec,
}: {
  houses: GameHouse[];
  running: boolean;
  fireRequest: FireRequest | null;
  onHit: (info: HitInfo) => void;
  onMiss: () => void;
  onTimeUp: () => void;
  durationSec: number;
}) {
  const reduceMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  return (
    <Canvas
      camera={{ position: [0, 9, 14], fov: 62, near: 0.1, far: 220 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ background: "#0b0b0d" }}
    >
      <SceneContents
        houses={houses}
        running={running}
        fireRequest={fireRequest}
        onHit={onHit}
        onMiss={onMiss}
        onTimeUp={onTimeUp}
        durationSec={durationSec}
        reduceMotion={reduceMotion}
      />
    </Canvas>
  );
}
