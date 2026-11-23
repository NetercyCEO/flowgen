"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three/webgpu";
import {
  Fn,
  clamp,
  diffuseColor,
  dot,
  exp,
  float,
  length,
  max,
  mix,
  normalView,
  normalize,
  positionViewDirection,
  pow,
  smoothstep,
  uv,
  vec3,
  vec4,
} from "three/tsl";
import { createSmartRenderer, detectGraphicsProfile, type RenderBackend } from "@/lib/gpu";
import { waitForHeroReady } from "@/lib/sceneReady";

const SUBTLE_TRACKING = {
  neckYaw: 0.175,   // ±10° (~20° total horizontal neck arc)
  neckPitch: 0.105, // ±6° gentle vertical tilt
  headRoll: 0.025,
  eyeYaw: 0.13,
  eyePitch: 0.08,
  earTilt: 0.025,
} as const;

const CAM_YAW = -0.22;
const CAM_PITCH = 0.08;
const CAM_DISTANCE = 3.45;
const LOOK_Y = 0.16;

interface FoxRig {
  root: THREE.Group;
  neckPivot: THREE.Group;
  leftEyePivot: THREE.Group | null;
  rightEyePivot: THREE.Group | null;
  leftEar: THREE.Group | null;
  rightEar: THREE.Group | null;
}

interface FurMaps {
  colorMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

function createPalette() {
  return {
    obsidian: new THREE.Color("#1F1815"),
    espresso: new THREE.Color("#4A2112"),
    copper: new THREE.Color("#9A3611"),
    deepOrg: new THREE.Color("#CC4B17"),
    orange: new THREE.Color("#E66326"),
    brightOr: new THREE.Color("#EE7A36"),
    peach: new THREE.Color("#EBB082"),
    cream: new THREE.Color("#F3DEC9"),
    eyeBlack: new THREE.Color("#0F0C0B"),
  };
}

function sampleRamp(stops: ReadonlyArray<readonly [number, THREE.Color]>, t: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i];
    const [t1, c1] = stops[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const localT = (clamped - t0) / Math.max(0.0001, t1 - t0);
      return c0.clone().lerp(c1, localT);
    }
  }
  return stops[stops.length - 1][1].clone();
}

function paintGeometry(
  geom: THREE.BufferGeometry,
  colorFn: (x: number, y: number, z: number) => THREE.Color
) {
  const pos = geom.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = colorFn(pos.getX(i), pos.getY(i), pos.getZ(i));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function createStylizedFurMaps(): FurMaps | null {
  const size = 512;

  const colCanvas = document.createElement("canvas");
  colCanvas.width = size;
  colCanvas.height = size;
  const cctx = colCanvas.getContext("2d");

  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext("2d");

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rctx = roughCanvas.getContext("2d");

  if (!cctx || !bctx || !rctx) return null;

  cctx.fillStyle = "#f5f0eb";
  cctx.fillRect(0, 0, size, size);

  bctx.fillStyle = "#808080";
  bctx.fillRect(0, 0, size, size);

  rctx.fillStyle = "#efefef";
  rctx.fillRect(0, 0, size, size);

  let seed = 4219;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 220; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const rad = 18 + rand() * 44;
    const tone = rand() > 0.5 ? "rgba(255,248,242,0.06)" : "rgba(198,176,162,0.06)";
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const px = x + ox * size;
        const py = y + oy * size;
        if (px < -rad || px > size + rad || py < -rad || py > size + rad) continue;
        const g = cctx.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0, tone);
        g.addColorStop(1, "rgba(245,240,235,0)");
        cctx.fillStyle = g;
        cctx.beginPath();
        cctx.arc(px, py, rad, 0, Math.PI * 2);
        cctx.fill();
      }
    }
  }

  for (let i = 0; i < 4200; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 5 + rand() * 11;
    const w = 0.8 + rand() * 1.4;
    const angle = Math.PI * 0.5 + (rand() - 0.5) * 0.42;
    const shade = rand();

    const tone = Math.floor(228 + shade * 24);
    const warmR = Math.min(255, tone + 4);
    const warmG = Math.max(0, tone - 2);
    const warmB = Math.max(0, tone - 7);
    const bumpVal = Math.floor(118 + shade * 20);
    const roughVal = Math.floor(230 + (1 - shade) * 24);

    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const px = x + ox * size;
        const py = y + oy * size;
        if (px < -16 || px > size + 16 || py < -16 || py > size + 16) continue;

        cctx.save();
        cctx.translate(px, py);
        cctx.rotate(angle);
        cctx.fillStyle = `rgba(${warmR},${warmG},${warmB},0.16)`;
        cctx.beginPath();
        cctx.ellipse(0, 0, len * 0.5, w * 0.5, 0, 0, Math.PI * 2);
        cctx.fill();
        cctx.restore();

        bctx.save();
        bctx.translate(px, py);
        bctx.rotate(angle);
        bctx.fillStyle = `rgba(${bumpVal},${bumpVal},${bumpVal},0.18)`;
        bctx.beginPath();
        bctx.ellipse(0, 0, len * 0.5, w * 0.45, 0, 0, Math.PI * 2);
        bctx.fill();
        bctx.restore();

        rctx.save();
        rctx.translate(px, py);
        rctx.rotate(angle);
        rctx.fillStyle = `rgba(${roughVal},${roughVal},${roughVal},0.22)`;
        rctx.beginPath();
        rctx.ellipse(0, 0, len * 0.5, w * 0.5, 0, 0, Math.PI * 2);
        rctx.fill();
        rctx.restore();
      }
    }
  }

  const colorMap = new THREE.CanvasTexture(colCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.repeat.set(3.5, 3.5);

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3.5, 3.5);

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(3.5, 3.5);

  return { colorMap, bumpMap, roughnessMap };
}

