"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Makler-Schild vor dem Haus — zwei Varianten:
 * - "verkauft": RIEGEL-blaues Schild, federt beim Treffer ein (Erfolgs-Feedback).
 * - "konkurrenz": graues, leicht schiefes "ZU VERKAUFEN · SEIT 379 TAGEN"-Schild,
 *   das schon VOR dem Treffer steht — der Ladenhüter der Konkurrenz (die 379 Tage
 *   sind die echte Ø-Standzeit bei ~20 % Überpreisung aus dem Ratgeber).
 * Text kommt als CanvasTexture (kein TextGeometry/Font-Asset nötig). Texturen,
 * Materialien und Geometrien leben EINMAL pro Variante im Modul-Scope — alle
 * Schilder einer Runde teilen sich dieselben GPU-Ressourcen.
 */

export type SignVariant = "verkauft" | "konkurrenz";

interface SignAssets {
  boardMaterial: THREE.MeshBasicMaterial;
  postMaterial: THREE.MeshStandardMaterial;
  boardGeometry: THREE.PlaneGeometry;
  postGeometry: THREE.CylinderGeometry;
}

const assetCache = new Map<SignVariant, SignAssets>();
let sharedGeo: { board: THREE.PlaneGeometry; post: THREE.CylinderGeometry } | null = null;
let sharedPostMat: THREE.MeshStandardMaterial | null = null;

/** Schriftgröße ggf. verkleinern statt fillText-maxWidth: maxWidth staucht
    die Glyphen horizontal und sieht billig aus, kleinere Größe nicht. */
function fitText(ctx: CanvasRenderingContext2D, text: string, startPx: number, maxWidth: number): void {
  let fontSize = startPx;
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && fontSize > 40) {
    fontSize -= 4;
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
  }
}

/** Lazy statt direkt im Modul-Scope, weil document erst im Browser existiert
    (die Spiel-Komponenten werden zwar per ssr:false geladen, aber so bleibt
    das Modul auch bei versehentlichem Server-Import importierbar). */
function getSignAssets(variant: SignVariant): SignAssets {
  const cached = assetCache.get(variant);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (variant === "verkauft") {
    ctx.fillStyle = "#015cff";
    ctx.fillRect(0, 0, 512, 288);
    ctx.letterSpacing = "6px";
    fitText(ctx, "VERKAUFT", 110, 452);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("VERKAUFT", 256, 126);
    ctx.letterSpacing = "3px";
    ctx.font = "bold 34px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillText("RIEGEL IMMOBILIEN", 256, 222);
  } else {
    // Konkurrenz-Ladenhüter: ausgeblichenes Grau, müder Text — bewusst
    // KEIN echter/erkennbarer Konkurrenz-Name (rechtlich sauber, generisch).
    ctx.fillStyle = "#3a3a41";
    ctx.fillRect(0, 0, 512, 288);
    ctx.letterSpacing = "3px";
    fitText(ctx, "ZU VERKAUFEN", 76, 452);
    ctx.fillStyle = "rgba(244, 243, 240, 0.75)";
    ctx.fillText("ZU VERKAUFEN", 256, 108);
    ctx.letterSpacing = "2px";
    ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "rgba(244, 243, 240, 0.45)";
    ctx.fillText("SEIT 379 TAGEN", 256, 205);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4; // flacher Blickwinkel im Überflug — ohne Anisotropie matscht der Text
  texture.colorSpace = THREE.SRGBColorSpace;

  if (!sharedGeo) {
    sharedGeo = {
      board: new THREE.PlaneGeometry(1.7, 0.95),
      post: new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8),
    };
  }
  if (!sharedPostMat) {
    sharedPostMat = new THREE.MeshStandardMaterial({ color: "#2a2a30", roughness: 0.8 });
  }

  const assets: SignAssets = {
    // toneMapped: false, damit das Schild das exakte RIEGEL-Blau zeigt statt
    // der ACES-gedämpften Variante — wirkt nachts wie ein beleuchtetes Schild.
    boardMaterial: new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false }),
    postMaterial: sharedPostMat,
    boardGeometry: sharedGeo.board,
    postGeometry: sharedGeo.post,
  };
  assetCache.set(variant, assets);
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
  variant = "verkauft",
  /** true = Schild steht von Anfang an (Konkurrenz-Ladenhüter) — kein Einfedern. */
  static: isStatic = false,
}: {
  position: [number, number, number];
  reduceMotion: boolean;
  variant?: SignVariant;
  static?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const life = useRef(0);
  // sofort voll da, keine Feder-Animation — als konstante Render-Entscheidung
  // (Props ändern sich nach Mount nicht), Ref nur als Frame-Loop-Flag daneben
  const skipAnimation = reduceMotion || isStatic;
  const settled = useRef(skipAnimation);
  const { boardMaterial, postMaterial, boardGeometry, postGeometry } = getSignAssets(variant);

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

  // Konkurrenz-Schild hängt sichtbar schief — 379 Tage nagen an der Aufhängung.
  const rotation: [number, number, number] =
    variant === "konkurrenz" ? [0, -0.12, 0.07] : [0, -0.12, 0];

  return (
    // scale 0 nur als Startwert des Einfederns — Pivot am Boden (y=0), damit
    // das Schild aus dem Rasen wächst statt aus seiner Mitte.
    <group ref={groupRef} position={position} rotation={rotation} scale={skipAnimation ? 1 : 0}>
      <mesh geometry={postGeometry} material={postMaterial} position={[0, 0.6, 0]} />
      <mesh geometry={boardGeometry} material={boardMaterial} position={[0, 1.15, 0.05]} />
    </group>
  );
}
