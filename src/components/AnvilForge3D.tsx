"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three/webgpu";
import {
  Fn,
  clamp,
  color,
  diffuseColor,
  dot,
  exp,
  float,
  length,
  max,
  mix,
  positionLocal,
  pow,
  smoothstep,
  texture,
  uniform,
  uv,
  vec3,
  vec4,
} from "three/tsl";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { createSmartRenderer, detectGraphicsProfile, type RenderBackend } from "@/lib/gpu";
import { markAnvilReady, waitForHeroReady } from "@/lib/sceneReady";

const STRIKE_POS: [number, number, number] = [0.05, 1.95, -0.1];

let anvilPromise: Promise<GLTF> | null = null;
function loadAnvilGLTF(): Promise<GLTF> {
  if (!anvilPromise) {
    const loader = new GLTFLoader();
    anvilPromise = loader.loadAsync("/models/anvil.glb");
  }
  return anvilPromise;
}

/** Preloads the anvil GLB into the shared GLTFLoader cache. */
export function preloadAnvilGLTF(): Promise<GLTF> {
  return loadAnvilGLTF();
}

/** Converts normalized sRGB components to Three.js working linear RGB. */
function linearColorVec(r: number, g: number, b: number) {
  const c = new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
  return vec3(c.r, c.g, c.b);
}

function createFloorMaterial() {
  const uImpact = uniform(0.15);

  const mat = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

  const shadowTint = linearColorVec(0.055, 0.055, 0.055);
  const bounceTint = linearColorVec(1.0, 0.51, 0.18);

  const evalFloor = Fn(() => {
    const p = uv().mul(2.0).sub(1.0);
    const d = length(p);
    const falloff = smoothstep(0.12, 0.75, d).oneMinus();
    const shadow = exp(d.mul(d).mul(-9.5)).mul(0.52).mul(falloff);
    const bounce = exp(d.mul(d).mul(-6.0)).mul(uImpact).mul(0.22).mul(falloff);
    const col = mix(shadowTint, bounceTint, clamp(bounce.mul(2.5), 0.0, 1.0));
    const alpha = clamp(shadow.add(bounce), 0.0, 0.68);
    return vec4(col, alpha);
  });

  const floorNode = evalFloor();
  mat.colorNode = floorNode.xyz;
  mat.opacityNode = floorNode.w;

  return { mat, uImpact };
}