function createContactShadowMaterial() {
  const mat = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });

  const shadowColor = new THREE.Color("#0d0a09");
  const emberColor = new THREE.Color("#e8682b");
  const shadowTint = vec3(shadowColor.r, shadowColor.g, shadowColor.b);
  const emberTint = vec3(emberColor.r, emberColor.g, emberColor.b);

  const evalShadow = Fn(() => {
    const p = uv().mul(2.0).sub(1.0);
    const d = length(p);
    const falloff = smoothstep(0.35, 0.96, d).oneMinus();
    const shadow = exp(d.mul(d).mul(-12.0)).mul(0.52).mul(falloff);
    const ringDist = d.sub(0.5);
    const ember = exp(ringDist.mul(ringDist).mul(-16.0)).mul(0.065).mul(falloff);
    const alpha = clamp(shadow.add(ember), 0.0, 0.65);
    const emberMix = clamp(ember.div(max(alpha, float(0.0001))), 0.0, 1.0);
    const col = mix(shadowTint, emberTint, emberMix);
    return vec4(col, alpha);
  });

  const shadowNode = evalShadow();
  mat.colorNode = shadowNode.xyz;
  mat.opacityNode = shadowNode.w;
  return mat;
}

function buildProceduralFlowGenFox(
  geometries: THREE.BufferGeometry[],
  materials: THREE.Material[],
  textures: THREE.Texture[]
): FoxRig {
  const palette = createPalette();
  const root = new THREE.Group();
  const furMaps = createStylizedFurMaps();

  if (furMaps) {
    textures.push(furMaps.colorMap, furMaps.bumpMap, furMaps.roughnessMap);
  }

  const furMat = new THREE.MeshStandardNodeMaterial({
    vertexColors: true,
    map: furMaps?.colorMap ?? null,
    bumpMap: furMaps?.bumpMap ?? null,
    bumpScale: 0.0028,
    roughnessMap: furMaps?.roughnessMap ?? null,
    roughness: 0.96,
    metalness: 0.0,
  });

  furMat.emissiveNode = Fn(() => {
    const ndotv = clamp(
      dot(normalize(normalView), normalize(positionViewDirection)),
      0.0,
      1.0
    );
    const velvet = pow(float(1.0).sub(ndotv), 2.4).mul(0.14);
    return diffuseColor.rgb.mul(velvet).mul(vec3(1.08, 0.96, 0.88));
  })();

  const eyeMat = new THREE.MeshStandardMaterial({
    color: palette.eyeBlack,
    roughness: 0.22,
    metalness: 0.0,
  });

  const noseMat = new THREE.MeshStandardMaterial({
    color: palette.eyeBlack,
    roughness: 0.48,
    metalness: 0.0,
  });

  materials.push(furMat, eyeMat, noseMat);

  const sampleBodyHeightColor = (yVal: number) =>
    sampleRamp(
      [
        [0.0, palette.obsidian],
        [0.14, palette.espresso],
        [0.34, palette.copper],
        [0.62, palette.deepOrg],
        [0.86, palette.orange],
        [1.0, palette.brightOr],
      ],
      THREE.MathUtils.clamp(yVal / 1.04, 0, 1)
    );

  // ---- A. Sitting Torso ----
  const bodyCurve = new THREE.SplineCurve([
    new THREE.Vector2(0.001, 0.0),
    new THREE.Vector2(0.21, 0.015),
    new THREE.Vector2(0.285, 0.14),
    new THREE.Vector2(0.285, 0.28),
    new THREE.Vector2(0.245, 0.46),
    new THREE.Vector2(0.205, 0.68),
    new THREE.Vector2(0.188, 0.86),
    new THREE.Vector2(0.172, 0.97),
    new THREE.Vector2(0.001, 1.04),
  ]);
  const bodyGeo = new THREE.LatheGeometry(bodyCurve.getPoints(64), 64);
  geometries.push(bodyGeo);
  {
    const p = bodyGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      let z = p.getZ(i);
      const hipWeight = Math.max(0, 1 - y / 0.68);
      z = z * (1.0 + 0.08 * hipWeight) - 0.055 * hipWeight;
      if (z > 0 && y < 0.48) {
        const frontFlatten = THREE.MathUtils.smoothstep(0.48 - y, 0.0, 0.35);
        z *= 1.0 - 0.14 * frontFlatten;
      }
      p.setZ(i, z);
      p.setX(i, x * (0.95 + 0.05 * hipWeight));
    }
    bodyGeo.computeVertexNormals();
  }
  paintGeometry(bodyGeo, (x, y, z) => {
    const baseColor = sampleBodyHeightColor(y);
    const yNorm = (y - 0.56) / 0.25;
    const taper = 1.0 - 0.32 * Math.abs(yNorm);
    const chestDx = x / Math.max(0.035, 0.095 * taper);
    const chestDist = Math.sqrt(chestDx * chestDx + yNorm * yNorm);
    if (z > 0.05 && chestDist < 1.35) {
      const blend = THREE.MathUtils.smoothstep(1.35 - chestDist, 0.0, 0.72);
      const chestTone = palette.peach.clone().lerp(palette.cream, 0.62);
      baseColor.lerp(chestTone, blend);
    }
    return baseColor;
  });
  root.add(new THREE.Mesh(bodyGeo, furMat));

  // ---- B. Continuous Sculpted Front Legs, Grounded Paws & Haunches ----
  ([-1, 1] as const).forEach((side) => {
    const legGroup = new THREE.Group();

    const legCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.115, 0.69, 0.09),
      new THREE.Vector3(side * 0.132, 0.62, 0.155),
      new THREE.Vector3(side * 0.132, 0.49, 0.212),
      new THREE.Vector3(side * 0.106, 0.31, 0.242),
      new THREE.Vector3(side * 0.082, 0.14, 0.252),
      new THREE.Vector3(side * 0.076, 0.052, 0.264),
      new THREE.Vector3(side * 0.076, 0.042, 0.308),
      new THREE.Vector3(side * 0.076, 0.036, 0.348),
    ]);

    const lSegs = 48;
    const lRadSegs = 24;
    const legGeo = new THREE.TubeGeometry(legCurve, lSegs, 1.0, lRadSegs, false);
    geometries.push(legGeo);
    {
      const p = legGeo.attributes.position;
      const frames = legCurve.computeFrenetFrames(lSegs, false);
      const colors = new Float32Array(p.count * 3);

      for (let i = 0; i <= lSegs; i++) {
        const u = i / lSegs;
        const center = legCurve.getPointAt(u);

        let r: number;
        if (u < 0.08) {
          const t = u / 0.08;
          r = 0.002 + Math.sin(t * Math.PI * 0.5) * 0.062;
        } else if (u < 0.78) {
          const t = (u - 0.08) / 0.7;
          r = THREE.MathUtils.lerp(0.068, 0.05, t);
        } else if (u < 0.92) {
          const t = (u - 0.78) / 0.14;
          r = THREE.MathUtils.lerp(0.05, 0.058, Math.sin(t * Math.PI * 0.5));
        } else {
          const t = (u - 0.92) / 0.08;
          r = Math.max(0.002, 0.058 * Math.cos(t * Math.PI * 0.5));
        }

        const pawWeight = THREE.MathUtils.smoothstep(u, 0.78, 0.94);

        for (let j = 0; j <= lRadSegs; j++) {
          const idx = i * (lRadSegs + 1) + j;
          const angle = (j / lRadSegs) * Math.PI * 2;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const N = frames.normals[i];
          const B = frames.binormals[i];
          const vx = center.x + r * (cos * N.x + sin * B.x);
          let vy = center.y + r * (1.0 - 0.28 * pawWeight) * (cos * N.y + sin * B.y);
          const vz = center.z + r * (cos * N.z + sin * B.z);
          if (vy < 0.004) vy = 0.004;

          p.setXYZ(idx, vx, vy, vz);

          const c = sampleBodyHeightColor(vy);
          if (pawWeight > 0.01) {
            c.lerp(palette.obsidian, pawWeight * 0.75);
          }
          colors[idx * 3] = c.r;
          colors[idx * 3 + 1] = c.g;
          colors[idx * 3 + 2] = c.b;
        }
      }
      legGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      legGeo.computeVertexNormals();
    }
    legGroup.add(new THREE.Mesh(legGeo, furMat));

    const thighGeo = new THREE.SphereGeometry(0.18, 32, 24);
    geometries.push(thighGeo);
    thighGeo.scale(0.82, 1.0, 1.12);
    const thighPos = new THREE.Vector3(side * 0.215, 0.185, -0.025);
    paintGeometry(thighGeo, (_x, y) => sampleBodyHeightColor(y + thighPos.y));
    const thighMesh = new THREE.Mesh(thighGeo, furMat);
    thighMesh.position.copy(thighPos);
    thighMesh.rotation.z = side * -0.12;
    legGroup.add(thighMesh);

    const backPawGeo = new THREE.SphereGeometry(0.062, 24, 18);
    geometries.push(backPawGeo);
    backPawGeo.scale(1.02, 0.56, 1.38);
    paintGeometry(backPawGeo, (_x, y) =>
      sampleRamp(
        [
          [0.0, palette.obsidian],
          [0.7, palette.obsidian],
          [1.0, palette.espresso],
        ],
        THREE.MathUtils.clamp((y + 0.035) / 0.07, 0, 1)
      )
    );
    const backPaw = new THREE.Mesh(backPawGeo, furMat);
    backPaw.position.set(side * 0.222, 0.036, 0.135);
    backPaw.rotation.y = side * 0.22;
    legGroup.add(backPaw);

    root.add(legGroup);
  });

  // ---- C. Fluffy Curved Tail ----
  const tailPivot = new THREE.Group();
  tailPivot.position.set(-0.07, 0.16, -0.22);

  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, 0.03, 0.0),
    new THREE.Vector3(-0.24, 0.11, -0.1),
    new THREE.Vector3(-0.5, 0.3, -0.12),
    new THREE.Vector3(-0.6, 0.58, -0.05),
    new THREE.Vector3(-0.54, 0.84, 0.02),
    new THREE.Vector3(-0.44, 0.99, 0.06),
  ]);

  const segs = 48;
  const radSegs = 26;
  const tailGeo = new THREE.TubeGeometry(tailCurve, segs, 1.0, radSegs, false);
  geometries.push(tailGeo);
  {
    const p = tailGeo.attributes.position;
    const frames = tailCurve.computeFrenetFrames(segs, false);
    const colors = new Float32Array(p.count * 3);

    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const center = tailCurve.getPointAt(u);
      const radius = Math.sin(Math.pow(u, 0.68) * Math.PI) * 0.23 + (1 - u) * 0.06;
      const tipPinch = u > 0.88 ? 1 - (u - 0.88) / 0.12 : 1.0;
      const finalR = Math.max(0.004, radius * (0.25 + 0.75 * tipPinch));

      const c = sampleRamp(
        [
          [0.0, palette.obsidian],
          [0.18, palette.espresso],
          [0.36, palette.copper],
          [0.6, palette.orange],
          [0.78, palette.brightOr],
          [0.89, palette.peach],
          [1.0, palette.cream],
        ],
        u
      );

      for (let j = 0; j <= radSegs; j++) {
        const idx = i * (radSegs + 1) + j;
        const angle = (j / radSegs) * Math.PI * 2;
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        const N = frames.normals[i];
        const B = frames.binormals[i];
        const fluff = 1.0 + 0.04 * Math.sin(angle * 4 + u * 8) * Math.sin(u * Math.PI);
        const vx = center.x + finalR * fluff * (cos * N.x + sin * B.x);
        let vy = center.y + finalR * fluff * (cos * N.y + sin * B.y);
        const vz = center.z + finalR * fluff * (cos * N.z + sin * B.z);
        if (vy < -0.14) vy = -0.14 + (vy + 0.14) * 0.12;
        p.setXYZ(idx, vx, vy, vz);
        colors[idx * 3] = c.r;
        colors[idx * 3 + 1] = c.g;
        colors[idx * 3 + 2] = c.b;
      }
    }
    tailGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    tailGeo.computeVertexNormals();
  }
  tailPivot.add(new THREE.Mesh(tailGeo, furMat));
  root.add(tailPivot);

  // ---- D. Articulated Neck & Sculpted Head Pivot ----
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 0.94, 0.03);
  root.add(neckPivot);

  const neckCollarGeo = new THREE.SphereGeometry(0.195, 28, 22);
  geometries.push(neckCollarGeo);
  neckCollarGeo.scale(1.0, 0.92, 1.0);
  paintGeometry(neckCollarGeo, (_x, y, z) => {
    const c = palette.deepOrg.clone().lerp(palette.orange, 0.65);
    if (z > 0.04 && y < 0.05) {
      c.lerp(palette.peach, THREE.MathUtils.clamp((z - 0.04) * 2.8, 0, 0.65));
    }
    return c;
  });
  const neckCollar = new THREE.Mesh(neckCollarGeo, furMat);
  neckCollar.position.set(0, 0.02, -0.01);
  neckPivot.add(neckCollar);

  const headGeo = new THREE.SphereGeometry(0.34, 60, 44);
  geometries.push(headGeo);
  {
    const p = headGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i) * 1.08;
      let y = p.getY(i) * 0.93;
      let z = p.getZ(i);

      const cheekBand = Math.exp(-Math.pow((y + 0.095) / 0.105, 2));
      const sideStrength = Math.pow(Math.abs(x) / 0.36, 1.45);
      const cheekFlare = cheekBand * sideStrength * 0.145;
      x += Math.sign(x) * cheekFlare;
      x *= 1.0 + 0.055 * Math.sin(y * 30.0) * cheekBand * sideStrength;

      if (z > 0.04) {
        const snoutCenterY = -0.075;
        const snoutDist = Math.sqrt(x * x * 1.9 + Math.pow(y - snoutCenterY, 2) * 2.4);
        const snoutPull = Math.exp(-snoutDist * snoutDist * 16.0) * 0.21;
        z += snoutPull;
        y -= snoutPull * 0.1;
      }

      p.setXYZ(i, x, y, z);
    }
    headGeo.computeVertexNormals();
  }
  paintGeometry(headGeo, (x, y, z) => {
    const base = sampleRamp(
      [
        [0.0, palette.copper],
        [0.28, palette.deepOrg],
        [0.64, palette.orange],
        [1.0, palette.brightOr],
      ],
      (y + 0.32) / 0.64
    );

    const dividerY = -0.04 + Math.abs(x) * 0.1 - Math.max(0, z - 0.16) * 0.18;
    const cheekMask = THREE.MathUtils.smoothstep(dividerY - y, -0.04, 0.05);
    const frontBias = THREE.MathUtils.smoothstep(z, -0.18, 0.08);
    const creamColor = palette.peach.clone().lerp(palette.cream, 0.62);
    base.lerp(creamColor, cheekMask * frontBias);

    const underChin = THREE.MathUtils.smoothstep(-0.19 - y, 0.0, 0.12);
    base.lerp(palette.copper, underChin * 0.28);
    return base;
  });

  const headMesh = new THREE.Mesh(headGeo, furMat);
  headMesh.position.set(0, 0.24, 0.03);
  neckPivot.add(headMesh);

  neckPivot.updateMatrixWorld(true);
  const faceRay = new THREE.Raycaster();
  const snapToHeadSurface = (x: number, y: number, fallbackZ: number) => {
    faceRay.set(new THREE.Vector3(x, y, 2.0), new THREE.Vector3(0, 0, -1));
    const hits = faceRay.intersectObject(headMesh, false);
    if (hits.length > 0) {
      return neckPivot.worldToLocal(hits[0].point.clone());
    }
    return new THREE.Vector3(x, y, fallbackZ);
  };

  const noseHit = snapToHeadSurface(0, 0.165, 0.52);
  const noseGeo = new THREE.SphereGeometry(0.052, 24, 18);
  geometries.push(noseGeo);
  noseGeo.scale(1.18, 0.85, 0.92);
  const noseMesh = new THREE.Mesh(noseGeo, noseMat);
  noseMesh.position.set(0, noseHit.y + 0.005, noseHit.z + 0.008);
  neckPivot.add(noseMesh);

  // ---- E. Fox Ears ----
  let leftEar: THREE.Group | null = null;
  let rightEar: THREE.Group | null = null;

  ([-1, 1] as const).forEach((side) => {
    const earGroup = new THREE.Group();
    earGroup.position.set(side * 0.185, 0.43, 0.01);
    earGroup.rotation.z = side * -0.22;
    earGroup.rotation.x = 0.06;
    earGroup.rotation.y = side * 0.14;

    const earPts = [
      new THREE.Vector2(0.001, 0.0),
      new THREE.Vector2(0.142, 0.01),
      new THREE.Vector2(0.135, 0.08),
      new THREE.Vector2(0.112, 0.17),
      new THREE.Vector2(0.075, 0.25),
      new THREE.Vector2(0.036, 0.31),
      new THREE.Vector2(0.012, 0.34),
      new THREE.Vector2(0.001, 0.35),
    ];
    const earGeo = new THREE.LatheGeometry(earPts, 28);
    geometries.push(earGeo);
    earGeo.scale(0.95, 1.0, 0.56);
    paintGeometry(earGeo, (x, y, z) => {
      const col = sampleRamp(
        [
          [0.0, palette.orange],
          [0.55, palette.deepOrg],
          [0.85, palette.copper],
          [1.0, palette.espresso],
        ],
        y / 0.35
      );
      if (z > 0.012 && Math.abs(x) < 0.078 && y > 0.04 && y < 0.26) {
        const inner = THREE.MathUtils.smoothstep(0.078 - Math.abs(x), 0.0, 0.045);
        col.lerp(palette.obsidian, inner * 0.72);
      }
      return col;
    });
    earGroup.add(new THREE.Mesh(earGeo, furMat));
    neckPivot.add(earGroup);

    if (side < 0) leftEar = earGroup;
    else rightEar = earGroup;
  });

  // ---- F. Pure Black Sphere Eyes ----
  let leftEyePivot: THREE.Group | null = null;
  let rightEyePivot: THREE.Group | null = null;

  ([-1, 1] as const).forEach((side) => {
    const eyeHit = snapToHeadSurface(side * 0.145, 0.295, 0.36);
    const eyePivot = new THREE.Group();
    eyePivot.position.set(eyeHit.x, eyeHit.y, eyeHit.z - 0.014);

    const eyeBallGeo = new THREE.SphereGeometry(0.06, 28, 22);
    geometries.push(eyeBallGeo);
    const eyeBall = new THREE.Mesh(eyeBallGeo, eyeMat);
    eyeBall.scale.set(0.94, 1.08, 0.86);
    eyePivot.add(eyeBall);

    neckPivot.add(eyePivot);
    if (side < 0) leftEyePivot = eyePivot;
    else rightEyePivot = eyePivot;
  });

  root.position.set(0.1, -0.8, 0);

  return {
    root,
    neckPivot,
    leftEyePivot,
    rightEyePivot,
    leftEar,
    rightEar,
  };
}

