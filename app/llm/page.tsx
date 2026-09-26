"use client";

import React, { useState } from "react";
import { differenceInDays, parseISO, format } from "date-fns";
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
import { MultiSelectInterests } from "@/components/ui/multi-select-interests";
import Link from "next/link";
import {
  Plane,
  Calendar,
  MapPin,
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
  LocateFixed
} from "lucide-react";

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
  morning: string;
  afternoon: string;
  evening: string;
  accommodation: string;
  meals: string;
  estimated_cost: string;
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
  };
}

interface ApiResponse {
  plan: TravelPlan;
  summary: string;
}

export function deriveBudgetCategory(amountStr: string): {
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

export interface DestinationItem {
  locationId?: string;
  googlePlaceId?: string;
  name: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
}

export default function LLMPage() {
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
  const [customBudget, setCustomBudget] = useState("60000");
  const [accommodation, setAccommodation] = useState("Hotel");
  const [transportation, setTransportation] = useState("Train");
  const [travelInterests, setTravelInterests] = useState<string[]>([]);
  const [specialRequests, setSpecialRequests] = useState("");

  const derivedBudget = deriveBudgetCategory(customBudget);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const addDestination = (item: DestinationItem) => {
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

  const generatePlan = async () => {
    setLoading(true);
    setError("");
    setPlan(null);
    setSummary("");
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
      const formattedBudget = `₹${numericBudget.toLocaleString("en-IN")} total budget (Category: ${derivedBudget.category})`;

      const payload: TravelDetails = {
        destinations,
        start_date: startDate,
        end_date: endDate,
        budget: formattedBudget,
        travel_style: travelInterests[0] || "Cultural",
        interests: travelInterests,
        accommodation,
        transportation,
        special_requests: specialRequests || "None",
      };

      // Always use direct API but simulate queue experience
      console.log('🚀 Starting travel plan generation...');
      setJobStatus('queued');
      console.log('📋 Job queued - waiting in line...');

      // Simulate "queued" status for 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      setJobStatus('processing');
      console.log('⚙️  Job processing - generating your travel plan...');

      // Simulate "processing" status for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('🤖 Calling LLM API...');

      // Make the actual API call
      const res = await fetch("/api/generatePlanWithSummary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Request failed");
      }

      const data: ApiResponse = await res.json();
      console.log('✅ LLM response received successfully!');

      // Simulate "processing" for a bit more to show the experience
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('🎉 Travel plan completed!');

      setPlan(data.plan);
      setSummary(data.summary);
      setDecisionStatus("pending");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate travel plan";
      setError(errorMessage);
      setJobStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPlan = () => {
    const numericBudget = Math.max(0, parseInt(customBudget.replace(/[^0-9]/g, ""), 10) || 0);
    const resolvedDests = selectedDestinations.length > 0
      ? selectedDestinations.map((d) => d.name)
      : citiesText.split(",").map((s) => s.trim()).filter(Boolean);

    const acceptedData = {
      plan,
      summary,
      destinations: resolvedDests,
      destinationDetails: selectedDestinations,
      startDate,
      endDate,
      totalBudget: numericBudget,
      budget: `₹${numericBudget.toLocaleString("en-IN")}`,
      budgetCategory: derivedBudget.category,
      accommodation,
      transportation,
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
        <Card id="travel-form-card" className="mb-8 border-[#e5e7db] shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-6 w-6" />
              Travel Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
                      key={dest.locationId || dest.googlePlaceId || `${dest.name}-${idx}`}
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
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#FAFBF8]">
                    Google Places Suggestions
                  </div>
                  {suggestions.map((sug) => (
                    <button
                      key={sug.placeId}
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

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              </div>
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
                  {jobStatus === 'completed' && 'Travel plan completed!'}
                  {jobStatus === 'failed' && 'Job failed'}
                </span>
              </div>
            )}

            {/* Job Status with Progress */}
            {jobStatus !== 'idle' && (
              <div className={`p-4 rounded-md ${jobStatus === 'completed' ? 'bg-green-50 border border-green-200' :
                jobStatus === 'failed' ? 'bg-red-50 border border-red-200' :
                  jobStatus === 'queued' ? 'bg-blue-50 border border-blue-200' :
                    'bg-yellow-50 border border-yellow-200'
                }`}>
                <div className="flex items-center gap-3 mb-3">
                  {jobStatus === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : jobStatus === 'failed' ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : jobStatus === 'queued' ? (
                    <Clock className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${jobStatus === 'completed' ? 'text-green-700' :
                      jobStatus === 'failed' ? 'text-red-700' :
                        jobStatus === 'queued' ? 'text-blue-700' :
                          'text-yellow-700'
                      }`}>
                      {jobStatus === 'completed' ? 'Travel plan generated successfully!' :
                        jobStatus === 'failed' ? 'Failed to generate travel plan' :
                          jobStatus === 'queued' ? 'Job submitted to queue, processing...' :
                            'Processing your request...'}
                    </p>
                    <p className={`text-xs ${jobStatus === 'completed' ? 'text-green-600' :
                      jobStatus === 'failed' ? 'text-red-600' :
                        jobStatus === 'queued' ? 'text-blue-600' :
                          'text-yellow-600'
                      }`}>
                      {jobStatus === 'completed' ? 'Your itinerary is ready below' :
                        jobStatus === 'failed' ? 'Please try again or check your inputs' :
                          jobStatus === 'queued' ? 'Waiting in queue...' :
                            'Generating your personalized travel plan...'}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all duration-1000 ${jobStatus === 'completed' ? 'bg-green-500 w-full' :
                    jobStatus === 'failed' ? 'bg-red-500 w-full' :
                      jobStatus === 'queued' ? 'bg-blue-500 w-1/3' :
                        'bg-yellow-500 w-2/3'
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
          <div className="space-y-6">
            {/* Itinerary Decision Card (Accept / Reject) */}
            {decisionStatus === 'pending' && (
              <Card className="border-2 border-[#8E9C78]/40 bg-gradient-to-r from-[#DFECC6]/30 via-white to-[#DFECC6]/30 shadow-md">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-5 text-[#485C11]" />
                        <h3 className="text-lg font-bold text-[#1a1a1a]">
                          Review Your Generated Itinerary
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Would you like to accept this plan and add it directly to your schedule?
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <Button
                        onClick={handleAcceptPlan}
                        className="flex-1 md:flex-none bg-[#485C11] hover:bg-[#3a4d0d] text-white rounded-full px-6 shadow-sm"
                      >
                        <Check className="mr-2 size-4" />
                        Accept Itinerary
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleRejectPlan}
                        className="flex-1 md:flex-none rounded-full px-6 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
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

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      <Link href="/mapcalendar" className="w-full sm:w-auto">
                        <Button className="w-full bg-[#485C11] hover:bg-[#3a4d0d] text-white rounded-full px-6 shadow-sm">
                          <Calendar className="mr-2 size-4" />
                          View in My Schedule
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

            {/* Itinerary */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Itinerary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {(plan?.itinerary || []).map((day, idx) => (
                    <div key={idx} className="border-l-2 border-blue-200 pl-4">
                      <div className="mb-3">
                        <h3 className="font-semibold text-lg text-gray-900">{day.day}</h3>
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {day.city}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Morning</p>
                          <p className="text-sm text-gray-700">{day.morning}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Afternoon</p>
                          <p className="text-sm text-gray-700">{day.afternoon}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Evening</p>
                          <p className="text-sm text-gray-700">{day.evening}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Accommodation</p>
                          <p className="text-sm text-gray-700">{day.accommodation}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">Meals</p>
                          <p className="text-sm text-gray-700">{day.meals}</p>
                        </div>
                      </div>

                      <div>
                        <Badge variant="secondary" className="text-xs">
                          <IndianRupee className="h-3 w-3 mr-1" />
                          {day.estimated_cost}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Travel Tips */}
              <Card>
                <CardHeader>
                  <CardTitle>Travel Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(plan?.travel_tips || []).map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-gray-700">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Packing List */}
              <Card>
                <CardHeader>
                  <CardTitle>Packing List</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {(plan?.packing_list || []).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Emergency Contacts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-red-700">Emergency Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Local Emergency</p>
                    <p className="text-sm font-mono text-gray-700">{plan?.emergency_contacts?.local_emergency || "112 / 100"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Embassy</p>
                    <p className="text-sm font-mono text-gray-700">{plan?.emergency_contacts?.embassy || "National Helpline 1363"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Hotel</p>
                    <p className="text-sm font-mono text-gray-700">{plan?.emergency_contacts?.hotel || "Hotel Concierge Desk"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}