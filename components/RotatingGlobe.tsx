"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Continent polygons in [lng, lat] degrees
const CONTINENTS: number[][][] = [
  // North America
  [[-168, 65], [-162, 70], [-150, 71], [-130, 70], [-115, 69], [-95, 68], [-80, 66], [-75, 62], [-64, 58], [-55, 52], [-60, 46], [-66, 44], [-70, 42], [-76, 35], [-81, 25], [-88, 30], [-97, 26], [-97, 20], [-105, 20], [-110, 23], [-115, 30], [-124, 40], [-124, 48], [-130, 54], [-140, 59], [-152, 60], [-160, 58], [-168, 65]],
  // Mexico & Central America
  [[-115, 30], [-110, 23], [-105, 20], [-97, 20], [-97, 26], [-90, 21], [-88, 16], [-83, 15], [-77, 8], [-82, 8], [-86, 11], [-92, 14], [-98, 16], [-105, 19], [-115, 30]],
  // Greenland
  [[-73, 78], [-60, 83], [-30, 83], [-18, 76], [-22, 70], [-40, 60], [-52, 60], [-73, 78]],
  // South America
  [[-77, 8], [-72, 11], [-62, 10], [-50, 2], [-44, -3], [-35, -5], [-35, -10], [-40, -20], [-48, -28], [-53, -33], [-62, -39], [-65, -54], [-75, -52], [-73, -42], [-71, -30], [-76, -15], [-81, -5], [-77, 8]],
  // Europe
  [[-9, 36], [-9, 43], [-1, 43], [3, 43], [4, 48], [9, 54], [10, 58], [5, 62], [10, 64], [18, 59], [25, 65], [30, 71], [40, 68], [45, 55], [40, 45], [30, 46], [28, 41], [22, 40], [15, 38], [0, 38], [-9, 36]],
  // UK & Ireland
  [[-10, 51], [-10, 55], [-6, 58], [2, 58], [1, 50], [-5, 50], [-10, 51]],
  // Scandinavia
  [[5, 58], [5, 62], [10, 64], [16, 68], [25, 71], [30, 70], [30, 60], [22, 60], [14, 56], [5, 58]],
  // Africa
  [[-17, 15], [-17, 28], [-6, 36], [11, 37], [25, 31], [34, 27], [33, 12], [43, 12], [51, 11], [46, -5], [40, -15], [35, -25], [20, -35], [17, -34], [12, -15], [9, 5], [-7, 4], [-17, 15]],
  // Madagascar
  [[43, -12], [50, -15], [47, -25], [43, -25], [43, -12]],
  // Arabia
  [[35, 30], [45, 30], [55, 25], [59, 22], [55, 16], [43, 12], [35, 30]],
  // Asia
  [[40, 45], [45, 55], [60, 70], [90, 73], [130, 72], [170, 68], [170, 60], [140, 50], [130, 43], [122, 40], [120, 30], [118, 25], [109, 13], [98, 10], [88, 21], [77, 8], [72, 20], [68, 24], [60, 25], [50, 30], [40, 40]],
  // India
  [[68, 24], [72, 20], [77, 8], [80, 13], [88, 21], [68, 24]],
  // Japan
  [[129, 31], [135, 34], [140, 36], [145, 45], [140, 45], [130, 33], [129, 31]],
  // Indochina & SE Asia
  [[95, 20], [108, 12], [108, -7], [115, -8], [125, -8], [140, -8], [140, 3], [120, 15], [100, 5], [95, 20]],
  // Australia
  [[113, -22], [120, -15], [130, -12], [142, -11], [153, -28], [150, -37], [138, -35], [115, -34], [113, -22]],
  // New Zealand
  [[166, -46], [174, -41], [178, -35], [175, -45], [166, -46]],
];

function subdividePoly(poly: number[][], maxStep = 2.0): number[][] {
  const res: number[][] = [];
  for (let i = 0; i < poly.length; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % poly.length];
    res.push(p1);
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dist = Math.hypot(dx, dy);
    if (dist > maxStep) {
      const steps = Math.ceil(dist / maxStep);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        res.push([p1[0] + dx * t, p1[1] + dy * t]);
      }
    }
  }
  return res;
}

const SUBDIVIDED_LAND = CONTINENTS.map((p) => subdividePoly(p, 1.8));
const AXIAL_TILT = 0.38;

