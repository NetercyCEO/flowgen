"use client";

import React, { Component, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { THEME, hexToSrgbVec3 } from "@/lib/theme";

/* ------------------------------------------------------------------ */
/*  Hero Lead Sculpture: 5 finite incoming pulse arcs + hollow double- */
/*  sided sculpted obsidian & molten-ember orb + 3 bold ember ribbons. */
/* ------------------------------------------------------------------ */

class CanvasErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function hasWebGL(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (gl && "getExtension" in gl) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
    return Boolean(gl);
  } catch {
    return false;
  }
}

/** Deterministic pseudo-random so SSR/CSR and re-renders stay stable. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const IN_COUNT = 5;
const OUT_COUNT = 3;
const IN_DOTS_PER_LINE = 3;
const OUT_DOTS_PER_LINE = 4;

const ACCENT_DEEP_VEC = hexToSrgbVec3(THEME.aquaDeep);
const ACCENT_MAIN_VEC = hexToSrgbVec3(THEME.aqua);
const ACCENT_SOFT_VEC = hexToSrgbVec3(THEME.gradFrom);
const ORB_SHELL_VEC = hexToSrgbVec3("#1a1817");

const ORB_VERTEX = /* glsl */ `
  uniform float uFlowPhase;
  uniform float uBurst;
  varying vec3 vLocalDir;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;

  void main() {
    vec3 dir = normalize(position);
    vLocalDir = dir;

    float ripple =
      sin(dir.x * 4.2 + uFlowPhase * 2.8) *
      cos(dir.y * 4.8 - uFlowPhase * 2.4) *
      sin(dir.z * 3.8 + uFlowPhase * 1.9);
    float scaleBoost = 1.0 + uBurst * 0.045;
    vec3 displaced = position * scaleBoost + normal * (ripple * uBurst * 0.022);

    vec4 mvPos = modelViewMatrix * vec4(displaced, 1.0);
    vViewPos = -mvPos.xyz;
    vViewNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPos;
  }
`;

// Sculptural hollow obsidian shell with smooth 3D simplex noise apertures & TSL click surge
const ORB_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uFlowPhase;
  uniform float uBurst;
  uniform vec3 uAccentDeep;
  uniform vec3 uAccentMain;
  uniform vec3 uAccentSoft;
  uniform vec3 uShellColor;
  varying vec3 vLocalDir;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  vec3 softRoll(vec3 c) {
    return c / (1.0 + max(c.r, max(c.g, c.b)) * 0.28);
  }

  void main() {
    vec3 dir = normalize(vLocalDir);
    vec3 flow1 = vec3(uFlowPhase * 0.45, -uFlowPhase * 0.22, uFlowPhase * 0.30);
    vec3 flow2 = vec3(-uFlowPhase * 0.32, uFlowPhase * 0.38, -uFlowPhase * 0.25);

    float n1 = 0.5 + 0.5 * snoise(dir * vec3(2.1, 3.0, 2.1) + flow1);
    float n2 = 0.5 + 0.5 * snoise(dir * vec3(3.6, 4.8, 3.6) + flow2);
    float pattern = n1 * 0.72 + n2 * 0.28;

    // ~75-80% solid obsidian surfaces at rest; smoothly opens & morphs on click surge
    float threshold = 0.365 + sin(uTime * 0.85) * 0.014 + uBurst * 0.095;
    float diff = pattern - threshold;
    if (diff <= 0.0) discard;

    vec3 N = normalize(vViewNormal);
    vec3 V = normalize(vViewPos);
    float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
    float fresnel = pow(max(1.0 - ndv, 0.0001), 2.5);

    if (gl_FrontFacing) {
      vec3 L = normalize(vec3(0.45, 0.72, 0.65));
      float diffuse = max(dot(N, L), 0.0);
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 32.0);

      float cutoutRim = smoothstep(0.042 + uBurst * 0.018, 0.0, diff);
      float bevel = smoothstep(0.11, 0.025, diff);

      vec3 studioRim = mix(vec3(0.28, 0.25, 0.24), uAccentMain * 0.95, 0.42 + uBurst * 0.25);
      vec3 obsidian = uShellColor
        + vec3(0.06, 0.055, 0.052) * diffuse
        + vec3(0.14, 0.12, 0.11) * spec
        - vec3(0.035) * bevel;
      obsidian = mix(obsidian, studioRim, fresnel * 0.82);

      vec3 carvedEdge = mix(
        uAccentMain * (1.12 + uBurst * 0.28),
        uAccentSoft * (1.08 + uBurst * 0.32),
        fresnel * 0.45 + uBurst * 0.45
      );
      gl_FragColor = vec4(softRoll(mix(obsidian, carvedEdge, cutoutRim)), 1.0);
    } else {
      // Hollow luminous back-facing cavity wall (no internal sphere)
      float edgeHeat = smoothstep(0.24, 0.0, diff);
      float depthShade = mix(0.62, 1.12, ndv);
      vec3 innerBase = mix(
        uAccentDeep,
        uAccentMain,
        clamp(smoothstep(0.0, 0.28, diff) + 0.22, 0.0, 1.0)
      );
      vec3 innerHot = mix(uAccentMain * 1.15, uAccentSoft * 1.15, 0.45 + uBurst * 0.45);
      vec3 cavity = mix(
        innerBase,
        innerHot,
        clamp(edgeHeat * 0.55 + uBurst * 0.42, 0.0, 1.0)
      );
      gl_FragColor = vec4(softRoll(cavity * depthShade * (1.08 + uBurst * 0.45)), 1.0);
    }
  }
