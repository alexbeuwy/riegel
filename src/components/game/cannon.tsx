"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Stilisiertes Geschütz unten mittig im Bild. Kein Kind der Kamera, sondern
 * eine freie Group, deren Pose pro Frame aus camera.position/quaternion
 * abgeleitet wird — so bleibt die Kanone vom Kamera-Bob mitgenommen, ohne
 * dass wir die Kamera-Hierarchie der Szene anfassen müssen.
 *
 * Das Rohr richtet sich geglättet nach aimRef aus (NDC → Kamera-Ray →
 * Zielpunkt auf dem Ray → Yaw/Pitch relativ zur Kanone). Der Zielpunkt liegt
 * bewusst WEIT auf dem Ray (AIM_DISTANCE), damit das Rohr optisch auf das
 * konvergiert, was das Fadenkreuz anvisiert, obwohl Kanone und Kamera nicht
 * am selben Punkt sitzen.
 */

const OFFSET = new THREE.Vector3(0, -1.2, -4); // relativ zur Kamera
const FALLBACK_AIM = { x: 0, y: -0.2 }; // HUD noch nicht verdrahtet → Rohr geradeaus-leicht-gesenkt
const AIM_DISTANCE = 30; // Zielpunkt-Abstand auf dem Kamera-Ray
const AIM_SMOOTHING = 10; // Glättungsfaktor (·delta) für Yaw/Pitch
const BARREL_LEN = 1.1;
const RECOIL_DIST = 0.25; // Rohr-Rücksprung beim Schuss
const RECOIL_TIME = 0.15; // Sekunden bis das Rohr zurückgefedert ist
const FLASH_TIME = 0.07; // Mündungsblitz — nur wenige Frames

