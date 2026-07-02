"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Umgebungs-Deko für das Blitzverkauf-Spiel: nächtliche Vorderpfalz aus der
 * Luft statt leerer Raum. Vier Schichten — Bäume, Straßenlaternen, Sternen-
 * himmel, Stadt-Silhouette mit stilisiertem Speyerer Dom am Horizont.
 *
 * Alles wird EINMALIG imperativ in useMemo gebaut und als <primitive>
 * eingehängt: InstancedMesh für alles Wiederholte (2 Drawcalls für 70 Bäume,
 * 2 für 24 Laternen, 1 für die Skyline-Blöcke), THREE.Points für Sterne und
 * Fenster. Kein einziges PointLight — Licht wird ausschließlich über Emissive
 * vorgetäuscht, damit die Szene auf schwacher Hardware flüssig bleibt.
 * Die einzige Frame-Arbeit ist die Horizont-Mitführung (eine Zuweisung).
 *
 * Math.random ist hier bewusst ok (wie in game-houses.ts): die Deko entsteht
 * einmalig pro Mount rein clientseitig, es gibt keine SSG/Hydration-Anforderung.
 */

const TREE_COUNT = 70;
const LANTERN_COUNT = 24;
const STAR_COUNT = 350;
const SKYLINE_BLOCKS = 26;
// Silhouetten-Abstand knapp vor dem Fog-Ende (145): die Stadt bleibt dauerhaft
// als kaum aufgelöste Ahnung im Nebel stehen, statt jemals "anzukommen"
const HORIZON_DIST = 130;

/**
 * ~70 Low-Poly-Bäume als zwei InstancedMesh (Kronen + Stämme) links/rechts
 * der Spielbahn. Kronen sind fast schwarz (Nacht!), die Varianz kommt aus
 * Instanz-Matrix (Größe/Drehung) und Instanz-Farbe (zwei sehr dunkle
 * Grün-/Blaugrün-Töne) — kostet keine zusätzlichen Drawcalls.
 */
function buildTrees(length: number): THREE.Group {
  const crownGeo = new THREE.ConeGeometry(0.95, 2.2, 6);
  const trunkGeo = new THREE.CylinderGeometry(0.09, 0.14, 0.7, 5);
  // Material-Farbe weiß, damit die Instanz-Farbe (setColorAt) den Ton bestimmt
  const crownMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95 });
  const trunkMat = new THREE.MeshStandardMaterial({ color: "#191510", roughness: 0.9 });
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, TREE_COUNT);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, TREE_COUNT);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const c = new THREE.Color();
  const tones = [new THREE.Color("#0f1a12"), new THREE.Color("#0d161a")];

  for (let i = 0; i < TREE_COUNT; i++) {
    // strikt alternierende Seiten statt Zufall — verhindert zufällige "Waldlöcher"
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (10 + Math.random() * 14);
    const z = 10 - Math.random() * length;
    const k = 0.75 + Math.random() * 0.65;
    // 6-seitige Kegel zeigen Facetten — zufälliger Yaw bricht die Gleichförmigkeit
    q.setFromEuler(e.set(0, Math.random() * Math.PI, 0));
    s.setScalar(k);
    trunks.setMatrixAt(i, m.compose(p.set(x, 0.35 * k, z), q, s));
    // Kronen-Zentrum: Stammhöhe (0.7k) + halbe Kegelhöhe (1.1k)
    crowns.setMatrixAt(i, m.compose(p.set(x, 1.8 * k, z), q, s));
    crowns.setColorAt(i, c.copy(tones[i % 2]).multiplyScalar(0.85 + Math.random() * 0.3));
  }
  // Instanzen überspannen die ganze Strecke — die BoundingSphere der kleinen
  // Basis-Geometrie würde sonst fälschlich alles wegcullen
  crowns.frustumCulled = false;
  trunks.frustumCulled = false;

  const g = new THREE.Group();
  g.add(trunks, crowns);
  return g;
}

/**
 * ~24 Straßenlaternen abwechselnd bei x=±9.5, gleichmäßig über die Strecke.
 * Warm-weiße Emissive-Köpfe statt echter Lichter: sie "leuchten" nur optisch
 * und tauchen dadurch stimmungsvoll aus dem Nebel auf, ohne Lichtkosten.
 */
