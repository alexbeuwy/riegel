"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Boden-Ebene mit demselben "wavy blue"-Streifen-Look wie wave-shader.tsx
 * (Shadertoy lfsBzB, RIEGEL-Blau) — deutlich dezenter (35% Mix statt voll),
 * damit der Boden nicht blendet, aber optisch klar zur restlichen Seite
 * ("Waves"-Ästhetik, siehe icon.tsx) gehört statt wie ein generisches
 * Grid auszusehen. In der Bahnmitte liegt zusätzlich eine dezente dunkle
 * "Straße" (reine Shader-Maske über vUv.x, kein zweites Mesh).
 */
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;

  void main() {
    vec2 uv = vUv;
    float s = 9.0;
    float st = 0.35;
    float osc = sin(uv.x * (uv.x - 1.5) * 7.0) * 0.15;
    uv.y += osc + uTime * 0.01;
    uv.y = fract(uv.y * s);

    vec3 bg = vec3(0.004, 0.361, 1.0);
    vec3 fg = vec3(0.03, 0.03, 0.04);

    float mask = smoothstep(0.4, 1.4, uv.y);
    mask += smoothstep(0.5 + st, 0.55 + st, 1.0 - uv.y);
    mask = clamp(mask, 0.0, 1.0);

    vec3 col = mix(fg, bg, mask * 0.35);

    // Dezente "Straße" in Bahnmitte — direkt als vUv.x-Maske im selben Shader
    // statt als zweites Mesh (spart Drawcall + Z-Fighting). Der dunkle
    // Asphalt-Streifen gibt der Flugbahn eine Leserichtung; die hauchdünnen
    // blauen Randlinien binden ihn ans RIEGEL-Blau, ohne vom Zielen abzulenken.
    float dx = abs(vUv.x - 0.5);
    float road = 1.0 - smoothstep(0.05, 0.085, dx);
    col = mix(col, vec3(0.014, 0.014, 0.018), road * 0.8);
    float edge = 1.0 - smoothstep(0.0, 0.012, abs(dx - 0.072));
    col += bg * edge * 0.08;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function Ground({ length, reduceMotion }: { length: number; reduceMotion: boolean }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state) => {
    if (reduceMotion || !matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -length / 2 + 10]} receiveShadow>
      <planeGeometry args={[60, length, 1, 1]} />
      <shaderMaterial ref={matRef} vertexShader={VERT} fragmentShader={FRAG} uniforms={uniforms} />
    </mesh>
  );
}
