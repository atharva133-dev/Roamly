"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Plane, Sparkles, MapPin } from "lucide-react";

export function PageLoadingTransition() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const prevPathRef = useRef(pathname);

  // 1. Initial Page Load / Reload: smooth progress from 0% to 100%
  useEffect(() => {
    const startTime = Date.now();
    const duration = 1400; // 1.4s smooth flight

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setIsInitialLoad(false);
          }, 400);
        }, 200);
      }
    }, 16);

    return () => clearInterval(interval);
  }, []);

  // 2. Intercept internal page link clicks for route transition
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("#") &&
        !href.startsWith("//") &&
        !target.getAttribute("target") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        const url = new URL(href, window.location.origin);
        if (url.pathname !== window.location.pathname || url.search !== window.location.search) {
          setIsNavigating(true);
        }
      }
    };

    document.addEventListener("click", handleLinkClick, true);
    return () => document.removeEventListener("click", handleLinkClick, true);
  }, []);

  // Finish navigation animation on route change
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      if (isNavigating) {
        const timer = setTimeout(() => {
          setIsNavigating(false);
        }, 450);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, searchParams, isNavigating]);

  return (
    <>
      {/* Route Switch Top Progress Bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-1 bg-[#DFECC6]/40 overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-[#485C11] via-[#6B7F3A] to-[#8E9C78] animate-[travel-shimmer_1s_infinite]" />
        </div>
      )}

      {/* Main Professional Loading Screen */}
      {isInitialLoad && (
        <div
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FAFBF8] transition-all duration-400 ease-out select-none ${
            isFadingOut ? "opacity-0 scale-[0.99] pointer-events-none" : "opacity-100 scale-100"
          }`}
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-radial from-[#DFECC6]/35 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

          {/* Centered Luxury Card with Horizontal Flight Track */}
          <div className="relative w-full max-w-xl px-6 sm:px-8 flex flex-col items-center">
            {/* Top Brand Header */}
            <div className="flex items-center gap-2 mb-6">
              <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#485C11] to-[#6B7F3A] shadow-sm text-white">
                <Sparkles className="size-3.5" />
              </span>
              <span className="font-serif text-2xl font-bold tracking-tight text-[#1a1a1a]">
                Roamly
              </span>
            </div>

            {/* Horizontal Flight Track Runway */}
            <div className="relative w-full py-6">
              {/* Runway Background Line */}
              <div className="w-full h-1 bg-[#e5e7db] rounded-full overflow-hidden relative">
                {/* Active Filled Contrail */}
                <div
                  className="h-full bg-gradient-to-r from-[#8E9C78]/40 via-[#6B7F3A] to-[#485C11] rounded-full transition-all duration-75 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Dashed Flight Guidance Line */}
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 border-t border-dashed border-[#8E9C78]/50 pointer-events-none" />

              {/* Start & End Waypoint Pins */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="size-3 rounded-full bg-[#485C11] border-2 border-[#FAFBF8] shadow-sm" />
              </div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 flex flex-col items-center">
                <div className="size-3 rounded-full bg-[#8E9C78] border-2 border-[#FAFBF8] shadow-sm animate-ping" />
              </div>

              {/* Prominent Airplane Moving Across Track */}
              <div
                className="absolute top-1/2 -translate-y-1/2 transition-all duration-75 ease-linear"
                style={{
                  left: `${progress}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="relative flex items-center justify-center">
                  {/* Glowing Radar Halo around plane */}
                  <div className="absolute size-10 rounded-full bg-[#DFECC6]/70 animate-pulse pointer-events-none" />
                  
                  {/* Airplane Badge */}
                  <div className="relative flex size-9 items-center justify-center rounded-full bg-[#485C11] text-white shadow-md shadow-[#485C11]/30">
                    <Plane className="size-4.5 fill-white rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            {/* Departure / Destination Labels */}
            <div className="w-full flex items-center justify-between text-xs font-semibold text-[#6B7F3A] tracking-wider uppercase pt-1">
              <span className="flex items-center gap-1 text-[#1a1a1a]">
                <MapPin className="size-3 text-[#485C11]" />
                Your Location
              </span>
              <span className="font-mono text-xs font-bold text-[#485C11] bg-[#DFECC6]/40 border border-[#8E9C78]/30 px-2 py-0.5 rounded-full">
                {progress}%
              </span>
              <span className="flex items-center gap-1 text-[#485C11]">
                Dream Destination
                <Sparkles className="size-3" />
              </span>
            </div>

            {/* Travel Status Subtitle */}
            <p className="mt-6 text-xs font-medium text-muted-foreground tracking-wide text-center">
              Crafting your AI-powered travel experience...
            </p>
          </div>
        </div>
      )}
    </>
  );
}
