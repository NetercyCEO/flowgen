"use client";

import React, { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

const SPARK_COUNT = 240;
const BURST_COUNT = 55;
const STRIKE_POS: [number, number, number] = [0.05, 1.95, -0.1];

let anvilPromise: Promise<GLTF> | null = null;
function loadAnvilGLTF(): Promise<GLTF> {
  if (!anvilPromise) {
    const loader = new GLTFLoader();
    anvilPromise = loader.loadAsync("/models/anvil.glb");
  }
  return anvilPromise;
}

class ForgeErrorBoundary extends Component<
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

const FLOOR_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Soft contact shadow + warm forge strike bounce preserved 100% identically to default
const FLOOR_FRAGMENT = /* glsl */ `
  uniform float uImpact;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float d = length(p);
    float falloff = smoothstep(0.75, 0.12, d);
    float shadow = exp(-d * d * 9.5) * 0.52 * falloff;
    float bounce = exp(-d * d * 6.0) * uImpact * 0.22 * falloff;
    vec3 col = mix(vec3(0.055), vec3(1.0, 0.51, 0.18), clamp(bounce * 2.5, 0.0, 1.0));
    float alpha = clamp(shadow + bounce, 0.0, 0.68);
    gl_FragColor = vec4(col, alpha);
  }
`;

function ForgeScene({
  strikeSignal,
  triggerRef,
}: {
  strikeSignal: number;
  triggerRef: React.MutableRefObject<(() => void) | null>;
}) {
  const [sceneClone, setSceneClone] = useState<THREE.Group | null>(null);
  const hammerRef = useRef<THREE.Object3D | null>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const sparksRef = useRef<THREE.InstancedMesh>(null);
  const bladeStrengthUniform = useRef({ value: 0.08 });
  const impactGlowRef = useRef(0.15);
  const autoTimerRef = useRef(2.45);

  const sparkPos = useMemo(() => new Float32Array(SPARK_COUNT * 3), []);
  const sparkVel = useMemo(() => new Float32Array(SPARK_COUNT * 3), []);
  // 0..1 active lifetime, >= 2 means parked offscreen (skip matrix updates)
  const sparkLife = useMemo(() => new Float32Array(SPARK_COUNT).fill(2), []);
  const sparkCursor = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const hadLiveSparks = useRef(false);

  const floorMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uImpact: { value: 0.15 } },
        vertexShader: FLOOR_VERTEX,
        fragmentShader: FLOOR_FRAGMENT,
      }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    loadAnvilGLTF()
      .then((gltf) => {
        if (cancelled) return;
        setSceneClone(gltf.scene.clone(true));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Wire hammer & radial emissive rune glow onto the cloned anvil.glb blade material
  useEffect(() => {
    if (!sceneClone) return;
    const hammer = sceneClone.getObjectByName("hammer") ?? null;
    if (hammer) {
      hammer.rotation.reorder("YXZ");
    }
    hammerRef.current = hammer;

    let clonedBladeMat: THREE.MeshStandardMaterial | null = null;
    const blade = sceneClone.getObjectByName("blade");
    if (blade && blade instanceof THREE.Mesh && blade.material) {
      const mat = (blade.material as THREE.MeshStandardMaterial).clone();
      mat.customProgramCacheKey = () => "flowgen-blade-forge-v1";
      const strengthRef = bladeStrengthUniform.current;
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uBladeStrength = strengthRef;
        shader.vertexShader = shader.vertexShader
          .replace(
            "#include <common>",
            "#include <common>\nvarying vec3 vBladeLocalPos;"
          )
          .replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\nvBladeLocalPos = position;"
          );
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            "#include <common>\nuniform float uBladeStrength;\nvarying vec3 vBladeLocalPos;"
          )
          .replace(
            "#include <emissivemap_fragment>",
            `#include <emissivemap_fragment>
float bladeGray = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
float bladeMask = clamp((0.13 - bladeGray) / 0.13, 0.0, 1.0);
float distToImpact = length(vBladeLocalPos - vec3(0.0, 0.0, 0.3));
float bladeEff = pow(max(0.0, bladeMask - distToImpact * 2.0 + uBladeStrength), 2.0);
vec3 bladeGlow = mix(vec3(1.0, 0.0, 0.482), vec3(1.0, 0.690, 0.439), clamp(bladeEff, 0.0, 1.0)) * bladeEff * 1.85;
totalEmissiveRadiance += bladeGlow;`
          );
      };
      blade.material = mat;
      clonedBladeMat = mat;
    }

    return () => {
      clonedBladeMat?.dispose();
    };
  }, [sceneClone]);

  useEffect(() => {
    return () => {
      floorMat.dispose();
    };
  }, [floorMat]);

  // Park all sparks offscreen and assign fiery forge orange -> amber (85%) + arcane violet (15%) colors
  useEffect(() => {
    const mesh = sparksRef.current;
    if (!mesh) return;
    const orange = new THREE.Color("#ff822e");
    const amber = new THREE.Color("#ffb84d");
    const violet = new THREE.Color("#5e24ff");
    const tmpCol = new THREE.Color();
    dummy.position.set(0, -10, 0);
    dummy.scale.setScalar(0.0001);
    dummy.updateMatrix();
    for (let i = 0; i < SPARK_COUNT; i++) {
      mesh.setMatrixAt(i, dummy.matrix);
      const r = Math.random();
      if (r < 0.15) {
        tmpCol.copy(violet);
      } else {
        tmpCol.copy(orange).lerp(amber, Math.random());
      }
      mesh.setColorAt(i, tmpCol);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [dummy]);

  const strike = useCallback(() => {
    if (hammerRef.current) {
      hammerRef.current.rotation.x = Math.PI * 0.5;
    }

    bladeStrengthUniform.current.value = Math.min(
      1.15,
      bladeStrengthUniform.current.value + 0.35
    );
    impactGlowRef.current = 1.0;
    autoTimerRef.current = 0;

    if (lightRef.current) {
      lightRef.current.intensity = Math.min(18, lightRef.current.intensity + 4.5);
    }

    for (let k = 0; k < BURST_COUNT; k++) {
      const idx = sparkCursor.current;
      sparkCursor.current = (idx + 1) % SPARK_COUNT;
      const i3 = idx * 3;
      const angle = Math.random() * Math.PI * 2;
      const radial = 0.65 + Math.random() * 0.55;

      sparkPos[i3] = STRIKE_POS[0];
      sparkPos[i3 + 1] = STRIKE_POS[1];
      sparkPos[i3 + 2] = STRIKE_POS[2];

      sparkVel[i3] = Math.sin(angle) * radial * 3.0;
      sparkVel[i3 + 1] = Math.random() * 1.25 * 3.0;
      sparkVel[i3 + 2] = Math.cos(angle) * radial * 3.0;
      sparkLife[idx] = 0;
    }
    hadLiveSparks.current = true;
  }, [sparkLife, sparkPos, sparkVel]);

  useEffect(() => {
    triggerRef.current = strike;
    return () => {
      triggerRef.current = null;
    };
  }, [strike, triggerRef]);

  const lastSignal = useRef(strikeSignal);
  useEffect(() => {
    if (strikeSignal !== lastSignal.current) {
      lastSignal.current = strikeSignal;
      strike();
    }
  }, [strikeSignal, strike]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);

    autoTimerRef.current += dt;
    if (autoTimerRef.current >= 2.8) {
      strike();
    }

    if (hammerRef.current) {
      hammerRef.current.rotation.x +=
        -hammerRef.current.rotation.x * Math.min(1, dt * 2.2);
    }

    bladeStrengthUniform.current.value +=
      (0.04 - bladeStrengthUniform.current.value) * Math.min(1, dt * 0.7);

    impactGlowRef.current += (0 - impactGlowRef.current) * Math.min(1, dt * 2.8);
    floorMat.uniforms.uImpact.value = impactGlowRef.current;

    if (lightRef.current) {
      lightRef.current.intensity +=
        (5 - lightRef.current.intensity) * Math.min(1, dt * 3);
    }

    const mesh = sparksRef.current;
    if (mesh && hadLiveSparks.current) {
      let anyAlive = false;
      for (let i = 0; i < SPARK_COUNT; i++) {
        const life = sparkLife[i];
        if (life >= 2) continue;
        if (life >= 1) {
          dummy.scale.setScalar(0.0001);
          dummy.position.set(0, -10, 0);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
          sparkLife[i] = 2;
          continue;
        }
        anyAlive = true;
        const i3 = i * 3;
        sparkVel[i3 + 1] -= 9.81 * dt;
        sparkPos[i3] += sparkVel[i3] * dt;
        sparkPos[i3 + 1] += sparkVel[i3 + 1] * dt;
        sparkPos[i3 + 2] += sparkVel[i3 + 2] * dt;

        if (sparkPos[i3 + 1] < 0.05) {
          sparkPos[i3 + 1] = 0.05;
          sparkVel[i3] *= 0.9;
          sparkVel[i3 + 1] *= -0.5;
          sparkVel[i3 + 2] *= 0.9;
        }

        const nextLife = Math.min(1, life + dt * 0.45);
        sparkLife[i] = nextLife;
        const t = THREE.MathUtils.smoothstep(nextLife, 0.5, 1.0);
        const sc = (1 - t) * 0.032;
        dummy.position.set(sparkPos[i3], sparkPos[i3 + 1], sparkPos[i3 + 2]);
        dummy.scale.setScalar(Math.max(0.0001, sc));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (!anyAlive) hadLiveSparks.current = false;
    }
  });

  return (
    <group>
      {sceneClone && <primitive object={sceneClone} />}

      {/* Grounded radial studio floor fading seamlessly into #212121 */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat}>
        <planeGeometry args={[4.4, 4.4]} />
      </mesh>

      {/* Fiery forge sparks */}
      <instancedMesh
        ref={sparksRef}
        args={[undefined, undefined, SPARK_COUNT]}
        frustumCulled={false}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      <pointLight
        ref={lightRef}
        color="#ff9955"
        intensity={5}
        position={[0.4, 2.65, 0.35]}
      />
    </group>
  );
}

