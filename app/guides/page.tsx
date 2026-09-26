"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Star,
  ShieldCheck,
  Clock,
  IndianRupee,
  Languages,
  Sparkles,
  Send,
  Calendar,
  CheckCircle,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LocationItem {
  id: string;
  name: string;
  city: string;
  country: string;
  type: string;
  activeGuidesCount: number;
}

interface GuideItem {
  id: string;
  userId: string;
  name: string;
  profilePhoto: string | null;
  bio: string | null;
  rating: number;
  experienceYears: number;
  hourlyRate: number;
  languages: string[];
  expertise: string[];
  verificationStatus: string;
  availabilityStatus: string;
  isCurrentlyAtLocation: boolean;
  currentLocation: { id: string; name: string } | null;
  coveredLocations: { id: string; name: string }[];
}

export default function GuideDiscoveryPage() {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationItem | null>(null);
  const [guides, setGuides] = useState<GuideItem[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [requestModalGuide, setRequestModalGuide] = useState<GuideItem | null>(null);

  // Request form state
  const [requestDate, setRequestDate] = useState("");
  const [requestTime, setRequestTime] = useState("10:00 AM");
  const [requestDuration, setRequestDuration] = useState("2");
  const [requestMessage, setRequestMessage] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Fetch locations on mount
  useEffect(() => {
    async function loadLocations() {
      try {
        setLoadingLocations(true);
        const res = await fetch("/api/locations?city=Mumbai");
        const data = await res.json();
        if (data.locations) {
          setLocations(data.locations);
          if (data.locations.length > 0) {
            setSelectedLocation(data.locations[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load locations:", err);
      } finally {
        setLoadingLocations(false);
      }
    }
    loadLocations();
  }, []);

  // Fetch guides whenever selected location changes
  useEffect(() => {
    const locId = selectedLocation?.id;
    if (!locId) return;
    async function loadGuides() {
      try {
        setLoadingGuides(true);
        const res = await fetch(`/api/guides?locationId=${locId}`);
        const data = await res.json();
        if (data.guides) {
          setGuides(data.guides);
        } else {
          setGuides([]);
        }
      } catch (err) {
        console.error("Failed to load guides:", err);
      } finally {
        setLoadingGuides(false);
      }
    }
    loadGuides();
  }, [selectedLocation]);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await fetch("/api/setup/seed-guides", { method: "POST" });
      const locRes = await fetch("/api/locations?city=Mumbai");
      const locData = await locRes.json();
      if (locData.locations) {
        setLocations(locData.locations);
        setSelectedLocation(locData.locations[0]);
      }
    } catch (err) {
      console.error("Seeding failed:", err);
    } finally {
      setSeeding(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestModalGuide || !selectedLocation || !requestDate) return;

    setSubmittingRequest(true);
    try {
      const res = await fetch("/api/guide-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: requestModalGuide.id,
          locationId: selectedLocation.id,
          date: requestDate,
          startTime: requestTime,
          duration: parseInt(requestDuration) || 2,
          message: requestMessage,
        })
      });

      if (res.ok) {
        setRequestSuccess(true);
        setTimeout(() => {
          setRequestSuccess(false);
          setRequestModalGuide(null);
          setRequestMessage("");
        }, 2000);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to submit guide request");
      }
    } catch (err) {
      console.error("Error sending request:", err);
      alert("Please sign in or check your connection to request a guide.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBF8] text-[#1a1a1a]">
      {/* Hero Header */}
      <section className="border-b border-[#e5e7db] bg-gradient-to-b from-[#f4f7ee] to-[#FAFBF8] py-12 px-6 sm:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#485C11]/10 text-[#485C11] text-xs font-semibold uppercase tracking-wider mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Local Experts
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1a1a1a]">
                Location-Based Guide Discovery
              </h1>
              <p className="mt-2 text-sm sm:text-base text-[#6b7280] max-w-2xl">
                Connect directly with certified, verified local guides available on-site at Mumbai&apos;s most iconic monuments, heritage trails, and cultural landmarks.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
              <Button
                asChild
                className="bg-[#485C11] hover:bg-[#38480e] text-white text-xs h-9 rounded-full px-4 shadow-sm cursor-pointer"
              >
                <Link href="/guide-register" className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Register as a Guide
                </Link>
              </Button>

              <Button
                variant="outline"
                onClick={handleSeedData}
                disabled={seeding}
                className="border-[#485C11]/30 hover:bg-[#DFECC6]/40 text-[#485C11] text-xs h-9 rounded-full cursor-pointer"
              >
                {seeding ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Seeding...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Seed Demo Guides
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Location Filter Chips */}
          <div className="mt-8">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6b7280] mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#485C11]" />
              Select Iconic Location (Mumbai)
            </h2>

            {loadingLocations ? (
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(n => (
                  <div key={n} className="h-9 w-36 bg-gray-200 animate-pulse rounded-full" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {locations.map(loc => {
                  const isSelected = selectedLocation?.id === loc.id;
                  return (
                    <button
                      key={loc.id}
                      onClick={() => setSelectedLocation(loc)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-[#485C11] text-white shadow-sm scale-102"
                          : "bg-white border border-[#e5e7db] text-[#4b5563] hover:border-[#485C11]/40 hover:bg-[#f4f7ee]"
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{loc.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isSelected ? "bg-white/20 text-white" : "bg-[#485C11]/10 text-[#485C11]"
                        }`}
                      >
                        {loc.activeGuidesCount} available
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content: Guide Grid */}
      <section className="max-w-6xl mx-auto py-10 px-6 sm:px-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
              <span>Available Verified Guides at</span>
              <span className="text-[#485C11] underline underline-offset-4 decoration-[#485C11]/30">
                {selectedLocation?.name || "Selected Location"}
              </span>
            </h2>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Only verified guides with confirmed availability status are shown.
            </p>
          </div>

          <Badge variant="outline" className="border-[#485C11]/30 text-[#485C11] bg-[#485C11]/5">
            {guides.length} {guides.length === 1 ? "Guide" : "Guides"} On-Site
          </Badge>
        </div>

        {loadingGuides ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-64 rounded-2xl bg-gray-100 animate-pulse border border-[#e5e7db]" />
            ))}
          </div>
        ) : guides.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#d6dacb] p-8">
            <Users className="w-10 h-10 text-[#9ca3af] mx-auto mb-3" />
            <h3 className="text-base font-semibold text-[#1a1a1a]">No Guides Currently Available Here</h3>
            <p className="text-xs text-[#6b7280] max-w-sm mx-auto mt-1 mb-4">
              There are no verified guides signed in at this location right now. Click the button below to seed demo verified guides.
            </p>
            <Button
              onClick={handleSeedData}
              disabled={seeding}
              className="bg-[#485C11] hover:bg-[#3a4d0d] text-white text-xs rounded-full px-5"
            >
              Seed Verified Guides
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map(guide => (
              <div
                key={guide.id}
                className="bg-white rounded-2xl border border-[#e5e7db] shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5">
                  {/* Guide Top Header */}
                  <div className="flex items-start gap-3.5">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-[#e5e7db]">
                      <Image
                        src={guide.profilePhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80"}
                        alt={guide.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-[#1a1a1a] truncate">{guide.name}</h3>
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center text-xs font-semibold text-[#1a1a1a]">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500 mr-1" />
                          {guide.rating.toFixed(1)}
                        </span>
                        <span className="text-xs text-[#6b7280]">•</span>
                        <span className="text-xs text-[#6b7280]">{guide.experienceYears} yrs exp</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Available On-Site Now
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="mt-3.5 text-xs text-[#4b5563] line-clamp-3 leading-relaxed">
                    {guide.bio || "Passionate licensed local guide with deep historical and cultural storytelling expertise."}
                  </p>

                  {/* Languages */}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-[#6b7280]">
                    <Languages className="w-3.5 h-3.5 text-[#485C11] shrink-0" />
                    <span className="truncate">{guide.languages.join(" • ")}</span>
                  </div>

                  {/* Expertise Badges */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {guide.expertise.slice(0, 3).map((exp, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#FAFBF8] border border-[#e5e7db] text-[#374151]"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer with Price and Action */}
                <div className="px-5 py-3.5 bg-[#FAFBF8] border-t border-[#e5e7db] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-[#6b7280] block">Hourly Rate</span>
                    <span className="text-sm font-bold text-[#1a1a1a] flex items-center">
                      <IndianRupee className="w-3 h-3 text-[#485C11]" />
                      {guide.hourlyRate}
                      <span className="text-[11px] text-[#6b7280] font-normal ml-0.5">/hr</span>
                    </span>
                  </div>

                  <Button
                    onClick={() => {
                      setRequestModalGuide(guide);
                      setRequestDate(new Date().toISOString().split("T")[0]);
                    }}
                    className="h-8 rounded-full px-4 text-xs font-semibold bg-[#485C11] hover:bg-[#3a4d0d] text-white shadow-xs cursor-pointer"
                  >
                    Request Guide
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Guide Request Modal */}
      {requestModalGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#e5e7db] relative">
            <div className="flex items-center justify-between border-b border-[#e5e7db] pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#1a1a1a]">Request Licensed Guide</h3>
                <p className="text-xs text-[#6b7280]">
                  Booking <span className="font-semibold text-[#485C11]">{requestModalGuide.name}</span> at {selectedLocation?.name}
                </p>
              </div>
              <button
                onClick={() => setRequestModalGuide(null)}
                className="text-[#9ca3af] hover:text-[#1a1a1a] text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {requestSuccess ? (
              <div className="py-8 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-2 animate-bounce" />
                <h4 className="text-base font-bold text-[#1a1a1a]">Request Sent Successfully!</h4>
                <p className="text-xs text-[#6b7280] mt-1">
                  {requestModalGuide.name} has been notified and will respond shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendRequest} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={requestDate}
                      onChange={e => setRequestDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-[#d6dacb] focus:border-[#485C11] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#374151] mb-1">Start Time</label>
                    <select
                      value={requestTime}
                      onChange={e => setRequestTime(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-[#d6dacb] focus:border-[#485C11] outline-none"
                    >
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">Duration (Hours)</label>
                  <select
                    value={requestDuration}
                    onChange={e => setRequestDuration(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-[#d6dacb] focus:border-[#485C11] outline-none"
                  >
                    <option value="1">1 Hour (Quick Monument Highlights)</option>
                    <option value="2">2 Hours (Standard Walking Tour)</option>
                    <option value="3">3 Hours (Deep Heritage &amp; Photography)</option>
                    <option value="4">4 Hours (Full Quarter Immersion)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1">
                    Special Interests / Requirements
                  </label>
                  <textarea
                    rows={2}
                    value={requestMessage}
                    onChange={e => setRequestMessage(e.target.value)}
                    placeholder="e.g. We love colonial architecture &amp; street food tasting..."
                    className="w-full text-xs px-3 py-2 rounded-xl border border-[#d6dacb] focus:border-[#485C11] outline-none resize-none"
                  />
                </div>

                {/* Price Summary */}
                <div className="bg-[#FAFBF8] border border-[#e5e7db] p-3 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
                    <Clock className="w-3.5 h-3.5 text-[#485C11]" />
                    <span>{requestDuration} Hours • ₹{requestModalGuide.hourlyRate}/hr</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#6b7280] block">Estimated Total</span>
                    <span className="text-sm font-bold text-[#485C11]">
                      ₹{(requestModalGuide.hourlyRate * parseInt(requestDuration || "2")).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRequestModalGuide(null)}
                    className="text-xs h-9 rounded-full px-4 border-[#e5e7db]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submittingRequest}
                    className="text-xs h-9 rounded-full px-5 bg-[#485C11] hover:bg-[#3a4d0d] text-white"
                  >
                    {submittingRequest ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        Confirm Request
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
