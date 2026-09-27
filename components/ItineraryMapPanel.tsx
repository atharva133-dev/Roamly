"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MapPin,
  Navigation,
  Clock,
  Car,
  Bus,
  Bike,
  Footprints,
  Star,
  Hotel,
  Compass,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  RefreshCw,
  Info,
  Loader2,
  Crosshair,
  Search,
  Utensils,
  Coffee,
} from "lucide-react";
import Link from "next/link";

export interface GroundedActivityStop {
  id: string;
  slot: string;
  placeId: string;
  name: string;
  startTime: string;
  endTime: string;
  estimatedCost?: number;
  day: string;
  dayNumber: number;
  city: string;
  date?: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  primaryType?: string | null;
  coordinatesUnavailable?: boolean;
  isResolving?: boolean;
}

export interface PlaceResult {
  placeId: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  primaryType?: string;
  types?: string[];
  rating?: number | null;
  userRatingCount?: number;
  regularOpeningHours?: any;
  priceLevel?: string | number | null;
  googleMapsUri?: string | null;
}

export interface RouteSummaryData {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  totalFare: number | null;
  currency: string;
  routeSource: string;
  distanceText: string;
  durationText: string;
  fareText: string;
}

export interface RouteLegData {
  fromIndex: number;
  toIndex: number;
  fromName: string;
  toName: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  routeSource: string;
  fare: number | null;
  currency: string;
  actualTravelModes: string[];
  encodedPolyline: string | null;
}

export interface ItineraryMapPanelProps {
  initialPlan?: any;
  tripId?: string | number | null;
}

type TravelMode = "CAB" | "PUBLIC_TRANSIT" | "TWO_WHEELER" | "WALKING";

/**
 * Decodes Google Encoded Polyline into an array of LatLng literals.
 */
export function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  if (!encoded) return [];
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/**
 * Persist resolved coordinates back into the saved plan in localStorage
 * so that subsequent visits load all stops instantly pinpointed without re-resolving.
 */
function syncResolvedCoordinatesToLocalStorage(
  stopId: string,
  data: {
    latitude: number;
    longitude: number;
    placeId?: string;
    address?: string | null;
    rating?: number | null;
    userRatingCount?: number | null;
    primaryType?: string | null;
  }
) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("roamly_accepted_plan");
    if (!raw) return;
    const plan = JSON.parse(raw);

    let changed = false;

    // 1. If groundedDays exist, update the matching activity
    if (Array.isArray(plan.groundedDays)) {
      plan.groundedDays.forEach((d: any, dayIdx: number) => {
        if (Array.isArray(d.activities)) {
          d.activities.forEach((act: any, actIdx: number) => {
            const actId = `grounded_${dayIdx}_${actIdx}_${act.placeId || actIdx}`;
            if (actId === stopId || (data.placeId && act.placeId === data.placeId)) {
              act.latitude = data.latitude;
              act.longitude = data.longitude;
              if (data.placeId) act.placeId = data.placeId;
              if (data.address) act.address = data.address;
              if (data.rating) act.rating = data.rating;
              if (data.userRatingCount) act.userRatingCount = data.userRatingCount;
              if (data.primaryType) act.primaryType = data.primaryType;
              changed = true;
            }
          });
        }
      });
    }

    // 2. Cache in coordinateCache map on the plan object
    if (!plan.coordinateCache) plan.coordinateCache = {};
    plan.coordinateCache[stopId] = data;
    changed = true;

    if (changed) {
      localStorage.setItem("roamly_accepted_plan", JSON.stringify(plan));
    }
  } catch (e) {
    console.warn("Failed to sync resolved coords to localStorage:", e);
  }
}

/**
 * Generate intelligent query candidates for an activity stop to maximize geocoding match rate.
 */
function getSearchQueries(name: string, city: string): string[] {
  const cleanCity = (city || "").replace(/\s*division/i, "").trim();
  // Strip bracketed times or notes like "(09:00 - 12:00)"
  const cleanName = (name || "").replace(/\s*\([^)]*\)/g, "").trim();
  const queries: string[] = [];

  // 1. Full clean name + city
  if (cleanCity && !cleanName.toLowerCase().includes(cleanCity.toLowerCase())) {
    queries.push(`${cleanName}, ${cleanCity}`);
  } else {
    queries.push(cleanName);
  }

  // 2. Strip leading action verbs (e.g. "Visit", "Explore", "Lunch at", "Relax at", "Check-in to", etc.)
  const strippedVerb = cleanName
    .replace(
      /^(visit|explore|tour|see|walk around|relax at|head to|check-in at|check in at|check-in to|check in to|lunch at|dinner at|breakfast at|shopping at|stroll through|morning at|evening at|afternoon at)\s+/i,
      ""
    )
    .trim();

  if (strippedVerb && strippedVerb !== cleanName) {
    if (cleanCity && !strippedVerb.toLowerCase().includes(cleanCity.toLowerCase())) {
      queries.push(`${strippedVerb}, ${cleanCity}`);
    }
    queries.push(strippedVerb);
  }

  // 3. Strip trailing descriptive words (e.g. "street food", "local market", "heritage walk", etc.)
  const strippedSuffix = (strippedVerb || cleanName)
    .replace(/\s+(street food|local market|market visit|photo stop|heritage walk|city tour|monument|attraction)$/i, "")
    .trim();

  if (strippedSuffix && strippedSuffix !== strippedVerb && strippedSuffix !== cleanName) {
    if (cleanCity) queries.push(`${strippedSuffix}, ${cleanCity}`);
    queries.push(strippedSuffix);
  }

  // 4. Fallback: cleanName alone
  if (!queries.includes(cleanName)) queries.push(cleanName);

  // 5. Ultimate fallback: cleanCity alone (guarantees a pinpoint on the map even for "Free time / Leisure")
  if (cleanCity && !queries.includes(cleanCity)) queries.push(cleanCity);

  return [...new Set(queries.filter(Boolean))];
}

/**
 * Robust multi-strategy resolver for a single activity stop.
 */
