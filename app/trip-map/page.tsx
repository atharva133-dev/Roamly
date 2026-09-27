"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  Calendar,
  Sparkles,
  MapPin,
  Info,
} from "lucide-react";
import { ItineraryMapPanel } from "@/components/ItineraryMapPanel";

export default function TripMapPage() {
  const [hasPlan, setHasPlan] = useState<boolean | null>(null);
  const [tripSummary, setTripSummary] = useState<string>("");
  const [destinations, setDestinations] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("roamly_accepted_plan");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          (Array.isArray(parsed.groundedDays) && parsed.groundedDays.length > 0) ||
          (Array.isArray(parsed.plan?.itinerary) && parsed.plan.itinerary.length > 0)
        ) {
          setHasPlan(true);
          setTripSummary(parsed.summary || "");
          setDestinations(parsed.destinations || []);
          return;
        }
      }
    } catch (e) {
      console.error("Error checking accepted plan in localStorage:", e);
    }
    setHasPlan(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFBF8] flex flex-col">
      {/* Top Header Bar */}
      <header className="border-b border-[#e5e7db] bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/llm"
              className="p-2 rounded-xl text-[#4b5563] hover:text-[#1a1a1a] hover:bg-[#f4f6ef] transition-colors"
              title="Back to AI Planner"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#485C11]" />
                <h1 className="text-base sm:text-lg font-bold text-[#1a1a1a] leading-tight">
                  Trip Map & Route Planner
                </h1>
              </div>
              <p className="text-xs text-[#6b7280]">
                {destinations.length > 0
                  ? `Interactive route map for ${destinations.join(" → ")}`
                  : "Grounded Google Maps itinerary & transport routing"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/mapcalendar"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#e5e7db] bg-white text-xs font-semibold text-[#4b5563] hover:text-[#485C11] hover:border-[#485C11]/30 transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-[#485C11]" />
              <span>Schedule</span>
            </Link>
            <Link
              href="/llm"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#485C11] text-white text-xs font-semibold hover:bg-[#3a4d0d] shadow-xs transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Planner</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-3 sm:p-5 max-w-7xl mx-auto w-full">
        {hasPlan === false ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-3xl border border-[#e5e7db] shadow-sm max-w-xl mx-auto my-8">
            <div className="w-14 h-14 rounded-2xl bg-[#DFECC6]/40 flex items-center justify-center text-[#485C11] mb-4 border border-[#485C11]/20">
              <MapPin className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-[#1a1a1a] mb-2">No Active Itinerary Found</h2>
            <p className="text-sm text-[#6b7280] max-w-md mb-6 leading-relaxed">
              Generate a personalized travel plan with Roamly's Grounded AI Planner. Once you accept your plan,
              all activity stops, Google routes, and nearby places will automatically map here.
            </p>
            <Link
              href="/llm"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#485C11] text-white text-sm font-semibold hover:bg-[#3a4d0d] shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Create an Itinerary</span>
            </Link>
          </div>
        ) : (
          <ItineraryMapPanel />
        )}
      </main>
    </div>
  );
}