/**
 * Lightweight procedural FlowGen 3D fox mascot:
 * - Matte-velvet fur + pure black sphere eyes + warm orange/copper/obsidian palette.
 * - Body, legs, paws, and tail stay 100% still; only neck and eyes track cursor subtly (~20° total arc).
 * - Pauses RAF when scrolled offscreen or tab hidden, caps pixel ratio <= 1.5, and disposes cleanly.
 */
export function FlowGenFox3D() {
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
    let inView = false;
    let tabVisible = !document.hidden;
    let rendererRef: THREE.WebGPURenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let io: IntersectionObserver | null = null;
    let cleanupScene: (() => void) | null = null;

    const onContextLost = (e: Event) => {
      e.preventDefault();
      if (!disposed) setFailed(true);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);

    (async () => {
      try {
        await waitForHeroReady(2500);
        if (disposed) return;

        const profile = await detectGraphicsProfile();
        if (disposed) return;
        if (profile.backend === "none") {
          setBackend("none");
          setFailed(true);
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
          return;
        }

        const { renderer, backend: activeBackend } = initResult;
        rendererRef = renderer;
        setBackend(activeBackend);

        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.02;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
        camera.position.set(
          Math.sin(CAM_YAW) * Math.cos(CAM_PITCH) * CAM_DISTANCE,
          LOOK_Y + Math.sin(CAM_PITCH) * CAM_DISTANCE + 0.12,
          Math.cos(CAM_YAW) * Math.cos(CAM_PITCH) * CAM_DISTANCE
        );
        camera.lookAt(0, LOOK_Y, 0);

        // 3-point soft diffused lighting calibrated to Three.js r170 physical light units
        const hemi = new THREE.HemisphereLight(0xfff0e4, 0x241915, 0.95);
        const keyLight = new THREE.DirectionalLight(0xfff0e2, 2.7);
        keyLight.position.set(2.8, 3.8, 3.6);
        const rimLight = new THREE.DirectionalLight(0xe8682b, 2.35);
        rimLight.position.set(-3.2, 1.6, -2.4);
        const fillLight = new THREE.DirectionalLight(0xe5ddd6, 1.15);
        fillLight.position.set(3.2, 0.6, -1.2);
        scene.add(hemi, keyLight, rimLight, fillLight);

        const geometries: THREE.BufferGeometry[] = [];
        const materials: THREE.Material[] = [];
        const textures: THREE.Texture[] = [];

        // Soft contact shadow disc (no real-time shadowMap rendering)
        const floorGeo = new THREE.PlaneGeometry(2.6, 2.6);
        const floorMat = createContactShadowMaterial();
        geometries.push(floorGeo);
        materials.push(floorMat);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.805;
        scene.add(floor);

        const rig = buildProceduralFlowGenFox(geometries, materials, textures);
        scene.add(rig.root);

        const reducedMotion =
          window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

        let pointerX = 0;
        let pointerY = 0;
        let pointerActive = false;
        let smoothNeckX = 0;
        let smoothNeckY = 0;
        let smoothEyeX = 0;
        let smoothEyeY = 0;
        let lastNow = performance.now();

        const syncSize = () => {
          const w = Math.max(wrap.clientWidth, 1);
          const h = Math.max(wrap.clientHeight, 1);
          const dpr = Math.min(window.devicePixelRatio || 1, profile.maxDpr, 1.5);
          renderer.setPixelRatio(dpr);
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };
        syncSize();

        const renderFrame = () => {
          try {
            renderer.render(scene, camera);
            return true;
          } catch {
            if (!disposed) setFailed(true);
            return false;
          }
        };

        resizeObserver = new ResizeObserver(() => {
          syncSize();
          if (reducedMotion || !raf) {
            renderFrame();
          }
        });
        resizeObserver.observe(wrap);

        const tick = (now: number) => {
          raf = 0;
          if (disposed || !inView || !tabVisible || reducedMotion) return;

          const dt = Math.max(0, Math.min((now - lastNow) / 1000, 0.05));
          lastNow = Math.max(lastNow, now);

          const targetX = pointerActive ? pointerX : 0;
          const targetY = pointerActive ? pointerY : 0;

          const neckAlpha = 1 - Math.exp(-5.8 * dt);
          const eyeAlpha = 1 - Math.exp(-11.0 * dt);

          smoothNeckX += (targetX - smoothNeckX) * neckAlpha;
          smoothNeckY += (targetY - smoothNeckY) * neckAlpha;
          smoothEyeX += (targetX - smoothEyeX) * eyeAlpha;
          smoothEyeY += (targetY - smoothEyeY) * eyeAlpha;

          // Body, legs, paws, and tail stay 100% still
          rig.root.rotation.set(0, 0, 0);
          rig.root.scale.set(1, 1, 1);

          // Only neck, eyes, and subtle ear micro-tilt track cursor
          rig.neckPivot.rotation.y = smoothNeckX * SUBTLE_TRACKING.neckYaw;
          rig.neckPivot.rotation.x = smoothNeckY * SUBTLE_TRACKING.neckPitch;
          rig.neckPivot.rotation.z = -smoothNeckX * SUBTLE_TRACKING.headRoll;

          const eyeY = smoothEyeX * SUBTLE_TRACKING.eyeYaw;
          const eyeX = smoothEyeY * SUBTLE_TRACKING.eyePitch;
          if (rig.leftEyePivot) {
            rig.leftEyePivot.rotation.y = eyeY;
            rig.leftEyePivot.rotation.x = eyeX;
          }
          if (rig.rightEyePivot) {
            rig.rightEyePivot.rotation.y = eyeY;
            rig.rightEyePivot.rotation.x = eyeX;
          }

          if (rig.leftEar) {
            rig.leftEar.rotation.z = 0.22 - smoothNeckX * SUBTLE_TRACKING.earTilt;
          }
          if (rig.rightEar) {
            rig.rightEar.rotation.z = -0.22 - smoothNeckX * SUBTLE_TRACKING.earTilt;
          }

          if (!renderFrame()) return;
          raf = requestAnimationFrame(tick);
        };

        const startLoop = () => {
          if (disposed || raf || !inView || !tabVisible || reducedMotion) return;
          lastNow = performance.now();
          raf = requestAnimationFrame(tick);
        };

        const stopLoop = () => {
          if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
        };

        const onMouseMove = (e: MouseEvent) => {
          if (reducedMotion) return;
          const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
          const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
          pointerX = Math.max(-1, Math.min(1, nx));
          pointerY = Math.max(-1, Math.min(1, ny));
          pointerActive = true;
        };

        const onPointerLeave = () => {
          pointerActive = false;
        };

        const onVis = () => {
          tabVisible = !document.hidden;
          if (tabVisible) startLoop();
          else stopLoop();
        };

        if (!reducedMotion) {
          window.addEventListener("mousemove", onMouseMove, { passive: true });
          document.documentElement.addEventListener("mouseleave", onPointerLeave);
          window.addEventListener("blur", onPointerLeave);
        }
        document.addEventListener("visibilitychange", onVis);

        cleanupScene = () => {
          stopLoop();
          window.removeEventListener("mousemove", onMouseMove);
          document.documentElement.removeEventListener("mouseleave", onPointerLeave);
          window.removeEventListener("blur", onPointerLeave);
          document.removeEventListener("visibilitychange", onVis);
          scene.remove(rig.root);
          scene.remove(floor);
          for (const g of geometries) g.dispose();
          for (const m of materials) m.dispose();
          for (const t of textures) t.dispose();
        };

        // Paint initial neutral frame immediately
        if (!renderFrame()) return;

        if (typeof IntersectionObserver !== "undefined") {
          io = new IntersectionObserver(
            ([entry]) => {
              inView = entry.isIntersecting;
              if (inView) startLoop();
              else stopLoop();
            },
            { threshold: 0.01, rootMargin: "160px 0px" }
          );
          io.observe(wrap);
        } else {
          inView = true;
          startLoop();
        }
      } catch {
        if (!disposed) setFailed(true);
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

  if (failed || backend === "none") {
    return null;
  }

  return (
    <div
      ref={wrapRef}
      data-backend={backend ?? "initializing"}
      aria-label="Interactive 3D FlowGen Fox mascot"
      className="pointer-events-none relative mx-auto h-[280px] w-full max-w-[360px] select-none sm:h-[330px] sm:max-w-[420px] lg:h-[370px] lg:max-w-[460px]"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
