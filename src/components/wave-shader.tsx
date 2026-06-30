"use client";

import { useEffect, useRef } from "react";

/**
 * „wavy blue" Fragment-Shader (nach Shadertoy lfsBzB), eingefärbt in RIEGEL-Blau (#015CFF).
 * Läuft als WebGL-Fullscreen-Quad hinter einer CTA-Box. Fallback: CSS-Gradient.
 * Respektiert prefers-reduced-motion (rendert ein statisches Bild, keine Animation).
 */
const FRAG = `
precision highp float;
uniform vec2 iResolution;
uniform float iTime;

vec2 rot(vec2 uv, float r) {
  float sinX = sin(r);
  float cosX = cos(r);
  float sinY = sin(r);
  mat2 m = mat2(cosX, -sinX, sinY, -cosX);
  return uv * m;
}

void main() {
  float speed = 0.05;
  float s = 15.0;   // stripes
  float st = 0.3;   // stripe thickness

  vec2 uv = rot(gl_FragCoord.xy / iResolution.xy, -0.2 + sin(iTime * speed) * 0.05);

  float osc = sin(uv.x * (uv.x - 1.5) * 9.0) * 0.2;
  uv.y += osc * sin((iTime * speed) + uv.x * 5.0);
  uv.y = fract(uv.y * s);

  vec3 bg = vec3(0.004, 0.361, 1.0); // RIEGEL Blau #015CFF
  vec3 fg = vec3(0.043, 0.043, 0.055); // Near-Black wie Seiten-Hintergrund

  float mask = smoothstep(0.4, 1.55, uv.y);
  mask += smoothstep(0.5 + st, 0.55 + st, 1.0 - uv.y);

  vec3 col = mask * bg + (1.0 - mask) * fg;
  gl_FragColor = vec4(col, 1.0);
}
`;

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

export function WaveShader({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: true, alpha: false });
    if (!gl) return; // CSS-Fallback (siehe Markup)

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "iResolution");
    const uTime = gl.getUniformLocation(prog, "iTime");

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let start = 0;
    let running = false;
    const render = (t: number) => {
      if (!start) start = t;
      gl.uniform1f(uTime, reduce ? 8 : (t - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce && running) raf = requestAnimationFrame(render);
    };
    const startLoop = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(render);
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    // Nur animieren, wenn das Canvas sichtbar ist (spart GPU/Akku außerhalb des Viewports).
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? startLoop() : stopLoop()),
      { threshold: 0 },
    );
    io.observe(canvas);

    return () => {
      stopLoop();
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`absolute inset-0 h-full w-full bg-[#015cff] ${className}`}
    />
  );
}