function buildLanterns(length: number): THREE.Group {
  const mastGeo = new THREE.CylinderGeometry(0.05, 0.07, 3.4, 6);
  const headGeo = new THREE.SphereGeometry(0.16, 10, 8);
  const mastMat = new THREE.MeshStandardMaterial({ color: "#2a2a30", roughness: 0.6, metalness: 0.25 });
  // geteiltes Emissive-Material für alle Köpfe — gewollt, Instanzen brauchen keine Einzel-Materialien
  const headMat = new THREE.MeshStandardMaterial({
    color: "#f4f3f0",
    emissive: "#f4f3f0",
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });
  const masts = new THREE.InstancedMesh(mastGeo, mastMat, LANTERN_COUNT);
  const heads = new THREE.InstancedMesh(headGeo, headMat, LANTERN_COUNT);

  const m = new THREE.Matrix4();
  const step = length / LANTERN_COUNT;
  for (let i = 0; i < LANTERN_COUNT; i++) {
    const x = (i % 2 === 0 ? -1 : 1) * 9.5;
    const z = 2 - i * step;
    masts.setMatrixAt(i, m.makeTranslation(x, 1.7, z));
    heads.setMatrixAt(i, m.makeTranslation(x, 3.42, z));
  }
  masts.frustumCulled = false;
  heads.frustumCulled = false;

  const g = new THREE.Group();
  g.add(masts, heads);
  return g;
}

/**
 * Sternenhimmel als statisches THREE.Points. Kein Dom/Halbkugel um den
 * Startpunkt: die Kamera legt in 45s über 700 Einheiten zurück und würde
 * jede lokale Kuppel hinter sich lassen. Stattdessen ein flaches Sternen-
 * "Band" hoch über der GESAMTEN Strecke — dank sizeAttenuation:false wirken
 * ferne wie nahe Sterne gleich groß, und es gibt null Frame-Arbeit.
 */
function buildStars(length: number): THREE.Points {
  const pos = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 320;
    pos[i * 3 + 1] = 55 + Math.random() * 95;
    pos[i * 3 + 2] = 40 - Math.random() * (length + 200);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: "#f4f3f0",
    size: 0.7,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.7,
    // Sterne liegen konzeptionell HINTER dem Bodennebel — mit fog:true wären
    // alle jenseits von 145 Einheiten unsichtbar und der Himmel bliebe leer
    fog: false,
    depthWrite: false,
  });
  const stars = new THREE.Points(geo, mat);
  stars.frustumCulled = false;
  return stars;
}

/**
 * Stadt-Silhouette am Horizont: sehr dunkle Blöcke plus ein stilisierter
 * Speyerer Dom (zwei schlanke Türme mit Kegelspitzen, Mittelschiff,
 * Vierungskuppel — abstrakt, aber als Wahrzeichen lesbar). Die Gruppe wird
 * pro Frame auf fester Distanz zur Kamera gehalten (siehe useFrame unten),
 * dadurch steht sie permanent tief im Nebel — der Fog erledigt das
 * "Fernsicht"-Grading von selbst.
 */
