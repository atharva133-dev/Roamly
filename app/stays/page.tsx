"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Hotel,
  UtensilsCrossed,
  MapPin,
  Star,
  Search,
  SlidersHorizontal,
  Compass,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Check,
  ChevronRight,
  X,
  Heart,
  CheckCircle2,
  Loader2,
  Tag,
  ArrowUpRight,
  Info,
  Clock,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StayOrRestroItem, AmenityDetail, PlatformPrice } from "@/app/api/stays/route";
import GoogleStaysMap from "@/components/GoogleStaysMap";
import GoogleTravelHotelCard from "@/components/GoogleTravelHotelCard";

function StaysPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Destination state extracted from AI trip planner
  const [activeDestination, setActiveDestination] = useState<string>("");
  const [userPlannerDestinations, setUserPlannerDestinations] = useState<string[]>([]);
  const [destinationInput, setDestinationInput] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"all" | "hotels" | "restaurants">("all");
  const [items, setItems] = useState<StayOrRestroItem[]>([]);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 28.6139, lng: 77.209 });
  const [counts, setCounts] = useState({ all: 0, hotels: 0, restaurants: 0 });
  const [loading, setLoading] = useState(false);

  // Selected item for Map focus & InfoWindow
  const [selectedItem, setSelectedItem] = useState<StayOrRestroItem | null>(null);

  // Detail Modal
  const [detailModalItem, setDetailModalItem] = useState<StayOrRestroItem | null>(null);
  const [detailModalTab, setDetailModalTab] = useState<"overview" | "prices" | "photos" | "reviews" | "about">("overview");

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (detailModalItem) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [detailModalItem]);

  // Filter & Sort
  const [sortBy, setSortBy] = useState<"rating" | "reviews" | "name">("rating");
  const [savedFavorites, setSavedFavorites] = useState<string[]>([]);
  const [mobileMapView, setMobileMapView] = useState(false);

  // 1. EXTRACT DESTINATION ENTERED BY USER IN AI TRIP PLANNER
  useEffect(() => {
    let resolvedDest = "";
    const collectedDestinations: string[] = [];

    // Priority A: URL Query param
    const queryDest = searchParams.get("destination");
    if (queryDest && queryDest.trim()) {
      resolvedDest = queryDest.trim();
      collectedDestinations.push(resolvedDest);
    }

    // Priority B: Stored destination from AI Trip Planner input
    if (typeof window !== "undefined") {
      try {
        const storedDest = localStorage.getItem("roamly_current_destination");
        if (storedDest && storedDest.trim()) {
          if (!resolvedDest) resolvedDest = storedDest.trim();
          if (!collectedDestinations.includes(storedDest.trim())) {
            collectedDestinations.push(storedDest.trim());
          }
        }

        const storedList = localStorage.getItem("roamly_planner_destinations");
        if (storedList) {
          const parsed = JSON.parse(storedList);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((d: string) => {
              if (d && !collectedDestinations.includes(d.trim())) {
                collectedDestinations.push(d.trim());
              }
            });
            if (!resolvedDest && parsed[0]) {
              resolvedDest = parsed[0].trim();
            }
          }
        }

        // Priority C: Accepted travel plan in localStorage
        const storedPlan = localStorage.getItem("roamly_accepted_plan");
        if (storedPlan) {
          const planData = JSON.parse(storedPlan);
          if (Array.isArray(planData.destinations) && planData.destinations.length > 0) {
            planData.destinations.forEach((d: string) => {
              if (d && !collectedDestinations.includes(d.trim())) {
                collectedDestinations.push(d.trim());
              }
            });
            if (!resolvedDest && planData.destinations[0]) {
              resolvedDest = planData.destinations[0].trim();
            }
          } else if (planData.destinationDetails?.[0]?.name) {
            const dName = planData.destinationDetails[0].name.trim();
            if (!collectedDestinations.includes(dName)) collectedDestinations.push(dName);
            if (!resolvedDest) resolvedDest = dName;
          }
        }
      } catch (err) {
        console.error("Error extracting destination from AI planner localStorage:", err);
      }
    }

    if (resolvedDest) {
      setActiveDestination(resolvedDest);
      setDestinationInput(resolvedDest);
      setUserPlannerDestinations(collectedDestinations);
    }
  }, [searchParams]);

  // 2. Fetch Stays & Dining data for the user's destination
  useEffect(() => {
    if (!activeDestination) return;

    let isCancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/stays?destination=${encodeURIComponent(activeDestination)}&type=${activeTab}`
        );
        if (!res.ok) throw new Error("Failed to fetch stays");
        const data = await res.json();
        if (!isCancelled && data.success) {
          setItems(data.items || []);
          if (data.center) {
            setCenter(data.center);
          }
          if (data.counts) {
            setCounts(data.counts);
          }
          if (data.items && data.items.length > 0) {
            setSelectedItem(data.items[0]);
          } else {
            setSelectedItem(null);
          }
        }
      } catch (err) {
        console.error("Error fetching stays data:", err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [activeDestination, activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationInput.trim()) return;
    const dest = destinationInput.trim();
    setActiveDestination(dest);
    if (!userPlannerDestinations.includes(dest)) {
      setUserPlannerDestinations((prev) => [...prev, dest]);
    }
    try {
      localStorage.setItem("roamly_current_destination", dest);
    } catch (_) {}
    router.push(`/stays?destination=${encodeURIComponent(dest)}`);
  };

  const handleSelectTripDestination = (dest: string) => {
    setActiveDestination(dest);
    setDestinationInput(dest);
    try {
      localStorage.setItem("roamly_current_destination", dest);
    } catch (_) {}
    router.push(`/stays?destination=${encodeURIComponent(dest)}`);
  };

  const toggleFavorite = (id: string) => {
    setSavedFavorites((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Open detail modal directly focused on a specific tab
  const openDetailModal = (item: StayOrRestroItem, tab: "overview" | "prices" | "photos" | "reviews" | "about" = "overview") => {
    setDetailModalItem(item);
    setDetailModalTab(tab);
  };

  // Sorted items
  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === "rating") return b.rating - a.rating;
    if (sortBy === "reviews") return b.userRatingCount - a.userRatingCount;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen bg-[#FAFBF8] text-[#1a1a1a]">
      {/* ---------------------------------------------------------------------- */}
      {/* HEADER & DESTINATION BAR                                               */}
      {/* ---------------------------------------------------------------------- */}
      <div className="border-b border-[#e5e7db] bg-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            {/* Title with User's Destination */}
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex size-7.5 items-center justify-center rounded-xl bg-[#485C11]/15 text-[#485C11]">
                  <Hotel className="size-4" />
                </span>
                <h1 className="text-lg sm:text-xl font-serif font-black tracking-tight text-[#1a1a1a]">
                  {activeDestination ? (
                    <>
                      Stays & Dining in{" "}
                      <span className="text-[#485C11] underline decoration-[#DFECC6] decoration-4 underline-offset-4">
                        {activeDestination}
                      </span>
                    </>
                  ) : (
                    "Stays & Dining"
                  )}
                </h1>
              </div>
              <p className="text-[11px] text-[#6b7280] mt-0.5 flex items-center gap-2">
                <span>Extracted from AI Trip Planner</span>
                <span>•</span>
                <span>Google Maps Engine</span>
                {counts.all > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-[#485C11] font-semibold">{counts.all} spots</span>
                  </>
                )}
              </p>
            </div>

            {/* Destination Search/Switch Form */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center gap-2 w-full lg:w-auto"
            >
              <div className="relative flex-1 lg:w-64">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#8E9C78]" />
                <input
                  type="text"
                  placeholder="Change destination..."
                  value={destinationInput}
                  onChange={(e) => setDestinationInput(e.target.value)}
                  className="w-full h-9 pl-8 pr-3 rounded-full border border-[#cfd4c5] bg-[#FAFBF8] text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#485C11]/30 focus:border-[#485C11] transition-all"
                />
              </div>

              <Button
                type="submit"
                className="h-9 rounded-full px-4 bg-[#485C11] hover:bg-[#38480e] text-white text-xs font-semibold shadow-xs cursor-pointer shrink-0"
              >
                <Search className="size-3 mr-1" />
                Search
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-9 rounded-full px-3.5 border-[#cfd4c5] text-xs font-semibold text-[#485C11] hover:bg-[#DFECC6]/40 shrink-0"
              >
                <Link href="/llm">
                  <Sparkles className="size-3 mr-1" />
                  Planner
                </Link>
              </Button>
            </form>
          </div>

          {/* User's Trip Destinations (ONLY destinations entered by user in AI planner) */}
          {userPlannerDestinations.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-[#e5e7db]/70 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9C78] shrink-0 mr-1 flex items-center gap-1">
                <MapPin className="size-2.5" />
                Your Trip Stops:
              </span>
              {userPlannerDestinations.map((city) => {
                const isSelected =
                  activeDestination.toLowerCase() === city.toLowerCase();
                return (
                  <button
                    key={city}
                    onClick={() => handleSelectTripDestination(city)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? "bg-[#485C11] text-white shadow-xs"
                        : "bg-[#f4f6ef] text-[#4b5563] hover:bg-[#DFECC6]/60 hover:text-[#1a1a1a]"
                    }`}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* EMPTY STATE: USER HAS NOT ENTERED DESTINATION IN AI PLANNER YET         */}
      {/* ---------------------------------------------------------------------- */}
      {!activeDestination ? (
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <div className="size-16 rounded-3xl bg-[#DFECC6]/60 text-[#485C11] flex items-center justify-center mx-auto mb-4 border border-[#485C11]/20">
            <Compass className="size-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#1a1a1a] mb-2">
            No Destination Entered in Trip Planner
          </h2>
          <p className="text-sm text-[#6b7280] leading-relaxed max-w-md mx-auto mb-6">
            Enter your destination in the AI Trip Planner, and Roamly will automatically
            pull all verified hotels, boutique stays, and top restaurants located in that destination.
          </p>

          <Button
            asChild
            className="h-11 rounded-full px-7 bg-[#485C11] hover:bg-[#38480e] text-white text-sm font-semibold shadow-md cursor-pointer"
          >
            <Link href="/llm">
              <Sparkles className="size-4 mr-2" />
              Open AI Trip Planner
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {/* ------------------------------------------------------------------ */}
          {/* FILTER TABS & SORT CONTROLS                                        */}
          {/* ------------------------------------------------------------------ */}
          <div className="bg-[#FAFBF8] border-b border-[#e5e7db]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-[#e5e7db] shadow-2xs">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "all"
                      ? "bg-[#485C11] text-white shadow-2xs"
                      : "text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#FAFBF8]"
                  }`}
                >
                  <span>All Spots</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeTab === "all"
                        ? "bg-white/20 text-white"
                        : "bg-[#f0f2eb] text-[#6b7280]"
                    }`}
                  >
                    {counts.all}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("hotels")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "hotels"
                      ? "bg-[#485C11] text-white shadow-2xs"
                      : "text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#FAFBF8]"
                  }`}
                >
                  <Hotel className="size-3.5" />
                  <span>Hotels ({counts.hotels})</span>
                </button>

                <button
                  onClick={() => setActiveTab("restaurants")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === "restaurants"
                      ? "bg-[#485C11] text-white shadow-2xs"
                      : "text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#FAFBF8]"
                  }`}
                >
                  <UtensilsCrossed className="size-3.5" />
                  <span>Restaurants ({counts.restaurants})</span>
                </button>
              </div>

              {/* Right: Sort & Mobile Map Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs text-[#6b7280]">
                  <SlidersHorizontal className="size-3 text-[#8E9C78]" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white border border-[#e5e7db] rounded-lg px-2 py-1 text-xs font-medium text-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#485C11] cursor-pointer"
                  >
                    <option value="rating">Highest Rated ★</option>
                    <option value="reviews">Most Google Reviews</option>
                    <option value="name">Alphabetical</option>
                  </select>
                </div>

                {/* Mobile Map Toggle */}
                <button
                  onClick={() => setMobileMapView((prev) => !prev)}
                  className="lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#485C11] bg-[#485C11]/10 text-[#485C11] text-xs font-bold transition-all cursor-pointer"
                >
                  <MapPin className="size-3" />
                  <span>{mobileMapView ? "Show Cards" : "Show Map"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* MAIN SPLIT: SLEEK COMPACT CARDS (LEFT) & GOOGLE MAP (RIGHT)        */}
          {/* ------------------------------------------------------------------ */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* LEFT COLUMN: COMPACT CARDS LIST */}
              <div
                className={`lg:col-span-7 space-y-3.5 ${
                  mobileMapView ? "hidden lg:block" : "block"
                }`}
              >
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <Loader2 className="size-9 text-[#485C11] animate-spin mb-3" />
                    <h3 className="text-sm font-bold text-[#1a1a1a]">
                      Locating places in {activeDestination}...
                    </h3>
                  </div>
                ) : sortedItems.length === 0 ? (
                  <div className="py-14 text-center bg-white rounded-2xl border border-[#e5e7db] p-6 shadow-xs">
                    <Hotel className="size-8 text-[#485C11] mx-auto mb-2" />
                    <h3 className="text-sm font-bold text-[#1a1a1a]">
                      No places found for &quot;{activeDestination}&quot;
                    </h3>
                    <Button asChild className="mt-3 rounded-full bg-[#485C11] text-xs font-semibold">
                      <Link href="/llm">Return to AI Planner</Link>
                    </Button>
                  </div>
                ) : (
                  sortedItems.map((item) => {
                    const isSelected = selectedItem?.id === item.id;
                    const isFavorite = savedFavorites.includes(item.id);

                    return (
                      <GoogleTravelHotelCard
                        key={item.id}
                        item={item}
                        isSelected={isSelected}
                        isFavorite={isFavorite}
                        onToggleFavorite={toggleFavorite}
                        onSelect={(sel) => {
                          setSelectedItem(sel);
                          if (window.innerWidth < 1024) {
                            setMobileMapView(true);
                          }
                        }}
                        onOpenDetailsModal={(item, tab = "overview") => openDetailModal(item, tab)}
                      />
                    );
                  })
                )}
              </div>

              {/* RIGHT COLUMN: STICKY GOOGLE MAP */}
              <div
                className={`lg:col-span-5 sticky top-24 ${
                  mobileMapView ? "block" : "hidden lg:block"
                }`}
              >
                <div className="rounded-2xl border border-[#e5e7db] bg-white p-2.5 shadow-md shadow-[#485C11]/5 flex flex-col h-[calc(100vh-7.5rem)] min-h-[500px]">
                  {/* Map Header */}
                  <div className="px-2 py-1.5 flex items-center justify-between border-b border-[#e5e7db] mb-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Compass className="size-4 text-[#485C11]" />
                      <h3 className="text-xs font-bold text-[#1a1a1a]">
                        Map of {activeDestination} ({items.length} spots)
                      </h3>
                    </div>

                    <div className="text-[10px] font-semibold text-[#485C11] bg-[#DFECC6]/40 px-2 py-0.5 rounded-full">
                      Google Maps
                    </div>
                  </div>

                  {/* Google Map Container Element */}
                  <div className="flex-1 w-full rounded-xl overflow-hidden relative">
                    <GoogleStaysMap
                      items={items}
                      center={center}
                      selectedItem={selectedItem}
                      onSelectItem={(item) => setSelectedItem(item)}
                    />

                    {/* Quick Selected Place Bar overlaying bottom of map */}
                    {selectedItem && (
                      <div className="absolute bottom-2 left-2 right-2 z-10 p-2.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#e5e7db] shadow-lg flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <img
                            src={selectedItem.image}
                            alt={selectedItem.name}
                            loading="lazy"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.src.includes('fallback')) {
                                target.src = selectedItem.type === "hotel"
                                  ? "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80#fallback"
                                  : "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80#fallback";
                              }
                            }}
                            className="size-11 rounded-lg object-cover shrink-0"
                          />
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-[#1a1a1a] truncate">
                              {selectedItem.name}
                            </div>
                            <div className="text-[11px] text-[#485C11] font-semibold">
                              {selectedItem.priceEstimate || selectedItem.starRatingText || selectedItem.category}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => openDetailModal(selectedItem, "overview")}
                          className="px-3 py-1.5 rounded-lg bg-[#007b83] text-white text-[11px] font-semibold hover:bg-[#00666d] transition-colors shrink-0 cursor-pointer shadow-sm"
                        >
                          View Details
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* DETAIL MODAL (RENDERS COMPLETE GOOGLE TRAVEL HOTEL CARD)               */}
      {/* ---------------------------------------------------------------------- */}
      {detailModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setDetailModalItem(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-5xl xl:max-w-[1140px] w-full max-h-[92vh] overflow-hidden shadow-2xl border border-neutral-200/80 relative animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <GoogleTravelHotelCard
              item={detailModalItem}
              variant="full"
              isSelected={true}
              isFavorite={savedFavorites.includes(detailModalItem.id)}
              onToggleFavorite={toggleFavorite}
              defaultTab={detailModalTab}
              onClose={() => setDetailModalItem(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaysPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFBF8] flex items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="size-8 text-[#485C11] animate-spin mb-3" />
            <span className="text-sm font-medium text-[#6b7280]">
              Loading Stays & Dining...
            </span>
          </div>
        </div>
      }
    >
      <StaysPageContent />
    </Suspense>
  );
}