function AnvilFallback() {
  return (
    <svg viewBox="0 0 360 180" className="h-full w-full" aria-hidden="true">
      <ellipse cx="180" cy="148" rx="88" ry="10" fill="#181818" />
      <path
        d="M126 144 H234 V132 L216 126 C204 108 216 94 246 86 L250 72 H142 C110 72 88 78 74 84 C100 92 122 96 142 100 C154 110 144 122 136 126 L126 132 Z"
        fill="#2b2e30"
        stroke="#464b4d"
        strokeWidth="1.5"
      />
      <rect x="150" y="64" width="66" height="8" rx="3" fill="#ff822e" fillOpacity="0.88" />
      <circle cx="183" cy="64" r="14" fill="#ffb84d" fillOpacity="0.22" />
    </svg>
  );
}

/**
 * Unboxed 3D Anvil Forge sitting directly on #212121 with its default forge colors & strike animation untouched.
 */
export function AnvilForge3D({ strikeSignal = 0 }: { strikeSignal?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<(() => void) | null>(null);
  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [maxDpr, setMaxDpr] = useState(1.5);

  useEffect(() => {
    setMounted(true);
    setWebgl(hasWebGL());
    setTabVisible(!document.hidden);
    setMaxDpr(window.innerWidth < 640 ? 1.35 : 1.5);

    const onVis = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const showWebGL = mounted && webgl;

  return (
    <div
      ref={wrapRef}
      onClick={() => triggerRef.current?.()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          triggerRef.current?.();
        }
      }}
      aria-label="Interactive 3D blacksmith anvil and hammer forging a glowing blade. Click to strike."
      className="relative h-[290px] w-full cursor-pointer sm:h-[380px] lg:h-[480px] 2xl:h-[540px]"
      style={{
        maskImage:
          "radial-gradient(ellipse 84% 82% at 50% 50%, #000 58%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 84% 82% at 50% 50%, #000 58%, transparent 100%)",
      }}
    >
      {showWebGL ? (
        <ForgeErrorBoundary fallback={<AnvilFallback />}>
          <Canvas
            dpr={[1, maxDpr]}
            resize={{ scroll: false }}
            frameloop={inView && tabVisible ? "always" : "never"}
            camera={{ position: [6.4, 5.2, 3.5], fov: 35 }}
            onCreated={({ camera }) => {
              camera.lookAt(0, 1.35, 0);
            }}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            style={{ width: "100%", height: "100%", display: "block" }}
            className="block h-full w-full"
          >
            <directionalLight color="#ffaf85" intensity={3} position={[-1, 1, 0.75]} />
            <ambientLight color="#4d70ff" intensity={2.15} />
            <ForgeScene strikeSignal={strikeSignal} triggerRef={triggerRef} />
          </Canvas>
        </ForgeErrorBoundary>
      ) : (
        <AnvilFallback />
      )}
    </div>
  );
}
