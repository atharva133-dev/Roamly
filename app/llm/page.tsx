"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { differenceInDays, parseISO, format, addDays, isBefore, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MultiSelectInterests } from "@/components/ui/multi-select-interests";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

// react-day-picker touches window/document during measurement — load client-only,
// matching the pattern already used in app/mapcalendar/page.tsx.
const Calendar = dynamic(() => import("@/components/ui/calendar").then((mod) => mod.Calendar), {
  ssr: false,
  loading: () => <div className="p-6 text-sm text-muted-foreground">Loading calendar…</div>,
});
import {
  Plane,
  Calendar as CalendarIcon,
  MapPin,
  Compass,
  IndianRupee,
  Hotel,
  Car,
  Heart,
  Lightbulb,
  Loader2,
  CheckCircle,
  AlertCircle,
  Globe,
  Clock,
  Star,
  Check,
  X,
  RotateCcw,
  Edit3,
  ArrowRight,
  Sparkles,
  Search,
  LocateFixed,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  User,
  Languages,
  Award,
  Lock,
  PhoneCall,
  Luggage,
  Copy,
  Shield,
  ExternalLink,
  CheckSquare,
  Square,
  Sun,
  Sunrise,
  Moon,
  Utensils,
  Layers,
  Plus,
  Trash2,
  CreditCard,
  Landmark,
  Bus,
  Zap,
} from "lucide-react";
import {
  buildDestinationTips,
  buildEmergencyContacts,
  buildPackingList,
  resolveDestinationProfile,
} from "@/lib/destination-insights";

interface TravelDetails {
  destinations: string[];
  start_date: string;
  end_date: string;
  budget: string;
  travel_style: string;
  interests: string[];
  accommodation: string;
  transportation: string;
  special_requests: string;
}

interface ItineraryDay {
  day: string;
  city: string;
  theme?: string;
  description?: string;
  morning: string;
  afternoon: string;
  evening: string;
  accommodation: string;
  meals: string;
  estimated_cost: string;
  guide?: {
    guideId: string;
    name: string;
    isDemo: boolean;
    isBookable: boolean;
    hourlyRate: number;
    cost: number;
  } | null;
  weather?: {
    description: string;
    emoji: string;
    minC: number;
    maxC: number;
  } | null;
}

interface TravelPlan {
  itinerary: ItineraryDay[];
  total_estimated_cost: string;
  travel_tips: string[];
  packing_list: string[];
  emergency_contacts: {
    local_emergency: string;
    embassy: string;
    hotel: string;
    police?: string;
    ambulance?: string;
    tourist_helpline?: string;
    women_helpline?: string;
    roamly_support?: string;
    country_code?: string;
    quick_dial?: string;
    advisory?: string;
  };
}

interface ApiResponse {
  plan: TravelPlan;
  summary: string;
}

// --- Grounded Agent Router response shape (POST /api/itinerary/plan) ---
// See docs/Roamly_Grounded_Agent_Router_Fixed_Plan.md for the full contract.
interface AgentGuide {
  guideId: string;
  name: string;
  isDemo: boolean;
  isBookable: boolean;
  hourlyRate: number;
  cost: number;
}

interface AgentActivity {
  slot: string;
  placeId: string;
  name: string;
  startTime: string;
  endTime: string;
  description?: string;
  estimatedCost: number;
}

interface AgentDay {
  day: string;
  date: string;
  locationId: string;
  city: string;
  theme?: string;
  description?: string;
  activities: AgentActivity[];
  transit: {
    fromLocationId: string;
    toLocationId: string;
    distanceMeters: number | null;
    durationSeconds: number | null;
    requestedMode: string;
    actualModes: string[];
    preferenceSatisfied: boolean;
  } | null;
  guide: AgentGuide | null;
  weather:
    | { available: true; description: string; temperatureMaxC: number; temperatureMinC: number; precipitationProbabilityMax: number }
    | { available: false; reason: string };
  meals?: string;
  accommodation?: string;
  accommodationCost: number;
  foodCost: number;
  transportCost: number;
  activitiesCost: number;
  guideCost: number;
  dayEstimatedCost: number;
}

interface ItineraryPlanSuccess {
  success: true;
  tripId: number | null;
  summary?: string | null;
  tripSummary: {
    totalBudget: number;
    estimatedTotalCost: number;
    remainingBudget: number;
    travelerCount: number;
    durationDays: number;
    budgetPerPersonPerDay: number;
  };
  budgetBreakdown: Record<string, number>;
  destinations: Array<{ locationId?: string; name: string; city: string }>;
  days: AgentDay[];
  travel_tips?: string[];
  packing_list?: string[];
  emergency_contacts?: {
    local_emergency: string;
    embassy: string;
    hotel: string;
    police?: string;
    ambulance?: string;
    tourist_helpline?: string;
    women_helpline?: string;
    roamly_support?: string;
    country_code?: string;
    quick_dial?: string;
    advisory?: string;
  };
  sources: Record<string, string | null>;
  routerTrace: {
    agentsExecuted: string[];
    fallbackUsed: boolean;
    validationStatus: "PASSED" | "FAILED";
    reOptimizations: number;
  };
  warnings?: Array<{ code: string; details: string }>;
}

interface ItineraryPlanFailure {
  success: false;
  error: { code: string; message: string; details?: unknown };
  routerTrace: {
    agentsExecuted: string[];
    fallbackUsed: boolean;
    validationStatus: "PASSED" | "FAILED";
    reOptimizations: number;
  };
}

type ItineraryPlanResponse = ItineraryPlanSuccess | ItineraryPlanFailure;

function deriveBudgetCategory(amountStr: string): {
  category: "Budget" | "Mid-range" | "Premium" | "Luxury";
  description: string;
} {
  const numeric = Math.max(0, parseInt(amountStr.replace(/[^0-9]/g, ""), 10) || 0);
  const formatted = `₹${numeric.toLocaleString("en-IN")}`;
  if (numeric < 50000) {
    return {
      category: "Budget",
      description: `Based on your ${formatted} total trip budget`,
    };
  }
  if (numeric < 100000) {
    return {
      category: "Mid-range",
      description: `Based on your ${formatted} total trip budget`,
    };
  }
  if (numeric < 200000) {
    return {
      category: "Premium",
      description: `Based on your ${formatted} total trip budget`,
    };
  }
  return {
    category: "Luxury",
    description: `Based on your ${formatted} total trip budget`,
  };
}

const accommodationOptions = ["Hostel", "Hotel", "Airbnb", "Resort"];
const transportOptions = ["Public Transport", "Car Rental", "Train", "Flight"];
const travelStyleOptions = ["Cultural", "Adventure", "Relaxation", "Food & Wine", "Historical", "Nature", "Urban", "Rural"];

const travelerCountOptions = [1, 2, 3, 4, 5];

const guidePreferenceOptions: Array<{ value: "NO_GUIDE" | "NEED_GUIDE" | "CHOOSE_GUIDE"; label: string }> = [
  { value: "NO_GUIDE", label: "No Guide" },
  { value: "NEED_GUIDE", label: "Need a Guide" },
  { value: "CHOOSE_GUIDE", label: "Choose a Guide" },
];

/**
 * Maps the free-text transportation dropdown value to the grounded agent
 * router's supported transit modes. "Flight" has no ground-route equivalent
 * (routeAgent only computes routes between consecutive resolved stops), so
 * it falls back to CAB for local transit legs.
 */
function mapTransportationPreference(uiValue: string): "TRAIN" | "PUBLIC_TRANSIT" | "CAB" | "WALKING" {
  switch (uiValue) {
    case "Train":
      return "TRAIN";
    case "Public Transport":
      return "PUBLIC_TRANSIT";
    case "Car Rental":
      return "CAB";
    case "Flight":
      return "CAB";
    default:
      return "CAB";
  }
}

const WEATHER_CODE_EMOJI: Record<string, string> = {
  Clear: "☀️",
  Cloud: "☁️",
  Rain: "🌧️",
  Drizzle: "🌦️",
  Snow: "❄️",
  Fog: "🌫️",
  Thunder: "⛈️",
};

function weatherEmoji(description: string): string {
  const match = Object.keys(WEATHER_CODE_EMOJI).find((k) => description.includes(k));
  return match ? WEATHER_CODE_EMOJI[match] : "🌤️";
}

/**
 * Adapts the grounded agent router's response (AgentDay[]) into the legacy
 * TravelPlan shape the existing itinerary UI renders, so the detailed card
 * layout below keeps working unchanged. The raw agent response is kept
 * separately (see `agentResult` state) for the grounding diagnostic panel.
 */