`;

const UV_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const AURA_FRAGMENT = /* glsl */ `
  uniform float uPulse;
  uniform vec3 uAccentMain;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float falloff = smoothstep(0.92, 0.0, r);
    float alpha = exp(-r * r * 3.8) * (0.20 + uPulse * 0.06) * falloff;
    gl_FragColor = vec4(uAccentMain, alpha);
  }
`;

// Smooth finite light-pulse ribbons fading completely at outer tips and orb shell perimeter
const PULSE_RIBBON_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uPulse;
  uniform vec3 uBaseColor;
  uniform vec3 uPulseColor;
  uniform float uBaseAlpha;
  uniform float uClipStart;
  uniform float uFadeStart;
  uniform float uFadeEnd;
  uniform float uClipEnd;
  uniform float uPulseRepeat;
  uniform float uPulseSpeed;
  varying vec2 vUv;

  void main() {
    float endMask = smoothstep(uClipStart, uFadeStart, vUv.x) * smoothstep(uClipEnd, uFadeEnd, vUv.x);
    float wave = 0.5 + 0.5 * sin((vUv.x * uPulseRepeat - uTime * uPulseSpeed) * 6.2831853);
    float pulse = pow(max(wave, 0.0001), 7.0);
    vec3 col = mix(uBaseColor, uPulseColor, clamp(pulse + uPulse * 0.25, 0.0, 1.0));
    float alpha = clamp(uBaseAlpha + pulse * (0.62 + uPulse * 0.22), 0.0, 0.92) * endMask;
    if (alpha < 0.005) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

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
  const uvs = new Float32Array(vertCount * 2);
  const indices = new Uint16Array(idxCount);
  let vOff = 0;
  let uvOff = 0;
  let iOff = 0;
  let baseVert = 0;
  for (const g of tubes) {
    const pos = g.attributes.position.array as Float32Array;
    const uv = g.attributes.uv.array as Float32Array;
    positions.set(pos, vOff);
    uvs.set(uv, uvOff);
    vOff += pos.length;
    uvOff += uv.length;
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
  merged.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  return merged;
}

function useFlowCurves() {
  return useMemo(() => {
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
  }, []);
}

function FlowBeads({
  curves,
  perLine,
  color,
  emissive,
  emissiveIntensity,
  size,
  speedRef,
  phaseSeed,
  reducedMotion,
  isOutgoing,
}: {
  curves: THREE.CatmullRomCurve3[];
  perLine: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  size: number;
  speedRef: React.MutableRefObject<number>;
  phaseSeed: number;
  reducedMotion: boolean;
  isOutgoing?: boolean;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const offsets = useMemo(() => {
    const rand = seeded(phaseSeed);
    return curves.map(() =>
      Array.from({ length: perLine }, (_, k) => k / perLine + rand() * 0.18)
    );
  }, [curves, perLine, phaseSeed]);
  const progress = useRef(0);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    progress.current += Math.min(delta, 0.05) * speedRef.current;
    const elapsed = state.clock.elapsedTime;
    const waveAmp = reducedMotion ? 0 : 0.06;
    let idx = 0;
    curves.forEach((curve, ci) => {
      offsets[ci].forEach((off) => {
        const t = (progress.current + off) % 1;
        curve.getPoint(t, tmp);
        const startFade = isOutgoing
          ? Math.max(0, Math.min(1, (t - 0.20) / 0.14))
          : Math.min(1, t / 0.24);
        const endFade = isOutgoing
          ? Math.min(1, (1 - t) / 0.3)
          : Math.max(0, Math.min(1, (0.78 - t) / 0.14));
        const envelope = startFade * endFade;
        tmp.y += Math.sin(t * 10.0 - elapsed * 2.0 + ci * 0.9) * waveAmp * envelope;
        dummy.position.copy(tmp);
        dummy.scale.setScalar(envelope * size + 0.0001);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      });
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, curves.length * perLine]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 14, 14]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={0.22}
        metalness={0.35}
      />
    </instancedMesh>
  );
}

function AquaFixedOrb({
  reducedMotion,
  pulseRef,
  onHoverChange,
  onPulseClick,
}: {
  reducedMotion: boolean;
  pulseRef: React.MutableRefObject<number>;
  onHoverChange: (hovered: boolean) => void;
  onPulseClick: () => void;
}) {
  const shellMeshRef = useRef<THREE.Mesh>(null);
  const flowPhaseRef = useRef(0);
  const burstRef = useRef(0);
  const smoothedBurstRef = useRef(0);
  const spinVelRef = useRef(0);

  const shellGeo = useMemo(() => new THREE.SphereGeometry(1.46, 64, 64), []);
  const auraGeo = useMemo(() => new THREE.PlaneGeometry(5.6, 5.6), []);

  const shellMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: false,
        uniforms: {
          uTime: { value: 0 },
          uFlowPhase: { value: 0 },
          uBurst: { value: 0 },
          uAccentDeep: { value: new THREE.Vector3(...ACCENT_DEEP_VEC) },
          uAccentMain: { value: new THREE.Vector3(...ACCENT_MAIN_VEC) },
          uAccentSoft: { value: new THREE.Vector3(...ACCENT_SOFT_VEC) },
          uShellColor: { value: new THREE.Vector3(...ORB_SHELL_VEC) },
        },
        vertexShader: ORB_VERTEX,
        fragmentShader: ORB_FRAGMENT,
      }),
    []
  );

  const auraMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uPulse: { value: 0 },
          uAccentMain: { value: new THREE.Vector3(...ACCENT_MAIN_VEC) },
        },
        vertexShader: UV_VERTEX,
        fragmentShader: AURA_FRAGMENT,
      }),
    []
  );

  useEffect(() => {
    return () => {
      shellGeo.dispose();
      auraGeo.dispose();
      shellMat.dispose();
      auraMat.dispose();
    };
  }, [shellGeo, auraGeo, shellMat, auraMat]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    pulseRef.current = Math.max(0, pulseRef.current - dt * 0.9);
    burstRef.current = Math.max(0, burstRef.current - dt * 0.72);

    const rate = burstRef.current > smoothedBurstRef.current ? 16 : 3.2;
    smoothedBurstRef.current +=
      (burstRef.current - smoothedBurstRef.current) * (1 - Math.exp(-dt * rate));

    const t = state.clock.elapsedTime * (reducedMotion ? 0.18 : 1.0);
    const idleFlow = reducedMotion ? 0.04 : 0.16;
    const clickFlow = reducedMotion ? 0.35 : 2.2;
    flowPhaseRef.current += dt * (idleFlow + smoothedBurstRef.current * clickFlow);

    if (shellMeshRef.current) {
      const idleSpin = reducedMotion ? 0 : 0.08;
      spinVelRef.current *= Math.exp(-dt * 2.1);
      shellMeshRef.current.rotation.y += dt * (idleSpin + spinVelRef.current);
      shellMeshRef.current.rotation.x =
        0.22 +
        Math.sin(t * 0.55) * (reducedMotion ? 0 : 0.05) +
        smoothedBurstRef.current * 0.11;
    }

    shellMat.uniforms.uTime.value = t;
    shellMat.uniforms.uFlowPhase.value = flowPhaseRef.current;
    shellMat.uniforms.uBurst.value = smoothedBurstRef.current;
    auraMat.uniforms.uPulse.value = Math.max(pulseRef.current, smoothedBurstRef.current);
  });

  return (
    <group>
      {/* Ambient volumetric ember backdrop */}
      <mesh position={[0, 0, -1.3]} geometry={auraGeo} material={auraMat} />

      {/* Hollow double-sided sculpted obsidian shell with molten inner wall */}
      <mesh
        ref={shellMeshRef}
        position={[0, 0, 0]}
        rotation={[0.22, -0.42, 0]}
        geometry={shellGeo}
        material={shellMat}
        onClick={(e) => {
          e.stopPropagation();
          burstRef.current = 1;
          spinVelRef.current = Math.min(spinVelRef.current + 1.8, 3.2);
          onPulseClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverChange(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          onHoverChange(false);
          document.body.style.cursor = "auto";
        }}
      />
    </group>
  );
}

function FlowScene({ reducedMotion }: { reducedMotion: boolean }) {
  const { incoming, outgoing } = useFlowCurves();
  const [hovered, setHovered] = useState(false);
  const base = reducedMotion ? 0.03 : 0.11;
  const speedRef = useRef(base);
  const pulseRef = useRef(0);

  const incomingGeo = useMemo(() => buildBatchedTubes(incoming, 40, 0.024), [incoming]);
  const outgoingGeo = useMemo(() => buildBatchedTubes(outgoing, 44, 0.036), [outgoing]);

  const incomingMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uPulse: { value: 0 },
          uBaseColor: { value: new THREE.Vector3(...hexToSrgbVec3("#8f8f94")) },
          uPulseColor: { value: new THREE.Vector3(...hexToSrgbVec3(THEME.ink)) },
          uBaseAlpha: { value: 0.14 },
          uClipStart: { value: 0.0 },
          uFadeStart: { value: 0.24 },
          uFadeEnd: { value: 0.64 },
          uClipEnd: { value: 0.79 },
          uPulseRepeat: { value: 2.0 },
          uPulseSpeed: { value: 0.42 },
        },
        vertexShader: UV_VERTEX,
        fragmentShader: PULSE_RIBBON_FRAGMENT,
      }),
    []
  );

  const outgoingMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uPulse: { value: 0 },
          uBaseColor: { value: new THREE.Vector3(...ACCENT_MAIN_VEC) },
          uPulseColor: { value: new THREE.Vector3(...ACCENT_SOFT_VEC) },
          uBaseAlpha: { value: 0.28 },
          uClipStart: { value: 0.21 },
          uFadeStart: { value: 0.34 },
          uFadeEnd: { value: 0.72 },
          uClipEnd: { value: 1.0 },
          uPulseRepeat: { value: 1.6 },
          uPulseSpeed: { value: 0.48 },
        },
        vertexShader: UV_VERTEX,
        fragmentShader: PULSE_RIBBON_FRAGMENT,
      }),
    []
  );

  useEffect(() => {
    return () => {
      incomingGeo.dispose();
      outgoingGeo.dispose();
      incomingMat.dispose();
      outgoingMat.dispose();
    };
  }, [incomingGeo, outgoingGeo, incomingMat, outgoingMat]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const k = 1 - Math.exp(-dt * 3);
    const targetSpeed = (hovered ? base * 2.0 : base) + pulseRef.current * 0.2;
    speedRef.current += (targetSpeed - speedRef.current) * k;

    const t = state.clock.elapsedTime * (reducedMotion ? 0.2 : 1.0);
    incomingMat.uniforms.uTime.value = t;
    incomingMat.uniforms.uPulse.value = pulseRef.current;
    outgoingMat.uniforms.uTime.value = t;
    outgoingMat.uniforms.uPulse.value = pulseRef.current;
  });

  return (
    <group>
      {/* Incoming finite frosted light ribbons (5 paths) */}
      <mesh geometry={incomingGeo} material={incomingMat} />

      {/* Outgoing bold ember energy ribbons (3 paths) */}
      <mesh geometry={outgoingGeo} material={outgoingMat} />

      <FlowBeads
        curves={incoming}
        perLine={IN_DOTS_PER_LINE}
        color="#dcdce0"
        emissive="#888890"
        emissiveIntensity={0.35}
        size={0.068}
        speedRef={speedRef}
        phaseSeed={11}
        reducedMotion={reducedMotion}
      />
      <FlowBeads
        curves={outgoing}
        perLine={OUT_DOTS_PER_LINE}
        color={THEME.gradFrom}
        emissive={THEME.aqua}
        emissiveIntensity={0.9}
        size={0.098}
        speedRef={speedRef}
        phaseSeed={23}
        reducedMotion={reducedMotion}
        isOutgoing
      />

      <AquaFixedOrb
        reducedMotion={reducedMotion}
        pulseRef={pulseRef}
        onHoverChange={setHovered}
        onPulseClick={() => {
          pulseRef.current = 1;
        }}
      />

      <pointLight color={THEME.aqua} intensity={2.6} distance={5.5} decay={2} />
    </group>
  );
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
 * Hero sculptural 3D centerpiece: hollow double-sided carved obsidian + ember orb with finite luminous lead arcs.
 */
export function FlowConversion3D() {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [contextLost, setContextLost] = useState(false);
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [maxDpr, setMaxDpr] = useState(1.5);

  useEffect(() => {
    setMounted(true);
    setWebgl(hasWebGL());
    setTabVisible(!document.hidden);
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setMaxDpr(window.innerWidth < 640 ? 1.35 : 1.5);

    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      document.body.style.cursor = "auto";
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.02,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative h-[240px] w-full sm:h-[290px] lg:h-[clamp(270px,38vh,360px)] 2xl:h-[420px]"
      aria-label="3D animation: visitor streams transform inside a hollow sculpted obsidian ember sphere into booked sales calls"
      role="img"
    >
      {mounted &&
        (webgl && !contextLost ? (
          <CanvasErrorBoundary fallback={<StaticFallback />}>
            <Canvas
              dpr={[1, maxDpr]}
              resize={{ scroll: false }}
              frameloop={inView && tabVisible ? "always" : "never"}
              camera={{ position: [0, 0, 7.6], fov: 36 }}
              gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
              onCreated={({ gl }) => {
                gl.domElement.addEventListener(
                  "webglcontextlost",
                  (e) => {
                    e.preventDefault();
                    setContextLost(true);
                  },
                  { once: true }
                );
              }}
              style={{ width: "100%", height: "100%", display: "block" }}
              className="block h-full w-full"
            >
              <ambientLight intensity={0.85} />
              <directionalLight position={[3, 5, 6]} intensity={1.6} />
              <directionalLight position={[-4, -2, 3]} intensity={0.45} color={THEME.aquaSoft} />
              <FlowScene reducedMotion={reducedMotion} />
            </Canvas>
          </CanvasErrorBoundary>
        ) : (
          <StaticFallback />
        ))}
    </div>
  );
}