async function resolveSingleStop(stop: GroundedActivityStop): Promise<{
  id: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string;
  address: string | null;
  rating: number | null;
  userRatingCount: number | null;
  primaryType: string | null;
}> {
  let lat: number | null = null;
  let lng: number | null = null;
  let address: string | null = null;
  let rating: number | null = null;
  let userRatingCount: number | null = null;
  let primaryType: string | null = null;
  let resolvedPlaceId: string = stop.placeId || "";

  // Strategy 1: Place details by placeId if already available
  if (stop.placeId) {
    try {
      const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(stop.placeId)}`);
      if (res.ok) {
        const data = await res.json();
        const r = data.result;
        if (r && typeof r.latitude === "number" && typeof r.longitude === "number") {
          lat = r.latitude;
          lng = r.longitude;
          address = r.address || null;
          rating = r.rating || null;
          userRatingCount = r.userRatingCount || null;
          primaryType = r.primaryType || null;
          return { id: stop.id, latitude: lat, longitude: lng, placeId: resolvedPlaceId, address, rating, userRatingCount, primaryType };
        }
      }
    } catch {}
  }

  const queries = getSearchQueries(stop.name, stop.city);

  for (const query of queries) {
    // Strategy 2: Server geocoding gateway POST /api/locations/geocode
    try {
      const res = await fetch("/api/locations/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: query, name: stop.name }),
      });
      if (res.ok) {
        const data = await res.json();
        const loc = data?.location;
        const pLat = loc?.coordinates?.lat ?? loc?.latitude ?? loc?.lat;
        const pLng = loc?.coordinates?.lng ?? loc?.longitude ?? loc?.lng;
        if (typeof pLat === "number" && typeof pLng === "number" && Number.isFinite(pLat) && Number.isFinite(pLng)) {
          lat = pLat;
          lng = pLng;
          address = loc?.address?.formatted || loc?.formattedAddress || loc?.address?.city || null;
          if (loc?.googlePlaceId && !resolvedPlaceId) resolvedPlaceId = loc.googlePlaceId;
          break;
        }
      }
    } catch {}

    // Strategy 3: GET /api/locations?query=...
    try {
      const res = await fetch(`/api/locations?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        const loc = Array.isArray(data) ? data[0] : (data?.location || data);
        const pLat = loc?.coordinates?.lat ?? loc?.latitude ?? data?.latitude;
        const pLng = loc?.coordinates?.lng ?? loc?.longitude ?? data?.longitude;
        if (typeof pLat === "number" && typeof pLng === "number" && Number.isFinite(pLat) && Number.isFinite(pLng)) {
          lat = pLat;
          lng = pLng;
          address = loc?.formattedAddress || loc?.address?.formatted || data?.formattedAddress || null;
          if (loc?.googlePlaceId && !resolvedPlaceId) resolvedPlaceId = loc.googlePlaceId;
          break;
        }
      }
    } catch {}

    // Strategy 4: Search suggestions -> details
    try {
      const searchRes = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}`);
      if (searchRes.ok) {
        const sData = await searchRes.json();
        const first = sData?.suggestions?.[0];
        if (first?.placeId) {
          resolvedPlaceId = first.placeId;
          const detRes = await fetch(`/api/places/details?placeId=${encodeURIComponent(first.placeId)}`);
          if (detRes.ok) {
            const detData = await detRes.json();
            const r = detData.result;
            if (r && typeof r.latitude === "number" && typeof r.longitude === "number") {
              lat = r.latitude;
              lng = r.longitude;
              address = r.address || null;
              rating = r.rating || null;
              userRatingCount = r.userRatingCount || null;
              primaryType = r.primaryType || null;
              break;
            }
          }
        }
      }
    } catch {}

    // Strategy 5: Browser Google Maps Geocoder
    if (typeof window !== "undefined" && (window as any).google?.maps?.Geocoder) {
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        const geoRes = await new Promise<any>((resolve) => {
          geocoder.geocode({ address: query }, (results: any, status: any) => {
            if (status === "OK" && results?.[0]) {
              resolve(results[0]);
            } else {
              resolve(null);
            }
          });
        });
        if (geoRes?.geometry?.location) {
          lat = geoRes.geometry.location.lat();
          lng = geoRes.geometry.location.lng();
          address = geoRes.formatted_address || address;
          if (geoRes.place_id && !resolvedPlaceId) resolvedPlaceId = geoRes.place_id;
          break;
        }
      } catch {}
    }
  }

  return {
    id: stop.id,
    latitude: lat,
    longitude: lng,
    placeId: resolvedPlaceId,
    address,
    rating,
    userRatingCount,
    primaryType,
  };
}

/**
 * Fast lookup for popular global and Indian travel destination coordinates
 * ensuring instantaneous correct map centering without static hardcoding.
 */
const POPULAR_DESTINATIONS_COORDS: Record<string, { lat: number; lng: number }> = {
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.209 },
  "new delhi": { lat: 28.6139, lng: 77.209 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  goa: { lat: 15.2993, lng: 74.124 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  udaipur: { lat: 24.5854, lng: 73.7125 },
  jodhpur: { lat: 26.2389, lng: 73.0243 },
  jaisalmer: { lat: 26.9157, lng: 70.9083 },
  agra: { lat: 27.1767, lng: 78.0081 },
  varanasi: { lat: 25.3176, lng: 82.9739 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  kerala: { lat: 9.9312, lng: 76.2673 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  munnar: { lat: 10.0889, lng: 77.0595 },
  alleppey: { lat: 9.4981, lng: 76.3388 },
  manali: { lat: 32.2432, lng: 77.1892 },
  shimla: { lat: 31.1048, lng: 77.1734 },
  dharamsala: { lat: 32.219, lng: 76.3234 },
  rishikesh: { lat: 30.0869, lng: 78.2676 },
  amritsar: { lat: 31.634, lng: 74.8723 },
  pune: { lat: 18.5204, lng: 73.8567 },
  ladakh: { lat: 34.1526, lng: 77.5771 },
  leh: { lat: 34.1526, lng: 77.5771 },
  srinagar: { lat: 34.0837, lng: 74.7973 },
  paris: { lat: 48.8566, lng: 2.3522 },
  london: { lat: 51.5074, lng: -0.1278 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  kyoto: { lat: 35.0116, lng: 135.7681 },
  "new york": { lat: 40.7128, lng: -74.006 },
  dubai: { lat: 25.2048, lng: 55.2708 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  rome: { lat: 41.9028, lng: 12.4964 },
  bali: { lat: -8.4095, lng: 115.1889 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
  barcelona: { lat: 41.3879, lng: 2.1699 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  cairo: { lat: 30.0444, lng: 31.2357 },
};

/**
 * Geocode destination dynamically to guarantee the map never falls back statically to Delhi.
 */
async function geocodeDestination(destName: string): Promise<{ lat: number; lng: number } | null> {
  if (!destName) return null;
  const clean = destName.toLowerCase().replace(/\s*division/i, "").trim();
  if (POPULAR_DESTINATIONS_COORDS[clean]) {
    return POPULAR_DESTINATIONS_COORDS[clean];
  }

  // 1. Try server geocode gateway
  try {
    const res = await fetch("/api/locations/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: destName, name: destName }),
    });
    if (res.ok) {
      const data = await res.json();
      const loc = data?.location;
      const lat = loc?.coordinates?.lat ?? loc?.latitude;
      const lng = loc?.coordinates?.lng ?? loc?.longitude;
      if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
  } catch {}

  // 2. Try browser geocoder if Google Maps JS is loaded
  if (typeof window !== "undefined" && (window as any).google?.maps?.Geocoder) {
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      const geoRes = await new Promise<any>((resolve) => {
        geocoder.geocode({ address: destName }, (results: any, status: any) => {
          if (status === "OK" && results?.[0]?.geometry?.location) {
            resolve(results[0].geometry.location);
          } else {
            resolve(null);
          }
        });
      });
      if (geoRes) {
        return { lat: geoRes.lat(), lng: geoRes.lng() };
      }
    } catch {}
  }

  return null;
}

export function ItineraryMapPanel({ initialPlan }: ItineraryMapPanelProps) {
  const [stops, setStops] = useState<GroundedActivityStop[]>([]);
  const [tripMetadata, setTripMetadata] = useState<{
    summary?: string;
    destinations?: string[];
    startDate?: string;
    endDate?: string;
    totalBudget?: number;
  }>({});

  // Dynamic destination coordinates (NEVER static Delhi fallback)
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationName, setDestinationName] = useState<string>("");

  const [selectedDay, setSelectedDay] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"stops" | "nearby" | "hotels">("stops");
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);

  const [travelMode, setTravelMode] = useState<TravelMode>("CAB");
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [hasCalculatedRoute, setHasCalculatedRoute] = useState(false);
  const [routeSummary, setRouteSummary] = useState<RouteSummaryData | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Dynamic Nearby Places state & filters
  const [nearbyPlaces, setNearbyPlaces] = useState<PlaceResult[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState<number>(3000);
  const [nearbyCategory, setNearbyCategory] = useState<string>("all");

  // Dynamic Hotels state & filters
  const [hotels, setHotels] = useState<PlaceResult[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [hotelRadius, setHotelRadius] = useState<number>(5000);

  // Search query caching refs to prevent redundant requests while enabling dynamic re-search
  const lastNearbySearchKeyRef = useRef<string>("");
  const lastHotelSearchKeyRef = useRef<string>("");

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapScriptError, setMapScriptError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const stopMarkerMapRef = useRef<Map<string, any>>(new Map());
  const isComponentMountedRef = useRef(true);
  const isResolvingRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    isComponentMountedRef.current = true;
    return () => {
      isComponentMountedRef.current = false;
    };
  }, []);

  // 1. Load itinerary data from props or localStorage
  useEffect(() => {
    let planData = initialPlan;
    if (!planData && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("roamly_accepted_plan");
        if (stored) {
          planData = JSON.parse(stored);
        }
      } catch (e) {
        console.error("Failed to parse stored itinerary plan:", e);
      }
    }

    if (!planData) return;

    // Reset previous search & routing states for the new plan
    setSelectedStopId(null);
    setNearbyPlaces([]);
    setHotels([]);
    setRouteSummary(null);
    setHasCalculatedRoute(false);
    lastNearbySearchKeyRef.current = "";
    lastHotelSearchKeyRef.current = "";
    isResolvingRef.current = false;

    // Resolve primary destination dynamically
    const primaryDest = (planData.destinations && planData.destinations[0]) || "";
    if (primaryDest) {
      setDestinationName(primaryDest);
      const clean = primaryDest.toLowerCase().replace(/\s*division/i, "").trim();
      if (POPULAR_DESTINATIONS_COORDS[clean]) {
        setDestinationCoords(POPULAR_DESTINATIONS_COORDS[clean]);
      } else if (planData.destinationDetails?.[0]?.latitude && planData.destinationDetails?.[0]?.longitude) {
        setDestinationCoords({
          lat: Number(planData.destinationDetails[0].latitude),
          lng: Number(planData.destinationDetails[0].longitude),
        });
      } else {
        geocodeDestination(primaryDest).then((coords) => {
          if (coords && isComponentMountedRef.current) {
            setDestinationCoords(coords);
          }
        });
      }
    }

    // Initialize travel mode from user trip preference if available
    if (planData.transportation) {
      const t = String(planData.transportation).toLowerCase();
      if (t.includes("bike") || t.includes("wheel") || t.includes("two")) {
        setTravelMode("TWO_WHEELER");
      } else if (t.includes("transit") || t.includes("train") || t.includes("bus")) {
        setTravelMode("PUBLIC_TRANSIT");
      } else if (t.includes("walk")) {
        setTravelMode("WALKING");
      } else {
        setTravelMode("CAB");
      }
    }

    setTripMetadata({
      summary: planData.summary,
      destinations: planData.destinations,
      startDate: planData.startDate,
      endDate: planData.endDate,
      totalBudget: planData.totalBudget,
    });

    const parsedStops: GroundedActivityStop[] = [];

    // Prioritize raw grounded agent days
    if (Array.isArray(planData.groundedDays) && planData.groundedDays.length > 0) {
      planData.groundedDays.forEach((dayObj: any, dayIdx: number) => {
        const dayLabel = dayObj.day || `Day ${dayIdx + 1}`;
        const cityName = dayObj.city || "Destination";
        const dateStr = dayObj.date || "";

        if (Array.isArray(dayObj.activities)) {
          dayObj.activities.forEach((act: any, actIdx: number) => {
            const stopId = `grounded_${dayIdx}_${actIdx}_${act.placeId || actIdx}`;
            const cached = planData.coordinateCache?.[stopId];
            const rawLat = act.latitude ?? cached?.latitude;
            const rawLng = act.longitude ?? cached?.longitude;
            const hasLat = typeof rawLat === "number" && Number.isFinite(rawLat);
            const hasLng = typeof rawLng === "number" && Number.isFinite(rawLng);

            parsedStops.push({
              id: stopId,
              slot: act.slot || "activity",
              placeId: act.placeId || cached?.placeId || "",
              name: act.name || `Activity ${actIdx + 1}`,
              startTime: act.startTime || "09:00",
              endTime: act.endTime || "11:30",
              estimatedCost: act.estimatedCost,
              day: dayLabel,
              dayNumber: dayIdx + 1,
              city: cityName,
              date: dateStr,
              latitude: hasLat ? rawLat : undefined,
              longitude: hasLng ? rawLng : undefined,
              address: act.address || cached?.address || null,
              rating: act.rating ?? cached?.rating ?? null,
              userRatingCount: act.userRatingCount || cached?.userRatingCount || null,
              primaryType: act.primaryType || cached?.primaryType || null,
              coordinatesUnavailable: false,
              isResolving: !hasLat || !hasLng,
            });
          });
        }
      });
    } else if (Array.isArray(planData.plan?.itinerary)) {
      // Fallback for legacy format: extract discrete morning/afternoon/evening activities
      planData.plan.itinerary.forEach((dayObj: any, dayIdx: number) => {
        const dayLabel = dayObj.day || `Day ${dayIdx + 1}`;
        const cityName = dayObj.city || "Destination";

        const slots = [
          { key: "morning", text: dayObj.morning, defaultStart: "09:00", defaultEnd: "12:00" },
          { key: "afternoon", text: dayObj.afternoon, defaultStart: "13:00", defaultEnd: "16:00" },
          { key: "evening", text: dayObj.evening, defaultStart: "17:00", defaultEnd: "20:00" },
        ];

        slots.forEach(({ key, text, defaultStart, defaultEnd }, slotIdx) => {
          if (!text || text === "Free time") return;
          // Parse "Activity Name (09:00–11:30)" if formatted
          const timeMatch = text.match(/^(.*?)(?:\s*\((.*?)[–-](.*?)\))?$/);
          const actName = timeMatch?.[1]?.trim() || text;
          const startTime = timeMatch?.[2]?.trim() || defaultStart;
          const endTime = timeMatch?.[3]?.trim() || defaultEnd;

          const stopId = `legacy_${dayIdx}_${slotIdx}`;
          const cached = planData.coordinateCache?.[stopId];
          const hasLat = typeof cached?.latitude === "number" && Number.isFinite(cached.latitude);
          const hasLng = typeof cached?.longitude === "number" && Number.isFinite(cached.longitude);

          parsedStops.push({
            id: stopId,
            slot: key,
            placeId: cached?.placeId || "",
            name: actName,
            startTime,
            endTime,
            day: dayLabel,
            dayNumber: dayIdx + 1,
            city: cityName,
            latitude: hasLat ? cached.latitude : undefined,
            longitude: hasLng ? cached.longitude : undefined,
            address: cached?.address || null,
            rating: cached?.rating ?? null,
            userRatingCount: cached?.userRatingCount ?? null,
            primaryType: cached?.primaryType || null,
            coordinatesUnavailable: false,
            isResolving: !hasLat || !hasLng,
          });
        });
      });
    }

    setStops(parsedStops);
  }, [initialPlan]);

  // Dynamically synchronize destination coordinates whenever destinations or stops change
  useEffect(() => {
    const dest = tripMetadata.destinations?.[0] || stops[0]?.city || "";
    if (!dest) return;
    setDestinationName(dest);
    const clean = dest.toLowerCase().replace(/\s*division/i, "").trim();
    if (POPULAR_DESTINATIONS_COORDS[clean]) {
      setDestinationCoords(POPULAR_DESTINATIONS_COORDS[clean]);
      return;
    }
    geocodeDestination(dest).then((coords) => {
      if (coords && isComponentMountedRef.current) {
        setDestinationCoords(coords);
      }
    });
  }, [tripMetadata.destinations, stops]);

  // Reload all stops and re-resolve coordinates dynamically
  const handleReloadAllStops = useCallback(async () => {
    if (stops.length === 0) return;
    setStops((prev) =>
      prev.map((s) => ({
        ...s,
        isResolving: true,
        coordinatesUnavailable: false,
      }))
    );
    isResolvingRef.current = false;

    try {
      const batchSize = 3;
      const allResolved: any[] = [];
      for (let i = 0; i < stops.length; i += batchSize) {
        if (!isComponentMountedRef.current) break;
        const chunk = stops.slice(i, i + batchSize);
        const chunkResults = await Promise.all(chunk.map((stop) => resolveSingleStop(stop)));
        allResolved.push(...chunkResults);
      }

      if (!isComponentMountedRef.current) return;

      setStops((prev) =>
        prev.map((s) => {
          const found = allResolved.find((r) => r.id === s.id);
          if (!found) return s;
          if (found.latitude != null && found.longitude != null) {
            syncResolvedCoordinatesToLocalStorage(s.id, {
              latitude: found.latitude,
              longitude: found.longitude,
              placeId: found.placeId,
              address: found.address,
              rating: found.rating,
              userRatingCount: found.userRatingCount,
              primaryType: found.primaryType,
            });
            return {
              ...s,
              latitude: found.latitude,
              longitude: found.longitude,
              placeId: found.placeId || s.placeId,
              address: found.address || s.address,
              rating: found.rating ?? s.rating,
              userRatingCount: found.userRatingCount ?? s.userRatingCount,
              primaryType: found.primaryType ?? s.primaryType,
              coordinatesUnavailable: false,
              isResolving: false,
            };
          }
          return { ...s, isResolving: false, coordinatesUnavailable: true };
        })
      );
    } catch (e) {
      console.error("Failed to reload stops:", e);
    }
  }, [stops]);

  // 2. Resolve real Google Place coordinates for all unmapped stops (robust atomic batch)
  useEffect(() => {
    if (stops.length === 0) return;

    const unmappedStops = stops.filter(
      (s) => (s.latitude === undefined || s.longitude === undefined) && s.coordinatesUnavailable !== true
    );
    if (unmappedStops.length === 0) return;
    if (isResolvingRef.current) return;

    isResolvingRef.current = true;

    async function runResolution() {
      try {
        const batchSize = 3;
        const allResolved: any[] = [];

        for (let i = 0; i < unmappedStops.length; i += batchSize) {
          if (!isComponentMountedRef.current) break;
          const chunk = unmappedStops.slice(i, i + batchSize);
          const chunkResults = await Promise.all(chunk.map((stop) => resolveSingleStop(stop)));
          allResolved.push(...chunkResults);
        }

        if (!isComponentMountedRef.current) return;

        // Apply ALL resolved stops in ONE atomic update!
        setStops((prev) =>
          prev.map((s) => {
            const found = allResolved.find((r) => r.id === s.id);
            if (!found) return s;
            if (found.latitude != null && found.longitude != null) {
              return {
                ...s,
                latitude: found.latitude,
                longitude: found.longitude,
                placeId: found.placeId || s.placeId,
                address: found.address || s.address,
                rating: found.rating ?? s.rating,
                userRatingCount: found.userRatingCount ?? s.userRatingCount,
                primaryType: found.primaryType || s.primaryType,
                coordinatesUnavailable: false,
                isResolving: false,
              };
            }
            return {
              ...s,
              coordinatesUnavailable: true,
              isResolving: false,
            };
          })
        );

        // Sync resolved coordinates to localStorage
        allResolved.forEach((r) => {
          if (r.latitude != null && r.longitude != null) {
            syncResolvedCoordinatesToLocalStorage(r.id, {
              latitude: r.latitude,
              longitude: r.longitude,
              placeId: r.placeId,
              address: r.address,
              rating: r.rating,
              userRatingCount: r.userRatingCount,
              primaryType: r.primaryType,
            });
          }
        });
      } catch (err) {
        console.warn("Batch resolution error:", err);
      } finally {
        isResolvingRef.current = false;
      }
    }

    runResolution();
  }, [stops]);

  // 3. Load Google Maps Browser JavaScript API
  useEffect(() => {
    if (typeof window === "undefined") return;

    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      "";

    if (!apiKey) {
      setMapScriptError("NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY is not configured.");
      return;
    }

    if ((window as any).google?.maps) {
      setMapLoaded(true);
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => setMapLoaded(true));
      existingScript.addEventListener("error", () => setMapScriptError("Failed to load Google Maps script."));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setMapScriptError("Failed to load Google Maps script. Please verify API key and network.");
    document.head.appendChild(script);
  }, []);

  // Compute available days dynamically
  const availableDays = useMemo(() => {
    const daysSet = new Set<string>();
    stops.forEach((s) => {
      if (s.day) daysSet.add(s.day);
    });
    return Array.from(daysSet).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });
  }, [stops]);

  // Filter stops by selected day
  const visibleStops = useMemo(() => {
    if (selectedDay === "ALL") return stops;
    return stops.filter((s) => s.day === selectedDay);
  }, [stops, selectedDay]);

  // Stops with valid coordinates
  const mappedStops = useMemo(() => {
    return visibleStops.filter(
      (s) => typeof s.latitude === "number" && typeof s.longitude === "number" && Number.isFinite(s.latitude) && Number.isFinite(s.longitude)
    );
  }, [visibleStops]);

  // Anchor coordinate for Nearby & Hotel search (selected stop -> selected day -> first mapped stop -> destination coords)
  const searchAnchor = useMemo(() => {
    if (selectedStopId) {
      const match = stops.find((s) => s.id === selectedStopId);
      if (match?.latitude && match?.longitude) {
        return { lat: match.latitude, lng: match.longitude, name: match.name };
      }
    }
    if (selectedDay !== "ALL") {
      const dayStop = visibleStops.find((s) => s.latitude && s.longitude);
      if (dayStop) {
        return { lat: dayStop.latitude!, lng: dayStop.longitude!, name: `${dayStop.name} (${selectedDay})` };
      }
    }
    if (mappedStops.length > 0) {
      return { lat: mappedStops[0].latitude!, lng: mappedStops[0].longitude!, name: mappedStops[0].name };
    }
    if (destinationCoords) {
      return {
        lat: destinationCoords.lat,
        lng: destinationCoords.lng,
        name: destinationName || tripMetadata.destinations?.[0] || "Destination",
      };
    }
    return null;
  }, [selectedStopId, selectedDay, visibleStops, stops, mappedStops, destinationCoords, destinationName, tripMetadata.destinations]);

  // Initialize Map Instance with dynamic destination center
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    try {
      // Dynamic center: First mapped stop -> Destination coordinates -> Neutral Country center (NEVER hardcoded Delhi)
      const dynamicCenter = mappedStops[0]
        ? { lat: mappedStops[0].latitude!, lng: mappedStops[0].longitude! }
        : destinationCoords || { lat: 20.5937, lng: 78.9629 };
      const dynamicZoom = (mappedStops[0] || destinationCoords) ? 12 : 5;

      const map = new (window as any).google.maps.Map(mapContainerRef.current, {
        zoom: dynamicZoom,
        center: dynamicCenter,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "simplified" }] },
        ],
      });

      infoWindowRef.current = new (window as any).google.maps.InfoWindow();
      mapInstanceRef.current = map;
      setMapReady(true);
    } catch (e) {
      console.error("Google Maps initialization error:", e);
    }
  }, [mapLoaded, mappedStops, destinationCoords]);

  // Pan to destination coordinates if map instance exists and no mapped stops yet
  useEffect(() => {
    if (!mapInstanceRef.current || !destinationCoords) return;
    if (mappedStops.length === 0) {
      mapInstanceRef.current.panTo(destinationCoords);
      mapInstanceRef.current.setZoom(12);
    }
  }, [destinationCoords, mappedStops.length]);

  // Update Markers & Fit Bounds
  useEffect(() => {
    if (!mapInstanceRef.current || !(window as any).google?.maps) return;
    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    stopMarkerMapRef.current.clear();

    const bounds = new (window as any).google.maps.LatLngBounds();
    let hasPoints = false;

    // 1. Plot Activity Stops
    mappedStops.forEach((stop, index) => {
      const position = { lat: stop.latitude!, lng: stop.longitude! };
      bounds.extend(position);
      hasPoints = true;

      const isSelected = stop.id === selectedStopId;
      const markerNumber = index + 1;

      // Custom SVG Marker with Stop Number
      const svgIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
            <path d="M17 0C7.61 0 0 7.61 0 17c0 11.25 17 25 17 25s17-13.75 17-25C34 7.61 26.39 0 17 0z" fill="${isSelected ? "#2b380a" : "#485C11"}" stroke="#ffffff" stroke-width="2"/>
            <circle cx="17" cy="16" r="11" fill="#ffffff"/>
            <text x="17" y="20.5" font-size="12" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="${isSelected ? "#2b380a" : "#485C11"}">${markerNumber}</text>
          </svg>
        `)}`,
        scaledSize: new (window as any).google.maps.Size(34, 42),
        anchor: new (window as any).google.maps.Point(17, 42),
      };

      const marker = new (window as any).google.maps.Marker({
        position,
        map,
        title: `${markerNumber}. ${stop.name}`,
        icon: svgIcon,
        zIndex: isSelected ? 100 : 10,
      });

      marker.addListener("click", () => {
        setSelectedStopId(stop.id);
        if (infoWindow) {
          infoWindow.setContent(`
            <div style="font-family: sans-serif; padding: 6px 2px; max-width: 240px;">
              <span style="font-size: 10px; font-weight: 700; color: #485C11; text-transform: uppercase;">Stop ${markerNumber} · ${stop.day}</span>
              <h4 style="margin: 2px 0 4px; font-size: 14px; font-weight: 700; color: #111827;">${stop.name}</h4>
              <p style="margin: 0; font-size: 11px; color: #4b5563;">⏰ ${stop.startTime} – ${stop.endTime}</p>
              ${stop.address ? `<p style="margin: 4px 0 0; font-size: 10px; color: #6b7280; line-height: 1.3;">📍 ${stop.address}</p>` : ""}
            </div>
          `);
          infoWindow.open(map, marker);
        }
        const cardEl = document.getElementById(`stop-card-${stop.id}`);
        if (cardEl) {
          cardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      });

      stopMarkerMapRef.current.set(stop.id, marker);
      markersRef.current.push(marker);
    });

    // 2. Plot Nearby Places (if tab active)
    if (activeTab === "nearby" && nearbyPlaces.length > 0) {
      nearbyPlaces.forEach((place) => {
        if (!place.latitude || !place.longitude) return;
        const position = { lat: place.latitude, lng: place.longitude };
        bounds.extend(position);
        hasPoints = true;

        const pType = (place.primaryType || "").toLowerCase();
        const tList = (place.types || []).map((t) => t.toLowerCase());
        const isCafe = pType.includes("cafe") || pType.includes("coffee") || tList.includes("cafe") || tList.includes("coffee_shop");
        const isRestro = pType.includes("restaurant") || tList.includes("restaurant") || pType.includes("food");
        const isBakery = pType.includes("bakery") || tList.includes("bakery");

        let pinFill = "#d97706"; // Amber for attractions
        let emojiIcon = "⭐";
        let placeLabel = "Nearby Attraction";

        if (isCafe) {
          pinFill = "#92400e"; // Warm brown for cafes
          emojiIcon = "☕";
          placeLabel = "Cafe & Coffee";
        } else if (isRestro) {
          pinFill = "#e11d48"; // Rose/Crimson for restaurants
          emojiIcon = "🍽️";
          placeLabel = "Restaurant & Dining";
        } else if (isBakery) {
          pinFill = "#ea580c"; // Orange for bakery
          emojiIcon = "🥐";
          placeLabel = "Bakery & Desserts";
        }

        const svgIcon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38">
              <path d="M15 0C6.72 0 0 6.72 0 15c0 10.5 15 23 15 23s15-12.5 15-23C30 6.72 23.28 0 15 0z" fill="${pinFill}" stroke="#ffffff" stroke-width="1.5"/>
              <circle cx="15" cy="14" r="8" fill="#ffffff"/>
              <text x="15" y="18.5" font-size="10" font-family="sans-serif" text-anchor="middle">${emojiIcon}</text>
            </svg>
          `)}`,
          scaledSize: new (window as any).google.maps.Size(30, 38),
          anchor: new (window as any).google.maps.Point(15, 38),
        };

        const marker = new (window as any).google.maps.Marker({
          position,
          map,
          title: place.name,
          icon: svgIcon,
          zIndex: isRestro || isCafe ? 7 : 5,
        });

        marker.addListener("click", () => {
          if (infoWindow) {
            infoWindow.setContent(`
              <div style="font-family: sans-serif; padding: 4px; max-width: 230px;">
                <span style="font-size: 9px; font-weight: 700; color: ${pinFill}; text-transform: uppercase;">${emojiIcon} ${placeLabel}</span>
                <h4 style="margin: 2px 0 4px; font-size: 13px; font-weight: 700; color: #111827;">${place.name}</h4>
                ${place.rating ? `<p style="margin: 0; font-size: 11px; color: #d97706; font-weight: 600;">⭐ ${place.rating} (${place.userRatingCount || 0} reviews)</p>` : ""}
                ${place.address ? `<p style="margin: 4px 0 0; font-size: 10px; color: #6b7280;">📍 ${place.address}</p>` : ""}
              </div>
            `);
            infoWindow.open(map, marker);
          }
        });

        markersRef.current.push(marker);
      });
    }

    // 3. Plot Hotels (if tab active)
    if (activeTab === "hotels" && hotels.length > 0) {
      hotels.forEach((hotel) => {
        if (!hotel.latitude || !hotel.longitude) return;
        const position = { lat: hotel.latitude, lng: hotel.longitude };
        bounds.extend(position);
        hasPoints = true;

        const svgIcon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="34" viewBox="0 0 28 34">
              <path d="M14 0C6.27 0 0 6.27 0 14c0 9.25 14 20 14 20s14-10.75 14-20C28 6.27 21.73 0 14 0z" fill="#2563eb" stroke="#ffffff" stroke-width="1.5"/>
              <circle cx="14" cy="13" r="7" fill="#ffffff"/>
              <text x="14" y="16.5" font-size="9" font-family="sans-serif" text-anchor="middle" fill="#2563eb">🏨</text>
            </svg>
          `)}`,
          scaledSize: new (window as any).google.maps.Size(28, 34),
          anchor: new (window as any).google.maps.Point(14, 34),
        };

        const marker = new (window as any).google.maps.Marker({
          position,
          map,
          title: hotel.name,
          icon: svgIcon,
          zIndex: 6,
        });

        marker.addListener("click", () => {
          if (infoWindow) {
            infoWindow.setContent(`
              <div style="font-family: sans-serif; padding: 4px; max-width: 220px;">
                <span style="font-size: 9px; font-weight: 700; color: #2563eb; text-transform: uppercase;">Verified Hotel</span>
                <h4 style="margin: 2px 0 4px; font-size: 13px; font-weight: 700; color: #111827;">${hotel.name}</h4>
                ${hotel.rating ? `<p style="margin: 0; font-size: 11px; color: #d97706; font-weight: 600;">⭐ ${hotel.rating} (${hotel.userRatingCount || 0} reviews)</p>` : ""}
                ${hotel.address ? `<p style="margin: 4px 0 0; font-size: 10px; color: #6b7280;">📍 ${hotel.address}</p>` : ""}
              </div>
            `);
            infoWindow.open(map, marker);
          }
        });

        markersRef.current.push(marker);
      });
    }

    if (hasPoints) {
      if (mappedStops.length === 1 && activeTab === "stops") {
        map.setCenter({ lat: mappedStops[0].latitude!, lng: mappedStops[0].longitude! });
        map.setZoom(14);
      } else {
        map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
      }
    } else if (destinationCoords) {
      map.setCenter(destinationCoords);
      map.setZoom(12);
    }
  }, [mappedStops, selectedStopId, activeTab, nearbyPlaces, hotels, mapReady, destinationCoords]);

  // Handle focusing/pinpointing a stop on the map
  const handleFocusStop = useCallback((stop: GroundedActivityStop, index: number) => {
    setSelectedStopId(stop.id);
    if (mapInstanceRef.current && stop.latitude && stop.longitude) {
      mapInstanceRef.current.panTo({ lat: stop.latitude, lng: stop.longitude });
      mapInstanceRef.current.setZoom(15);
    }
    const marker = stopMarkerMapRef.current.get(stop.id);
    if (marker && infoWindowRef.current && mapInstanceRef.current) {
      infoWindowRef.current.setContent(`
        <div style="font-family: sans-serif; padding: 6px 2px; max-width: 240px;">
          <span style="font-size: 10px; font-weight: 700; color: #485C11; text-transform: uppercase;">Stop ${index + 1} · ${stop.day}</span>
          <h4 style="margin: 2px 0 4px; font-size: 14px; font-weight: 700; color: #111827;">${stop.name}</h4>
          <p style="margin: 0; font-size: 11px; color: #4b5563;">⏰ ${stop.startTime} – ${stop.endTime}</p>
          ${stop.address ? `<p style="margin: 4px 0 0; font-size: 10px; color: #6b7280; line-height: 1.3;">📍 ${stop.address}</p>` : ""}
        </div>
      `);
      infoWindowRef.current.open(mapInstanceRef.current, marker);
      if (marker.setAnimation) {
        marker.setAnimation((window as any).google.maps.Animation.BOUNCE);
        setTimeout(() => {
          try {
            marker.setAnimation(null);
          } catch {}
        }, 1200);
      }
    }
  }, []);

  // Handle retrying geocoding for a specific stop
  const handleRetryStop = useCallback((stopId: string) => {
    isResolvingRef.current = false;
    setStops((prev) =>
      prev.map((s) => (s.id === stopId ? { ...s, coordinatesUnavailable: false, isResolving: true } : s))
    );
  }, []);

  // Execute Route Calculation
  const handleCalculateRoute = useCallback(async () => {
    if (mappedStops.length < 2) {
      setRouteError("At least 2 itinerary stops with mapped coordinates are needed to calculate a route.");
      return;
    }

    setIsCalculatingRoute(true);
    setRouteError(null);

    // Clear previous polylines
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    try {
      const payload = {
        mode: travelMode,
        stops: mappedStops.map((s) => ({
          lat: s.latitude,
          lng: s.longitude,
          name: s.name,
          placeId: s.placeId,
        })),
      };

      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to calculate route");
      }

      setRouteSummary(data.summary);

      // Render Polylines on Google Map
      if (mapInstanceRef.current && (window as any).google?.maps) {
        const map = mapInstanceRef.current;
        const modeColors: Record<TravelMode, string> = {
          CAB: "#1e40af",
          PUBLIC_TRANSIT: "#7c3aed",
          TWO_WHEELER: "#485C11",
          WALKING: "#059669",
        };
        const color = modeColors[travelMode] || "#485C11";

        const polylinesToDraw: string[] = data.polylines || [];
        const allPoints: Array<{ lat: number; lng: number }> = [];

        polylinesToDraw.forEach((encoded) => {
          if (!encoded) return;
          const decoded = decodePolyline(encoded);
          if (decoded.length > 0) {
            allPoints.push(...decoded);
            const polyline = new (window as any).google.maps.Polyline({
              path: decoded,
              geodesic: true,
              strokeColor: color,
              strokeOpacity: 0.85,
              strokeWeight: 5,
              map,
            });
            polylinesRef.current.push(polyline);
          }
        });

        // Fit map to full decoded polyline
        if (allPoints.length > 0) {
          const polyBounds = new (window as any).google.maps.LatLngBounds();
          allPoints.forEach((pt) => polyBounds.extend(pt));
          map.fitBounds(polyBounds, { top: 60, bottom: 60, left: 60, right: 60 });
        }
      }
    } catch (err: any) {
      console.error("Route calculation error:", err);
      setRouteError(err.message || "Failed to calculate route");
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [mappedStops, travelMode]);

  // Clear route polylines and reset route state
  const handleClearRoute = useCallback(() => {
    setHasCalculatedRoute(false);
    setRouteSummary(null);
    setRouteError(null);
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
  }, []);

  // ONLY re-calculate if the user has ALREADY explicitly triggered route calculation!
  // Never auto-calculate or draw routes from starting.
  useEffect(() => {
    if (hasCalculatedRoute && mappedStops.length >= 2) {
      handleCalculateRoute();
    }
  }, [hasCalculatedRoute, travelMode, selectedDay, handleCalculateRoute, mappedStops.length]);

  // Execute Nearby Search with dynamic anchor, radius, and types
  const handleSearchNearby = useCallback(
    async (
      anchorOverride?: { lat: number; lng: number; name?: string },
      radiusOverride?: number,
      categoryOverride?: string
    ) => {
      const targetAnchor = anchorOverride || searchAnchor;
      if (!targetAnchor) return;
      const targetRadius = radiusOverride ?? nearbyRadius;
      const targetCategory = categoryOverride ?? nearbyCategory;

      let typesParam = "tourist_attraction,restaurant,cafe,museum,park";
      if (targetCategory === "restaurants") {
        typesParam = "restaurant,meal_takeaway,bar";
      } else if (targetCategory === "cafes") {
        typesParam = "cafe,bakery";
      } else if (targetCategory === "food") {
        typesParam = "restaurant,cafe,bakery,bar";
      } else if (targetCategory === "culture") {
        typesParam = "museum,historical_landmark,art_gallery,place_of_worship";
      } else if (targetCategory === "nature") {
        typesParam = "park,natural_feature,campground";
      } else if (targetCategory === "shopping") {
        typesParam = "shopping_mall,market,clothing_store";
      }

      setLoadingNearby(true);
      try {
        const res = await fetch(
          `/api/places/nearby?lat=${targetAnchor.lat}&lng=${targetAnchor.lng}&radius=${targetRadius}&types=${typesParam}&maxResults=15`
        );
        const data = await res.json();
        setNearbyPlaces(data.places || []);
      } catch (err) {
        console.error("Failed to search nearby places:", err);
      } finally {
        setLoadingNearby(false);
      }
    },
    [searchAnchor, nearbyRadius, nearbyCategory]
  );

  // Execute Hotel Search with dynamic anchor and radius
  const handleSearchHotels = useCallback(
    async (
      anchorOverride?: { lat: number; lng: number; name?: string },
      radiusOverride?: number
    ) => {
      const targetAnchor = anchorOverride || searchAnchor;
      if (!targetAnchor) return;
      const targetRadius = radiusOverride ?? hotelRadius;

      setLoadingHotels(true);
      try {
        const res = await fetch(
          `/api/places/nearby?lat=${targetAnchor.lat}&lng=${targetAnchor.lng}&radius=${targetRadius}&types=lodging,hotel&maxResults=15`
        );
        const data = await res.json();
        setHotels(data.places || []);
      } catch (err) {
        console.error("Failed to search hotels:", err);
      } finally {
        setLoadingHotels(false);
      }
    },
    [searchAnchor, hotelRadius]
  );

  // Dynamically search at current map view center
  const handleSearchCurrentMapView = useCallback(() => {
    if (!mapInstanceRef.current) return;
    const center = mapInstanceRef.current.getCenter();
    if (!center) return;
    const mapAnchor = {
      lat: center.lat(),
      lng: center.lng(),
      name: `Map Center (${center.lat().toFixed(2)}, ${center.lng().toFixed(2)})`,
    };
    if (activeTab === "nearby") {
      lastNearbySearchKeyRef.current = `${mapAnchor.lat.toFixed(3)},${mapAnchor.lng.toFixed(3)}_${nearbyRadius}_${nearbyCategory}`;
      handleSearchNearby(mapAnchor, nearbyRadius, nearbyCategory);
    } else if (activeTab === "hotels") {
      lastHotelSearchKeyRef.current = `${mapAnchor.lat.toFixed(3)},${mapAnchor.lng.toFixed(3)}_${hotelRadius}`;
      handleSearchHotels(mapAnchor, hotelRadius);
    }
  }, [activeTab, nearbyRadius, nearbyCategory, hotelRadius, handleSearchNearby, handleSearchHotels]);

  // Dynamically trigger searches whenever active tab, anchor, radius, or category changes
  useEffect(() => {
    if (!searchAnchor) return;

    if (activeTab === "nearby") {
      const currentKey = `${searchAnchor.lat.toFixed(3)},${searchAnchor.lng.toFixed(3)}_${nearbyRadius}_${nearbyCategory}`;
      if (lastNearbySearchKeyRef.current !== currentKey) {
        lastNearbySearchKeyRef.current = currentKey;
        handleSearchNearby(searchAnchor, nearbyRadius, nearbyCategory);
      }
    } else if (activeTab === "hotels") {
      const currentKey = `${searchAnchor.lat.toFixed(3)},${searchAnchor.lng.toFixed(3)}_${hotelRadius}`;
      if (lastHotelSearchKeyRef.current !== currentKey) {
        lastHotelSearchKeyRef.current = currentKey;
        handleSearchHotels(searchAnchor, hotelRadius);
      }
    }
  }, [activeTab, searchAnchor, nearbyRadius, nearbyCategory, hotelRadius, handleSearchNearby, handleSearchHotels]);

  // Clean polylines when day filter changes
  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];
    setRouteSummary(null);
    setRouteError(null);
  }, [selectedDay]);

  return (
    <div className="flex flex-col lg:flex-row h-full w-full min-h-[680px] lg:h-[calc(100vh-80px)] bg-[#FAFBF8] border border-[#e5e7db] rounded-2xl overflow-hidden shadow-lg">
      {/* LEFT PANEL: Controls, Filters & List */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex flex-col h-[520px] lg:h-full border-b lg:border-b-0 lg:border-r border-[#e5e7db] bg-white shrink-0">
        {/* Header & Itinerary Title */}
        <div className="p-4 border-b border-[#e5e7db] bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h2 className="text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#485C11]" />
              Itinerary Map & Stops
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleReloadAllStops}
                disabled={stops.some((s) => s.isResolving)}
                className="text-[11px] font-semibold text-[#485C11] hover:text-[#2d3a0b] flex items-center gap-1 bg-[#f4f6ef] px-2 py-0.5 rounded-lg border border-[#e5e7db] transition-colors cursor-pointer"
                title="Reload & re-geocode all stops for this destination"
              >
                <RefreshCw className={`w-3 h-3 ${stops.some((s) => s.isResolving) ? "animate-spin" : ""}`} />
                <span>{stops.some((s) => s.isResolving) ? "Resolving..." : "Reload Stops"}</span>
              </button>
              <span className="text-[11px] font-semibold text-[#485C11] bg-[#DFECC6]/40 px-2.5 py-0.5 rounded-full border border-[#485C11]/20">
                Grounded
              </span>
            </div>
          </div>

          <p className="text-xs text-[#6b7280]">
            Destination: <strong className="text-[#1a1a1a]">{destinationName || tripMetadata.destinations?.join(" → ") || "Dynamic"}</strong>
            {destinationCoords && (
              <span className="ml-1 text-[10px] text-[#485C11] font-mono">
                ({destinationCoords.lat.toFixed(2)}, {destinationCoords.lng.toFixed(2)})
              </span>
            )}
          </p>

          {/* DAY FILTER TABS */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedDay("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                selectedDay === "ALL"
                  ? "bg-[#485C11] text-white shadow-sm"
                  : "bg-[#f4f6ef] text-[#4b5563] hover:bg-[#e5e7db] hover:text-[#1a1a1a]"
              }`}
            >
              All Days ({stops.length})
            </button>
            {availableDays.map((day) => {
              const count = stops.filter((s) => s.day === day).length;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                    selectedDay === day
                      ? "bg-[#485C11] text-white shadow-sm"
                      : "bg-[#f4f6ef] text-[#4b5563] hover:bg-[#e5e7db] hover:text-[#1a1a1a]"
                  }`}
                >
                  {day} ({count})
                </button>
              );
            })}
          </div>

          {/* TABS: STOPS | NEARBY | HOTELS */}
          <div className="grid grid-cols-3 gap-1.5 mt-3 bg-[#f4f6ef] p-1 rounded-xl border border-[#e5e7db]">
            <button
              onClick={() => setActiveTab("stops")}
              className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "stops" ? "bg-white text-[#485C11] shadow-xs" : "text-[#6b7280] hover:text-[#1a1a1a]"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Stops ({visibleStops.length})
            </button>
            <button
              onClick={() => setActiveTab("nearby")}
              className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "nearby" ? "bg-white text-[#d97706] shadow-xs" : "text-[#6b7280] hover:text-[#1a1a1a]"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Nearby ({nearbyPlaces.length})
            </button>
            <button
              onClick={() => setActiveTab("hotels")}
              className={`py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "hotels" ? "bg-white text-[#2563eb] shadow-xs" : "text-[#6b7280] hover:text-[#1a1a1a]"
              }`}
            >
              <Hotel className="w-3.5 h-3.5" />
              Hotels ({hotels.length})
            </button>
          </div>
        </div>

        {/* ROUTING CONTROLS (Only visible on Stops tab) */}
        {activeTab === "stops" && (
          <div className="p-3 border-b border-[#e5e7db] bg-[#fafbf7]">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-[#4b5563] uppercase tracking-wider flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5 text-[#485C11]" />
                  Travel Mode
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DFECC6] text-[#303f0b] border border-[#8E9C78]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#485C11] animate-pulse" />
                  ACTIVE
                </span>
              </div>

              {/* Mode Buttons */}
              <div className="flex items-center gap-1">
                {(
                  [
                    { mode: "CAB", label: "Car", icon: Car },
                    { mode: "PUBLIC_TRANSIT", label: "Transit", icon: Bus },
                    { mode: "TWO_WHEELER", label: "2-Wheeler", icon: Bike },
                    { mode: "WALKING", label: "Walk", icon: Footprints },
                  ] as const
                ).map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setTravelMode(mode)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      travelMode === mode
                        ? "bg-[#485C11] text-white shadow-xs"
                        : "bg-white text-[#6b7280] hover:text-[#1a1a1a] border border-[#e5e7db]"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Calculating State or Action Row */}
            {isCalculatingRoute ? (
              <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#DFECC6]/40 border border-[#8E9C78]/30 text-xs font-semibold text-[#303f0b] mt-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#485C11]" />
                Calculating Google route & polyline...
              </div>
            ) : !hasCalculatedRoute ? (
              <button
                type="button"
                onClick={() => {
                  setHasCalculatedRoute(true);
                  handleCalculateRoute();
                }}
                disabled={mappedStops.length < 2}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#485C11] hover:bg-[#3a4d0d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>
                  {mappedStops.length < 2
                    ? "Need 2+ mapped stops to route"
                    : `Show Route (${travelMode === "CAB" ? "Cab" : travelMode === "PUBLIC_TRANSIT" ? "Transit" : travelMode === "TWO_WHEELER" ? "2-Wheeler" : "Walking"})`}
                </span>
              </button>
            ) : null}

            {/* Route Error if any */}
            {routeError && (
              <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" />
                <span>{routeError}</span>
              </div>
            )}

            {/* ROUTE SUMMARY DISPLAY */}
            {routeSummary && (
              <div className="mt-2.5 p-3 rounded-xl bg-white border border-[#DFECC6] shadow-xs">
                <div className="flex items-center justify-between text-[11px] text-[#6b7280] mb-1.5">
                  <span className="font-semibold text-[#1a1a1a] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#485C11]" />
                    Live Route Connected
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-[#DFECC6]/40 text-[#485C11] font-bold text-[10px]">
                      Source: {routeSummary.routeSource}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearRoute}
                      className="text-[10px] text-gray-500 hover:text-red-600 font-semibold px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Hide route lines"
                    >
                      Hide Route
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-[#f0f4e8]">
                  <div>
                    <span className="block text-[10px] text-[#6b7280]">Distance</span>
                    <strong className="text-xs text-[#1a1a1a]">{routeSummary.distanceText}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#6b7280]">Travel Time</span>
                    <strong className="text-xs text-[#1a1a1a]">{routeSummary.durationText}</strong>
                  </div>
                  <div>
                    <span className="block text-[10px] text-[#6b7280]">Est. Fare</span>
                    <strong className="text-xs text-[#485C11]">{routeSummary.fareText}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SCROLLABLE LIST AREA */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {/* TAB 1: STOPS LIST */}
          {activeTab === "stops" && (
            <>
              {visibleStops.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MapPin className="w-8 h-8 text-[#9ca3af] mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-[#4b5563]">No itinerary stops for this day</p>
                  <p className="text-xs text-[#9ca3af] mt-1">Select "All Days" to view the complete schedule.</p>
                </div>
              ) : (
                visibleStops.map((stop, index) => {
                  const isSelected = stop.id === selectedStopId;
                  const isMapped = typeof stop.latitude === "number" && typeof stop.longitude === "number";

                  return (
                    <div
                      key={stop.id}
                      id={`stop-card-${stop.id}`}
                      onClick={() => handleFocusStop(stop, index)}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-[#f4f7ee] border-[#485C11] shadow-md ring-1 ring-[#485C11]/30"
                          : "bg-white border-[#e5e7db] hover:border-[#485C11]/40 hover:shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          {/* Stop Number Badge */}
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                              isSelected
                                ? "bg-[#485C11] text-white shadow-xs"
                                : "bg-[#f0f4e8] text-[#485C11] border border-[#485C11]/20"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            {/* Real Activity Name */}
                            <h3 className="text-sm font-bold text-[#1a1a1a] leading-tight">
                              {stop.name}
                            </h3>

                            {/* City and Day metadata */}
                            <p className="text-[11px] text-[#6b7280] mt-0.5 font-medium">
                              {stop.day} · {stop.city}
                              {stop.slot && (
                                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-gray-100 text-[#4b5563] text-[9.5px] uppercase font-semibold">
                                  {stop.slot}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Estimated Cost if present */}
                        {typeof stop.estimatedCost === "number" && stop.estimatedCost > 0 && (
                          <span className="text-xs font-bold text-[#485C11] shrink-0">
                            ₹{stop.estimatedCost}
                          </span>
                        )}
                      </div>

                      {/* Time & Coordinate status */}
                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-gray-100 text-xs">
                        <span className="flex items-center gap-1 text-[#4b5563] font-medium text-[11px]">
                          <Clock className="w-3 h-3 text-[#485C11]" />
                          {stop.startTime} – {stop.endTime}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isMapped && (
                            <span className="text-[10px] text-[#485C11] font-semibold flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              View on Map
                            </span>
                          )}
                          {isMapped ? (
                            <span className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 border border-green-200">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              Mapped
                            </span>
                          ) : stop.coordinatesUnavailable ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetryStop(stop.id);
                              }}
                              className="text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 border border-amber-200 transition-colors cursor-pointer"
                              title="Click to retry finding location on map"
                            >
                              <RefreshCw className="w-2.5 h-2.5" />
                              Retry Location
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#485C11] bg-[#485C11]/10 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-[#485C11]" />
                              Locating...
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Address preview */}
                      {stop.address && (
                        <p className="text-[10.5px] text-[#6b7280] mt-1.5 line-clamp-1">
                          📍 {stop.address}
                        </p>
                      )}

                      {/* Place ID metadata */}
                      {stop.placeId && (
                        <span className="block mt-1 text-[9px] font-mono text-[#9ca3af] truncate">
                          ID: {stop.placeId}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* TAB 2: NEARBY ATTRACTIONS */}
          {activeTab === "nearby" && (
            <div className="space-y-3">
              {/* Location & Search Controls Header */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 space-y-2.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Compass className="w-3.5 h-3.5 text-[#d97706] shrink-0" />
                    <span className="text-xs font-bold text-[#92400e] truncate">
                      Near: {searchAnchor?.name || destinationName || "Destination"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleSearchCurrentMapView}
                      disabled={loadingNearby}
                      className="text-[11px] text-[#92400e] hover:text-[#78350f] font-semibold flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-amber-200 shadow-2xs hover:bg-amber-50/50 transition-all cursor-pointer"
                      title="Search around current map view center"
                    >
                      <Crosshair className="w-3 h-3 text-[#d97706]" />
                      Map Area
                    </button>
                    <button
                      onClick={() => handleSearchNearby()}
                      disabled={loadingNearby}
                      className="text-[11px] text-[#92400e] hover:text-[#78350f] font-semibold flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-amber-200 shadow-2xs hover:bg-amber-50/50 transition-all cursor-pointer"
                      title="Refresh nearby attractions"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingNearby ? "animate-spin text-[#d97706]" : ""}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Radius selector */}
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-gray-500 font-medium shrink-0">Radius:</span>
                  {[
                    { label: "1.5 km", val: 1500 },
                    { label: "3 km", val: 3000 },
                    { label: "5 km", val: 5000 },
                    { label: "10 km", val: 10000 },
                  ].map((r) => (
                    <button
                      key={r.val}
                      onClick={() => setNearbyRadius(r.val)}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                        nearbyRadius === r.val
                          ? "bg-[#d97706] text-white shadow-2xs"
                          : "bg-white text-gray-600 border border-amber-200/70 hover:bg-amber-100/50"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {/* Category selector */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[10.5px]">
                  {[
                    { label: "⭐ All", key: "all" },
                    { label: "🍽️ Restros", key: "restaurants" },
                    { label: "☕ Cafes", key: "cafes" },
                    { label: "🏛️ Culture", key: "culture" },
                    { label: "🌳 Nature", key: "nature" },
                    { label: "🛍️ Shopping", key: "shopping" },
                  ].map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setNearbyCategory(c.key)}
                      className={`px-2.5 py-0.5 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        nearbyCategory === c.key
                          ? "bg-[#d97706] text-white shadow-2xs"
                          : "bg-white/90 text-gray-700 border border-amber-200/60 hover:bg-white hover:text-black"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingNearby ? (
                <div className="text-center py-10 text-xs text-[#6b7280]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#d97706]" />
                  Searching real nearby places via Google Places...
                </div>
              ) : nearbyPlaces.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#9ca3af]">
                  No places found within {nearbyRadius / 1000}km. Try expanding the radius or switching categories.
                </div>
              ) : (
                nearbyPlaces.map((place) => {
                  const pType = (place.primaryType || "").toLowerCase();
                  const tList = (place.types || []).map((t) => t.toLowerCase());
                  const isCafe = pType.includes("cafe") || pType.includes("coffee") || tList.includes("cafe") || tList.includes("coffee_shop");
                  const isRestro = pType.includes("restaurant") || tList.includes("restaurant") || pType.includes("food");
                  const isBakery = pType.includes("bakery") || tList.includes("bakery");

                  let badgeLabel = place.primaryType?.replace(/_/g, " ") || "Attraction";
                  let badgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
                  let cardHover = "hover:border-[#d97706]/40";
                  let BadgeIcon = Compass;

                  if (isCafe) {
                    badgeLabel = "Cafe & Coffee";
                    badgeStyle = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
                    cardHover = "hover:border-amber-400";
                    BadgeIcon = Coffee;
                  } else if (isRestro) {
                    badgeLabel = "Restaurant";
                    badgeStyle = "bg-rose-100 text-rose-900 border-rose-300 font-bold";
                    cardHover = "hover:border-rose-400";
                    BadgeIcon = Utensils;
                  } else if (isBakery) {
                    badgeLabel = "Bakery & Desserts";
                    badgeStyle = "bg-orange-100 text-orange-900 border-orange-300 font-bold";
                    cardHover = "hover:border-orange-400";
                    BadgeIcon = Utensils;
                  }

                  return (
                    <div
                      key={place.placeId}
                      onClick={() => {
                        if (place.latitude && place.longitude && mapInstanceRef.current) {
                          mapInstanceRef.current.panTo({ lat: place.latitude, lng: place.longitude });
                          mapInstanceRef.current.setZoom(16);
                        }
                      }}
                      className={`p-3 rounded-xl border border-[#e5e7db] bg-white ${cardHover} hover:shadow-xs cursor-pointer transition-all`}
                    >
                      <div className="flex items-start justify-between gap-1.5 mb-1">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                          <BadgeIcon className="w-3 h-3 shrink-0" />
                          <span className="capitalize">{badgeLabel}</span>
                        </span>
                        {place.rating && (
                          <span className="text-[11px] font-bold text-[#d97706] flex items-center gap-0.5 shrink-0">
                            <Star className="w-3 h-3 fill-[#d97706]" />
                            {place.rating}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-[#1a1a1a] leading-tight">{place.name}</h4>

                      {place.address && (
                        <p className="text-[10.5px] text-[#6b7280] mt-1 line-clamp-1">📍 {place.address}</p>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100 text-[10px]">
                        <span className="text-[#6b7280]">
                          {isCafe ? "☕ Hot brews & snacks" : isRestro ? "🍽️ Dining & cuisine" : "Attraction"}
                        </span>
                        {place.userRatingCount ? (
                          <span className="text-[#9ca3af]">{place.userRatingCount.toLocaleString()} reviews</span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: HOTELS */}
          {activeTab === "hotels" && (
            <div className="space-y-3">
              {/* Location & Search Controls Header */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 space-y-2.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Hotel className="w-3.5 h-3.5 text-[#2563eb] shrink-0" />
                    <span className="text-xs font-bold text-[#1e40af] truncate">
                      Hotels near {searchAnchor?.name || destinationName || "Destination"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleSearchCurrentMapView}
                      disabled={loadingHotels}
                      className="text-[11px] text-[#1e40af] hover:text-[#1e3a8a] font-semibold flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-blue-200 shadow-2xs hover:bg-blue-50/50 transition-all cursor-pointer"
                      title="Search around current map view center"
                    >
                      <Crosshair className="w-3 h-3 text-[#2563eb]" />
                      Map Area
                    </button>
                    <button
                      onClick={() => handleSearchHotels()}
                      disabled={loadingHotels}
                      className="text-[11px] text-[#1e40af] hover:text-[#1e3a8a] font-semibold flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-blue-200 shadow-2xs hover:bg-blue-50/50 transition-all cursor-pointer"
                      title="Refresh verified hotels"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingHotels ? "animate-spin text-[#2563eb]" : ""}`} />
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Radius selector */}
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-gray-500 font-medium shrink-0">Radius:</span>
                  {[
                    { label: "2 km", val: 2000 },
                    { label: "5 km", val: 5000 },
                    { label: "10 km", val: 10000 },
                    { label: "25 km", val: 25000 },
                  ].map((r) => (
                    <button
                      key={r.val}
                      onClick={() => setHotelRadius(r.val)}
                      className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                        hotelRadius === r.val
                          ? "bg-[#2563eb] text-white shadow-2xs"
                          : "bg-white text-gray-600 border border-blue-200/70 hover:bg-blue-100/50"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingHotels ? (
                <div className="text-center py-10 text-xs text-[#6b7280]">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#2563eb]" />
                  Searching real hotels via Google Places...
                </div>
              ) : hotels.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#9ca3af]">
                  No hotels found within {hotelRadius / 1000}km. Try expanding the search radius or clicking "Map Area".
                </div>
              ) : (
                hotels.map((hotel) => (
                  <div
                    key={hotel.placeId}
                    onClick={() => {
                      if (hotel.latitude && hotel.longitude && mapInstanceRef.current) {
                        mapInstanceRef.current.panTo({ lat: hotel.latitude, lng: hotel.longitude });
                        mapInstanceRef.current.setZoom(16);
                      }
                    }}
                    className="p-3 rounded-xl border border-[#e5e7db] bg-white hover:border-[#2563eb]/40 hover:shadow-xs cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-bold text-[#1a1a1a] leading-tight">{hotel.name}</h4>
                      {hotel.rating && (
                        <span className="text-[11px] font-bold text-[#d97706] flex items-center gap-0.5 shrink-0">
                          <Star className="w-3 h-3 fill-[#d97706]" />
                          {hotel.rating}
                        </span>
                      )}
                    </div>
                    {hotel.address && (
                      <p className="text-[10.5px] text-[#6b7280] mt-1 line-clamp-1">📍 {hotel.address}</p>
                    )}
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100 text-[10px]">
                      <span className="text-[#2563eb] font-medium">🏨 Lodging</span>
                      {hotel.userRatingCount && (
                        <span className="text-[#9ca3af]">{hotel.userRatingCount} reviews</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: GOOGLE MAP */}
      <div className="flex-1 relative w-full h-[400px] lg:h-full bg-[#f4f4f4]">
        {/* Google Map Container */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Fallback Overlay if Maps script failed */}
        {mapScriptError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-white/90 backdrop-blur-xs">
            <div className="max-w-md p-6 bg-white border border-red-200 rounded-2xl shadow-lg text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-gray-900 mb-1">Google Maps Unavailable</h3>
              <p className="text-xs text-gray-600 mb-4">{mapScriptError}</p>
              <p className="text-[11px] text-gray-500">
                Ensure <code>NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY</code> is configured in <code>.env</code>.
              </p>
            </div>
          </div>
        )}

        {/* Loading Overlay while initializing */}
        {!mapLoaded && !mapScriptError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#FAFBF8]">
            <div className="flex flex-col items-center gap-2">
              <Compass className="w-8 h-8 text-[#485C11] animate-spin" />
              <span className="text-xs font-semibold text-[#485C11]">Loading Google Maps...</span>
            </div>
          </div>
        )}

        {/* Legend / Status Overlay at bottom of Map */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-10 p-2.5 rounded-xl bg-white/95 backdrop-blur-md border border-[#e5e7db] shadow-md text-xs">
          <div className="flex items-center flex-wrap gap-2.5 text-[11px] font-medium text-[#4b5563]">
            <span className="flex items-center gap-1 font-semibold text-[#1a1a1a]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#485C11]" />
              Stops ({mappedStops.length})
            </span>
            {routeSummary && (
              <span className="flex items-center gap-1 text-[#485C11] font-semibold">
                <Navigation className="w-3 h-3" />
                {routeSummary.distanceText} · {routeSummary.durationText}
              </span>
            )}
            {activeTab === "nearby" && (
              <span className="flex items-center gap-1 text-[#d97706]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]" />
                Nearby Attractions
              </span>
            )}
            {activeTab === "hotels" && (
              <span className="flex items-center gap-1 text-[#2563eb]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]" />
                Hotels
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ItineraryMapPanel;