function adaptAgentResponseToTravelPlan(result: ItineraryPlanSuccess): TravelPlan {
  const itinerary: ItineraryDay[] = result.days.map((day) => {
    const bySlot = (slot: string, fallbackIdx: number) => {
      let activity = day.activities.find((a) => a.slot?.toLowerCase() === slot.toLowerCase());
      if (!activity && day.activities[fallbackIdx]) {
        activity = day.activities[fallbackIdx];
      }
      if (!activity) {
        const timeRanges: Record<string, string> = {
          morning: "09:00–11:30",
          afternoon: "13:00–16:00",
          evening: "17:00–19:30"
        };
        const tr = timeRanges[slot.toLowerCase()] || "10:00–13:00";
        return `${day.city} Cultural Discovery & Scenic Exploration (${tr}): Stroll through historic neighborhoods, vibrant local markets, and scenic viewpoints in ${day.city}.`;
      }
      const desc = activity.description ? `: ${activity.description}` : "";
      return `${activity.name} (${activity.startTime}–${activity.endTime})${desc}`;
    };

    const weatherNote = day.weather.available
      ? `${weatherEmoji(day.weather.description)} ${day.weather.description}, ${Math.round(day.weather.temperatureMinC)}–${Math.round(day.weather.temperatureMaxC)}°C`
      : "Weather forecast unavailable for this date";

    const guideNote = day.guide
      ? `${day.guide.name}${day.guide.isDemo ? " ⚠️ DEMO DATA — NOT BOOKABLE" : ""}`
      : "No guide assigned";

    return {
      day: day.day,
      city: day.city,
      theme: day.theme,
      description: day.description,
      morning: bySlot("morning", 0),
      afternoon: bySlot("afternoon", 1),
      evening: bySlot("evening", 2),
      accommodation: day.accommodation || `Hotel / Stay near central ${day.city}`,
      meals: day.meals || `Sample authentic regional specialties and street culinary delights in ${day.city}`,
      estimated_cost: `₹${day.dayEstimatedCost.toLocaleString("en-IN")}`,
      guide: day.guide || null,
      weather: day.weather.available
        ? {
            description: day.weather.description,
            emoji: weatherEmoji(day.weather.description),
            minC: Math.round(day.weather.temperatureMinC),
            maxC: Math.round(day.weather.temperatureMaxC),
          }
        : null,
    };
  });

  const rawTips = result.travel_tips || (result as any).plan?.travel_tips;
  const transitWarnings = result.days
    .filter((d) => d.transit && d.transit.preferenceSatisfied === false)
    .map((d) => `Transit notice: Travel to ${d.city} utilizes the best available verified connection.`);

  const destProfile = resolveDestinationProfile(result.destinations);
  const isIndia = destProfile.country === "India";

  let travel_tips: string[] = [];
  if (Array.isArray(rawTips) && rawTips.length > 0) {
    const hasFalseIndiaInfo = !isIndia && rawTips.some((t: string) =>
      /\b(UPI|PhonePe|Paytm|auto-rickshaw|rickshaws|Aadhaar|temple shoe)\b/i.test(t)
    );
    travel_tips = hasFalseIndiaInfo ? buildDestinationTips(result.destinations) : rawTips;
  } else {
    travel_tips = buildDestinationTips(result.destinations);
  }
  if (transitWarnings.length > 0) {
    travel_tips = [...travel_tips, ...transitWarnings];
  }

  const rawPacking = result.packing_list || (result as any).plan?.packing_list;
  let packing_list: string[] = [];
  if (Array.isArray(rawPacking) && rawPacking.length > 0) {
    const hasFalseIndiaPacking = !isIndia && rawPacking.some((p: string) =>
      /\b(Aadhaar|temple shoe)\b/i.test(p)
    );
    packing_list = hasFalseIndiaPacking ? buildPackingList(result.destinations) : rawPacking;
  } else {
    packing_list = buildPackingList(result.destinations);
  }

  const rawEmergency = result.emergency_contacts || (result as any).plan?.emergency_contacts;
  const verifiedEmergency = buildEmergencyContacts(result.destinations);

  let emergency_contacts: TravelPlan["emergency_contacts"] = {
    local_emergency: rawEmergency?.local_emergency || verifiedEmergency.local_emergency,
    police: rawEmergency?.police || verifiedEmergency.police,
    ambulance: rawEmergency?.ambulance || verifiedEmergency.ambulance,
    tourist_helpline: rawEmergency?.tourist_helpline || verifiedEmergency.tourist_helpline,
    women_helpline: rawEmergency?.women_helpline || verifiedEmergency.women_helpline || "Local Safety Line",
    embassy: rawEmergency?.embassy || verifiedEmergency.embassy,
    hotel: rawEmergency?.hotel || verifiedEmergency.hotel,
    roamly_support: rawEmergency?.roamly_support || verifiedEmergency.roamly_support,
    country_code: verifiedEmergency.country_code,
    quick_dial: verifiedEmergency.quick_dial,
    advisory: verifiedEmergency.advisory
  };

  // If destination is outside India but emergency contacts carry Indian 108/1363, sanitize to true local numbers
  if (!isIndia) {
    const rawLocal = String(emergency_contacts.local_emergency || "");
    const rawAmb = String(emergency_contacts.ambulance || "");
    if (rawAmb.includes("108") || rawLocal.includes("100") || (destProfile.country === "USA" && !rawLocal.includes("911"))) {
      emergency_contacts = {
        ...verifiedEmergency,
        women_helpline: verifiedEmergency.women_helpline || "Local Safety Line",
      };
    }
  }

  return {
    itinerary,
    total_estimated_cost: `₹${result.tripSummary.estimatedTotalCost.toLocaleString("en-IN")}`,
    travel_tips,
    packing_list,
    emergency_contacts,
  };
}

export interface DestinationItem {
  locationId?: string;
  googlePlaceId?: string;
  name: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
}

