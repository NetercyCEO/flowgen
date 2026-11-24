"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three/webgpu";
import {
  Discard,
  Fn,
  abs,
  clamp,
  color,
  cos,
  dot,
  exp,
  float,
  frontFacing,
  length,
  max,
  mix,
  normalize,
  positionLocal,
  positionViewDirection,
  pow,
  select,
  sin,
  smoothstep,
  uniform,
  uv,
  vec3,
  vec4,
  normalLocal,
  normalView,
} from "three/tsl";
import { createSmartRenderer, detectGraphicsProfile, type RenderBackend } from "@/lib/gpu";
import { triggerOrbFeedback } from "@/lib/feedback";
import { markHeroReady } from "@/lib/sceneReady";
import { THEME } from "@/lib/theme";

/* ------------------------------------------------------------------ */
/*  Hero Lead Sculpture: 5 finite incoming pulse arcs + hollow double- */
/*  sided sculpted obsidian & molten-ember orb + 3 bold ember ribbons. */
/*  Built with Three.js TSL (WebGPU on stronger devices, WebGL2 fall-  */
/*  back on weaker devices / unsupported browsers).                    */
/* ------------------------------------------------------------------ */

const IN_COUNT = 5;
const OUT_COUNT = 3;

/** Converts normalized sRGB components to Three.js working linear RGB. */
function linearColorVec(r: number, g: number, b: number) {
  const c = new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
  return vec3(c.r, c.g, c.b);
}

function buildBatchedTubes(
  curves: THREE.CatmullRomCurve3[],
  segments: number,
  radius: number
) {
  const tubes = curves.map((c) => new THREE.TubeGeometry(c, segments, radius, 6, false));
  let vertCount = 0;
  let idxCount = 0;
  for (const g of tubes) {
    vertCount += g.attributes.position.count;
    idxCount += g.index ? g.index.count : 0;
  }
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices = new Uint16Array(idxCount);
  let vOff = 0;
  let nOff = 0;
  let uvOff = 0;
  let iOff = 0;
  let baseVert = 0;
  for (const g of tubes) {
    const pos = g.attributes.position.array as Float32Array;
    const normAttr = g.attributes.normal.array as Float32Array;
    const uvAttr = g.attributes.uv.array as Float32Array;
    positions.set(pos, vOff);
    normals.set(normAttr, nOff);
    uvs.set(uvAttr, uvOff);
    vOff += pos.length;
    nOff += normAttr.length;
    uvOff += uvAttr.length;
    if (g.index) {
      const idx = g.index.array;
      for (let k = 0; k < idx.length; k++) {
        indices[iOff++] = idx[k] + baseVert;
      }
    }
    baseVert += g.attributes.position.count;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  merged.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}

function createFlowCurves() {
  const incoming: THREE.CatmullRomCurve3[] = [];
  for (let i = 0; i < IN_COUNT; i++) {
    const norm = i / (IN_COUNT - 1) - 0.5;
    const y = norm * 3.1;
    const z = (i % 2 === 0 ? 1 : -1) * (0.28 + Math.abs(norm) * 0.45);
    const swell = Math.sin(norm * Math.PI) * 0.24;
    incoming.push(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-6.4, y, z * 0.7),
        new THREE.Vector3(-3.8, y * 0.72 + swell, z * 0.85),
        new THREE.Vector3(-1.7, y * 0.24 - swell * 0.35, z * 0.3),
        new THREE.Vector3(0, 0, 0),
      ])
    );
  }

  const outgoing: THREE.CatmullRomCurve3[] = [];
  for (let i = 0; i < OUT_COUNT; i++) {
    const norm = i / (OUT_COUNT - 1) - 0.5;
    const y = norm * 2.1;
    const z = (i === 1 ? 0.35 : -0.25) * (1 - Math.abs(norm) * 0.3);
    const swell = Math.cos(norm * Math.PI) * 0.16;
    outgoing.push(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1.7, y * 0.26 + swell, z * 0.3),
        new THREE.Vector3(3.8, y * 0.74 - swell * 0.3, z * 0.7),
        new THREE.Vector3(6.4, y, z * 0.55),
      ])
    );
  }
  return { incoming, outgoing };
}