interface Destination { lat: number; lng: number; phase: number; }
const DESTINATIONS: Destination[] = [
  { lat: 19.076, lng: 72.8777, phase: 0 },
  { lat: 15.2993, lng: 74.124, phase: 1.2 },
  { lat: 25.2048, lng: 55.2708, phase: 2.4 },
  { lat: 51.5074, lng: -0.1278, phase: 0.8 },
  { lat: 48.8566, lng: 2.3522, phase: 3.1 },
  { lat: 35.6762, lng: 139.6503, phase: 1.9 },
  { lat: 40.7128, lng: -74.006, phase: 4.2 },
  { lat: 1.3521, lng: 103.8198, phase: 0.5 },
  { lat: -33.8688, lng: 151.2093, phase: 2.8 },
  { lat: 37.7749, lng: -122.4194, phase: 3.6 },
  { lat: -22.9068, lng: -43.1729, phase: 1.5 },
  { lat: -33.9249, lng: 18.4241, phase: 4.8 },
];

interface RouteArc {
  startLat: number; startLng: number;
  endLat: number; endLng: number;
  speed: number; offset: number; maxHeight: number;
  hasPlane?: boolean;
}
const ROUTES: RouteArc[] = [
  { startLat: 19.076, startLng: 72.8777, endLat: 51.5074, endLng: -0.1278, speed: 0.08, offset: 0.1, maxHeight: 0.18, hasPlane: true },
  { startLat: 25.2048, startLng: 55.2708, endLat: 35.6762, endLng: 139.6503, speed: 0.07, offset: 0.45, maxHeight: 0.22 },
  { startLat: 51.5074, startLng: -0.1278, endLat: 40.7128, endLng: -74.006, speed: 0.09, offset: 0.7, maxHeight: 0.20, hasPlane: true },
  { startLat: 19.076, startLng: 72.8777, endLat: 25.2048, endLng: 55.2708, speed: 0.10, offset: 0.2, maxHeight: 0.14 },
  { startLat: 1.3521, startLng: 103.8198, endLat: 51.5074, endLng: -0.1278, speed: 0.06, offset: 0.35, maxHeight: 0.25 },
  { startLat: -33.8688, startLng: 151.2093, endLat: 35.6762, endLng: 139.6503, speed: 0.075, offset: 0.6, maxHeight: 0.19 },
  { startLat: 48.8566, startLng: 2.3522, endLat: 40.7128, endLng: -74.006, speed: 0.08, offset: 0.85, maxHeight: 0.21 },
  { startLat: 19.076, startLng: 72.8777, endLat: -33.8688, endLng: 151.2093, speed: 0.065, offset: 0.05, maxHeight: 0.26 },
  { startLat: 37.7749, startLng: -122.4194, endLat: 35.6762, endLng: 139.6503, speed: 0.07, offset: 0.4, maxHeight: 0.24, hasPlane: true },
  { startLat: -22.9068, startLng: -43.1729, endLat: 48.8566, endLng: 2.3522, speed: 0.085, offset: 0.15, maxHeight: 0.22 },
  { startLat: -33.9249, startLng: 18.4241, endLat: 25.2048, endLng: 55.2708, speed: 0.07, offset: 0.5, maxHeight: 0.23 },
  { startLat: 15.2993, startLng: 74.124, endLat: 1.3521, endLng: 103.8198, speed: 0.09, offset: 0.65, maxHeight: 0.15 },
];

function latLngToVec3(lat: number, lng: number): [number, number, number] {
  const phi = (lat * Math.PI) / 180;
  const theta = (lng * Math.PI) / 180;
  return [Math.cos(phi) * Math.sin(theta), -Math.sin(phi), Math.cos(phi) * Math.cos(theta)];
}

function slerpVec3(v1: [number, number, number], v2: [number, number, number], t: number): [number, number, number] {
  const dot = Math.max(-1, Math.min(1, v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]));
  const omega = Math.acos(dot);
  if (Math.abs(omega) < 1e-4) return [v1[0], v1[1], v1[2]];
  const sinOmega = Math.sin(omega);
  const s1 = Math.sin((1 - t) * omega) / sinOmega;
  const s2 = Math.sin(t * omega) / sinOmega;
  return [s1 * v1[0] + s2 * v2[0], s1 * v1[1] + s2 * v2[1], s1 * v1[2] + s2 * v2[2]];
}