export default function LLMPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  const handleRequireLogin = (e?: React.SyntheticEvent) => {
    if (!isLoaded) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    if (!isSignedIn) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        const target = e.target as HTMLElement | null;
        if (target && typeof target.blur === "function") {
          target.blur();
        }
      }
      router.push(`/sign-in?redirect_url=${encodeURIComponent("/auth-redirect")}`);
    }
  };

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [jobStatus, setJobStatus] = useState<'idle' | 'queued' | 'processing' | 'completed' | 'failed'>('idle');
  const [decisionStatus, setDecisionStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  const [citiesText, setCitiesText] = useState("");
  const [selectedDestinations, setSelectedDestinations] = useState<DestinationItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{
    placeId: string;
    name: string;
    mainText: string;
    secondaryText?: string;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locatingCurrent, setLocatingCurrent] = useState(false);
  const [locationMessage, setLocationMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [customBudget, setCustomBudget] = useState("60000");
  const [accommodation, setAccommodation] = useState("Hotel");
  const [transportation, setTransportation] = useState("Train");
  const [travelInterests, setTravelInterests] = useState<string[]>([]);
  const [specialRequests, setSpecialRequests] = useState("");
  const [travelerCount, setTravelerCount] = useState(2);
  const [guidePreference, setGuidePreference] = useState<"NO_GUIDE" | "NEED_GUIDE" | "CHOOSE_GUIDE">("NO_GUIDE");
  const [agentResult, setAgentResult] = useState<ItineraryPlanSuccess | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [packedItems, setPackedItems] = useState<Record<number, boolean>>({});
  const [copiedContact, setCopiedContact] = useState<string | null>(null);
  const [customPackingItems, setCustomPackingItems] = useState<string[]>([]);
  const [newPackingInput, setNewPackingInput] = useState("");
  const [packingCategory, setPackingCategory] = useState<string>("all");

  const togglePacked = (idx: number) => {
    setPackedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handlePackAll = () => {
    const allItems = [...(plan?.packing_list || []), ...customPackingItems];
    const next: Record<number, boolean> = {};
    allItems.forEach((_, idx) => {
      next[idx] = true;
    });
    setPackedItems(next);
  };

  const handleResetPacked = () => {
    setPackedItems({});
  };

  const handleAddCustomPackingItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newPackingInput.trim();
    if (!clean) return;
    setCustomPackingItems((prev) => [...prev, clean]);
    setNewPackingInput("");
  };

  const handleRemoveCustomPackingItem = (itemToRemove: string, itemIdx: number) => {
    setCustomPackingItems((prev) => prev.filter((item) => item !== itemToRemove));
    setPackedItems((prev) => {
      const next = { ...prev };
      delete next[itemIdx];
      return next;
    });
  };

  const copyToClipboard = (label: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedContact(label);
      setTimeout(() => setCopiedContact(null), 2000);
    }
  };

  // Guide selection state (for CHOOSE_GUIDE mode)
  interface AvailableGuide {
    id: string;
    guideId: string;
    userId?: string;
    name: string;
    profilePhoto: string | null;
    bio: string | null;
    rating: number;
    experienceYears: number;
    hourlyRate: number;
    currency?: string;
    languages: string[];
    expertise: string[];
    verificationStatus?: string;
    availabilityStatus: string;
    matchedAreas: string[];
    nearbyAreas: string[];
    coverageCount: number;
    totalSelectedAreas: number;
    distanceKm: number | null;
    matchType: "MULTI_AREA" | "EXACT" | "NEARBY";
    coverageLabel: string;
    isAllCovered: boolean;
  }
  const [availableGuides, setAvailableGuides] = useState<AvailableGuide[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<AvailableGuide | null>(null);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [guideSearchCity, setGuideSearchCity] = useState<string>("");
  const [hasSingleGuideCoveringAll, setHasSingleGuideCoveringAll] = useState(false);
  const [isGuideUser, setIsGuideUser] = useState(false);

  // State for interactive expandable day cards. Default: Day 1 (index 0) is open.
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([0]));

  const toggleDayExpansion = (idx: number) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const expandAllDays = () => {
    if (plan?.itinerary) {
      setExpandedDays(new Set(plan.itinerary.map((_, i) => i)));
    }
  };

  const collapseAllDays = () => {
    setExpandedDays(new Set());
  };

  const derivedBudget = deriveBudgetCategory(customBudget);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Derived range object for the Calendar; startDate/endDate ("yyyy-MM-dd"
  // strings) stay the single source of truth since the rest of the page
  // (payload building, min= constraints, etc.) already reads them directly.
  const dateRange: DateRange | undefined = startDate
    ? { from: parseISO(startDate), to: endDate ? parseISO(endDate) : undefined }
    : undefined;

  const handleDateRangeSelect = (
    range: DateRange | undefined,
    triggerDate?: Date
  ) => {
    if (isLoaded && !isSignedIn) {
      handleRequireLogin();
      return;
    }

    const clickedDate = triggerDate || range?.to || range?.from;
    if (!clickedDate) {
      setStartDate("");
      setEndDate("");
      return;
    }

    // Step 1: If no start date exists yet, or both start & end were already set,
    // this click initiates a fresh departure date selection.
    if (!startDate || (startDate && endDate)) {
      setStartDate(format(clickedDate, "yyyy-MM-dd"));
      setEndDate("");
      return;
    }

    // Step 2: Start date is set, user is picking the return date.
    const currentStart = parseISO(startDate);
    if (isBefore(clickedDate, currentStart)) {
      // If clicked date is earlier than departure, reassign departure
      setStartDate(format(clickedDate, "yyyy-MM-dd"));
      setEndDate("");
    } else {
      // Valid return date (same day or future day)
      setEndDate(format(clickedDate, "yyyy-MM-dd"));
    }
  };

  const handleDurationPreset = (days: number) => {
    if (isLoaded && !isSignedIn) {
      handleRequireLogin();
      return;
    }

    const base = startDate ? parseISO(startDate) : new Date();
    const formattedStart = format(base, "yyyy-MM-dd");
    const formattedEnd = format(addDays(base, Math.max(0, days - 1)), "yyyy-MM-dd");
    setStartDate(formattedStart);
    setEndDate(formattedEnd);
  };

  const addDestination = (item: DestinationItem) => {
    // Prevent duplicate additions
    const alreadyExists = selectedDestinations.some(
      (d) =>
        (item.locationId && d.locationId === item.locationId) ||
        (item.googlePlaceId && d.googlePlaceId === item.googlePlaceId) ||
        (item.name && d.name.trim().toLowerCase() === item.name.trim().toLowerCase())
    );
    if (alreadyExists) {
      setSearchQuery("");
      setShowSuggestions(false);
      return;
    }
    const updated = [...selectedDestinations, item];
    setSelectedDestinations(updated);
    setCitiesText(updated.map((d) => d.name).join(", "));
    setSearchQuery("");
    setShowSuggestions(false);
  };

  const removeDestination = (index: number) => {
    const updated = selectedDestinations.filter((_, idx) => idx !== index);
    setSelectedDestinations(updated);
    setCitiesText(updated.map((d) => d.name).join(", "));
  };

  // Sync destination entered in AI planner to localStorage so Stays page extracts it
  useEffect(() => {
    try {
      if (selectedDestinations.length > 0) {
        const destNames = selectedDestinations.map((d) => d.name);
        localStorage.setItem("roamly_planner_destinations", JSON.stringify(destNames));
        localStorage.setItem("roamly_current_destination", destNames[destNames.length - 1]);
      } else if (citiesText.trim()) {
        const destNames = citiesText.split(",").map((s) => s.trim()).filter(Boolean);
        if (destNames.length > 0) {
          localStorage.setItem("roamly_planner_destinations", JSON.stringify(destNames));
          localStorage.setItem("roamly_current_destination", destNames[0]);
        }
      }
    } catch (e) {
      console.warn("Failed to persist destination for stays:", e);
    }
  }, [selectedDestinations, citiesText]);

  const handleSearchInputChange = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/locations/search?q=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        if (data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  const handleSelectSuggestion = async (sug: { placeId: string; name: string; mainText: string; secondaryText?: string }) => {
    if (isLoaded && !isSignedIn) {
      handleRequireLogin();
      return;
    }

    try {
      setIsSearching(true);
      const res = await fetch("/api/locations/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: sug.placeId, name: sug.mainText || sug.name }),
      });
      const data = await res.json();
      if (data.location) {
        addDestination({
          locationId: data.location.id,
          googlePlaceId: data.location.googlePlaceId || sug.placeId,
          name: data.location.name,
          formattedAddress: data.location.address?.formatted || sug.secondaryText,
          latitude: data.location.coordinates?.lat,
          longitude: data.location.coordinates?.lng,
        });
      } else {
        addDestination({
          googlePlaceId: sug.placeId,
          name: sug.mainText || sug.name,
          formattedAddress: sug.secondaryText,
        });
      }
    } catch (e) {
      addDestination({
        googlePlaceId: sug.placeId,
        name: sug.mainText || sug.name,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isLoaded && !isSignedIn) {
      handleRequireLogin(e);
      return;
    }

    if (e.key === "Enter" && searchQuery.trim()) {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0]);
      } else {
        fetch("/api/locations/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: searchQuery.trim() }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.location) {
              addDestination({
                locationId: data.location.id,
                googlePlaceId: data.location.googlePlaceId,
                name: data.location.name,
                latitude: data.location.coordinates?.lat,
                longitude: data.location.coordinates?.lng,
                formattedAddress: data.location.address?.formatted,
              });
            } else {
              addDestination({ name: searchQuery.trim() });
            }
          })
          .catch(() => {
            addDestination({ name: searchQuery.trim() });
          });
      }
    }
  };

  const handleUseCurrentLocation = () => {
    if (isLoaded && !isSignedIn) {
      handleRequireLogin();
      return;
    }

    setLocatingCurrent(true);
    setLocationMessage(null);

    const fallbackDeviceLocation = async () => {
      try {
        const res = await fetch("/api/location/current");
        const data = await res.json();
        if (data.location) {
          addDestination({
            locationId: data.location.id,
            googlePlaceId: data.location.googlePlaceId,
            name: data.location.name || "Current Location",
            latitude: data.location.coordinates?.lat,
            longitude: data.location.coordinates?.lng,
            formattedAddress: data.location.address?.formatted,
          });
          setLocationMessage({
            type: "info",
            text: `📍 Device location: ${data.location.name} (${data.deviceLocation?.accuracyMeters ? Math.round(data.deviceLocation.accuracyMeters / 1000) + 'km radius' : 'Network estimate'})`,
          });
        } else {
          setLocationMessage({
            type: "error",
            text: "Unable to detect device location. You can enter destination manually below.",
          });
        }
      } catch (err: any) {
        setLocationMessage({
          type: "error",
          text: "Unable to detect device location. You can enter destination manually below.",
        });
      } finally {
        setLocatingCurrent(false);
      }
    };

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(`/api/locations/reverse-geocode?lat=${latitude}&lng=${longitude}`);
            const data = await res.json();
            if (data.location) {
              addDestination({
                locationId: data.location.id,
                googlePlaceId: data.location.googlePlaceId,
                name: data.location.name,
                latitude: data.location.coordinates?.lat,
                longitude: data.location.coordinates?.lng,
                formattedAddress: data.location.address?.formatted,
              });
              setLocationMessage({
                type: "success",
                text: `📍 Current location found: ${data.location.name} (${data.location.address?.city || ""}, ${data.location.address?.country || ""})`,
              });
            } else {
              await fallbackDeviceLocation();
            }
          } catch (e) {
            await fallbackDeviceLocation();
          } finally {
            setLocatingCurrent(false);
          }
        },
        async (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setLocationMessage({
              type: "info",
              text: "Location permission was denied. You can search or type your destination manually below.",
            });
            setLocatingCurrent(false);
          } else {
            await fallbackDeviceLocation();
          }
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    } else {
      fallbackDeviceLocation();
    }
  };

  // Check role and restore persisted guide on mount
  useEffect(() => {
    async function checkRoleAndPersistedGuide() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            if (data.user.role === "GUIDE") {
              setIsGuideUser(true);
              window.location.href = "/guide-dashboard";
              return;
            }
          }
        }
      } catch (err) {
        console.error("Error checking role:", err);
      }

      try {
        const savedGuide = localStorage.getItem("roamly_selected_guide");
        if (savedGuide) {
          const parsed = JSON.parse(savedGuide);
          if (parsed && (parsed.id || parsed.guideId)) {
            setSelectedGuide(parsed);
            setGuidePreference("CHOOSE_GUIDE");
            return;
          }
        }
        const storedPlan = localStorage.getItem("roamly_accepted_plan");
        if (storedPlan) {
          const parsed = JSON.parse(storedPlan);
          if (parsed.selectedGuide) {
            setSelectedGuide(parsed.selectedGuide);
            setGuidePreference("CHOOSE_GUIDE");
          }
        }
      } catch (e) {
        console.error("Error reading saved guide:", e);
      }
    }
    checkRoleAndPersistedGuide();
  }, []);

  // Save selected guide in localStorage on change
  useEffect(() => {
    try {
      if (selectedGuide) {
        localStorage.setItem("roamly_selected_guide", JSON.stringify(selectedGuide));
      } else {
        localStorage.removeItem("roamly_selected_guide");
      }
    } catch (e) {
      console.error("Error saving selected guide to localStorage:", e);
    }
  }, [selectedGuide]);

  // Fetch available guides for all selected trip areas
  const fetchGuidesForDestinations = async () => {
    const destNames = selectedDestinations.length > 0
      ? selectedDestinations.map((d) => d.name)
      : citiesText.split(",").map((s) => s.trim()).filter(Boolean);

    if (destNames.length === 0) {
      setAvailableGuides([]);
      return;
    }

    setLoadingGuides(true);
    setGuideSearchCity(destNames[0]);

    try {
      const params = new URLSearchParams();
      params.set("selectedAreas", destNames.join(","));
      const firstWithCoords = selectedDestinations.find((d) => d.latitude != null && d.longitude != null);
      if (firstWithCoords) {
        params.set("latitude", String(firstWithCoords.latitude));
        params.set("longitude", String(firstWithCoords.longitude));
      }

      const res = await fetch(`/api/guides?${params.toString()}`);
      if (res.ok) {
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          if (data.guides && Array.isArray(data.guides)) {
            setAvailableGuides(data.guides);
            setHasSingleGuideCoveringAll(Boolean(data.hasSingleGuideCoveringAll));
          } else {
            setAvailableGuides([]);
          }
        }
      } else {
        setAvailableGuides([]);
      }
    } catch (err) {
      console.error("Failed to fetch guides:", err);
      setAvailableGuides([]);
    } finally {
      setLoadingGuides(false);
    }
  };

  // Automatically fetch guides whenever destination changes when guide discovery is active
  useEffect(() => {
    if (guidePreference === "CHOOSE_GUIDE" || guidePreference === "NEED_GUIDE") {
      fetchGuidesForDestinations();
    }
  }, [selectedDestinations, citiesText, guidePreference]);

  const generatePlan = async () => {
    if (isLoaded && !isSignedIn) {
      handleRequireLogin();
      return;
    }

    setLoading(true);
    setError("");
    setPlan(null);
    setSummary("");
    setAgentResult(null);
    setDecisionStatus("pending");

    try {
      const destinations = selectedDestinations.length > 0
        ? selectedDestinations.map((d) => d.name)
        : citiesText
            .split(",")
            .map((city) => city.trim())
            .filter(Boolean);

      if (destinations.length === 0) {
        throw new Error("Please enter or select at least one destination");
      }

      if (!startDate || !endDate) {
        throw new Error("Please select both start date and end date");
      }

      const days = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
      if (days <= 0) {
        throw new Error("End date must be after start date");
      }

      const numericBudget = Math.max(0, parseInt(customBudget.replace(/[^0-9]/g, ""), 10) || 0);

      const payload = {
        destinations,
        startDate,
        endDate,
        travelerCount,
        totalBudget: numericBudget,
        accommodationPreference: accommodation,
        transportationPreference: mapTransportationPreference(transportation),
        interests: travelInterests,
        travelStyle: travelInterests[0] || "Cultural",
        pace: "MODERATE" as const,
        guidePreference,
        selectedGuideId: selectedGuide?.id || null,
      };

      console.log('🚀 Starting travel plan generation...');
      setJobStatus('processing');
      console.log('⚙️  Job processing - generating your travel plan (grounded agent router)...');

      // Make the actual API call to the grounded agent router
      const res = await fetch("/api/itinerary/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        throw new Error("Please sign in to generate a trip plan — itineraries are saved to your account.");
      }

      const rawText = await res.text();
      let data: ItineraryPlanResponse;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Server returned a non-JSON response (HTTP ${res.status}). Please try again.`);
      }

      if (!data.success) {
        throw new Error(data.error?.message || "Itinerary generation failed validation");
      }

      console.log('✅ Grounded itinerary received successfully!', data.routerTrace);
      console.log('🎉 Travel plan completed!');

      setAgentResult(data);
      setPlan(adaptAgentResponseToTravelPlan(data));
      setExpandedDays(new Set([0]));
      setSummary(
        data.summary ||
          `Grounded ${data.tripSummary.durationDays}-day trip to ${data.destinations.map((d) => d.name).join(", ")} for ${data.tripSummary.travelerCount} traveler(s). Validation: ${data.routerTrace.validationStatus}.`
      );
      setDecisionStatus("pending");
      setJobStatus("completed");

      // Smoothly auto-scroll to the generated itinerary and decision card
      setTimeout(() => {
        const el = document.getElementById("generated-itinerary-output");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate travel plan";
      setError(errorMessage);
      setJobStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPlan = () => {
    if (isLoaded && !isSignedIn) {
      handleRequireLogin();
      return;
    }

    const numericBudget = Math.max(0, parseInt(customBudget.replace(/[^0-9]/g, ""), 10) || 0);
    const resolvedDests = selectedDestinations.length > 0
      ? selectedDestinations.map((d) => d.name)
      : citiesText.split(",").map((s) => s.trim()).filter(Boolean);

    const acceptedData = {
      plan,
      summary,
      tripId: agentResult?.tripId ?? null,
      groundedDays: agentResult && "days" in agentResult ? agentResult.days : [],
      agentResult: agentResult || null,
      destinations: resolvedDests,
      destinationDetails: selectedDestinations,
      startDate,
      endDate,
      totalBudget: numericBudget,
      budget: `₹${numericBudget.toLocaleString("en-IN")}`,
      budgetCategory: derivedBudget.category,
      accommodation,
      transportation,
      travelerCount,
      guidePreference,
      selectedGuide: selectedGuide
        ? {
            id: selectedGuide.id,
            guideId: selectedGuide.guideId || selectedGuide.id,
            name: selectedGuide.name,
            hourlyRate: selectedGuide.hourlyRate,
            profilePhoto: selectedGuide.profilePhoto,
            matchedAreas: selectedGuide.matchedAreas,
            coverageLabel: selectedGuide.coverageLabel,
          }
        : null,
      interests: travelInterests,
      acceptedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem("roamly_accepted_plan", JSON.stringify(acceptedData));
    } catch (e) {
      console.error("Failed to save accepted plan to localStorage", e);
    }
    setDecisionStatus("accepted");
  };

  const handleRejectPlan = () => {
    setDecisionStatus("rejected");
  };

  const handleRegenerate = () => {
    if (isLoaded && !isSignedIn) {
      handleRequireLogin();
      return;
    }
    setDecisionStatus("pending");
    generatePlan();
  };

  const handleEditChanges = () => {
    setDecisionStatus("pending");
    const formElement = document.getElementById("travel-form-card");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Travel Planner
          </h1>
          <p className="text-gray-600">
            Generate your perfect travel itinerary with AI assistance
          </p>
        </div>

        {/* Form */}
        <Card
          id="travel-form-card"
          className="mb-8 border-[#e5e7db] shadow-sm relative transition-all"
          onClickCapture={handleRequireLogin}
          onPointerDownCapture={handleRequireLogin}
          onTouchStartCapture={handleRequireLogin}
          onFocusCapture={handleRequireLogin}
          onKeyDownCapture={handleRequireLogin}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-6 w-6" />
                Travel Details
              </CardTitle>
              {isLoaded && !isSignedIn && (
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1.5 py-1 px-2.5">
                  <Lock className="w-3.5 h-3.5" />
                  Sign In Required
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informational Banner when unauthenticated */}
            {isLoaded && !isSignedIn && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-950">
                      Sign in to use the AI Trip Planner
                    </p>
                    <p className="text-xs text-amber-800/90">
                      Please log in to set destinations, dates, and create your personalized AI itinerary.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#485C11] hover:bg-[#364A0E] text-white shrink-0 cursor-pointer self-start sm:self-auto shadow-2xs"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/sign-in?redirect_url=${encodeURIComponent("/auth-redirect")}`);
                  }}
                >
                  Sign In
                </Button>
              </div>
            )}

            {/* Google-Backed Destinations & Current Location */}
            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#485C11]" />
                  Destinations
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locatingCurrent}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#485C11] hover:text-[#364A0E] bg-[#DFECC6]/50 hover:bg-[#DFECC6]/80 px-2.5 py-1 rounded-full transition-colors cursor-pointer border border-[#8E9C78]/30 shadow-2xs"
                >
                  {locatingCurrent ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Locating device...
                    </>
                  ) : (
                    <>
                      <LocateFixed className="w-3.5 h-3.5" />
                      Use My Current Location
                    </>
                  )}
                </button>
              </div>

              {/* Status or notification message for location detection */}
              {locationMessage && (
                <div
                  className={`mb-2.5 text-xs px-3 py-1.5 rounded-lg flex items-center justify-between ${
                    locationMessage.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : locationMessage.type === "error"
                      ? "bg-red-50 text-red-800 border border-red-200"
                      : "bg-amber-50 text-amber-900 border border-amber-200"
                  }`}
                >
                  <span>{locationMessage.text}</span>
                  <button
                    type="button"
                    onClick={() => setLocationMessage(null)}
                    className="ml-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Selected Destination Chips */}
              {selectedDestinations.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2.5">
                  {selectedDestinations.map((dest, idx) => (
                    <span
                      key={`dest-chip-${dest.locationId || dest.googlePlaceId || dest.name || 'loc'}-${idx}`}
                      className="inline-flex items-center gap-1.5 bg-[#F4F6EE] border border-[#d6dacb] text-[#2f3d0c] text-xs font-medium px-3 py-1 rounded-full shadow-2xs"
                    >
                      <MapPin className="w-3 h-3 text-[#485C11]" />
                      <span>{dest.name}</span>
                      <button
                        type="button"
                        onClick={() => removeDestination(idx)}
                        className="text-gray-400 hover:text-red-600 transition-colors ml-0.5 cursor-pointer"
                        title="Remove destination"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Destination Search Input with Google Places Autocomplete */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyDown={handleSearchInputKeyDown}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  placeholder={
                    selectedDestinations.length > 0
                      ? "Search to add another stop (e.g. Agra, Jaipur)..."
                      : "Search destination or city (e.g. Delhi, Gateway of India)..."
                  }
                  className="pl-9 pr-8 bg-white"
                />
                {isSearching && (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Google Places Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-[#e5e7db] rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.every((s) => s.placeId?.startsWith("custom_")) ? (
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-amber-700 uppercase tracking-wider border-b border-gray-100 bg-amber-50">
                      No Google Places match — free-text entry only (configure GOOGLE_MAPS_SERVER_API_KEY for real search)
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#FAFBF8]">
                      Google Places Suggestions
                    </div>
                  )}
                  {suggestions.map((sug, sIdx) => (
                    <button
                      key={`sug-${sug.placeId || sug.name || 'sug'}-${sIdx}`}
                      type="button"
                      onClick={() => handleSelectSuggestion(sug)}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#F4F6EE] transition-colors flex items-start gap-2.5 cursor-pointer border-b border-gray-50 last:border-0"
                    >
                      <MapPin className="w-4 h-4 text-[#485C11] shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-gray-900">
                          {sug.mainText || sug.name}
                        </div>
                        {sug.secondaryText && (
                          <div className="text-[11px] text-gray-500">
                            {sug.secondaryText}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500 mt-1.5 flex items-center justify-between">
                <span>Select from Google suggestions or press Enter to add. Multi-city stops supported.</span>
                {selectedDestinations.length > 1 && (
                  <span className="text-[#485C11] font-semibold">
                    {selectedDestinations.length} stops planned
                  </span>
                )}
              </p>
            </div>

            {/* Trip Dates */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Trip Dates
                </label>
                {startDate && endDate && (
                  <span className="text-xs font-semibold text-[#485C11] bg-[#DFECC6]/60 px-2.5 py-0.5 rounded-full">
                    {differenceInDays(parseISO(endDate), parseISO(startDate)) + 1} Days Trip
                  </span>
                )}
              </div>

              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 rounded-lg border border-input bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all hover:border-[#8E9C78] focus:outline-none focus:ring-2 focus:ring-[#485C11]/20 focus:border-[#485C11]"
                  >
                    <span className="flex items-center gap-2.5 text-left">
                      <CalendarIcon className="size-4 text-[#485C11] shrink-0" />
                      {startDate ? (
                        <span className="text-gray-900 font-medium">
                          {format(parseISO(startDate), "EEE, MMM d, yyyy")}
                          <span className="text-gray-400 mx-1.5">→</span>
                          {endDate ? (
                            <span>{format(parseISO(endDate), "EEE, MMM d, yyyy")}</span>
                          ) : (
                            <span className="text-amber-600 font-normal italic">Select return date</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Select departure & return dates</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500 font-medium shrink-0">
                      {startDate && endDate
                        ? `${differenceInDays(parseISO(endDate), parseISO(startDate)) + 1} days`
                        : "Choose dates"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-2xl border border-gray-200/80 rounded-2xl overflow-hidden bg-white max-w-[95vw]" align="start">
                  {/* Top Status & Date Overview Bar */}
                  <div className="p-3.5 bg-gradient-to-r from-[#FAFBF8] to-[#F4F6F0] border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 text-xs">
                      <div className={`px-2.5 py-1.5 rounded-lg border ${startDate ? "bg-white border-[#485C11]/40 shadow-xs" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Departure</div>
                        <div className="font-semibold text-gray-900">
                          {startDate ? format(parseISO(startDate), "MMM d, yyyy") : "Select date"}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <div className={`px-2.5 py-1.5 rounded-lg border ${endDate ? "bg-white border-[#485C11]/40 shadow-xs" : startDate ? "bg-amber-50 border-amber-300 text-amber-900 animate-pulse" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Return</div>
                        <div className="font-semibold">
                          {endDate ? format(parseISO(endDate), "MMM d, yyyy") : startDate ? "Pick return date" : "Select date"}
                        </div>
                      </div>
                    </div>

                    {startDate && endDate && (
                      <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#485C11]/10 text-[#485C11] text-xs font-semibold px-2.5 py-1 rounded-full">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{differenceInDays(parseISO(endDate), parseISO(startDate)) + 1} Days Trip</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Duration Shortcut Pills */}
                  <div className="px-3.5 py-2 bg-white border-b border-gray-100 flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="text-gray-500 font-medium text-[11px] mr-1">Duration:</span>
                    {[
                      { label: "2 Days", days: 2 },
                      { label: "3 Days", days: 3 },
                      { label: "5 Days", days: 5 },
                      { label: "7 Days (1 Wk)", days: 7 },
                      { label: "10 Days", days: 10 },
                      { label: "14 Days (2 Wks)", days: 14 },
                    ].map((preset) => {
                      const isActive =
                        startDate &&
                        endDate &&
                        differenceInDays(parseISO(endDate), parseISO(startDate)) + 1 === preset.days;
                      return (
                        <button
                          key={preset.days}
                          type="button"
                          onClick={() => handleDurationPreset(preset.days)}
                          className={`px-2.5 py-1 rounded-full border text-[11px] transition-all cursor-pointer font-medium ${
                            isActive
                              ? "bg-[#485C11] text-white border-[#485C11]"
                              : "bg-gray-50 hover:bg-[#DFECC6]/40 border-gray-200 text-gray-700 hover:border-[#485C11]/40"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Calendar view */}
                  <div className="p-2 sm:p-3 overflow-x-auto">
                    <Calendar
                      mode="range"
                      numberOfMonths={2}
                      defaultMonth={dateRange?.from || new Date()}
                      selected={dateRange}
                      onSelect={handleDateRangeSelect}
                      disabled={{ before: startOfDay(new Date()) }}
                      className="rounded-lg"
                    />
                  </div>

                  {/* Footer actions */}
                  <div className="p-3 bg-[#FAFBF8] border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-gray-500 hidden sm:block">
                      {!startDate
                        ? "1️⃣ Click a date to choose departure"
                        : !endDate
                        ? "2️⃣ Click a date to choose return"
                        : "✅ Range selected! Click Apply Dates to confirm"}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      {(startDate || endDate) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setStartDate("");
                            setEndDate("");
                          }}
                          className="h-8 text-xs text-gray-500 hover:text-gray-900 cursor-pointer"
                        >
                          Clear
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        disabled={!startDate}
                        onClick={() => {
                          if (startDate && !endDate) {
                            setEndDate(startDate);
                          }
                          setIsDatePickerOpen(false);
                        }}
                        className="h-8 text-xs bg-[#485C11] hover:bg-[#3d4f0e] text-white px-3 font-medium cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Apply Dates
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-gray-500 mt-1.5">
                Pick departure and return dates, or select a start date and click a duration shortcut.
              </p>
            </div>

            {/* Total Trip Budget Section (Single User-Controlled Budget Input) */}
            <div className="bg-[#FAFBF8] border border-[#e5e7db] p-4 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label htmlFor="total-trip-budget" className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4 text-[#485C11]" />
                  Enter Total Trip Budget (INR)
                </label>
                <span className="text-xs text-[#6b7280]">
                  Target constraint: {customBudget ? `₹${(parseInt(customBudget.replace(/[^0-9]/g, ""), 10) || 0).toLocaleString("en-IN")}` : "₹0"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">₹</span>
                  <Input
                    id="total-trip-budget"
                    type="number"
                    min="0"
                    step="1000"
                    value={customBudget}
                    onChange={(e) => setCustomBudget(e.target.value)}
                    placeholder="e.g. 60000"
                    className="pl-8 text-sm font-semibold bg-white"
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: "₹25K", val: "25000" },
                    { label: "₹50K", val: "50000" },
                    { label: "₹75K", val: "75000" },
                    { label: "₹1 Lakh", val: "100000" },
                    { label: "₹2 Lakh+", val: "200000" },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setCustomBudget(preset.val)}
                      className={`text-xs px-2.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                        customBudget === preset.val
                          ? "bg-[#485C11] text-white border-[#485C11]"
                          : "bg-white border-[#d6dacb] text-gray-700 hover:border-[#485C11]/50"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Derived Budget Category Display (Read-Only Dynamic Label) */}
              <div className="pt-2.5 border-t border-[#e5e7db]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-[#F4F6EE] px-3.5 py-2.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">Budget Category:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#485C11] text-white shadow-xs">
                    {derivedBudget.category}
                  </span>
                </div>
                <span className="text-xs text-[#556341] font-medium">
                  {derivedBudget.description}
                </span>
              </div>
            </div>

            {/* Accommodation and Transportation (Separate User Inputs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accommodation
                </label>
                <Select value={accommodation} onValueChange={setAccommodation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accommodationOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transportation
                </label>
                <Select value={transportation} onValueChange={setTransportation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {transportOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Traveler Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Traveler Count
              </label>
              <div className="flex gap-2 flex-wrap">
                {travelerCountOptions.map((count) => (
                  <Button
                    key={count}
                    type="button"
                    size="sm"
                    variant={travelerCount === count ? "default" : "outline"}
                    onClick={() => setTravelerCount(count)}
                  >
                    {count}
                    {count === 5 ? "+" : ""}
                  </Button>
                ))}
              </div>
            </div>

            {/* ─── Do You Need a Tour Guide? (Section 2 & 13) ─── */}
            <div className="rounded-2xl border border-[#DFECC6] bg-gradient-to-br from-white via-[#FAFBF8] to-[#f4f7ee] p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-1">
                <Compass className="w-5 h-5 text-[#485C11]" />
                <h3 className="text-base font-bold text-[#1a1a1a]">Do you need a tour guide?</h3>
              </div>
              <p className="text-xs text-[#6b7280] mb-4">
                Connect with verified local guides tailored for your trip destinations.
              </p>

              {/* Simple Yes / No toggle buttons */}
              <div className="grid grid-cols-2 gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setGuidePreference("NO_GUIDE");
                    setSelectedGuide(null);
                    setAvailableGuides([]);
                  }}
                  className={`py-2.5 px-4 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    guidePreference === "NO_GUIDE"
                      ? "border-[#485C11] bg-[#485C11] text-white shadow-xs"
                      : "border-gray-200 bg-white text-gray-700 hover:border-[#8E9C78] hover:bg-[#DFECC6]/20"
                  }`}
                >
                  <X className="w-4 h-4" />
                  No
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGuidePreference("NEED_GUIDE");
                    fetchGuidesForDestinations();
                  }}
                  className={`py-2.5 px-4 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    guidePreference !== "NO_GUIDE"
                      ? "border-[#485C11] bg-[#485C11] text-white shadow-xs"
                      : "border-gray-200 bg-white text-gray-700 hover:border-[#8E9C78] hover:bg-[#DFECC6]/20"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  Yes
                </button>
              </div>

              {/* Guide Dropdown (Shown ONLY when Yes is selected) */}
              {guidePreference !== "NO_GUIDE" && (
                <div className="mt-4 pt-3.5 border-t border-[#DFECC6]/70 animate-in fade-in-0 duration-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-700">
                      Choose Your Tour Guide
                    </label>
                    {loadingGuides ? (
                      <span className="text-[11px] text-[#485C11] flex items-center gap-1 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Finding guides...
                      </span>
                    ) : availableGuides.length > 0 ? (
                      <span className="text-[11px] text-[#485C11] font-semibold">
                        {availableGuides.length} verified guide{availableGuides.length === 1 ? "" : "s"} found
                      </span>
                    ) : null}
                  </div>

                  <Select
                    value={selectedGuide?.id || (guidePreference === "NEED_GUIDE" ? "auto" : "")}
                    onValueChange={(val) => {
                      if (val === "auto") {
                        setGuidePreference("NEED_GUIDE");
                        setSelectedGuide(null);
                      } else {
                        const found = availableGuides.find((g) => g.id === val);
                        if (found) {
                          setSelectedGuide(found);
                          setGuidePreference("CHOOSE_GUIDE");
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="w-full bg-white border-[#d2d7c5] focus:ring-[#485C11]">
                      <SelectValue placeholder="Select a guide or choose Auto-Match..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto" className="font-medium text-[#2f3d0c]">
                        ✨ Auto-Match: Let Roamly assign the best licensed guide
                      </SelectItem>
                      {availableGuides.map((guide) => (
                        <SelectItem key={guide.id} value={guide.id}>
                          {guide.name} — ₹{guide.hourlyRate}/hr ({guide.experienceYears}y exp{guide.rating > 0 ? ` · ★ ${guide.rating.toFixed(1)}` : ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Selected Guide Details or Auto-Match Confirmation */}
                  {selectedGuide ? (
                    <div className="p-3 rounded-xl bg-white border border-[#DFECC6] flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#485C11] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {selectedGuide.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {selectedGuide.name}
                            <span className="ml-2 font-semibold text-[#485C11]">₹{selectedGuide.hourlyRate}/hr</span>
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">
                            {selectedGuide.coverageLabel || (selectedGuide.matchedAreas?.length ? `Covers ${selectedGuide.matchedAreas.join(" + ")}` : "Verified Guide")}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGuide(null);
                          setGuidePreference("NEED_GUIDE");
                        }}
                        className="text-xs text-gray-400 hover:text-red-600 transition-colors font-medium shrink-0 cursor-pointer"
                        title="Reset to Auto-Match"
                      >
                        Reset
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#485C11] font-medium flex items-center gap-1.5 bg-[#DFECC6]/40 p-2.5 rounded-lg border border-[#8E9C78]/30">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      Roamly will automatically match and coordinate a licensed local guide for your trip destinations.
                    </p>
                  )}
                </div>
              )}

          </div>

            {/* Travel Interests (Combined Multi-select Dropdown) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Travel Interests
                </label>
                <span className="text-xs text-muted-foreground">
                  Select multiple styles & activities
                </span>
              </div>
              <MultiSelectInterests
                selected={travelInterests}
                onChange={setTravelInterests}
                placeholder="Choose or search travel interests..."
              />
            </div>

            {/* Special Requests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Requests
              </label>
              <Textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Any special requirements or preferences..."
                rows={3}
              />
            </div>



            {/* Terminal Output */}
            {jobStatus !== 'idle' && (
              <div className="p-4 bg-black text-green-400 font-mono text-sm rounded-md border border-gray-600">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-400 ml-2">Terminal</span>
                </div>
                <div className="space-y-1">
                  {jobStatus === 'queued' && (
                    <>
                      <div>$ 🚀 Starting travel plan generation...</div>
                      <div>$ 📋 Job queued - waiting in line...</div>
                    </>
                  )}
                  {jobStatus === 'processing' && (
                    <>
                      <div>$ 🚀 Starting travel plan generation...</div>
                      <div>$ 📋 Job queued - waiting in line...</div>
                      <div>$ ⚙️  Job processing - generating your travel plan...</div>
                      <div>$ 🤖 Calling LLM API...</div>
                    </>
                  )}
                  {jobStatus === 'completed' && (
                    <>
                      <div>$ 🚀 Starting travel plan generation...</div>
                      <div>$ 📋 Job queued - waiting in line...</div>
                      <div>$ ⚙️  Job processing - generating your travel plan...</div>
                      <div>$ 🤖 Calling LLM API...</div>
                      <div>$ ✅ LLM response received successfully!</div>
                      <div>$ 🎉 Travel plan completed!</div>
                    </>
                  )}
                  {jobStatus === 'failed' && (
                    <>
                      <div>$ 🚀 Starting travel plan generation...</div>
                      <div>$ 📋 Job queued - waiting in line...</div>
                      <div>$ ⚙️  Job processing - generating your travel plan...</div>
                      <div>$ 🤖 Calling LLM API...</div>
                      <div>$ ❌ Error generating travel plan: {error}</div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={generatePlan}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Generate Travel Plan
                </>
              )}
            </Button>

            {/* Job Status Indicator */}
            {jobStatus !== 'idle' && (
              <div className="mt-3 flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${jobStatus === 'queued' ? 'bg-yellow-500' :
                  jobStatus === 'processing' ? 'bg-blue-500' :
                    jobStatus === 'completed' ? 'bg-green-500' :
                      jobStatus === 'failed' ? 'bg-red-500' : 'bg-gray-500'
                  }`} />
                <span className="text-sm text-gray-600">
                  {jobStatus === 'queued' && 'Job queued, waiting to start...'}
                  {jobStatus === 'processing' && 'Processing your travel plan...'}
                  {jobStatus === 'completed' && 'Travel plan completed! Review & accept below.'}
                  {jobStatus === 'failed' && 'Job failed'}
                </span>
              </div>
            )}

            {/* Job Status with Progress */}
            {jobStatus !== 'idle' && (
              <div className={`p-4 rounded-xl border transition-all ${jobStatus === 'completed' ? 'bg-[#DFECC6]/40 border-[#8E9C78]/60 shadow-xs' :
                jobStatus === 'failed' ? 'bg-red-50 border border-red-200' :
                  jobStatus === 'queued' ? 'bg-blue-50 border border-blue-200' :
                    'bg-amber-50/80 border border-amber-200'
                }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {jobStatus === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-[#485C11] shrink-0" />
                    ) : jobStatus === 'failed' ? (
                      <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                    ) : jobStatus === 'queued' ? (
                      <Clock className="h-5 w-5 text-blue-500 shrink-0" />
                    ) : (
                      <Loader2 className="h-5 w-5 text-amber-600 animate-spin shrink-0" />
                    )}
                    <div>
                      <p className={`font-semibold text-sm ${jobStatus === 'completed' ? 'text-[#2a3809]' :
                        jobStatus === 'failed' ? 'text-red-700' :
                          jobStatus === 'queued' ? 'text-blue-700' :
                            'text-amber-800'
                        }`}>
                        {jobStatus === 'completed' ? 'Travel plan generated successfully!' :
                          jobStatus === 'failed' ? 'Failed to generate travel plan' :
                            jobStatus === 'queued' ? 'Job submitted to queue, processing...' :
                              'Processing your request...'}
                      </p>
                      <p className={`text-xs ${jobStatus === 'completed' ? 'text-[#485C11]' :
                        jobStatus === 'failed' ? 'text-red-600' :
                          jobStatus === 'queued' ? 'text-blue-600' :
                            'text-amber-700'
                        }`}>
                        {jobStatus === 'completed' ? 'Your personalized itinerary is ready below — please Accept or Reject below' :
                          jobStatus === 'failed' ? 'Please try again or check your inputs' :
                            jobStatus === 'queued' ? 'Waiting in queue...' :
                              'Generating your personalized travel plan...'}
                      </p>
                    </div>
                  </div>

                  {jobStatus === 'completed' && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        document.getElementById("generated-itinerary-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="bg-[#485C11] hover:bg-[#38480e] text-white text-xs rounded-xl shadow-xs shrink-0 self-start sm:self-center"
                    >
                      View & Accept Plan ↓
                    </Button>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all duration-700 ${jobStatus === 'completed' ? 'bg-[#485C11] w-full' :
                    jobStatus === 'failed' ? 'bg-red-500 w-full' :
                      jobStatus === 'queued' ? 'bg-blue-500 w-1/3' :
                        'bg-amber-500 w-2/3'
                    }`}></div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Output */}
        {plan && (
          <div id="generated-itinerary-output" className="space-y-6 scroll-mt-6">
            {/* Itinerary Decision Card (Accept / Reject) */}
            {decisionStatus === 'pending' && (
              <Card className="border-2 border-[#485C11]/50 bg-gradient-to-r from-[#DFECC6]/40 via-white to-[#DFECC6]/40 shadow-lg ring-2 ring-[#485C11]/20 animate-in fade-in-0 duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-5 text-[#485C11] animate-pulse" />
                        <h3 className="text-lg font-bold text-[#1a1a1a]">
                          Review Your Generated Itinerary
                        </h3>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#485C11] text-white">
                          Action Required
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Review your personalized itinerary below. Would you like to accept this plan and add it to your schedule?
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                      <Button
                        onClick={handleAcceptPlan}
                        className="flex-1 md:flex-none bg-[#485C11] hover:bg-[#3a4d0d] text-white font-semibold rounded-full px-6 py-2.5 shadow-md transition-all hover:scale-105"
                      >
                        <Check className="mr-2 size-4" />
                        Accept Itinerary
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRejectPlan}
                        className="flex-1 md:flex-none rounded-full px-6 py-2.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 font-semibold transition-all"
                      >
                        <X className="mr-2 size-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* If Accepted Banner */}
            {decisionStatus === 'accepted' && (
              <Card className="border-2 border-green-500/40 bg-green-50/50 shadow-md animate-in fade-in-0 duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle className="size-5 text-green-700" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-green-900">
                          Itinerary Accepted & Added to Schedule!
                        </h3>
                        <p className="text-xs sm:text-sm text-green-700 mt-0.5">
                          This itinerary is now synced side-by-side with your calendar in the My Schedule menu.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                      <Link href="/trip-map" className="w-full sm:w-auto">
                        <Button className="w-full bg-[#485C11] hover:bg-[#3a4d0d] text-white rounded-full px-5 shadow-sm">
                          <MapPin className="mr-2 size-4 text-[#DFECC6]" />
                          Open Trip Map & Hotels
                        </Button>
                      </Link>
                      <Link href="/mapcalendar" className="w-full sm:w-auto">
                        <Button variant="outline" className="w-full border-[#485C11]/40 hover:bg-[#485C11]/10 text-[#485C11] rounded-full px-5 shadow-sm">
                          <CalendarIcon className="mr-2 size-4" />
                          View Schedule
                          <ArrowRight className="ml-2 size-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* If Rejected Banner */}
            {decisionStatus === 'rejected' && (
              <Card className="border-2 border-amber-400/50 bg-amber-50/60 shadow-md animate-in fade-in-0 duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle className="size-5 text-amber-700" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-amber-900">
                          Itinerary Rejected
                        </h3>
                        <p className="text-xs sm:text-sm text-amber-800 mt-0.5">
                          Would you like to regenerate a fresh plan with AI, or edit your travel preferences above?
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <Button
                        onClick={handleRegenerate}
                        disabled={loading}
                        className="flex-1 sm:flex-none bg-[#485C11] hover:bg-[#3a4d0d] text-white rounded-full px-5 text-xs sm:text-sm"
                      >
                        <RotateCcw className="mr-1.5 size-3.5" />
                        Regenerate Plan
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleEditChanges}
                        className="flex-1 sm:flex-none rounded-full px-5 border-amber-300 text-amber-900 hover:bg-amber-100/70 text-xs sm:text-sm"
                      >
                        <Edit3 className="mr-1.5 size-3.5" />
                        Edit Preferences
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Trip Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">{summary}</p>
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    <IndianRupee className="h-3 w-3 mr-1" />
                    {plan?.total_estimated_cost || "₹15,000"}
                  </Badge>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {plan?.itinerary?.length || 0} Days
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Interactive Day-by-Day Itinerary Cards */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#DFECC6] shadow-xs">
                <div>
                  <h3 className="text-lg font-bold text-[#1a1a1a] flex items-center gap-2">
                    <CalendarIcon className="size-5 text-[#485C11]" />
                    Day-by-Day Itinerary
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Click any day card to explore its morning, afternoon, and evening schedule details.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={expandedDays.size === (plan?.itinerary?.length || 0) ? collapseAllDays : expandAllDays}
                    className="text-xs border-[#8E9C78]/50 text-[#485C11] hover:bg-[#DFECC6]/40 rounded-xl"
                  >
                    <Layers className="size-3.5 mr-1.5" />
                    {expandedDays.size === (plan?.itinerary?.length || 0) ? "Collapse All Days" : "Expand All Days"}
                  </Button>
                  <Badge variant="outline" className="bg-[#DFECC6]/40 border-[#8E9C78]/50 text-[#303f0b] text-xs font-semibold">
                    {plan?.itinerary?.length || 0} Days
                  </Badge>
                </div>
              </div>

              {/* Day Selector Quick Navigation Pills */}
              {(plan?.itinerary || []).length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {(plan?.itinerary || []).map((day, idx) => {
                    const isExpanded = expandedDays.has(idx);
                    return (
                      <button
                        key={`day-nav-pill-${idx}`}
                        type="button"
                        onClick={() => {
                          if (!isExpanded) toggleDayExpansion(idx);
                          const el = document.getElementById(`day-card-${idx}`);
                          if (el) {
                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                        className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                          isExpanded
                            ? "bg-[#485C11] text-white border-[#485C11] shadow-xs"
                            : "bg-white text-gray-700 border-gray-200 hover:border-[#8E9C78] hover:bg-[#DFECC6]/30"
                        }`}
                      >
                        <span className="font-bold">{day.day}</span>
                        <span className="opacity-80">· {day.city}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Day Cards List */}
              <div className="space-y-4">
                {(plan?.itinerary || []).map((day, idx) => {
                  const isExpanded = expandedDays.has(idx);
                  return (
                    <Card
                      key={`day-card-${idx}`}
                      id={`day-card-${idx}`}
                      className={`transition-all duration-200 border-2 overflow-hidden ${
                        isExpanded
                          ? "border-[#485C11]/50 bg-white ring-1 ring-[#485C11]/20 shadow-md"
                          : "border-[#e5e7db] bg-gradient-to-r from-white via-[#FAFBF8] to-white hover:border-[#8E9C78]/70 hover:shadow-md"
                      }`}
                    >
                      {/* Clickable Header */}
                      <div
                        onClick={() => toggleDayExpansion(idx)}
                        className="p-4 sm:p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3.5 select-none"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <span
                            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-2xs shrink-0 transition-colors ${
                              isExpanded
                                ? "bg-[#485C11] text-white"
                                : "bg-[#DFECC6] text-[#293608]"
                            }`}
                          >
                            {day.day}
                          </span>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-base text-gray-900">
                                {day.theme || `${day.city} Discovery`}
                              </h4>
                              <span className="inline-flex items-center text-xs font-semibold text-gray-700 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                                <MapPin className="h-3 w-3 mr-1 text-[#485C11]" />
                                {day.city}
                              </span>
                              {day.weather && (
                                <span className="inline-flex items-center text-xs text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full font-medium">
                                  <span className="mr-1">{day.weather.emoji}</span>
                                  {day.weather.description} · {day.weather.minC}–{day.weather.maxC}°C
                                </span>
                              )}
                            </div>

                            {/* Collapsed Preview Snippets */}
                            {!isExpanded && (
                              <div className="flex items-center gap-2.5 mt-2 text-xs text-gray-500 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                                  <Sunrise className="size-3" /> Morning
                                </span>
                                <span className="text-gray-300">•</span>
                                <span className="inline-flex items-center gap-1 text-sky-700 font-medium">
                                  <Sun className="size-3" /> Afternoon
                                </span>
                                <span className="text-gray-300">•</span>
                                <span className="inline-flex items-center gap-1 text-indigo-700 font-medium">
                                  <Moon className="size-3" /> Evening
                                </span>
                                <span className="text-gray-300">•</span>
                                <span className="text-gray-400 italic">Click card to view details</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right side Badges & Toggle Button */}
                        <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
                          <Badge variant="secondary" className="text-xs font-bold text-[#485C11] bg-[#DFECC6]/60 px-3 py-1">
                            <IndianRupee className="h-3 w-3 mr-0.5" />
                            {day.estimated_cost}
                          </Badge>

                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                              isExpanded
                                ? "bg-[#485C11]/10 text-[#485C11]"
                                : "bg-gray-100 text-gray-700 hover:bg-[#DFECC6]/60"
                            }`}
                          >
                            <span>{isExpanded ? "Collapse" : "View Morning, Afternoon & Evening"}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-[#485C11]" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-600" />
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Details Body */}
                      {isExpanded && (
                        <CardContent className="px-4 sm:px-5 pb-5 pt-0 border-t border-gray-100 animate-in fade-in-0 duration-200">
                          {/* Overview Description */}
                          {day.description && (
                            <div className="my-3.5 p-3.5 rounded-xl bg-[#FAFBF8] border border-[#e5e7db] text-xs text-gray-700 italic leading-relaxed">
                              &ldquo;{day.description}&rdquo;
                            </div>
                          )}

                          {/* Morning, Afternoon, Evening Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-3 mb-4">
                            {/* Morning Card */}
                            <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-white border border-amber-200/70 shadow-2xs">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="size-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                                    <Sunrise className="size-4" />
                                  </div>
                                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Morning</span>
                                </div>
                                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                                  08:00 – 12:30
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
                                {day.morning}
                              </p>
                            </div>

                            {/* Afternoon Card */}
                            <div className="rounded-2xl p-4 bg-gradient-to-br from-sky-50/70 via-blue-50/30 to-white border border-sky-200/70 shadow-2xs">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="size-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                                    <Sun className="size-4" />
                                  </div>
                                  <span className="text-xs font-bold uppercase tracking-wider text-sky-900">Afternoon</span>
                                </div>
                                <span className="text-[10px] font-semibold text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded-full">
                                  12:30 – 17:00
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
                                {day.afternoon}
                              </p>
                            </div>

                            {/* Evening Card */}
                            <div className="rounded-2xl p-4 bg-gradient-to-br from-indigo-50/70 via-purple-50/30 to-white border border-indigo-200/70 shadow-2xs">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="size-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                                    <Moon className="size-4" />
                                  </div>
                                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">Evening</span>
                                </div>
                                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                                  17:00 – 21:30
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm text-gray-800 leading-relaxed">
                                {day.evening}
                              </p>
                            </div>
                          </div>

                          {/* Accommodation & Dining Section */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3">
                            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200 flex items-start gap-3">
                              <div className="size-8 rounded-lg bg-[#485C11]/10 text-[#485C11] flex items-center justify-center shrink-0 mt-0.5">
                                <Hotel className="size-4" />
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Stay & Accommodation</p>
                                <p className="text-xs sm:text-sm text-gray-800 font-medium mt-0.5">{day.accommodation}</p>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200 flex items-start gap-3">
                              <div className="size-8 rounded-lg bg-[#485C11]/10 text-[#485C11] flex items-center justify-center shrink-0 mt-0.5">
                                <Utensils className="size-4" />
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Dining & Recommended Food</p>
                                <p className="text-xs sm:text-sm text-gray-800 font-medium mt-0.5">{day.meals}</p>
                              </div>
                            </div>
                          </div>

                          {/* Dedicated Local Guide Card */}
                          {day.guide ? (
                            <div className="mt-3 p-3.5 rounded-xl bg-[#DFECC6]/40 border border-[#8E9C78]/40 flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#485C11]/15 flex items-center justify-center text-[#485C11] shrink-0">
                                  <User className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-[#1a1a1a]">
                                    Local Guide: {day.guide.name}
                                    {day.guide.isDemo && (
                                      <span className="ml-1 text-[10px] text-amber-600 font-normal">(Demo Guide)</span>
                                    )}
                                  </p>
                                  <p className="text-[11px] text-[#6b7280]">
                                    Dedicated local expertise · ₹{day.guide.hourlyRate}/hr (est. ₹{day.guide.cost})
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-[10px] bg-[#485C11] text-white">
                                Verified Guide
                              </Badge>
                            </div>
                          ) : (
                            <div className="mt-2 text-xs text-gray-400 italic flex items-center gap-1.5">
                              <Compass className="size-3.5 text-[#485C11]" />
                              Self-guided exploration — enjoy independent discovery at your own pace
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Travel Tips, Smart Packing List, and Emergency Directory */}
            {(() => {
              const activeDests =
                selectedDestinations.length > 0
                  ? selectedDestinations.map((d) => d.name)
                  : plan?.itinerary && plan.itinerary.length > 0
                  ? plan.itinerary.map((d) => d.city).filter(Boolean)
                  : citiesText.split(",").map((s) => s.trim()).filter(Boolean);
              const currentProfile = resolveDestinationProfile(activeDests);
              const primaryCityName = plan?.itinerary?.[0]?.city || selectedDestinations?.[0]?.name || citiesText.split(",")[0]?.trim() || "Destination";

              const allPackingItems = [...(plan?.packing_list || []), ...customPackingItems];
              const totalPackingCount = allPackingItems.length;
              const currentPackedCount = Object.values(packedItems).filter(Boolean).length;
              const percentPacked = totalPackingCount > 0 ? Math.round((currentPackedCount / totalPackingCount) * 100) : 0;

              const filteredPackingItems = allPackingItems.filter((item) => {
                if (packingCategory === "all") return true;
                const lower = item.toLowerCase();
                if (packingCategory === "essentials") {
                  return /passport|visa|id|card|cash|insurance|wallet|permit|license|proof|booking|reservation/i.test(lower);
                }
                if (packingCategory === "clothing") {
                  return /shoe|apparel|jacket|shirt|pant|hat|sock|sandals|scarf|sunglasses|dress|rain|umbrella|linen|cotton|layer/i.test(lower);
                }
                if (packingCategory === "gear") {
                  return /plug|adapter|power|charger|cable|sim|wifi|battery|phone|electronics|towel|pouch|coin/i.test(lower);
                }
                if (packingCategory === "health") {
                  return /sunscreen|spf|medicine|first-aid|electrolyte|ors|sanitizer|wipes|bottle|hydration|mosquito|repellent/i.test(lower);
                }
                return true;
              });

              const parseEmergencyNumber = (rawVal?: string, defaultSub: string = "") => {
                if (!rawVal) return { num: "112", sub: defaultSub };
                const str = String(rawVal);
                const cleanNum = str.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
                const parenMatch = str.match(/\(([^)]+)\)/);
                const sub = parenMatch ? parenMatch[1] : defaultSub;
                return {
                  num: cleanNum || str,
                  sub: sub || defaultSub,
                };
              };

              const getDialableNumber = (numStr: string, fallback: string = "112"): string => {
                if (!numStr) return fallback;
                const firstPart = numStr.split("/")[0].trim();
                const digits = firstPart.replace(/[^0-9+]/g, "");
                return digits || fallback;
              };

              const parsedLocal = parseEmergencyNumber(
                plan?.emergency_contacts?.local_emergency || currentProfile.emergency.local_emergency,
                "Police & Urgent Dispatch"
              );
              const parsedAmbulance = parseEmergencyNumber(
                plan?.emergency_contacts?.ambulance || currentProfile.emergency.ambulance,
                "Emergency Medical Care"
              );
              const parsedTourist = parseEmergencyNumber(
                plan?.emergency_contacts?.tourist_helpline || currentProfile.emergency.tourist_helpline,
                "Visitor & Consular Support"
              );

              return (
                <div className="space-y-6">
                  {/* Row 1: Travel Tips & Smart Packing List */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    {/* Curated Travel & Cultural Tips */}
                    <Card className="border border-[#8E9C78]/40 shadow-sm bg-gradient-to-br from-[#DFECC6]/15 via-white to-white flex flex-col justify-between">
                      <CardHeader className="pb-3 border-b border-gray-100/80">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-[#2d3a0c]">
                            <Compass className="size-5 text-[#485C11]" />
                            Curated Travel & Cultural Tips
                          </CardTitle>
                          <Badge variant="outline" className="text-xs bg-[#DFECC6]/40 border-[#8E9C78]/50 text-[#303f0b] font-medium">
                            📍 {currentProfile.country}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Verified local guidelines, payment customs & cultural etiquette
                        </p>
                      </CardHeader>
                      <CardContent className="pt-4 flex-1">
                        <div className="space-y-2.5">
                          {(plan?.travel_tips || []).map((tip, idx) => {
                            const [rawCategory, ...rest] = tip.includes(":") ? tip.split(":") : ["Guidance", tip];
                            const content = rest.length > 0 ? rest.join(":") : rawCategory;
                            const hasPrefix = rest.length > 0;
                            const catLower = rawCategory.toLowerCase();

                            let CatIcon = Compass;
                            let badgeStyle = "bg-gray-100 text-gray-700 border-gray-200";

                            if (catLower.includes("payment") || catLower.includes("cash") || catLower.includes("currency")) {
                              CatIcon = CreditCard;
                              badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200";
                            } else if (catLower.includes("culture") || catLower.includes("etiquette") || catLower.includes("temple") || catLower.includes("dress") || catLower.includes("respect")) {
                              CatIcon = Landmark;
                              badgeStyle = "bg-purple-50 text-purple-800 border-purple-200";
                            } else if (catLower.includes("transit") || catLower.includes("commute") || catLower.includes("metro") || catLower.includes("ride") || catLower.includes("train")) {
                              CatIcon = Bus;
                              badgeStyle = "bg-blue-50 text-blue-800 border-blue-200";
                            } else if (catLower.includes("power") || catLower.includes("plug") || catLower.includes("connectivity") || catLower.includes("wifi") || catLower.includes("sim")) {
                              CatIcon = Zap;
                              badgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
                            } else if (catLower.includes("dining") || catLower.includes("water") || catLower.includes("food") || catLower.includes("hydration")) {
                              CatIcon = Utensils;
                              badgeStyle = "bg-teal-50 text-teal-800 border-teal-200";
                            } else if (catLower.includes("photo") || catLower.includes("sights") || catLower.includes("golden hour") || catLower.includes("sunrise")) {
                              CatIcon = Sunrise;
                              badgeStyle = "bg-rose-50 text-rose-800 border-rose-200";
                            }

                            return (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-white border border-[#8E9C78]/25 hover:border-[#485C11]/50 transition-all shadow-2xs hover:shadow-xs flex flex-col gap-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badgeStyle}`}>
                                    <CatIcon className="size-3" />
                                    {hasPrefix ? rawCategory.trim() : `Insight #${idx + 1}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(`tip_${idx}`, tip)}
                                    className="text-gray-400 hover:text-gray-700 transition-colors p-1"
                                    title="Copy tip"
                                  >
                                    {copiedContact === `tip_${idx}` ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
                                  </button>
                                </div>
                                <p className="text-xs sm:text-[13px] text-gray-700 leading-relaxed">
                                  {content.trim()}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Smart Packing Checklist */}
                    <Card className="border border-[#8E9C78]/40 shadow-sm bg-gradient-to-br from-white via-white to-gray-50/50 flex flex-col justify-between">
                      <CardHeader className="pb-3 border-b border-gray-100/80">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-[#2d3a0c]">
                            <Luggage className="size-5 text-[#485C11]" />
                            Smart Packing Checklist
                          </CardTitle>
                          <Badge variant="secondary" className="text-xs bg-[#485C11] text-white">
                            {currentPackedCount} / {totalPackingCount} Packed
                          </Badge>
                        </div>
                        {/* Slim Progress Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mt-2">
                          <div
                            className="bg-gradient-to-r from-[#485C11] to-emerald-500 h-1.5 transition-all duration-300 rounded-full"
                            style={{ width: `${percentPacked}%` }}
                          />
                        </div>
                        {/* Category Pills & Bulk Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2">
                          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                            {[
                              { id: "all", label: "All" },
                              { id: "essentials", label: "Essentials" },
                              { id: "clothing", label: "Clothing" },
                              { id: "gear", label: "Gear" },
                              { id: "health", label: "Health" }
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setPackingCategory(tab.id)}
                                className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-colors ${
                                  packingCategory === tab.id
                                    ? "bg-[#485C11] text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                            <button
                              type="button"
                              onClick={handlePackAll}
                              className="text-[11px] text-[#485C11] hover:underline font-medium"
                            >
                              Pack All
                            </button>
                            <span className="text-gray-300">•</span>
                            <button
                              type="button"
                              onClick={handleResetPacked}
                              className="text-[11px] text-gray-500 hover:underline"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-3 flex-1 flex flex-col justify-between">
                        {/* Compact 2-Column Responsive Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-0.5">
                          {filteredPackingItems.map((item, idx) => {
                            const actualIdx = allPackingItems.indexOf(item);
                            const isPacked = !!packedItems[actualIdx];
                            const isCustom = actualIdx >= (plan?.packing_list || []).length;
                            return (
                              <div
                                key={actualIdx}
                                onClick={() => togglePacked(actualIdx)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                  isPacked
                                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                                    : "bg-white border-gray-200/80 hover:border-[#8E9C78] text-gray-700 shadow-2xs"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    className={`shrink-0 transition-colors ${isPacked ? "text-emerald-600" : "text-gray-400"}`}
                                  >
                                    {isPacked ? (
                                      <CheckSquare className="size-4 fill-emerald-100 text-emerald-600" />
                                    ) : (
                                      <Square className="size-4" />
                                    )}
                                  </button>
                                  <span className={`text-xs truncate ${isPacked ? "line-through opacity-70" : "font-medium"}`} title={item}>
                                    {item}
                                  </span>
                                </div>
                                {isCustom && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveCustomPackingItem(item, actualIdx);
                                    }}
                                    className="text-gray-400 hover:text-red-500 p-0.5 shrink-0"
                                    title="Delete custom item"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Inline Add Item Input */}
                        <form onSubmit={handleAddCustomPackingItem} className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-100">
                          <Input
                            value={newPackingInput}
                            onChange={(e) => setNewPackingInput(e.target.value)}
                            placeholder="+ Add personal item (e.g. Lens case, Camera)..."
                            className="h-8 text-xs bg-white"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs px-2.5 shrink-0 border-[#8E9C78]/50 text-[#303f0b] hover:bg-[#DFECC6]/30"
                          >
                            <Plus className="size-3 mr-1" /> Add
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Row 2: Emergency & Safety Directory (Space-efficient, 100% accurate, Prominent Numbers) */}
                  <Card className="border border-rose-200 bg-gradient-to-r from-rose-50/40 via-white to-orange-50/20 shadow-xs">
                    <CardHeader className="py-2.5 px-4 sm:px-6 border-b border-rose-100">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                            <PhoneCall className="size-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm sm:text-base font-bold text-rose-950">
                                Emergency & Safety Directory
                              </CardTitle>
                              <Badge variant="outline" className="text-[10px] bg-white border-rose-200 text-rose-800 font-semibold px-2 py-0">
                                📍 {currentProfile.country}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-rose-800/80">
                              {plan?.emergency_contacts?.advisory || currentProfile.emergency.advisory}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-rose-600 text-white self-start sm:self-auto text-[10px] px-2.5 py-0.5">
                          24/7 Rapid Response
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3 sm:p-4">
                      {/* 4-Column Contact Cards with Bold, Fully-Visible Numbers */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        {/* Police & Emergency */}
                        <div className="p-3 rounded-xl bg-white border border-rose-200 shadow-2xs hover:border-rose-300 transition-all flex flex-col justify-between gap-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                              Police & Emergency
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={`tel:${getDialableNumber(parsedLocal.num, currentProfile.emergency.quick_dial || "112")}`}
                                className="py-0.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                title="Call Police / Emergency"
                              >
                                <PhoneCall className="size-3" />
                                Call
                              </a>
                              <button
                                type="button"
                                onClick={() => copyToClipboard("local", parsedLocal.num)}
                                className="p-1 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 text-xs transition-colors"
                                title="Copy number"
                              >
                                {copiedContact === "local" ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-gray-950 select-all leading-tight break-words py-0.5">
                              {parsedLocal.num}
                            </div>
                            <p className="text-[10px] text-gray-500 line-clamp-1">
                              {parsedLocal.sub || "Police / Urgent Dispatch"}
                            </p>
                          </div>
                        </div>

                        {/* Medical & Ambulance */}
                        <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs hover:border-emerald-300 transition-all flex flex-col justify-between gap-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                              Medical & Ambulance
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={`tel:${getDialableNumber(parsedAmbulance.num, "112")}`}
                                className="py-0.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                title="Call Ambulance"
                              >
                                <PhoneCall className="size-3" />
                                Call
                              </a>
                              <button
                                type="button"
                                onClick={() => copyToClipboard("ambulance", parsedAmbulance.num)}
                                className="p-1 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 text-xs transition-colors"
                                title="Copy number"
                              >
                                {copiedContact === "ambulance" ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-gray-950 select-all leading-tight break-words py-0.5">
                              {parsedAmbulance.num}
                            </div>
                            <p className="text-[10px] text-gray-500 line-clamp-1">
                              {parsedAmbulance.sub || "Emergency Medical Care"}
                            </p>
                          </div>
                        </div>

                        {/* Tourist Helpline */}
                        <div className="p-3 rounded-xl bg-white border border-blue-200 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between gap-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                              Tourist Helpline
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={`tel:${getDialableNumber(parsedTourist.num, "112")}`}
                                className="py-0.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                title="Call Tourist Helpline"
                              >
                                <PhoneCall className="size-3" />
                                Call
                              </a>
                              <button
                                type="button"
                                onClick={() => copyToClipboard("tourist", parsedTourist.num)}
                                className="p-1 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 text-xs transition-colors"
                                title="Copy number"
                              >
                                {copiedContact === "tourist" ? <Check className="size-3 text-green-600" /> : <Copy className="size-3" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <div className="text-base sm:text-lg font-black font-mono tracking-tight text-gray-950 select-all leading-tight break-words py-0.5">
                              {parsedTourist.num}
                            </div>
                            <p className="text-[10px] text-gray-500 line-clamp-1">
                              {parsedTourist.sub || "Visitor & Consular Support"}
                            </p>
                          </div>
                        </div>

                        {/* Stay & Concierge */}
                        <div className="p-3 rounded-xl bg-white border border-[#8E9C78]/50 shadow-2xs hover:border-[#8E9C78] transition-all flex flex-col justify-between gap-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-bold text-[#303f0b] uppercase tracking-wider">
                              Stay & Concierge
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard("hotel", `${plan?.emergency_contacts?.hotel || "Hotel Front Desk"} | ${plan?.emergency_contacts?.roamly_support || currentProfile.emergency.roamly_support}`)}
                              className="py-0.5 px-2 bg-[#485C11] hover:bg-[#3a4d0d] text-white rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors"
                              title="Copy Stay Information"
                            >
                              {copiedContact === "hotel" ? <Check className="size-3 text-white" /> : <Copy className="size-3" />}
                              Copy
                            </button>
                          </div>
                          <div>
                            <div className="text-sm sm:text-base font-bold text-gray-950 select-all leading-tight">
                              {plan?.emergency_contacts?.hotel || "Hotel Front Desk"}
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 font-mono">
                              {plan?.emergency_contacts?.roamly_support || currentProfile.emergency.roamly_support}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            {/* Grounding Diagnostic Panel (collapsible) */}
            {agentResult && (
              <Card className="border-dashed">
                <CardHeader
                  className="cursor-pointer select-none"
                  onClick={() => setShowDiagnostics((prev) => !prev)}
                >
                  <CardTitle className="flex items-center justify-between text-sm text-gray-600">
                    <span className="flex items-center gap-2">
                      {agentResult.routerTrace.validationStatus === "PASSED" ? (
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                      )}
                      Grounding Diagnostics
                      <Badge variant={agentResult.routerTrace.validationStatus === "PASSED" ? "secondary" : "outline"}>
                        {agentResult.routerTrace.validationStatus}
                      </Badge>
                      {agentResult.routerTrace.fallbackUsed && (
                        <Badge variant="outline" className="text-amber-700">Fallback used</Badge>
                      )}
                    </span>
                    {showDiagnostics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CardTitle>
                </CardHeader>
                {showDiagnostics && (
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">Agents Executed</p>
                      <div className="flex flex-wrap gap-2">
                        {agentResult.routerTrace.agentsExecuted.map((agent, idx) => (
                          <Badge key={`${agent}-${idx}`} variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1 text-green-600" />
                            {agent}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">Grounding Sources</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(agentResult.sources).map(([key, value]) => (
                          <div key={key} className="flex justify-between border rounded px-2 py-1">
                            <span className="text-gray-500">{key}</span>
                            <span className="font-mono text-gray-800">{value || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {agentResult.days.some((d) => d.guide?.isDemo) && (
                      <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs">
                        ⚠️ DEMO DATA — NOT BOOKABLE: one or more days use a demo guide fallback because the Roamly guide database was unreachable.
                      </div>
                    )}

                    {agentResult.warnings && agentResult.warnings.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">Warnings</p>
                        <ul className="space-y-1 text-xs text-gray-600">
                          {agentResult.warnings.map((w, idx) => (
                            <li key={idx}>• [{w.code}] {w.details}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="text-xs text-gray-400">
                      Re-optimizations: {agentResult.routerTrace.reOptimizations} · Trip ID: {agentResult.tripId ?? "not persisted"}
                    </p>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Bottom Decision Card when reviewing full plan */}
            {decisionStatus === 'pending' && (
              <Card className="border-2 border-[#485C11]/50 bg-gradient-to-r from-[#DFECC6]/40 via-white to-[#DFECC6]/40 shadow-lg ring-2 ring-[#485C11]/20 animate-in fade-in-0 duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-5 text-[#485C11]" />
                        <h4 className="font-bold text-base text-[#1a1a1a]">Ready to finalize this trip plan?</h4>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        Accept this itinerary to sync it with your schedule and hotels, or reject to regenerate.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                      <Button
                        onClick={handleAcceptPlan}
                        className="flex-1 sm:flex-none bg-[#485C11] hover:bg-[#3a4d0d] text-white font-semibold rounded-full px-6 py-2.5 shadow-md transition-all hover:scale-105 text-sm"
                      >
                        <Check className="mr-2 size-4" />
                        Accept Itinerary
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRejectPlan}
                        className="flex-1 sm:flex-none rounded-full px-5 py-2.5 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 font-semibold transition-all text-sm"
                      >
                        <X className="mr-2 size-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}