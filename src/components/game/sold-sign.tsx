"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * "VERKAUFT"-Makler-Schild, das beim Treffer vor dem Haus einfedert — das
 * eigentliche Erfolgs-Feedback ("da steht: Haus verkauft"). Text kommt als
 * CanvasTexture (kein TextGeometry/Font-Asset nötig): RIEGEL-Blau als
 * Tafel-Hintergrund, bold system sans in Weiß. Textur, Materialien und
 * Geometrien leben EINMAL im Modul-Scope — alle Schilder einer Runde teilen
 * sich dieselben GPU-Ressourcen, statt pro Treffer neue Canvas/Texturen
 * anzulegen.
 */

interface SignAssets {
  boardMaterial: THREE.MeshBasicMaterial;
  postMaterial: THREE.MeshStandardMaterial;
  boardGeometry: THREE.PlaneGeometry;
  postGeometry: THREE.CylinderGeometry;
}

let assets: SignAssets | null = null;

/** Lazy statt direkt im Modul-Scope, weil document erst im Browser existiert
    (die Spiel-Komponenten werden zwar per ssr:false geladen, aber so bleibt
    das Modul auch bei versehentlichem Server-Import importierbar). */
function getSignAssets(): SignAssets {
  if (assets) return assets;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#015cff";
  ctx.fillRect(0, 0, 512, 288);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "6px";

  // Schriftgröße ggf. verkleinern statt fillText-maxWidth: maxWidth staucht
  // die Glyphen horizontal und sieht billig aus, kleinere Größe nicht.
  let fontSize = 110;
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
  while (ctx.measureText("VERKAUFT").width > 452 && fontSize > 60) {
    fontSize -= 4;
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillText("VERKAUFT", 256, 126);

  ctx.letterSpacing = "3px";
  ctx.font = "bold 34px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillText("RIEGEL IMMOBILIEN", 256, 222);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4; // flacher Blickwinkel im Überflug — ohne Anisotropie matscht der Text
  texture.colorSpace = THREE.SRGBColorSpace;

  assets = {
    // toneMapped: false, damit das Schild das exakte RIEGEL-Blau zeigt statt
    // der ACES-gedämpften Variante — wirkt nachts wie ein beleuchtetes Schild.
    boardMaterial: new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false }),
    postMaterial: new THREE.MeshStandardMaterial({ color: "#2a2a30", roughness: 0.8 }),
    boardGeometry: new THREE.PlaneGeometry(1.7, 0.95),
    postGeometry: new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8),
  };
  return assets;
}

/** easeOutBack — federt über 1 hinaus und schwingt zurück ("Schild wird in
    den Boden gerammt"). f(0)=0, f(1)=1, nie negativ. */
function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

const POP_DURATION = 0.35;

export function SoldSign({
  position,
  reduceMotion,
}: {
  position: [number, number, number];
  reduceMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const life = useRef(0);
  const settled = useRef(reduceMotion); // reduceMotion: sofort voll da, keine Feder-Animation
  const { boardMaterial, postMaterial, boardGeometry, postGeometry } = getSignAssets();

  // Scale-Animation direkt in useFrame (R3F-Kernmuster, siehe game-canvas.tsx):
  // setState pro Frame wäre 60 Re-Renders/s für eine reine Darstellungs-Interpolation.
  useFrame((_, delta) => {
    if (settled.current) return;
    const g = groupRef.current;
    if (!g) return;
    life.current += delta;
    if (life.current >= POP_DURATION) {
      g.scale.setScalar(1);
      settled.current = true;
      return;
    }
    g.scale.setScalar(easeOutBack(life.current / POP_DURATION));
  });

  return (
    // scale 0 nur als Startwert des Einfederns — Pivot am Boden (y=0), damit
    // das Schild aus dem Rasen wächst statt aus seiner Mitte.
    <group ref={groupRef} position={position} rotation={[0, -0.12, 0]} scale={reduceMotion ? 1 : 0}>
      <mesh geometry={postGeometry} material={postMaterial} position={[0, 0.6, 0]} />
      <mesh geometry={boardGeometry} material={boardMaterial} position={[0, 1.15, 0.05]} />
    </group>
  );
}
