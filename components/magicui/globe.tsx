"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring } from "motion/react";
import { cn } from "@/lib/utils";

const MOVEMENT_DAMPING = 1400;

// City markers with pulsing dots
const MARKERS = [
  { location: [14.5995, 120.9842], size: 0.03 },
  { location: [19.076, 72.8777], size: 0.1 },
  { location: [23.8103, 90.4125], size: 0.05 },
  { location: [30.0444, 31.2357], size: 0.07 },
  { location: [39.9042, 116.4074], size: 0.08 },
  { location: [-23.5505, -46.6333], size: 0.1 },
  { location: [19.4326, -99.1332], size: 0.1 },
  { location: [40.7128, -74.006], size: 0.1 },
  { location: [34.6937, 135.5022], size: 0.05 },
  { location: [41.0082, 28.9784], size: 0.06 },
  { location: [48.8566, 2.3522], size: 0.08 },
  { location: [51.5074, -0.1278], size: 0.08 },
  { location: [-33.8688, 151.2093], size: 0.07 },
  { location: [35.6762, 139.6503], size: 0.09 },
];

// Continent polygons [lng, lat]
const DETAILED_CONTINENTS: number[][][] = [
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

// Subdivide polygon edges for smooth sphere curvature
function subdividePolygon(points: number[][], maxStep = 2.5): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    result.push(p1);
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dist = Math.hypot(dx, dy);
    if (dist > maxStep) {
      const steps = Math.ceil(dist / maxStep);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        result.push([p1[0] + dx * t, p1[1] + dy * t]);
      }
    }
  }
  return result;
}

const SUBDIVIDED_LANDMASSES = DETAILED_CONTINENTS.map((poly) => subdividePolygon(poly, 1.8));
const AXIAL_TILT = 0.35;

