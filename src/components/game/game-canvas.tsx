"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Ground } from "@/components/game/ground";
import { Environment } from "@/components/game/environment";
import { House } from "@/components/game/house";
import { Cannon } from "@/components/game/cannon";
import { Projectile } from "@/components/game/projectile";
import { FLIGHT_SPEED, type GameHouse } from "@/lib/game-houses";

const REVEAL_DISTANCE = 130; // Häuser werden erst innerhalb dieser Sichtweite gerendert
const MISS_DISTANCE = 40; // Fernpunkt auf dem Ray, zu dem Miss-Würfel fliegen
// Fallback-Startpunkt, falls die Kanone (noch) nicht gemountet ist — grob deren Mündungshöhe
const FALLBACK_MUZZLE_OFFSET = new THREE.Vector3(0, -0.9, -4.8);

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

/** Ein abgefeuerter Würfel im Flug. houseId null = Fehlschuss (fliegt zum Fernpunkt). */
interface Shot {
  id: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  houseId: string | null;
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
  aimRef,
}: {
  houses: GameHouse[];
  running: boolean;
  fireRequest: FireRequest | null;
  onHit: (info: HitInfo) => void;
  onMiss: () => void;
  onTimeUp: () => void;
  durationSec: number;
  reduceMotion: boolean;
  aimRef: React.RefObject<{ x: number; y: number }>;
}) {
  const { camera, size } = useThree();
  const houseObjects = useRef(new Map<string, THREE.Object3D>());
  const [soldIds, setSoldIds] = useState<Set<string>>(() => new Set());
  // Beim ABSCHUSS reserviert, damit ein Haus während der ~0.35s Flugzeit nicht
  // ein zweites Mal beschossen werden kann — soldIds greift erst beim Einschlag.
  const claimedIds = useRef(new Set<string>());
  const [shots, setShots] = useState<Shot[]>([]);
  const lastSeq = useRef(0);
  // Warteschlange statt Ein-Platz-Postfach: landen zwei Schüsse zwischen zwei Frames
  // (Zwei-Daumen-Tippen auf Touch, niedrige FPS), würde der zweite fireRequest-Prop
  // den noch nicht konsumierten ersten überschreiben und ein Schuss ginge verloren.
  // Der Effekt unten läuft pro Render (= pro Klick-Event) und sammelt daher JEDEN ein.
  const pendingShots = useRef<FireRequest[]>([]);
  const shotId = useRef(0);
  const fireSeqRef = useRef(0); // signalisiert der Kanone Rückstoß + Mündungsblitz
  const muzzleRef = useRef<THREE.Object3D | null>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useRef(new THREE.Vector2());
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

  // Jeden neuen fireRequest in die Queue übernehmen — der seq-Vergleich schützt
  // gegen Re-Renders mit unverändertem Request (z. B. durch setShots/setSoldIds).
  useEffect(() => {
    if (!fireRequest || fireRequest.seq === lastSeq.current) return;
    lastSeq.current = fireRequest.seq;
    pendingShots.current.push(fireRequest);
  }, [fireRequest]);

  /** Einschlag eines Treffer-Würfels: JETZT erst verkaufen + Punkte melden —
      Screen-Koordinaten fürs Popup mit der Kamera-Pose zum Einschlagszeitpunkt. */
  const handleImpact = (shot: Shot) => {
    const houseId = shot.houseId;
    if (!houseId) return;
    const house = houses.find((h) => h.id === houseId);
    if (!house) return;
    setSoldIds((prev) => {
      const next = new Set(prev);
      next.add(houseId);
      return next;
    });
    const screen = projectToScreen(shot.end, camera, size);
    onHit({ x: screen.x, y: screen.y, house });
  };

  /* eslint-disable react-hooks/immutability --
     R3F-Kernmuster: useFrame läuft in der requestAnimationFrame-Schleife AUSSERHALB von
     Reacts Render-Phase. Die Kamera hier über React-State zu steuern würde 60 Re-Renders/
     Sekunde bedeuten — direktes Mutieren von camera.position/.rotation in useFrame ist der
     von R3F selbst dokumentierte, performante Weg. Block-Disable statt Einzelzeilen, weil
     der React-Compiler-Linter die Verletzung am umschließenden useFrame-Callback meldet. */

  // Priorität -2: Kamera-Flug + Timer laufen VOR der Kanone (-1), damit deren
  // Pose im selben Frame auf der frischen Kameraposition basiert (kein Ein-Frame-Lag).
  useFrame((_, delta) => {
    if (running && !finished.current) {
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
    }
    // lookAt bewusst AUSSERHALB des running-Guards: schon während des Countdowns
    // (Canvas gemountet, Szene hinter dem Overlay sichtbar) soll die Kamera auf die
    // Strecke blicken — mit der R3F-Default-Rotation würde der Pitch sonst im ersten
    // Frame nach "LOS!" sichtbar um ~22° nach unten springen.
    camera.lookAt(0, 0, camera.position.z - 22);
  }, -2);

  // Priorität 0 (Default): Schuss-Auswertung NACH dem Kanonen-Update (-1),
  // damit die Mündungsposition exakt der gerenderten Rohrstellung entspricht.
  useFrame(() => {
    if (!running || finished.current) return;
    // splice(0) leert die Queue und liefert ALLE aufgelaufenen Schüsse — so wird
    // auch bei mehreren Klicks zwischen zwei Frames keiner verschluckt.
    const requests = pendingShots.current.splice(0);
    for (const request of requests) {
      // Raycast entscheidet SOFORT über Hit/Miss und liefert den exakten Zielpunkt —
      // der Würfel fliegt danach rein visuell dorthin (keine Physik, kein Danebentreffen).
      raycaster.setFromCamera(ndc.current.set(request.ndcX, request.ndcY), camera);
      const targets = Array.from(houseObjects.current.values());
      const hits = targets.length ? raycaster.intersectObjects(targets, true) : [];
      const hit = hits.find((h) => {
        const id = h.object.userData?.houseId as string | undefined;
        return !!id && !soldIds.has(id) && !claimedIds.current.has(id);
      });

      const start = new THREE.Vector3();
      if (muzzleRef.current) {
        muzzleRef.current.getWorldPosition(start);
      } else {
        start.copy(camera.position).add(FALLBACK_MUZZLE_OFFSET.clone().applyQuaternion(camera.quaternion));
      }

      fireSeqRef.current = request.seq; // Kanone: Rückstoß + Mündungsblitz

      if (hit) {
        const houseId = hit.object.userData.houseId as string;
        // Reservieren beim Abschuss — Punkte/soldId kommen erst beim Einschlag (handleImpact)
        claimedIds.current.add(houseId);
        setShots((prev) => [...prev, { id: shotId.current++, start, end: hit.point.clone(), houseId }]);
      } else {
        // Miss-Feedback (Fadenkreuz-Ring) bewusst SOFORT, nicht erst beim Verglühen des Würfels
        onMiss();
        const farPoint = raycaster.ray.at(MISS_DISTANCE, new THREE.Vector3());
        setShots((prev) => [...prev, { id: shotId.current++, start, end: farPoint, houseId: null }]);
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
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 6]} intensity={1} color="#f4f3f0" />
      <fog attach="fog" args={["#0b0b0d", 40, 145]} />
      <Ground length={flightLength} reduceMotion={reduceMotion} />
      <Environment length={flightLength} reduceMotion={reduceMotion} />
      <Cannon aimRef={aimRef} fireSeqRef={fireSeqRef} muzzleRef={muzzleRef} reduceMotion={reduceMotion} />
      {visibleHouses.map((h) => (
        <House key={h.id} house={h} sold={soldIds.has(h.id)} onRegister={register} onUnregister={unregister} />
      ))}
      {shots.map((s) => (
        <Projectile
          key={s.id}
          start={s.start}
          end={s.end}
          isHit={s.houseId !== null}
          reduceMotion={reduceMotion}
          onImpact={() => handleImpact(s)}
          onDone={() => setShots((prev) => prev.filter((x) => x.id !== s.id))}
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
  aimRef,
}: {
  houses: GameHouse[];
  running: boolean;
  fireRequest: FireRequest | null;
  onHit: (info: HitInfo) => void;
  onMiss: () => void;
  onTimeUp: () => void;
  durationSec: number;
  /** NDC-Zielposition (−1..1), vom HUD bei Pointer-Move gemutated — steuert die Rohrausrichtung. */
  aimRef: React.RefObject<{ x: number; y: number }>;
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
        aimRef={aimRef}
      />
    </Canvas>
  );
}