function createOrbShellMaterial() {
  const uTime = uniform(0);
  const uFlowPhase = uniform(0);
  const uBurst = uniform(0);

  const accentDeep = color(THEME.aquaDeep);
  const accentMain = color(THEME.aqua);
  const accentSoft = color(THEME.gradFrom);
  const shellBase = color("#1a1817");

  const diffuseTint = linearColorVec(0.06, 0.055, 0.052);
  const specTint = linearColorVec(0.14, 0.12, 0.11);
  const bevelTint = linearColorVec(0.035, 0.035, 0.035);
  const rimCool = linearColorVec(0.28, 0.25, 0.24);

  const mat = new THREE.MeshBasicNodeMaterial({
    side: THREE.DoubleSide,
    transparent: false,
    toneMapped: false,
  });

  // TSL vertex displacement: subtle ripple + click surge expansion
  mat.positionNode = Fn(() => {
    const dir = normalize(positionLocal);
    const ripple = sin(dir.x.mul(4.2).add(uFlowPhase.mul(2.8)))
      .mul(cos(dir.y.mul(4.8).sub(uFlowPhase.mul(2.4))))
      .mul(sin(dir.z.mul(3.8).add(uFlowPhase.mul(1.9))));
    const scaleBoost = float(1.0).add(uBurst.mul(0.045));
    return positionLocal.mul(scaleBoost).add(normalLocal.mul(ripple.mul(uBurst).mul(0.022)));
  })();

  const softRoll = (col: ReturnType<typeof vec3>) => {
    const peak = max(col.r, max(col.g, col.b));
    return col.div(float(1.0).add(peak.mul(0.28)));
  };

  // TSL fragment: sculpted hollow obsidian shell with smooth 3D noise apertures & molten interior
  mat.colorNode = Fn(() => {
    const dir = normalize(positionLocal);
    const flow1 = vec3(
      uFlowPhase.mul(0.85),
      uFlowPhase.mul(-0.42),
      uFlowPhase.mul(0.58)
    );
    const flow2 = vec3(
      uFlowPhase.mul(-0.62),
      uFlowPhase.mul(0.72),
      uFlowPhase.mul(-0.48)
    );

    // Fast 2-octave rotated, domain-warped 3D gyroid noise calibrated to Perlin aperture scale (~12 organic cutouts)
    const p1 = dir.mul(vec3(6.6, 9.2, 6.6)).add(flow1);
    const g1 = dot(sin(p1), cos(vec3(p1.y, p1.z, p1.x)));
    const n1 = g1.div(3.0).add(0.5);

    const rotDir = vec3(
      dir.x.mul(0.8).sub(dir.z.mul(0.6)),
      dir.y.mul(0.8).add(dir.x.mul(0.6)),
      dir.z.mul(0.8).sub(dir.y.mul(0.6))
    );
    const p2 = rotDir
      .mul(vec3(11.2, 14.6, 11.2))
      .add(flow2)
      .add(vec3(g1.mul(0.95), g1.mul(-0.75), g1.mul(0.55)));
    const n2 = dot(sin(p2), cos(vec3(p2.y, p2.z, p2.x)))
      .div(3.0)
      .add(0.5);

    const pattern = n1.mul(0.68).add(n2.mul(0.32));

    const threshold = float(0.365)
      .add(sin(uTime.mul(0.85)).mul(0.014))
      .add(uBurst.mul(0.095));
    const diff = pattern.sub(threshold).toVar();
    Discard(diff.lessThanEqual(0.0));

    const N = normalize(normalView);
    const V = normalize(positionViewDirection);
    const ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
    const fresnel = pow(max(float(1.0).sub(ndv), 0.0001), 2.5);

    // Front-facing sculpted obsidian surface + glowing carved aperture rim
    const L = normalize(vec3(0.45, 0.72, 0.65));
    const diffuse = max(dot(N, L), 0.0);
    const H = normalize(L.add(V));
    const spec = pow(max(dot(N, H), 0.0001), 32.0);

    const cutoutRim = smoothstep(0.0, uBurst.mul(0.018).add(0.042), diff).oneMinus();
    const bevel = smoothstep(0.025, 0.11, diff).oneMinus();

    const studioRim = mix(rimCool, accentMain.mul(0.85), uBurst.mul(0.22).add(0.22));
    const obsidianLit = shellBase
      .add(diffuseTint.mul(diffuse))
      .add(specTint.mul(spec))
      .sub(bevelTint.mul(bevel))
      .max(0.0);
    const obsidian = mix(obsidianLit, studioRim, fresnel.mul(0.62));

    const carvedEdge = mix(
      accentMain.mul(uBurst.mul(0.28).add(1.12)),
      accentSoft.mul(uBurst.mul(0.32).add(1.08)),
      fresnel.mul(0.45).add(uBurst.mul(0.45))
    );
    const frontCol = softRoll(mix(obsidian, carvedEdge, cutoutRim));

    // Back-facing hollow glowing molten cavity
    const edgeHeat = smoothstep(0.0, 0.24, diff).oneMinus();
    const depthShade = mix(float(0.62), float(1.12), ndv);
    const innerBase = mix(
      accentDeep,
      accentMain,
      clamp(smoothstep(0.0, 0.28, diff).add(0.22), 0.0, 1.0)
    );
    const innerHot = mix(
      accentMain.mul(1.15),
      accentSoft.mul(1.15),
      uBurst.mul(0.45).add(0.45)
    );
    const cavity = mix(
      innerBase,
      innerHot,
      clamp(edgeHeat.mul(0.55).add(uBurst.mul(0.42)), 0.0, 1.0)
    );
    const backCol = softRoll(cavity.mul(depthShade).mul(uBurst.mul(0.45).add(1.08)));

    return select(frontFacing, frontCol, backCol);
  })();

  return { mat, uTime, uFlowPhase, uBurst };
}