export function RotatingGlobe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const phiRef = useRef(0.8);
  const thetaRef = useRef(0);
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // canvas logical size — updated by ResizeObserver
  const sizeRef = useRef({ w: 440, h: 440 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // ResizeObserver keeps canvas pixel-perfect at all sizes
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          sizeRef.current = { w: width, h: height };
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = width * dpr;
          canvas.height = height * dpr;
        }
      }
    });
    ro.observe(container);

    let animFrameId: number;
    let time = 0;
    const AUTO_SPEED = 0.0065; // Smooth continuous revolving speed

    const render = () => {
      time += 0.016;
      const { w, h } = sizeRef.current;

      if (w === 0 || h === 0) {
        animFrameId = requestAnimationFrame(render);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      // Ensure canvas buffer matches (belt-and-suspenders)
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.44;

      // ── ALWAYS rotate continuously
      const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      phiRef.current += isReducedMotion ? 0 : AUTO_SPEED;

      if (!isDraggingRef.current) {
        velocityRef.current.x *= 0.93;
        velocityRef.current.y *= 0.93;
        thetaRef.current *= 0.95;
        phiRef.current += velocityRef.current.x;
      }

      const curPhi = phiRef.current;
      const curAxialTilt = AXIAL_TILT + thetaRef.current;
      const cosT = Math.cos(curAxialTilt);
      const sinT = Math.sin(curAxialTilt);

      const project = (x0: number, y0: number, z0: number, sf = 1.0) => {
        const r = radius * sf;
        return { px: cx + (x0 * cosT - y0 * sinT) * r, py: cy + (x0 * sinT + y0 * cosT) * r, z3d: z0 };
      };

      const projectLL = (lat: number, lng: number, sf = 1.0) => {
        const latR = (lat * Math.PI) / 180;
        const lngR = (lng * Math.PI) / 180 + curPhi;
        const x0 = Math.cos(latR) * Math.sin(lngR);
        const y0 = -Math.sin(latR);
        const z0 = Math.cos(latR) * Math.cos(lngR);
        return project(x0, y0, z0, sf);
      };

      // 1. Earth base sphere (clean edge, no blurry outer halo)
      const oceanGrad = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.38, radius * 0.05, cx + radius * 0.2, cy + radius * 0.2, radius * 1.05);
      oceanGrad.addColorStop(0, "#637D25");
      oceanGrad.addColorStop(0.35, "#4F6817");
      oceanGrad.addColorStop(0.7, "#364A0E");
      oceanGrad.addColorStop(1, "#233207");
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = oceanGrad;
      ctx.fill();
      ctx.strokeStyle = "rgba(72,92,17,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // 3. Clip sphere interior
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();

      // 4. Dotted lat/lng grid
      ctx.strokeStyle = "rgba(248,250,245,0.12)"; ctx.lineWidth = 0.6;
      ctx.setLineDash([3, 4]);
      for (let lat = -60; lat <= 60; lat += 20) {
        ctx.beginPath(); let started = false;
        for (let lng = -180; lng <= 180; lng += 4) {
          const { px, py, z3d } = projectLL(lat, lng);
          if (z3d > 0) { if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py); }
          else { started = false; }
        }
        ctx.stroke();
      }
      for (let lng = -180; lng < 180; lng += 20) {
        ctx.beginPath(); let started = false;
        for (let lat = -84; lat <= 84; lat += 4) {
          const { px, py, z3d } = projectLL(lat, lng);
          if (z3d > 0) { if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py); }
          else { started = false; }
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 5. Continents
      SUBDIVIDED_LAND.forEach((poly) => {
        const proj = poly.map(([lng, lat]) => projectLL(lat, lng));
        const vis = proj.filter((p) => p.z3d > -0.05);
        if (vis.length > 2) {
          ctx.beginPath(); let started = false;
          proj.forEach((p) => {
            if (p.z3d > -0.08) { if (!started) { ctx.moveTo(p.px, p.py); started = true; } else ctx.lineTo(p.px, p.py); }
          });
          if (started) {
            ctx.closePath();
            const avgZ = vis.reduce((s, p) => s + p.z3d, 0) / vis.length;
            const br = Math.max(0.45, 0.65 + avgZ * 0.35);
            ctx.fillStyle = `rgba(${Math.round(126 * br)},${Math.round(147 * br)},${Math.round(77 * br)},0.94)`;
            ctx.fill();
            ctx.strokeStyle = "rgba(168,184,138,0.4)"; ctx.lineWidth = 0.7; ctx.stroke();
          }
        }
      });

      // 6. Specular highlight + rim shadow
      const spec = ctx.createRadialGradient(cx - radius * 0.38, cy - radius * 0.42, 0, cx - radius * 0.38, cy - radius * 0.42, radius * 0.8);
      spec.addColorStop(0, "rgba(255,255,255,0.24)"); spec.addColorStop(0.5, "rgba(255,255,255,0.05)"); spec.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = spec; ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      const rim = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius);
      rim.addColorStop(0, "rgba(0,0,0,0)"); rim.addColorStop(0.7, "rgba(35,50,7,0.18)"); rim.addColorStop(1, "rgba(20,32,4,0.5)");
      ctx.fillStyle = rim; ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

      ctx.restore(); // unclip

      // 7. Route arcs + airplanes
      ROUTES.forEach((route) => {
        const vS = latLngToVec3(route.startLat, route.startLng);
        const vE = latLngToVec3(route.endLat, route.endLng);
        const steps = 45;
        const arc: { px: number; py: number; z3d: number }[] = [];
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const v = slerpVec3(vS, vE, t);
          const ht = 1.0 + Math.sin(Math.PI * t) * route.maxHeight;
          const rx = v[0] * Math.cos(curPhi) + v[2] * Math.sin(curPhi);
          const ry = v[1];
          const rz = -v[0] * Math.sin(curPhi) + v[2] * Math.cos(curPhi);
          arc.push(project(rx, ry, rz, ht));
        }
        ctx.beginPath(); let st = false;
        arc.forEach((pt) => {
          if (pt.z3d > -0.05) { if (!st) { ctx.moveTo(pt.px, pt.py); st = true; } else ctx.lineTo(pt.px, pt.py); }
          else { st = false; }
        });
        if (st) {
          ctx.strokeStyle = "rgba(188,204,158,0.70)"; ctx.lineWidth = 1.3;
          ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
        }
        if (route.hasPlane) {
          const planeT = (time * route.speed + route.offset) % 1.0;
          const pIdx = Math.floor(planeT * steps);
          const pt1 = arc[pIdx];
          const pt2 = arc[Math.min(steps, pIdx + 1)] || pt1;
          const frac = (planeT * steps) - pIdx;
          if (pt1 && pt1.z3d > 0.02) {
            const px = pt1.px + (pt2.px - pt1.px) * frac;
            const py = pt1.py + (pt2.py - pt1.py) * frac;
            const jg = ctx.createRadialGradient(px, py, 0, px, py, 9);
            jg.addColorStop(0, "rgba(255,255,255,0.95)"); jg.addColorStop(0.4, "rgba(168,184,138,0.6)"); jg.addColorStop(1, "rgba(168,184,138,0)");
            ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fillStyle = jg; ctx.fill();
            const angle = Math.atan2(pt2.py - pt1.py, pt2.px - pt1.px);
            ctx.save(); ctx.translate(px, py); ctx.rotate(angle);
            ctx.fillStyle = "#F8FAF5"; ctx.beginPath();
            ctx.moveTo(6, 0); ctx.lineTo(1, -2); ctx.lineTo(-2, -6); ctx.lineTo(-1, -2); ctx.lineTo(-5, -2);
            ctx.lineTo(-7, -4); ctx.lineTo(-6, 0); ctx.lineTo(-7, 4); ctx.lineTo(-5, 2);
            ctx.lineTo(-1, 2); ctx.lineTo(-2, 6); ctx.lineTo(1, 2); ctx.closePath(); ctx.fill();
            ctx.restore();
          }
        }
      });

      // 8. Destination dots (no labels)
      DESTINATIONS.forEach((dst) => {
        const { px, py, z3d } = projectLL(dst.lat, dst.lng);
        if (z3d > 0.12) {
          const alpha = Math.min(1, (z3d - 0.12) / 0.3);
          const pulse = (Math.sin(time * 2.5 + dst.phase) + 1) / 2;
          const ringR = 3.5 + pulse * 6.5;
          ctx.beginPath(); ctx.arc(px, py, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(168,184,138,${(1 - pulse) * 0.65 * alpha})`; ctx.lineWidth = 1.0; ctx.stroke();
          const halo = ctx.createRadialGradient(px, py, 0, px, py, 6);
          halo.addColorStop(0, `rgba(248,250,245,${0.9 * alpha})`); halo.addColorStop(0.5, `rgba(168,184,138,${0.4 * alpha})`); halo.addColorStop(1, "rgba(168,184,138,0)");
          ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.fillStyle = halo; ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fill();
        }
      });

      ctx.restore();
      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animFrameId);
      ro.disconnect();
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = { x: 0, y: 0 };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    const sx = dx * 0.005;
    const sy = dy * 0.003;
    phiRef.current += sx;
    thetaRef.current = Math.max(-0.4, Math.min(0.4, thetaRef.current + sy));
    velocityRef.current = { x: sx * 0.4, y: sy * 0.4 };
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative mx-auto flex items-center justify-center select-none touch-none",
        "w-[280px] h-[280px] sm:w-[380px] sm:h-[380px] md:w-[480px] md:h-[480px]",
        className
      )}
    >

      <canvas
        ref={canvasRef}
        className="size-full cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
