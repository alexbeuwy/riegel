"use client";

import { useEffect, useRef } from "react";

/**
 * WOW-Hintergrund: animierter WebGL-Mesh-Gradient (Near-Black → RIEGEL-Blau).
 * Robust: bei fehlendem WebGL / prefers-reduced-motion bleibt der CSS-Fallback
 * (darunter liegender Radial-Gradient) sichtbar. GPU-only (transform/opacity-frei),
 * sauberes Cleanup. Subtil gehalten (kein „Rave").
 */
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
vec2 hash(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return -1.0 + 2.0*fract(sin(p)*43758.5453123); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(dot(hash(i+vec2(0.0,0.0)), f-vec2(0.0,0.0)), dot(hash(i+vec2(1.0,0.0)), f-vec2(1.0,0.0)), u.x),
             mix(dot(hash(i+vec2(0.0,1.0)), f-vec2(0.0,1.0)), dot(hash(i+vec2(1.0,1.0)), f-vec2(1.0,1.0)), u.x), u.y);
}
float fbm(vec2 p){ float v=0.0; float a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = uv*2.0-1.0;
  p.x *= u_res.x/u_res.y;
  float t = u_time*0.04;
  float n = fbm(p*1.4 + vec2(t, t*0.6));
  n += 0.5*fbm(p*2.8 - vec2(t*0.5, t));
  float glow = smoothstep(0.15, 0.95, n);
  vec3 bg   = vec3(0.043,0.043,0.051);
  vec3 blue = vec3(0.004,0.36,1.0);
  vec3 col = mix(bg, blue, glow*0.45);
  float vig = smoothstep(1.35, 0.15, length(p));
  col *= mix(0.45, 1.0, vig);
  gl_FragColor = vec4(col, 1.0);
}`;

const VERT = `attribute vec2 a_pos; void main(){ gl_Position = vec4(a_pos,0.0,1.0); }`;

export function HeroBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = (canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }
    if (!gl) return; // CSS-Fallback bleibt sichtbar

    const compile = (type: number, src: string) => {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
        gl!.deleteShader(s);
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl!.viewport(0, 0, w, h);
      }
      gl!.uniform2f(uRes, w, h);
    };

    let raf = 0;
    let start = 0;
    const render = (now: number) => {
      if (!start) start = now;
      resize();
      gl!.uniform1f(uTime, (now - start) / 1000);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(render);
    };

    resize();
    let io: IntersectionObserver | null = null;
    if (reduce) {
      gl.uniform1f(uTime, 12.0); // statisches, schönes Standbild
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      // Nur rendern, wenn sichtbar — der fbm-Shader ist GPU-teuer und würde
      // sonst nach dem Scrollen endlos weiterlaufen (Akku, v. a. mobil).
      let visible = false;
      io = new IntersectionObserver(
        ([entry]) => {
          const nowVisible = entry.isIntersecting;
          if (nowVisible && !visible) {
            visible = true;
            raf = requestAnimationFrame(render);
          } else if (!nowVisible && visible) {
            visible = false;
            cancelAnimationFrame(raf);
          }
        },
        { threshold: 0.01 },
      );
      io.observe(canvas);
    }

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-bg" aria-hidden>
      {/* CSS-Fallback (immer da, falls WebGL fehlt) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 70% 20%, rgba(1,92,255,0.28), transparent 70%), radial-gradient(50% 50% at 20% 80%, rgba(1,92,255,0.16), transparent 70%), #0b0b0d",
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