function createAuraMaterial() {
  const uPulse = uniform(0);
  const accentMain = color(THEME.aqua);

  const mat = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

  mat.colorNode = accentMain;
  mat.opacityNode = Fn(() => {
    const p = uv().mul(2.0).sub(1.0);
    const r = length(p);
    const falloff = smoothstep(0.0, 0.78, r).oneMinus();
    return exp(r.mul(r).mul(-5.8)).mul(uPulse.mul(0.03).add(0.045)).mul(falloff);
  })();

  return { mat, uPulse };
}

function createPulseRibbonMaterial(opts: {
  baseHex: string;
  pulseHex: string;
  baseAlpha: number;
  clipStart: number;
  fadeStart: number;
  fadeEnd: number;
  clipEnd: number;
  pulseRepeat: number;
  pulseSpeed: number;
  expandRadius: number;
}) {
  const uTime = uniform(0);
  const uPulse = uniform(0);

  const baseColor = color(opts.baseHex);
  const pulseColor = color(opts.pulseHex);

  const mat = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

  const samplePulse = () => {
    const x = uv().x;
    const wave = sin(
      x.mul(opts.pulseRepeat).sub(uTime.mul(opts.pulseSpeed)).mul(6.2831853)
    )
      .mul(0.5)
      .add(0.5);
    const sharpness = mix(float(7.0), float(4.7), uPulse);
    const pulse = pow(max(wave, 0.0001), sharpness);
    return { x, pulse };
  };

  mat.positionNode = Fn(() => {
    const { pulse } = samplePulse();
    const expand = uPulse.mul(opts.expandRadius).mul(pulse.mul(0.55).add(0.65));
    return positionLocal.add(normalLocal.mul(expand));
  })();

  const evalRibbon = Fn(() => {
    const { x, pulse } = samplePulse();
    const endMask = smoothstep(opts.clipStart, opts.fadeStart, x).mul(
      smoothstep(opts.fadeEnd, opts.clipEnd, x).oneMinus()
    );
    const boostedPulseCol = pulseColor.mul(uPulse.mul(0.26).add(1.0));
    const col = mix(
      baseColor,
      boostedPulseCol,
      clamp(pulse.mul(uPulse.mul(0.22).add(1.0)).add(uPulse.mul(0.20)), 0.0, 1.0)
    );
    const alpha = clamp(
      float(opts.baseAlpha)
        .add(uPulse.mul(0.15))
        .add(pulse.mul(uPulse.mul(0.19).add(0.62))),
      0.0,
      0.95
    ).mul(endMask);
    return vec4(col, alpha);
  });

  const ribbonNode = evalRibbon();
  mat.colorNode = ribbonNode.xyz;
  mat.opacityNode = ribbonNode.w;

  return { mat, uTime, uPulse };
}