export function Globe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);
  const rafRef = useRef<number>(0);

  const r = useMotionValue(0);
  const rs = useSpring(r, {
    mass: 1,
    damping: 30,
    stiffness: 100,
  });

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab";
    }
  };

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
      r.set(r.get() + delta / MOVEMENT_DAMPING);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let pulseAngle = 0;

    const draw = () => {
      if (!canvas) return;
      const displayWidth = canvas.offsetWidth;
      const displayHeight = canvas.offsetHeight;

      if (displayWidth === 0 || displayHeight === 0) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, displayWidth, displayHeight);

      const cx = displayWidth / 2;
      const cy = displayHeight / 2;
      const radius = Math.min(displayWidth, displayHeight) * 0.42;

      // === ATMOSPHERIC GLOW ===
      const atmo = ctx.createRadialGradient(cx, cy, radius * 0.92, cx, cy, radius * 1.35);
      atmo.addColorStop(0, "rgba(100, 180, 255, 0.15)");
      atmo.addColorStop(0.4, "rgba(80, 160, 240, 0.08)");
      atmo.addColorStop(0.7, "rgba(60, 140, 220, 0.03)");
      atmo.addColorStop(1, "rgba(60, 140, 220, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
      ctx.fillStyle = atmo;
      ctx.fill();

      // === OCEAN BASE - Deep Blue Sphere ===
      const oceanGrad = ctx.createRadialGradient(
        cx - radius * 0.3, cy - radius * 0.3, radius * 0.05,
        cx + radius * 0.1, cy + radius * 0.1, radius
      );
      oceanGrad.addColorStop(0, "#4FA8D6");
      oceanGrad.addColorStop(0.3, "#3B8FC4");
      oceanGrad.addColorStop(0.6, "#2D7AB5");
      oceanGrad.addColorStop(0.85, "#1E5F8E");
      oceanGrad.addColorStop(1, "#14405E");

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = oceanGrad;
      ctx.shadowColor = "rgba(15, 50, 80, 0.4)";
      ctx.shadowBlur = 50;
      ctx.shadowOffsetY = 15;
      ctx.fill();
      ctx.restore();

      // Clip to sphere
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // === SUBTLE OCEAN TEXTURE (grid lines) ===
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 0.5;
      const cosTheta = Math.cos(AXIAL_TILT);
      const sinTheta = Math.sin(AXIAL_TILT);

      if (!pointerInteracting.current) {
        phiRef.current += 0.004;
      }
      const currentPhi = phiRef.current + rs.get();

      // 3D projection function
      const project = (lat: number, lng: number) => {
        const latR = (lat * Math.PI) / 180;
        const lngR = (lng * Math.PI) / 180 + currentPhi;
        const x0 = Math.cos(latR) * Math.sin(lngR);
        const y0 = -Math.sin(latR);
        const z0 = Math.cos(latR) * Math.cos(lngR);
        const x3d = x0 * cosTheta - y0 * sinTheta;
        const y3d = x0 * sinTheta + y0 * cosTheta;
        const z3d = z0;
        return { px: cx + x3d * radius, py: cy + y3d * radius, z3d };
      };

      // Draw latitude lines
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lng = -180; lng <= 180; lng += 3) {
          const { px, py, z3d } = project(lat, lng);
          if (z3d > 0) {
            if (!started) { ctx.moveTo(px, py); started = true; }
            else ctx.lineTo(px, py);
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // Draw longitude lines
      for (let lng = -180; lng < 180; lng += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -90; lat <= 90; lat += 3) {
          const { px, py, z3d } = project(lat, lng);
          if (z3d > 0) {
            if (!started) { ctx.moveTo(px, py); started = true; }
            else ctx.lineTo(px, py);
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // === CONTINENTS - Natural green/brown terrain ===
      SUBDIVIDED_LANDMASSES.forEach((polygon) => {
        const projectedPoints = polygon.map(([lng, lat]) => project(lat, lng));
        const visiblePoints = projectedPoints.filter((p) => p.z3d > -0.05);

        if (visiblePoints.length > 2) {
          ctx.beginPath();
          let started = false;

          projectedPoints.forEach((p) => {
            if (p.z3d > -0.08) {
              if (!started) { ctx.moveTo(p.px, p.py); started = true; }
              else ctx.lineTo(p.px, p.py);
            }
          });

          if (started) {
            ctx.closePath();

            // Compute average z for depth-based shading
            const avgZ = visiblePoints.reduce((sum, p) => sum + p.z3d, 0) / visiblePoints.length;
            const brightness = 0.55 + avgZ * 0.45;

            // Natural terrain colors
            const r = Math.round(65 * brightness + 40);
            const g = Math.round(110 * brightness + 50);
            const b = Math.round(50 * brightness + 25);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.92)`;
            ctx.fill();

            // Subtle terrain border
            ctx.strokeStyle = `rgba(${r - 20}, ${g - 15}, ${b - 10}, 0.4)`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      });

      // === CITY MARKERS - Glowing warm dots ===
      pulseAngle += 0.035;
      const pulseScale = 1 + Math.sin(pulseAngle) * 0.2;

      MARKERS.forEach(({ location: [lat, lng] }) => {
        const { px, py, z3d } = project(lat, lng);

        if (z3d > 0.1) {
          const alpha = Math.pow(z3d, 0.6);
          const glowR = (7 + z3d * 5) * pulseScale;

          // Outer glow
          const glow = ctx.createRadialGradient(px, py, 0, px, py, glowR);
          glow.addColorStop(0, `rgba(255, 200, 60, ${0.7 * alpha})`);
          glow.addColorStop(0.4, `rgba(255, 160, 40, ${0.3 * alpha})`);
          glow.addColorStop(1, "rgba(255, 160, 40, 0)");
          ctx.beginPath();
          ctx.arc(px, py, glowR, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          // Core dot
          ctx.beginPath();
          ctx.arc(px, py, 2.5 + z3d * 1.0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 180, 50, ${alpha})`;
          ctx.fill();

          // Bright center
          ctx.beginPath();
          ctx.arc(px, py, 1.2 + z3d * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 220, ${alpha})`;
          ctx.fill();
        }
      });

      ctx.restore(); // unclip

      // === SPECULAR HIGHLIGHT - top-left shine ===
      const spec = ctx.createRadialGradient(
        cx - radius * 0.35, cy - radius * 0.4, 0,
        cx - radius * 0.35, cy - radius * 0.4, radius * 0.7
      );
      spec.addColorStop(0, "rgba(255, 255, 255, 0.35)");
      spec.addColorStop(0.5, "rgba(255, 255, 255, 0.08)");
      spec.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = spec;
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();

      // === RIM SHADOW - atmospheric edge darkening ===
      const rimShadow = ctx.createRadialGradient(cx, cy, radius * 0.82, cx, cy, radius);
      rimShadow.addColorStop(0, "rgba(0, 0, 0, 0)");
      rimShadow.addColorStop(0.75, "rgba(10, 30, 60, 0.06)");
      rimShadow.addColorStop(1, "rgba(10, 30, 60, 0.25)");
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = rimShadow;
      ctx.fill();

      canvas.style.opacity = "1";
    };

    const loop = () => {
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => cancelAnimationFrame(rafRef.current);
  }, [rs]);

  return (
    <div
      className={cn(
        "absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[600px]",
        className
      )}
    >
      <canvas
        className={cn(
          "size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
        )}
        ref={canvasRef}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX;
          updatePointerInteraction(e.clientX);
        }}
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) =>
          e.touches[0] && updateMovement(e.touches[0].clientX)
        }
      />
    </div>
  );
}
