"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { format, parseISO, addDays, isSameDay } from "date-fns";
import {
  Calendar as CalendarIcon,
  MapPin,
  IndianRupee,
  Hotel,
  Utensils,
  Sun,
  CloudSun,
  Moon,
  Sparkles,
  Plane,
  Clock,
  Shield,
  CheckCircle,
  Briefcase,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { exportItineraryToPDF } from "@/lib/generate-itinerary-pdf";

const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((mod) => mod.Calendar),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] w-full flex items-center justify-center text-xs text-muted-foreground animate-pulse">
        Loading calendar...
      </div>
    ),
  }
);

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

interface AcceptedTripData {
  plan: TravelPlan;
  summary: string;
  destinations: string[];
  startDate: string;
  endDate: string;
  budget: string;
  accommodation: string;
  transportation: string;
  interests: string[];
  acceptedAt?: string;
}

// Fallback sample trip data if none accepted yet
const SAMPLE_ACCEPTED_TRIP: AcceptedTripData = {
  destinations: ["Delhi", "Agra", "Jaipur"],
  startDate: format(new Date(), "yyyy-MM-dd"),
  endDate: format(addDays(new Date(), 6), "yyyy-MM-dd"),
  budget: "Mid-range",
  accommodation: "Boutique Heritage Hotel",
  transportation: "Express Train & Private Cab",
  interests: ["Cultural & Heritage", "Historical Sites", "Food & Culinary", "Photography & Scenic"],
  summary:
    "A culturally rich Golden Triangle journey traversing iconic Mughal monuments, vibrant culinary alleys of Old Delhi, and royal palaces in Rajasthan.",
  plan: {
    total_estimated_cost: "₹28,500",
    itinerary: [
      {
        day: "Day 1",
        city: "Delhi",
        morning: "Arrive in Delhi. Check into heritage hotel and enjoy breakfast at Connaught Place.",
        afternoon: "Explore the UNESCO World Heritage Red Fort and wander through Chandni Chowk spice markets.",
        evening: "Sunset photography at India Gate and traditional North Indian dinner at Karim's.",
        accommodation: "Heritage Haveli, Old Delhi",
        meals: "Breakfast at hotel, Street food lunch, Mughlai dinner",
        estimated_cost: "₹4,200",
      },
      {
        day: "Day 2",
        city: "Delhi",
        morning: "Visit Qutub Minar complex and the serene gardens of Humayun's Tomb.",
        afternoon: "Guided walking tour through Lodhi Art District and craft shopping at Dilli Haat.",
        evening: "Musical evening and light dinner at Hauz Khas Village overlooking the lake.",
        accommodation: "Heritage Haveli, Old Delhi",
        meals: "Continental breakfast, Cafe lunch, Rooftop dinner",
        estimated_cost: "₹3,800",
      },
      {
        day: "Day 3",
        city: "Agra",
        morning: "Morning Gatimaan Express train to Agra. Check in near the Taj East Gate.",
        afternoon: "Visit the formidable Agra Fort and explore Mehtab Bagh sunset viewpoint.",
        evening: "Sample authentic Agra Petha and enjoy rooftop dinner with Taj Mahal skyline views.",
        accommodation: "Taj View Boutique Hotel",
        meals: "Train breakfast, Mughlai lunch, Rooftop dinner",
        estimated_cost: "₹5,400",
      },
      {
        day: "Day 4",
        city: "Agra & Fatehpur Sikri",
        morning: "Sunrise visit to the Taj Mahal to capture the golden dawn reflection.",
        afternoon: "Excursion to the ghost city of Fatehpur Sikri and Buland Darwaza.",
        evening: "Scenic private cab transfer towards Jaipur with a stop at Abhaneri Stepwell.",
        accommodation: "Royal Palace Hotel, Jaipur",
        meals: "Hotel breakfast, Highway dhaba lunch, Rajasthani thali",
        estimated_cost: "₹5,100",
      },
      {
        day: "Day 5",
        city: "Jaipur",
        morning: "Ascend to Amber Fort with panoramic views of Maota Lake.",
        afternoon: "Tour City Palace museum and marvel at the astronomical instruments at Jantar Mantar.",
        evening: "Photo stop at Hawa Mahal (Palace of Winds) and shopping for handcrafted textiles.",
        accommodation: "Royal Palace Hotel, Jaipur",
        meals: "Buffet breakfast, Local thali lunch, Candlelit dinner",
        estimated_cost: "₹4,800",
      },
      {
        day: "Day 6",
        city: "Jaipur",
        morning: "Morning hike to Nahargarh Fort for a sweeping sunrise view over the Pink City.",
        afternoon: "Visit Albert Hall Museum and enjoy local sweets at Laxmi Mishthan Bhandar.",
        evening: "Farewell rooftop dinner with traditional Rajasthani folk music and dance performance.",
        accommodation: "Royal Palace Hotel, Jaipur",
        meals: "Heritage breakfast, Rajasthani sweets & lunch, Farewell dinner",
        estimated_cost: "₹5,200",
      },
    ],
    travel_tips: [
      "Carry valid photo ID for monument entries across Delhi and Rajasthan.",
      "Taj Mahal remains closed on Fridays — plan accordingly.",
      "Pre-book express train tickets for Delhi to Agra via IRCTC.",
      "Stay hydrated and prefer bottled water at heritage sites.",
    ],
    packing_list: [
      "Light breathable cotton clothing with conservative layers for temples",
      "Comfortable walking shoes with sturdy soles",
      "Sun hat, UV sunglasses, and SPF 50+ sunscreen",
      "Universal adapter and high-capacity portable power bank",
    ],
    emergency_contacts: {
      local_emergency: "Police: 112 / Ambulance: 102",
      embassy: "Tourist Helpline: 1363",
      hotel: "24/7 Hotel Concierge Support",
    },
  },
};