function createBladeNodeMaterial(origMat: THREE.MeshStandardMaterial) {
  const uBladeStrength = uniform(0.08);

  const mat = new THREE.MeshStandardNodeMaterial({
    color: origMat.color.clone(),
    roughness: origMat.roughness,
    metalness: origMat.metalness,
    side: origMat.side,
    map: origMat.map ?? null,
    normalMap: origMat.normalMap ?? null,
    roughnessMap: origMat.roughnessMap ?? null,
    metalnessMap: origMat.metalnessMap ?? null,
    emissiveMap: origMat.emissiveMap ?? null,
  });

  if (origMat.normalScale) {
    mat.normalScale = origMat.normalScale.clone();
  }

  const hotPink = linearColorVec(1.0, 0.0, 0.482);
  const hotAmber = linearColorVec(1.0, 0.69, 0.439);
  const baseEmissive = color(origMat.emissive.clone()).mul(origMat.emissiveIntensity ?? 1);
  const baseEmissiveTex = origMat.emissiveMap
    ? baseEmissive.mul(texture(origMat.emissiveMap))
    : baseEmissive;

  // Pure TSL rune glow matching the GLSL blade emissive pulse across WebGPU & WebGL2
  mat.emissiveNode = Fn(() => {
    const bladeGray = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
    const bladeMask = clamp(float(0.13).sub(bladeGray).div(0.13), 0.0, 1.0);
    const distToImpact = length(positionLocal.sub(vec3(0.0, 0.0, 0.3)));
    const bladeBase = max(
      float(0.0001),
      bladeMask.sub(distToImpact.mul(2.0)).add(uBladeStrength)
    );
    const bladeEff = pow(bladeBase, 2.0);
    const bladeGlow = mix(hotPink, hotAmber, clamp(bladeEff, 0.0, 1.0))
      .mul(bladeEff)
      .mul(1.85);
    return baseEmissiveTex.add(bladeGlow);
  })();

  return { mat, uBladeStrength };
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
 * Unboxed 3D Anvil Forge sitting directly on #212121 with its default forge colors
 * and strike animation powered by Three.js TSL (WebGPU -> WebGL2 fallback).
 */
export function AnvilForge3D({ strikeSignal = 0 }: { strikeSignal?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const triggerRef = useRef<(() => void) | null>(null);
  const [backend, setBackend] = useState<RenderBackend | null>(null);
  const [failed, setFailed] = useState(false);

  const lastSignal = useRef(strikeSignal);
  useEffect(() => {
    if (strikeSignal !== lastSignal.current) {
      lastSignal.current = strikeSignal;
      triggerRef.current?.();
    }
  }, [strikeSignal]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let disposed = false;
    let raf = 0;
    let inView = false;
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

    // Start fetching anvil.glb immediately while giving Hero Frame 1 brief GPU priority
    const gltfPromise = loadAnvilGLTF().catch(() => null);

    (async () => {
      try {
        await waitForHeroReady(2500);
        if (disposed) return;

        const profile = await detectGraphicsProfile();
        if (disposed) return;
        if (profile.backend === "none") {
          setBackend("none");
          setFailed(true);
          markAnvilReady();
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
          markAnvilReady();
          return;
        }

        const { renderer, backend: activeBackend } = initResult;
        rendererRef = renderer;
        setBackend(activeBackend);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        camera.position.set(6.4, 5.2, 3.5);
        camera.lookAt(0, 1.35, 0);

        const dirLight = new THREE.DirectionalLight("#ffaf85", 3);
        dirLight.position.set(-1, 1, 0.75);
        const ambientLight = new THREE.AmbientLight("#4d70ff", 2.15);
        const impactLight = new THREE.PointLight("#ff9955", 5);
        impactLight.position.set(0.4, 2.65, 0.35);
        scene.add(dirLight, ambientLight, impactLight);

        const floorGeo = new THREE.PlaneGeometry(4.4, 4.4);
        const floor = createFloorMaterial();
        const floorMesh = new THREE.Mesh(floorGeo, floor.mat);
        floorMesh.rotation.x = -Math.PI / 2;
        scene.add(floorMesh);

        const sparkCount =
          profile.tier === "high" ? 240 : profile.tier === "medium" ? 160 : 96;
        const burstCount =
          profile.tier === "high" ? 55 : profile.tier === "medium" ? 38 : 24;

        const sparkPos = new Float32Array(sparkCount * 3);
        const sparkVel = new Float32Array(sparkCount * 3);
        const sparkLife = new Float32Array(sparkCount).fill(2);
        let sparkCursor = 0;
        let hadLiveSparks = false;

        const sparkGeo = new THREE.OctahedronGeometry(1, 0);
        const sparkMat = new THREE.MeshBasicNodeMaterial({ toneMapped: false });
        const sparksMesh = new THREE.InstancedMesh(sparkGeo, sparkMat, sparkCount);
        sparksMesh.frustumCulled = false;

        const dummy = new THREE.Object3D();
        const orange = new THREE.Color("#ff822e");
        const amber = new THREE.Color("#ffb84d");
        const violet = new THREE.Color("#5e24ff");
        const tmpCol = new THREE.Color();

        dummy.position.set(0, -10, 0);
        dummy.scale.setScalar(0.0001);
        dummy.updateMatrix();
        for (let i = 0; i < sparkCount; i++) {
          sparksMesh.setMatrixAt(i, dummy.matrix);
          if (Math.random() < 0.15) {
            tmpCol.copy(violet);
          } else {
            tmpCol.copy(orange).lerp(amber, Math.random());
          }
          sparksMesh.setColorAt(i, tmpCol);
        }
        sparksMesh.instanceMatrix.needsUpdate = true;
        if (sparksMesh.instanceColor) sparksMesh.instanceColor.needsUpdate = true;
        scene.add(sparksMesh);

        let hammerRef: THREE.Object3D | null = null;
        let bladeUniform: { value: number } | null = null;
        let clonedBladeMat: THREE.Material | null = null;
        let sceneClone: THREE.Group | null = null;
        let bladeStrengthVal = 0.08;
        let impactGlow = 0.15;
        let autoTimer = 2.45;

        const strike = () => {
          if (hammerRef) {
            hammerRef.rotation.x = Math.PI * 0.5;
          }

          bladeStrengthVal = Math.min(1.15, bladeStrengthVal + 0.35);
          if (bladeUniform) bladeUniform.value = bladeStrengthVal;
          impactGlow = 1.0;
          autoTimer = 0;
          impactLight.intensity = Math.min(18, impactLight.intensity + 4.5);

          for (let k = 0; k < burstCount; k++) {
            const idx = sparkCursor;
            sparkCursor = (idx + 1) % sparkCount;
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
          hadLiveSparks = true;
        };

        triggerRef.current = strike;

        // Synchronous sizing before first frame prevents WebGL viewport rect warnings
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

        let lastNow = performance.now();

        const tick = (now: number) => {
          raf = 0;
          if (disposed || !inView || !tabVisible) return;

          const dt = Math.max(0, Math.min((now - lastNow) / 1000, 1 / 30));
          lastNow = Math.max(lastNow, now);

          autoTimer += dt;
          if (autoTimer >= 2.8) {
            strike();
          }

          if (hammerRef) {
            hammerRef.rotation.x += -hammerRef.rotation.x * Math.min(1, dt * 2.2);
          }

          bladeStrengthVal += (0.04 - bladeStrengthVal) * Math.min(1, dt * 0.7);
          if (bladeUniform) bladeUniform.value = bladeStrengthVal;

          impactGlow += (0 - impactGlow) * Math.min(1, dt * 2.8);
          floor.uImpact.value = impactGlow;

          impactLight.intensity += (5 - impactLight.intensity) * Math.min(1, dt * 3);

          if (hadLiveSparks) {
            let anyAlive = false;
            for (let i = 0; i < sparkCount; i++) {
              const life = sparkLife[i];
              if (life >= 2) continue;
              if (life >= 1) {
                dummy.scale.setScalar(0.0001);
                dummy.position.set(0, -10, 0);
                dummy.updateMatrix();
                sparksMesh.setMatrixAt(i, dummy.matrix);
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
              sparksMesh.setMatrixAt(i, dummy.matrix);
            }
            sparksMesh.instanceMatrix.needsUpdate = true;
            if (!anyAlive) hadLiveSparks = false;
          }

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
          triggerRef.current = null;
          floorGeo.dispose();
          floor.mat.dispose();
          sparkGeo.dispose();
          sparkMat.dispose();
          clonedBladeMat?.dispose();
          if (sceneClone) {
            scene.remove(sceneClone);
          }
        };

        // Attach anvil GLB before compileAsync so shader compilation & warm-up include the blade
        const gltf = await gltfPromise;
        if (disposed) return;

        if (gltf) {
          const clone = gltf.scene.clone(true);
          sceneClone = clone;

          const hammer = clone.getObjectByName("hammer") ?? null;
          if (hammer) {
            hammer.rotation.reorder("YXZ");
          }
          hammerRef = hammer;

          const blade = clone.getObjectByName("blade");
          if (blade && blade instanceof THREE.Mesh && blade.material) {
            const origMat = blade.material as THREE.MeshStandardMaterial;
            const nodeBlade = createBladeNodeMaterial(origMat);
            blade.material = nodeBlade.mat;
            clonedBladeMat = nodeBlade.mat;
            bladeUniform = nodeBlade.uBladeStrength;
            bladeUniform.value = bladeStrengthVal;
          }

          scene.add(clone);
        }

        try {
          renderer.render(scene, camera);
        } catch {
          if (!disposed) {
            setFailed(true);
            markAnvilReady();
          }
          return;
        }

        if (!disposed) {
          markAnvilReady();
        }

        if (typeof IntersectionObserver !== "undefined") {
          io = new IntersectionObserver(
            ([entry]) => {
              inView = entry.isIntersecting;
              if (inView) startLoop();
              else stopLoop();
            },
            { threshold: 0.01, rootMargin: "450px 0px" }
          );
          io.observe(wrap);
        } else {
          inView = true;
          startLoop();
        }
      } catch {
        if (!disposed) {
          setFailed(true);
          markAnvilReady();
        }
      }
    })();

    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      triggerRef.current = null;
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
      className="relative h-[220px] w-full cursor-pointer sm:h-[340px] md:h-[400px] lg:h-[480px] 2xl:h-[540px]"
      style={{
        maskImage:
          "radial-gradient(ellipse 84% 82% at 50% 50%, #000 58%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 84% 82% at 50% 50%, #000 58%, transparent 100%)",
      }}
    >
      {failed || backend === "none" ? (
        <AnvilFallback />
      ) : (
        <canvas ref={canvasRef} className="block h-full w-full" />
      )}
    </div>
  );
}
