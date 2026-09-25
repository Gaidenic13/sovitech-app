"use client"

import { useEffect, useRef } from "react"

// Full-bleed WebGL fluid field for the hero (Aethel Forge treatment in Sovitech
// green): silk-like flowing folds from domain-warped noise in a fullscreen
// fragment shader. Pointer-reactive drift, timeline reveal, alpha, DPR clamp.
// Recovers from WebGL context loss (browser context-cap eviction, GPU resets).
// DOM fallback: the section's solid dark green background remains.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uReveal;
uniform vec2 uPointer;
uniform vec2 uRes;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.0 + vec2(13.7, 7.3);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  uv.x *= uRes.x / uRes.y;
  float t = uTime * 0.12;

  // domain warping: fbm fed by fbm makes the silk-like flowing folds
  vec2 drift = uPointer * 0.15;
  vec2 q = vec2(
    fbm(uv * 1.2 + vec2(t * 0.9, -t * 0.6) + drift),
    fbm(uv * 1.2 + vec2(-t * 0.5, t * 0.8))
  );
  vec2 r = vec2(
    fbm(uv * 1.8 + q * 2.2 + vec2(t * 0.4, t * 0.3)),
    fbm(uv * 1.8 + q * 2.2 + vec2(-t * 0.3, t * 0.5))
  );
  float f = fbm(uv * 1.4 + r * 2.4);

  // carve the field into wisps: dark base, glowing folds
  float wisp = smoothstep(0.30, 0.85, f);
  float ridge = smoothstep(0.55, 0.95, f);

  vec3 base = vec3(0.016, 0.07, 0.06);    // deepened Sovitech green
  vec3 green = vec3(0.14, 0.52, 0.33);    // brightened #1F6B4A brand green
  vec3 teal = vec3(0.06, 0.30, 0.25);     // deep teal fold shadow
  vec3 glow = vec3(0.72, 0.88, 0.74);     // #C8E6C9 light green

  vec3 color = mix(base, mix(green, teal, q.y), wisp);
  color = mix(color, glow, ridge * 0.45);

  // keep the left side near-black so the display type stays legible
  float sideFade = 0.35 + 0.65 * smoothstep(0.15, 0.85, vUv.x);
  gl_FragColor = vec4(color * uReveal * sideFade, 1.0);
}
`

export function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false })
    if (!gl) return

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let disposed = false
    let teardownScene: (() => void) | null = null

    const setupScene = () => {
      if (disposed || gl.isContextLost()) return

      const compile = (type: number, src: string) => {
        const s = gl.createShader(type)!
        gl.shaderSource(s, src)
        gl.compileShader(s)
        return s
      }
      const program = gl.createProgram()!
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT))
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
      gl.useProgram(program)

      // fullscreen plane
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const aPos = gl.getAttribLocation(program, "aPos")
      gl.enableVertexAttribArray(aPos)
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

      const uTime = gl.getUniformLocation(program, "uTime")
      const uReveal = gl.getUniformLocation(program, "uReveal")
      const uPointer = gl.getUniformLocation(program, "uPointer")
      const uRes = gl.getUniformLocation(program, "uRes")

      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const resize = () => {
        // fluid field reads fine at half resolution — keeps fill-rate cheap
        canvas.width = (canvas.clientWidth * dpr) / 2
        canvas.height = (canvas.clientHeight * dpr) / 2
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.uniform2f(uRes, canvas.width, canvas.height)
      }
      resize()
      window.addEventListener("resize", resize)

      const start = performance.now()
      const frame = () => {
        if (disposed || gl.isContextLost()) return
        const t = (performance.now() - start) / 1000
        const rv = Math.min(t / 1.5, 1)
        pointer.x += (pointer.tx - pointer.x) * 0.03
        pointer.y += (pointer.ty - pointer.y) * 0.03
        gl.uniform1f(uTime, t)
        gl.uniform1f(uReveal, reducedMotion ? 1 : rv * rv * (3 - 2 * rv))
        gl.uniform2f(uPointer, pointer.x, pointer.y)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        if (!reducedMotion) raf = requestAnimationFrame(frame)
      }
      frame()

      teardownScene = () => {
        cancelAnimationFrame(raf)
        window.removeEventListener("resize", resize)
      }
    }

    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      pointer.tx = ((e.clientX - r.left) / r.width) * 2 - 1
      pointer.ty = -(((e.clientY - r.top) / r.height) * 2 - 1)
    }
    window.addEventListener("pointermove", onPointer)

    // context-loss recovery: preventDefault marks the context restorable, then
    // we proactively request restoration; on restore, rebuild the whole scene
    // (all GL resources are gone)
    const requestRestore = () => {
      setTimeout(() => {
        if (disposed) return
        try {
          gl.getExtension("WEBGL_lose_context")?.restoreContext()
        } catch {
          // not restorable (event wasn't preventDefault-ed) — nothing to do
        }
      }, 0)
    }
    const onLost = (e: Event) => {
      e.preventDefault()
      teardownScene?.()
      teardownScene = null
      requestRestore()
    }
    const onRestored = () => setupScene()
    canvas.addEventListener("webglcontextlost", onLost)
    canvas.addEventListener("webglcontextrestored", onRestored)

    if (gl.isContextLost()) {
      // context was lost before this mount (browser eviction) — try to revive
      requestRestore()
    } else {
      setupScene()
    }

    return () => {
      // Do NOT loseContext() here: React StrictMode remounts reuse the same
      // canvas, and a context lost during cleanup (with its restore listener
      // already removed) can never be restored — the hero stays blank on
      // route re-entry. Unreferenced canvases release their contexts on GC.
      disposed = true
      teardownScene?.()
      window.removeEventListener("pointermove", onPointer)
      canvas.removeEventListener("webglcontextlost", onLost)
      canvas.removeEventListener("webglcontextrestored", onRestored)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" aria-hidden="true" />
}