function StaticFallback() {
  return (
    <svg viewBox="0 0 1200 420" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="hero-ember-orb" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={THEME.gradFrom} stopOpacity="0.95" />
          <stop offset="48%" stopColor={THEME.aqua} stopOpacity="0.72" />
          <stop offset="100%" stopColor="#1a1817" stopOpacity="0.1" />
        </radialGradient>
        <linearGradient id="in-fade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8f8f94" stopOpacity="0" />
          <stop offset="100%" stopColor="#ececec" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id="out-fade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffd4b8" stopOpacity="0.9" />
          <stop offset="100%" stopColor={THEME.aqua} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[-120, -60, 0, 60, 120].map((dy, i) => (
        <path
          key={`fi-${i}`}
          d={`M180 ${210 + dy} C 350 ${210 + dy * 0.72}, 470 210, 600 210`}
          stroke="url(#in-fade)"
          strokeWidth="2.2"
          fill="none"
        />
      ))}
      {[-84, 0, 84].map((dy, i) => (
        <path
          key={`fo-${i}`}
          d={`M600 210 C 730 210, 850 ${210 + dy * 0.74}, 1020 ${210 + dy}`}
          stroke="url(#out-fade)"
          strokeWidth="3.2"
          fill="none"
        />
      ))}
      <circle
        cx="600"
        cy="210"
        r="64"
        fill="#1a1817"
        stroke={THEME.aqua}
        strokeOpacity="0.65"
        strokeWidth="2"
      />
      <circle cx="600" cy="210" r="46" fill="url(#hero-ember-orb)" />
    </svg>
  );
}

/**
 * Hero sculptural 3D centerpiece: hollow double-sided carved obsidian + ember orb
 * with finite luminous lead arcs powered by Three.js TSL (WebGPU -> WebGL2 fallback).
 */