export default function MySchedulePage() {
  const [tripData, setTripData] = useState<AcceptedTripData>(SAMPLE_ACCEPTED_TRIP);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [hasCustomAcceptedPlan, setHasCustomAcceptedPlan] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"itinerary" | "tips" | "packing" | "emergency">("itinerary");
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("roamly_accepted_plan");
      if (stored) {
        const parsed: AcceptedTripData = JSON.parse(stored);
        if (parsed && parsed.plan && parsed.plan.itinerary?.length > 0) {
          setTripData(parsed);
          setHasCustomAcceptedPlan(true);
          if (parsed.startDate) {
            setSelectedDate(parseISO(parsed.startDate));
          }
        }
      }
    } catch (e) {
      console.error("Error reading accepted plan from localStorage", e);
    }
  }, []);

  // Sync calendar date click with corresponding day in itinerary
  const handleCalendarDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    if (!tripData.startDate) return;

    try {
      const start = parseISO(tripData.startDate);
      const itinerary = tripData.plan.itinerary || [];
      // Find matching day index by date offset
      for (let i = 0; i < itinerary.length; i++) {
        const dayDate = addDays(start, i);
        if (isSameDay(dayDate, date)) {
          setSelectedDayIndex(i);
          setActiveTab("itinerary");
          break;
        }
      }
    } catch (e) {
      console.error("Date matching error", e);
    }
  };

  const itinerary = tripData.plan.itinerary || [];
  const currentDay = itinerary[selectedDayIndex] || itinerary[0];

  return (
    <div className="min-h-screen bg-[#FAFBF8] pb-16 pt-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Page Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e7db] pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DFECC6]/60 border border-[#8E9C78]/40 px-3 py-0.5 text-xs font-semibold text-[#485C11]">
                <Sparkles className="size-3" />
                {hasCustomAcceptedPlan ? "Accepted Travel Itinerary" : "Sample Active Schedule"}
              </span>
              <Badge variant="outline" className="text-xs font-mono border-[#8E9C78]/40 text-[#485C11]">
                {itinerary.length} Days Planned
              </Badge>
            </div>
            <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#1a1a1a]">
              My Schedule & Itinerary
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tripData.destinations?.join(" • ") || "Your Trip"} |{" "}
              {tripData.startDate && tripData.endDate
                ? `${tripData.startDate} to ${tripData.endDate}`
                : "Active Dates"}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => exportItineraryToPDF(tripData)}
              className="bg-[#485C11] hover:bg-[#3a4d0d] text-white rounded-full px-5 shadow-sm text-sm"
            >
              <Download className="mr-2 size-4" />
              Download Itinerary PDF
            </Button>
            <Link href="/llm">
              <Button variant="outline" className="border-[#8E9C78]/40 hover:bg-[#DFECC6]/30 text-[#1a1a1a] rounded-full px-5 shadow-sm text-sm">
                <Plane className="mr-2 size-4 text-[#485C11]" />
                Plan / Re-plan Trip
              </Button>
            </Link>
          </div>
        </div>

        {/* Accepted Itinerary Banner Notice */}
        {hasCustomAcceptedPlan && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50/60 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 shrink-0">
                <CheckCircle className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-900">
                  Accepted AI Itinerary Synced & Ready
                </p>
                <p className="text-xs text-green-700">
                  {tripData.summary}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <Button
                size="sm"
                onClick={() => exportItineraryToPDF(tripData)}
                variant="outline"
                className="border-green-300 text-green-800 hover:bg-green-100 rounded-full text-xs h-8 px-3"
              >
                <Download className="mr-1.5 size-3.5" />
                Download PDF
              </Button>
              <Badge className="bg-[#485C11] text-white">
                <IndianRupee className="size-3 mr-0.5" />
                {tripData.plan.total_estimated_cost}
              </Badge>
            </div>
          </div>
        )}

        {/* Side-by-Side Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT PANE: Interactive Calendar & Day Selector (Cols: 5 / 12) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Interactive Calendar Card */}
            <Card className="border-[#e5e7db] shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-[#FAFBF8] border-b border-[#e5e7db] py-3.5 px-5">
                <CardTitle className="text-sm font-bold flex items-center justify-between text-[#1a1a1a]">
                  <span className="flex items-center gap-2">
                    <CalendarIcon className="size-4 text-[#485C11]" />
                    Trip Calendar
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Click a date to view day
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleCalendarDateSelect}
                  className="rounded-lg border border-[#e5e7db]/80 p-3"
                />
              </CardContent>
            </Card>

            {/* Quick Trip Metrics Card */}
            <Card className="border-[#e5e7db] shadow-sm bg-white">
              <CardHeader className="bg-[#FAFBF8] border-b border-[#e5e7db] py-3.5 px-5">
                <CardTitle className="text-sm font-bold text-[#1a1a1a]">
                  Trip Overview & Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-[#e5e7db]/70 pb-2">
                  <span className="text-muted-foreground">Total Estimated Cost:</span>
                  <span className="font-bold text-sm text-[#485C11] flex items-center">
                    <IndianRupee className="size-3.5 mr-0.5" />
                    {tripData.plan.total_estimated_cost}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[#e5e7db]/70 pb-2">
                  <span className="text-muted-foreground">Budget Tier:</span>
                  <Badge variant="secondary" className="bg-[#DFECC6]/60 text-[#364A0E]">
                    {tripData.budget || "Mid-range"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between border-b border-[#e5e7db]/70 pb-2">
                  <span className="text-muted-foreground">Accommodation:</span>
                  <span className="font-medium text-gray-800">{tripData.accommodation || "Hotel"}</span>
                </div>
                <div className="flex items-center justify-between border-b border-[#e5e7db]/70 pb-2">
                  <span className="text-muted-foreground">Transportation:</span>
                  <span className="font-medium text-gray-800">{tripData.transportation || "Train / Flight"}</span>
                </div>

                {/* Selected Travel Interests */}
                {tripData.interests && tripData.interests.length > 0 && (
                  <div className="pt-1">
                    <span className="text-muted-foreground block mb-1.5">Travel Interests:</span>
                    <div className="flex flex-wrap gap-1">
                      {tripData.interests.map((interest) => (
                        <Badge
                          key={interest}
                          variant="outline"
                          className="text-[10px] bg-[#FAFBF8] border-[#8E9C78]/40 text-[#485C11]"
                        >
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Days Navigator List */}
            <Card className="border-[#e5e7db] shadow-sm bg-white">
              <CardHeader className="bg-[#FAFBF8] border-b border-[#e5e7db] py-3.5 px-5">
                <CardTitle className="text-sm font-bold text-[#1a1a1a]">
                  Day Schedule Selector
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
                {itinerary.map((day, idx) => {
                  const isSelected = selectedDayIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedDayIndex(idx);
                        setActiveTab("itinerary");
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left text-xs transition-all ${
                        isSelected
                          ? "bg-[#485C11] text-white font-semibold shadow-sm"
                          : "hover:bg-muted text-gray-700 bg-[#FAFBF8] border border-[#e5e7db]/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`size-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                            isSelected ? "bg-white text-[#485C11]" : "bg-[#DFECC6] text-[#485C11]"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium">{day.day}</p>
                          <p className={`text-[11px] ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                            {day.city}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] ${isSelected ? "text-white" : "text-[#485C11] font-mono"}`}>
                          {day.estimated_cost}
                        </span>
                        <ChevronRight className={`size-3.5 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT PANE: Day-by-Day Timeline & Details (Cols: 7 / 12) */}
          <div className="lg:col-span-7 space-y-6">
            {/* View Switcher Tabs */}
            <div className="flex items-center gap-2 border-b border-[#e5e7db] pb-3">
              <button
                type="button"
                onClick={() => setActiveTab("itinerary")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeTab === "itinerary"
                    ? "bg-[#485C11] text-white shadow-sm"
                    : "bg-white text-muted-foreground hover:text-foreground border border-[#e5e7db]"
                }`}
              >
                Day Timeline
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tips")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeTab === "tips"
                    ? "bg-[#485C11] text-white shadow-sm"
                    : "bg-white text-muted-foreground hover:text-foreground border border-[#e5e7db]"
                }`}
              >
                Travel Tips ({tripData.plan.travel_tips?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("packing")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeTab === "packing"
                    ? "bg-[#485C11] text-white shadow-sm"
                    : "bg-white text-muted-foreground hover:text-foreground border border-[#e5e7db]"
                }`}
              >
                Packing List ({tripData.plan.packing_list?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("emergency")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeTab === "emergency"
                    ? "bg-red-700 text-white shadow-sm"
                    : "bg-white text-muted-foreground hover:text-foreground border border-[#e5e7db]"
                }`}
              >
                Emergency
              </button>
            </div>

            {/* TAB 1: DAY TIMELINE */}
            {activeTab === "itinerary" && currentDay && (
              <div className="space-y-6 animate-in fade-in-0 duration-200">
                {/* Active Day Header Banner */}
                <Card className="border-[#e5e7db] bg-gradient-to-r from-white via-[#FAFBF8] to-[#DFECC6]/20 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-serif text-2xl font-bold text-[#1a1a1a]">
                            {currentDay.day}
                          </h2>
                          <Badge className="bg-[#485C11] text-white text-xs px-2.5 py-0.5">
                            <MapPin className="size-3 mr-1" />
                            {currentDay.city}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Day {selectedDayIndex + 1} of {itinerary.length} • Scheduled Itinerary
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-[#DFECC6] text-[#364A0E] text-xs font-semibold px-3 py-1 font-mono">
                          <IndianRupee className="size-3 mr-0.5" />
                          {currentDay.estimated_cost} Daily Est.
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Day Activity Timeline Cards */}
                <div className="space-y-4">
                  {/* Morning */}
                  <Card className="border-l-4 border-l-amber-500 border-y-[#e5e7db] border-r-[#e5e7db] shadow-sm bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="size-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
                          <Sun className="size-4" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold tracking-wider uppercase text-amber-700 block">
                            Morning Activities
                          </span>
                          <p className="text-sm text-gray-800 mt-1 leading-relaxed">
                            {currentDay.morning}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Afternoon */}
                  <Card className="border-l-4 border-l-blue-500 border-y-[#e5e7db] border-r-[#e5e7db] shadow-sm bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 shrink-0 mt-0.5">
                          <CloudSun className="size-4" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700 block">
                            Afternoon Exploration
                          </span>
                          <p className="text-sm text-gray-800 mt-1 leading-relaxed">
                            {currentDay.afternoon}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Evening */}
                  <Card className="border-l-4 border-l-indigo-600 border-y-[#e5e7db] border-r-[#e5e7db] shadow-sm bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="size-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0 mt-0.5">
                          <Moon className="size-4" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold tracking-wider uppercase text-indigo-700 block">
                            Evening & Night
                          </span>
                          <p className="text-sm text-gray-800 mt-1 leading-relaxed">
                            {currentDay.evening}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Accommodation & Meals Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="border-[#e5e7db] shadow-sm bg-white">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="size-8 rounded-full bg-[#DFECC6] flex items-center justify-center text-[#485C11] shrink-0">
                        <Hotel className="size-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase text-[#485C11] block">
                          Accommodation
                        </span>
                        <p className="text-xs text-gray-700 mt-0.5 font-medium">
                          {currentDay.accommodation}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-[#e5e7db] shadow-sm bg-white">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="size-8 rounded-full bg-[#DFECC6] flex items-center justify-center text-[#485C11] shrink-0">
                        <Utensils className="size-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase text-[#485C11] block">
                          Meals & Dining
                        </span>
                        <p className="text-xs text-gray-700 mt-0.5 font-medium">
                          {currentDay.meals}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* TAB 2: TRAVEL TIPS */}
            {activeTab === "tips" && (
              <Card className="border-[#e5e7db] shadow-sm bg-white animate-in fade-in-0 duration-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-[#485C11]">
                    <Sparkles className="size-4" />
                    AI Travel Tips for Your Journey
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-3">
                  {(tripData.plan.travel_tips || []).map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-[#FAFBF8] border border-[#e5e7db]/70">
                      <span className="size-5 rounded-full bg-[#DFECC6] text-[#485C11] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-sm text-gray-800">{tip}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* TAB 3: PACKING CHECKLIST */}
            {activeTab === "packing" && (
              <Card className="border-[#e5e7db] shadow-sm bg-white animate-in fade-in-0 duration-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-[#485C11]">
                    <Briefcase className="size-4" />
                    Recommended Packing Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-2.5">
                  {(tripData.plan.packing_list || []).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#FAFBF8] border border-[#e5e7db]/70">
                      <CheckCircle className="size-4 text-[#485C11] shrink-0" />
                      <span className="text-sm text-gray-800">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* TAB 4: EMERGENCY CONTACTS */}
            {activeTab === "emergency" && (
              <Card className="border-red-200 bg-red-50/30 shadow-sm animate-in fade-in-0 duration-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-red-700">
                    <Shield className="size-4" />
                    Emergency Contacts & Safety Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3 bg-white rounded-lg border border-red-100">
                      <p className="text-xs font-bold text-red-600 uppercase">Local Emergency</p>
                      <p className="text-sm font-mono text-gray-900 mt-1">
                        {tripData.plan.emergency_contacts?.local_emergency || "112 / 100"}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-red-100">
                      <p className="text-xs font-bold text-red-600 uppercase">Tourist Helpline / Embassy</p>
                      <p className="text-sm font-mono text-gray-900 mt-1">
                        {tripData.plan.emergency_contacts?.embassy || "1363 (National Helpline)"}
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-lg border border-red-100">
                      <p className="text-xs font-bold text-red-600 uppercase">Hotel Concierge</p>
                      <p className="text-sm font-mono text-gray-900 mt-1">
                        {tripData.plan.emergency_contacts?.hotel || "24/7 Concierge Support"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