export function Cannon({
  aimRef,
  fireSeqRef,
  muzzleRef,
  reduceMotion,
}: {
  aimRef: React.RefObject<{ x: number; y: number }>;
  /** Wird von der Szene beim Abschuss hochgezählt → löst Rückstoß + Mündungsblitz aus. */
  fireSeqRef: React.RefObject<number>;
  /** Die Kanone hinterlegt hier ihre Mündungsspitze — Projektil-Startpunkt in Weltkoordinaten. */
  muzzleRef: React.RefObject<THREE.Object3D | null>;
  reduceMotion: boolean;
}) {
  const { camera } = useThree();
  const rootRef = useRef<THREE.Group>(null);
  const turretRef = useRef<THREE.Group>(null); // Yaw
  const pivotRef = useRef<THREE.Group>(null); // Pitch
  const barrelRef = useRef<THREE.Group>(null); // Rückstoß (lokales Z)
  const flashRef = useRef<THREE.Mesh>(null);

  const yaw = useRef(0);
  const pitch = useRef(0);
  const recoil = useRef(0); // normalisiert 1 → 0
  const flash = useRef(0);
  const lastSeq = useRef(0);

  // Arbeitsobjekte vorab — useFrame darf nicht pro Frame allokieren
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useRef(new THREE.Vector2());
  const aimPoint = useRef(new THREE.Vector3());
  const dirLocal = useRef(new THREE.Vector3());
  const quatInv = useRef(new THREE.Quaternion());
  const offsetWorld = useRef(new THREE.Vector3());

  // R3F-Kernmuster: Pose-Folgen, Rohr-Glättung und Rückstoß mutieren die
  // three.js-Objekte direkt in der rAF-Schleife (Begründung siehe game-canvas.tsx).
  // Priorität -1: läuft NACH der Kamera-Bewegung (-2) und VOR der Schuss-Auswertung (0),
  // damit die Mündungsposition beim Abschuss exakt der in diesem Frame gerenderten
  // Kanonen-Pose entspricht.
  useFrame((_, delta) => {
    const root = rootRef.current;
    if (!root) return;

    // Kanone folgt der Kamera starr (inkl. Bob/Roll), Offset unten-vorne
    offsetWorld.current.copy(OFFSET).applyQuaternion(camera.quaternion);
    root.position.copy(camera.position).add(offsetWorld.current);
    root.quaternion.copy(camera.quaternion);

    // NDC → Weltrichtung → Zielpunkt → Richtung in Kanonen-Lokalraum
    const aim = aimRef?.current ?? FALLBACK_AIM;
    raycaster.setFromCamera(ndc.current.set(aim.x, aim.y), camera);
    raycaster.ray.at(AIM_DISTANCE, aimPoint.current);
    quatInv.current.copy(camera.quaternion).invert();
    dirLocal.current.copy(aimPoint.current).sub(root.position).applyQuaternion(quatInv.current).normalize();

    // Lokales "vorne" ist -Z: Yaw um Y, Pitch um X (siehe Rotationsherleitung)
    const targetYaw = Math.atan2(-dirLocal.current.x, -dirLocal.current.z);
    const horiz = Math.hypot(dirLocal.current.x, dirLocal.current.z);
    const targetPitch = Math.atan2(dirLocal.current.y, horiz);
    const k = Math.min(1, AIM_SMOOTHING * delta);
    yaw.current += (targetYaw - yaw.current) * k;
    pitch.current += (targetPitch - pitch.current) * k;
    if (turretRef.current) turretRef.current.rotation.y = yaw.current;
    if (pivotRef.current) pivotRef.current.rotation.x = pitch.current;

    // Schuss-Signal aus der Szene: Rückstoß + Mündungsblitz anstoßen
    const seq = fireSeqRef?.current ?? 0;
    if (seq !== lastSeq.current) {
      lastSeq.current = seq;
      if (!reduceMotion) {
        recoil.current = 1;
        flash.current = FLASH_TIME;
      }
    }

    if (recoil.current > 0) {
      recoil.current = Math.max(0, recoil.current - delta / RECOIL_TIME);
    }
    if (barrelRef.current) {
      // quadratisch statt linear: schnappt schnell zurück, landet weich
      barrelRef.current.position.z = RECOIL_DIST * recoil.current * recoil.current;
    }

    if (flashRef.current) {
      flash.current = Math.max(0, flash.current - delta);
      flashRef.current.visible = flash.current > 0;
    }
  }, -1);

  return (
    <group ref={rootRef}>
      {/* Dezentes Akzentlicht, damit das dunkle Geschütz nicht im dunklen Boden absäuft —
          eng begrenzt (distance), damit es die Landschaft nicht einfärbt */}
      <pointLight position={[0.6, 1.4, 0.8]} intensity={2.2} distance={5} decay={2} color="#6aa1ff" />

      {/* Basis — flache Platte plus Sockel */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[1.15, 0.16, 1.15]} />
        <meshStandardMaterial color="#141417" roughness={0.85} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 0.12, 8]} />
        <meshStandardMaterial color="#141417" roughness={0.75} metalness={0.2} />
      </mesh>

      {/* Drehbarer Turm */}
      <group ref={turretRef} position={[0, 0.08, 0]}>
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[0.3, 0.38, 0.28, 8]} />
          <meshStandardMaterial color="#1c1c21" roughness={0.55} metalness={0.35} />
        </mesh>

        {/* Rohr-Pivot (Pitch) — sitzt oben auf dem Turm */}
        <group ref={pivotRef} position={[0, 0.32, 0]}>
          <group ref={barrelRef}>
            {/* Rohr: Zylinderachse Y → um -90° um X gedreht zeigt +Y (radiusTop) nach -Z (Mündung) */}
            <mesh position={[0, 0, -BARREL_LEN / 2]} rotation={[-Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.085, 0.12, BARREL_LEN, 10]} />
              <meshStandardMaterial color="#1c1c21" roughness={0.45} metalness={0.45} />
            </mesh>
            {/* Verschlussblock hinten — gibt dem Rohr Gewicht in der Silhouette */}
            <mesh position={[0, 0, 0.14]}>
              <boxGeometry args={[0.28, 0.26, 0.34]} />
              <meshStandardMaterial color="#1c1c21" roughness={0.6} metalness={0.35} />
            </mesh>
            {/* Emissive-Ring an der Mündung — RIEGEL-Blau als einziger Farbakzent */}
            <mesh position={[0, 0, -BARREL_LEN + 0.06]}>
              <torusGeometry args={[0.1, 0.022, 8, 20]} />
              <meshStandardMaterial color="#015cff" emissive="#015cff" emissiveIntensity={2} roughness={0.3} />
            </mesh>
            {/* Mündungsblitz — rein emissiv, kein PointLight (Performance) */}
            <mesh ref={flashRef} position={[0, 0, -BARREL_LEN - 0.08]} visible={false}>
              <sphereGeometry args={[0.14, 10, 10]} />
              <meshBasicMaterial color="#6aa1ff" transparent opacity={0.9} depthWrite={false} />
            </mesh>
            {/* Mündungsspitze = Projektil-Startpunkt; die Szene liest hieraus die Weltposition */}
            <group
              ref={(g) => {
                muzzleRef.current = g;
              }}
              position={[0, 0, -BARREL_LEN]}
            />
          </group>
        </group>
      </group>
    </group>
  );
}