export function FlowConversion3D() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [backend, setBackend] = useState<RenderBackend | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let disposed = false;
    let raf = 0;
    let inView = true;
    let tabVisible = !document.hidden;
    let rendererRef: THREE.WebGPURenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let io: IntersectionObserver | null = null;
    let cleanupScene: (() => void) | null = null;

    const onContextLost = (e: Event) => {
      e.preventDefault();
      if (!disposed) {
        setFailed(true);
      }
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    (async () => {
      try {
        const profile = await detectGraphicsProfile();
        if (disposed) return;
        if (profile.backend === "none") {
          setBackend("none");
          setFailed(true);
          markHeroReady();
          return;
        }

        const initResult = await createSmartRenderer(canvas, profile);
        if (disposed) {
          initResult?.renderer.dispose();
          return;
        }
        if (!initResult) {
          setBackend("none");
          setFailed(true);
          markHeroReady();
          return;
        }

        const { renderer, backend: activeBackend } = initResult;
        rendererRef = renderer;
        setBackend(activeBackend);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
        camera.position.set(0, 0, 7.6);

        // Adaptive geometry density by device tier
        const sphereSegs =
          profile.tier === "high" ? 56 : profile.tier === "medium" ? 44 : 32;
        const inTubeSegs =
          profile.tier === "high" ? 40 : profile.tier === "medium" ? 32 : 22;
        const outTubeSegs =
          profile.tier === "high" ? 44 : profile.tier === "medium" ? 36 : 26;

        const { incoming, outgoing } = createFlowCurves();
        const incomingGeo = buildBatchedTubes(incoming, inTubeSegs, 0.024);
        const outgoingGeo = buildBatchedTubes(outgoing, outTubeSegs, 0.036);

        const incomingRibbon = createPulseRibbonMaterial({
          baseHex: "#8f8f94",
          pulseHex: THEME.ink,
          baseAlpha: 0.14,
          clipStart: 0.0,
          fadeStart: 0.24,
          fadeEnd: 0.64,
          clipEnd: 0.79,
          pulseRepeat: 2.0,
          pulseSpeed: 0.42,
          expandRadius: 0.008,
        });
        const outgoingRibbon = createPulseRibbonMaterial({
          baseHex: THEME.aqua,
          pulseHex: THEME.gradFrom,
          baseAlpha: 0.28,
          clipStart: 0.21,
          fadeStart: 0.34,
          fadeEnd: 0.72,
          clipEnd: 1.0,
          pulseRepeat: 1.6,
          pulseSpeed: 0.48,
          expandRadius: 0.011,
        });

        const incomingMesh = new THREE.Mesh(incomingGeo, incomingRibbon.mat);
        const outgoingMesh = new THREE.Mesh(outgoingGeo, outgoingRibbon.mat);
        scene.add(incomingMesh, outgoingMesh);

        const shellGeo = new THREE.SphereGeometry(1.46, sphereSegs, sphereSegs);
        const auraGeo = new THREE.PlaneGeometry(5.6, 5.6);
        const orbShell = createOrbShellMaterial();
        const aura = createAuraMaterial();

        const auraMesh = new THREE.Mesh(auraGeo, aura.mat);
        auraMesh.position.set(0, 0, -1.3);

        const shellMesh = new THREE.Mesh(shellGeo, orbShell.mat);
        shellMesh.rotation.set(0.22, -0.42, 0);
        scene.add(auraMesh, shellMesh);

        // Synchronous sizing before first draw avoids destination/viewport mismatches
        const syncSize = () => {
          const w = Math.max(wrap.clientWidth, 1);
          const h = Math.max(wrap.clientHeight, 1);
          const dpr = Math.min(window.devicePixelRatio || 1, profile.maxDpr);
          renderer.setPixelRatio(dpr);
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        syncSize();

        resizeObserver = new ResizeObserver(syncSize);
        resizeObserver.observe(wrap);

        // Native pointer click surge on the orb (no R3F mouse warnings)
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let pulse = 0;
        let burst = 0;
        let smoothedBurst = 0;
        let spinVel = 0;
        let flowPhase = 0;
        let ribbonPhase = 0;

        const raycastOrb = (e: PointerEvent) => {
          const rect = canvas.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return false;
          pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          return raycaster.intersectObject(shellMesh, false).length > 0;
        };

        const onPointerDown = (e: PointerEvent) => {
          if (raycastOrb(e)) {
            triggerOrbFeedback();
            burst = 1;
            pulse = 1;
            spinVel = Math.min(spinVel + 1.8, 3.2);
          }
        };

        canvas.addEventListener("pointerdown", onPointerDown);

        let lastNow = performance.now();
        let elapsedTotal = 0;

        const tick = (now: number) => {
          raf = 0;
          if (disposed || !inView || !tabVisible) return;

          const dt = Math.max(0, Math.min((now - lastNow) / 1000, 0.05));
          lastNow = Math.max(lastNow, now);
          elapsedTotal += dt;

          pulse = Math.max(0, pulse - dt * 0.58);
          burst = Math.max(0, burst - dt * 0.72);

          const rate = burst > smoothedBurst ? 16 : 3.2;
          smoothedBurst += (burst - smoothedBurst) * (1 - Math.exp(-dt * rate));

          const ribbonSurge = Math.max(pulse, smoothedBurst);

          const tShader = elapsedTotal;
          const idleFlow = 0.16;
          const clickFlow = 2.2;
          flowPhase += dt * (idleFlow + smoothedBurst * clickFlow);
          ribbonPhase += dt * (1.0 + ribbonSurge * 3.8);

          const idleSpin = 0.08;
          spinVel *= Math.exp(-dt * 2.1);
          shellMesh.rotation.y += dt * (idleSpin + spinVel);
          shellMesh.rotation.x =
            0.22 + Math.sin(tShader * 0.55) * 0.05 + smoothedBurst * 0.11;

          orbShell.uTime.value = tShader;
          orbShell.uFlowPhase.value = flowPhase;
          orbShell.uBurst.value = smoothedBurst;
          aura.uPulse.value = ribbonSurge;

          incomingRibbon.uTime.value = ribbonPhase;
          incomingRibbon.uPulse.value = ribbonSurge;
          outgoingRibbon.uTime.value = ribbonPhase;
          outgoingRibbon.uPulse.value = ribbonSurge;

          try {
            renderer.render(scene, camera);
          } catch {
            if (!disposed) setFailed(true);
            return;
          }
          raf = requestAnimationFrame(tick);
        };

        const startLoop = () => {
          if (disposed || raf || !inView || !tabVisible) return;
          lastNow = performance.now();
          raf = requestAnimationFrame(tick);
        };

        const stopLoop = () => {
          if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
        };

        const onVis = () => {
          tabVisible = !document.hidden;
          if (tabVisible) startLoop();
          else stopLoop();
        };
        document.addEventListener("visibilitychange", onVis);

        cleanupScene = () => {
          stopLoop();
          document.removeEventListener("visibilitychange", onVis);
          canvas.removeEventListener("pointerdown", onPointerDown);
          incomingGeo.dispose();
          outgoingGeo.dispose();
          shellGeo.dispose();
          auraGeo.dispose();
          incomingRibbon.mat.dispose();
          outgoingRibbon.mat.dispose();
          orbShell.mat.dispose();
          aura.mat.dispose();
        };

        try {
          renderer.render(scene, camera);
        } catch {
          if (!disposed) {
            setFailed(true);
            markHeroReady();
          }
          return;
        }

        if (!disposed) {
          markHeroReady();
        }

        if (typeof IntersectionObserver !== "undefined") {
          io = new IntersectionObserver(
            ([entry]) => {
              inView = entry.isIntersecting;
              if (inView) startLoop();
              else stopLoop();
            },
            { threshold: 0.02 }
          );
          io.observe(wrap);
        }

        startLoop();
      } catch {
        if (!disposed) {
          setFailed(true);
          markHeroReady();
        }
      }
    })();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      resizeObserver?.disconnect();
      io?.disconnect();
      cleanupScene?.();
      try {
        rendererRef?.dispose();
      } catch {
        // Ignore teardown errors
      }
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      data-backend={backend ?? "initializing"}
      className="relative h-[240px] w-full sm:h-[290px] lg:h-[clamp(270px,38vh,360px)] 2xl:h-[420px]"
      aria-label="3D animation: visitor streams transform inside a hollow sculpted obsidian ember sphere into booked sales calls"
      role="img"
    >
      {failed || backend === "none" ? (
        <StaticFallback />
      ) : (
        <canvas ref={canvasRef} className="block h-full w-full" />
      )}
    </div>
  );
}