function buildSkyline(): THREE.Group {
  const g = new THREE.Group();

  // Blöcke: Pivot an der Unterkante, damit Höhe rein über die Matrix-Skalierung geht
  const blockGeo = new THREE.BoxGeometry(1, 1, 1);
  blockGeo.translate(0, 0.5, 0);
  const blockMat = new THREE.MeshStandardMaterial({ color: "#141417", roughness: 1 });
  const blocks = new THREE.InstancedMesh(blockGeo, blockMat, SKYLINE_BLOCKS);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const windows: number[] = [];

  for (let i = 0; i < SKYLINE_BLOCKS; i++) {
    let x = -100 + (i / (SKYLINE_BLOCKS - 1)) * 200 + (Math.random() - 0.5) * 8;
    // Sichtachse des Doms freihalten — Blöcke davor würden das Wahrzeichen verdecken
    if (x > -2 && x < 22) x += x < 10 ? -26 : 26;
    const w = 4 + Math.random() * 7;
    const h = 3 + Math.random() * 7;
    const d = 3 + Math.random() * 3;
    const zJit = (Math.random() - 0.5) * 10;
    blocks.setMatrixAt(i, m.compose(p.set(x, 0, zJit), q, s.set(w, h, d)));

    // vereinzelte warme Fensterpunkte auf der kamerazugewandten Front —
    // nicht jedes Haus ist nachts wach, deshalb nur ~60% der Blöcke
    if (Math.random() < 0.6) {
      const winCount = 1 + Math.floor(Math.random() * 3);
      for (let wi = 0; wi < winCount; wi++) {
        windows.push(
          x + (Math.random() - 0.5) * w * 0.7,
          h * (0.25 + Math.random() * 0.55),
          zJit + d / 2 + 0.3,
        );
      }
    }
  }
  blocks.frustumCulled = false;
  g.add(blocks);

  const winGeo = new THREE.BufferGeometry();
  winGeo.setAttribute("position", new THREE.Float32BufferAttribute(windows, 3));
  const winMat = new THREE.PointsMaterial({
    color: "#e8c37a",
    size: 1.6,
    sizeAttenuation: false,
    transparent: true,
    // fog:false + niedrige Opacity statt fog:true — bei 130 Einheiten Distanz
    // wären die Punkte sonst zu ~86% weggenebelt und schlicht unsichtbar
    opacity: 0.4,
    fog: false,
    depthWrite: false,
  });
  const winPts = new THREE.Points(winGeo, winMat);
  winPts.frustumCulled = false;
  g.add(winPts);

  // Dom minimal heller als die Blöcke und leicht vor die Skyline gerückt,
  // damit die Silhouette trotz Nebel als eigene Form lesbar bleibt
  const domMat = new THREE.MeshStandardMaterial({ color: "#17171c", roughness: 1 });
  const dom = new THREE.Group();
  const nave = new THREE.Mesh(new THREE.BoxGeometry(11, 4.2, 3.4), domMat);
  nave.position.y = 2.1;
  dom.add(nave);
  const towerGeo = new THREE.CylinderGeometry(0.75, 0.85, 9.5, 6);
  const tipGeo = new THREE.ConeGeometry(1.0, 2.6, 6);
  for (const tx of [-4.6, 4.6]) {
    const tower = new THREE.Mesh(towerGeo, domMat);
    tower.position.set(tx, 4.75, 0);
    const tip = new THREE.Mesh(tipGeo, domMat);
    tip.position.set(tx, 10.8, 0);
    dom.add(tower, tip);
  }
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 1.4, 8), domMat);
  drum.position.y = 4.9;
  const cupola = new THREE.Mesh(new THREE.ConeGeometry(1.7, 2.0, 8), domMat);
  cupola.position.y = 6.6;
  dom.add(drum, cupola);
  dom.position.set(10, 0, 5);
  g.add(dom);

  // Startpose passend zur initialen Kameraposition (z=14) — sonst stünde die
  // Stadt für einen Frame am Ursprung, bevor useFrame greift
  g.position.set(0, 0, 14 - HORIZON_DIST);
  return g;
}

export function Environment({ length }: { length: number; reduceMotion: boolean }) {
  // reduceMotion wird bewusst nicht destrukturiert: die Umgebung ist komplett
  // statisch, und die Horizont-Mitführung unten ist Positions-Synchronisation
  // (ohne sie verschwände die Stadt aus dem Sichtfeld), keine Animation.

  const { deko, skyline } = useMemo(() => {
    const deko = new THREE.Group();
    deko.add(buildTrees(length), buildLanterns(length), buildStars(length));
    return { deko, skyline: buildSkyline() };
  }, [length]);

  // <primitive>-Objekte räumt R3F beim Unmount nicht selbst auf —
  // Geometrien/Materialien explizit freigeben, sonst leakt jeder Neustart GPU-Speicher
  useEffect(() => {
    return () => {
      for (const root of [deko, skyline]) {
        root.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
            obj.geometry.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach((mat) => mat.dispose());
            else obj.material.dispose();
          }
        });
      }
    };
  }, [deko, skyline]);

  /* eslint-disable react-hooks/immutability --
     R3F-Kernmuster wie in game-canvas.tsx: die Horizont-Gruppe wird pro Frame in der
     rAF-Schleife direkt mutiert (eine einzige Zuweisung, null Allokationen) — React-State
     wäre hier 60 Re-Renders/Sekunde für eine reine Positions-Synchronisation. */
  useFrame(({ camera }) => {
    // Läuft absichtlich auch bei reduceMotion: die Stadt "bewegt" sich nicht,
    // sie wird nur relativ zur Kamera festgehalten.
    skyline.position.z = camera.position.z - HORIZON_DIST;
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <>
      <primitive object={deko} />
      <primitive object={skyline} />
    </>
  );
}
