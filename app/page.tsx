"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Plane,
  Compass,
  MapPin,
  Calendar,
  IndianRupee,
  Clock,
  Star,
  Check,
  Minus,
  ChevronRight,
  SlidersHorizontal,
  Luggage,
  Hotel,
  UtensilsCrossed,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/*                               DESTINATIONS                                 */
/* -------------------------------------------------------------------------- */

type DestinationCategory = "all" | "island" | "cultural" | "culinary";

interface DestinationItem {
  id: string;
  name: string;
  country: string;
  category: DestinationCategory;
  categoryLabel: string;
  image: string;
  rating: number;
  reviewsCount: number;
  bestSeason: string;
  budgetEst: string;
  daysIdeal: string;
  highlights: string[];
  tagline: string;
  dayPreview: { time: string; title: string; desc: string }[];
}

const DESTINATIONS: DestinationItem[] = [
  {
    id: "bali",
    name: "Bali & Nusa Penida",
    country: "Indonesia",
    category: "island",
    categoryLabel: "Coastal & Island",
    image:
      "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    rating: 4.95,
    reviewsCount: 1420,
    bestSeason: "April – October",
    budgetEst: "₹7,000 / day",
    daysIdeal: "7 days",
    tagline: "Terraced valleys, coastal cliffs, and morning surf routines.",
    highlights: ["Tegalalang Terraces", "Uluwatu Cliffs", "Campuhan Ridge", "Kelingking Beach"],
    dayPreview: [
      { time: "09:00", title: "Campuhan Ridge Walk", desc: "Morning ridge trek overlooking the lush river valley." },
      { time: "13:30", title: "Tirta Empul Sacred Springs", desc: "Traditional water sanctuary and temple grounds." },
      { time: "18:30", title: "Jimbaran Coast Dining", desc: "Open-air seafood dinner along the coastline." },
    ],
  },
  {
    id: "paris",
    name: "Paris & Versailles",
    country: "France",
    category: "cultural",
    categoryLabel: "Art & Architecture",
    image:
      "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
    rating: 4.92,
    reviewsCount: 2310,
    bestSeason: "May – September",
    budgetEst: "₹15,000 / day",
    daysIdeal: "5 days",
    tagline: "Historic quarters, private museum hours, and neighborhood bistros.",
    highlights: ["Musée d'Orsay", "Montmartre Quarters", "Le Marais Bistros", "Sainte-Chapelle"],
    dayPreview: [
      { time: "09:30", title: "Le Marais Morning Coffee", desc: "Artisan bakeries and historic townhouse walks." },
      { time: "14:00", title: "Musée de l'Orangerie", desc: "Monet's Water Lilies in natural light gallery." },
      { time: "19:30", title: "Seine River Walk & Bistro", desc: "Classic seasonal dining in Saint-Germain." },
    ],
  },
  {
    id: "tokyo",
    name: "Tokyo & Kyoto",
    country: "Japan",
    category: "culinary",
    categoryLabel: "Gastronomy & Transit",
    image:
      "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
    rating: 4.98,
    reviewsCount: 3105,
    bestSeason: "March – May, Oct – Nov",
    budgetEst: "₹11,500 / day",
    daysIdeal: "9 days",
    tagline: "Hand-rolled soba, tranquil bamboo groves, and neighborhood trains.",
    highlights: ["Shibuya Sky", "Fushimi Inari Torii", "Tsukiji Outer Market", "Gion Historic Lanes"],
    dayPreview: [
      { time: "08:30", title: "Early Fushimi Inari", desc: "Quiet morning ascent through the torii shrines." },
      { time: "12:30", title: "Handmade Soba in Kanda", desc: "Century-old soba house with fresh buckwheat noodles." },
      { time: "19:00", title: "Ginza Counter Omakase", desc: "Seasonal chef selection of regional sushi." },
    ],
  },
  {
    id: "amsterdam",
    name: "Amsterdam & Haarlem",
    country: "Netherlands",
    category: "cultural",
    categoryLabel: "Canals & Design",
    image:
      "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=80",
    rating: 4.88,
    reviewsCount: 940,
    bestSeason: "April – September",
    budgetEst: "₹12,500 / day",
    daysIdeal: "4 days",
    tagline: "Canal-side architecture, private collections, and quiet cycling paths.",
    highlights: ["Jordaan Canal Rings", "Rijksmuseum Masters", "Vondelpark Loop", "Nine Streets"],
    dayPreview: [
      { time: "09:30", title: "Canal Loop by Bicycle", desc: "Crossing historic 17th-century bridge viewpoints." },
      { time: "14:00", title: "Rijksmuseum Gallery", desc: "Rembrandt and Vermeer collection walkthrough." },
      { time: "18:30", title: "De Pijp Courtyard Dinner", desc: "Seasonal local dining and courtyard wine bar." },
    ],
  },
  {
    id: "amalfi",
    name: "Amalfi Coast & Rome",
    country: "Italy",
    category: "island",
    categoryLabel: "Mediterranean Coast",
    image:
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    rating: 4.94,
    reviewsCount: 1840,
    bestSeason: "May – October",
    budgetEst: "₹16,000 / day",
    daysIdeal: "6 days",
    tagline: "Limestone cliffs, handmade pasta, and coastal ferries.",
    highlights: ["Positano Ferry", "Capri Blue Coast", "Path of the Gods", "Trastevere Trattorias"],
    dayPreview: [
      { time: "10:00", title: "Coastal Ferry to Positano", desc: "Arriving by sea beneath pastel cliffside villas." },
      { time: "13:30", title: "Cliffside Terrace Lunch", desc: "Handmade gnocchi, local burrata, and citrus granite." },
      { time: "17:30", title: "Ravello Garden Viewpoints", desc: "Panoramic vista over the Mediterranean horizon." },
    ],
  },
  {
    id: "malaysia",
    name: "Kuala Lumpur & Penang",
    country: "Malaysia",
    category: "culinary",
    categoryLabel: "Street Markets",
    image:
      "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80",
    rating: 4.89,
    reviewsCount: 1120,
    bestSeason: "Year-round",
    budgetEst: "₹5,500 / day",
    daysIdeal: "5 days",
    tagline: "UNESCO heritage colonial quarters and night food alleys.",
    highlights: ["Jalan Alor Markets", "Batu Caves", "George Town Murals", "Petronas Skyline"],
    dayPreview: [
      { time: "09:00", title: "Batu Caves Morning Visit", desc: "Ascending the limestone staircase before midday heat." },
      { time: "14:00", title: "George Town Architectural Walk", desc: "Preserved shophouse heritage and historic lanes." },
      { time: "19:30", title: "Jalan Alor Night Tasting", desc: "Claypot noodles, satay skewers, and fresh tropical fruit." },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*                          FEATURE COMPARISON DATA                           */
/* -------------------------------------------------------------------------- */

interface ComparisonRow {
  feature: string;
  roamly: string;
  spreadsheets: string;
  agencies: string;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: "Preparation time",
    roamly: "Under 2 minutes",
    spreadsheets: "10 to 20 hours of research",
    agencies: "Multiple days of back-and-forth",
  },
  {
    feature: "Route intelligence",
    roamly: "Geographic clustering by neighborhood",
    spreadsheets: "Manual map checking",
    agencies: "Fixed tourist circuits",
  },
  {
    feature: "Budget estimation",
    roamly: "Itemized by lodging, transit & meals",
    spreadsheets: "Manual formulas",
    agencies: "Opaque package markups",
  },
  {
    feature: "On-trip adjustments",
    roamly: "Instant re-ordering with one tap",
    spreadsheets: "Messy re-planning on phone",
    agencies: "Inflexible cancellation policies",
  },
  {
    feature: "Calendar & map sync",
    roamly: "Native Apple & Google calendar export",
    spreadsheets: "Manual calendar entries",
    agencies: "Static paper or PDF printouts",
  },
];

/* -------------------------------------------------------------------------- */
/*                                REVIEWS                                     */
/* -------------------------------------------------------------------------- */

interface ReviewItem {
  id: string;
  name: string;
  role: string;
  avatar: string;
  trip: string;
  quote: string;
}

const REVIEWS: ReviewItem[] = [
  {
    id: "r1",
    name: "Elena Rostova",
    role: "Architectural Photographer",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    trip: "Kyoto & Tokyo • 10 days",
    quote:
      "Roamly grouped neighborhood visits in genuine geographic sequence. I avoided crossing the city twice in a single day, leaving real time to shoot and wander.",
  },
  {
    id: "r2",
    name: "Marcus Vance",
    role: "Design Lead",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    trip: "Amalfi Coast & Rome • 7 days",
    quote:
      "The budget model was accurate to within five percent. It factored in realistic train connections, museum entry, and casual dining without fluff.",
  },
  {
    id: "r3",
    name: "Liam O'Connor",
    role: "Software Engineer",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    trip: "Bali • 14 days",
    quote:
      "Clean, functional, and fast. I asked for mornings open for surfing and afternoons near quiet cafes, and the resulting itinerary was effortless to follow.",
  },
];

/* -------------------------------------------------------------------------- */
/*                                MAIN PAGE                                   */
/* -------------------------------------------------------------------------- */

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState<DestinationCategory>("all");
  const [activeDestination, setActiveDestination] = useState<DestinationItem>(DESTINATIONS[0]);

  const [heroPrompt, setHeroPrompt] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("Any time");
  const [selectedVibe, setSelectedVibe] = useState("Balanced");

  const filteredDestinations =
    selectedCategory === "all"
      ? DESTINATIONS
      : DESTINATIONS.filter((d) => d.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#FAFBF8] text-[#1a1a1a] selection:bg-[#DFECC6] selection:text-[#485C11] font-sans antialiased">
      {/* ---------------------------------------------------------------------- */}
      {/* 1. HERO SECTION                                                        */}
      {/* ---------------------------------------------------------------------- */}
      {/* ---------------------------------------------------------------------- */}
      {/* 1. HERO SECTION (Full-Bleed Panoramic Viewport Layout)                  */}
      {/* ---------------------------------------------------------------------- */}
      <section className="relative w-full min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-hidden bg-[#FAFBF8] border-b border-[#e5e7db]">
        {/* Full-bleed Panoramic Background Image */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-0">
          <Image
            src="/hero-panorama-suitcase.jpg"
            alt="Explore the World panoramic background"
            fill
            priority
            className="object-cover object-[78%_center] lg:object-[82%_center] xl:object-right opacity-95"
          />
          {/* Luminous gradient overlay on the left so typography is ultra crisp & legible */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAFBF8] via-[#FAFBF8]/95 via-35% sm:via-42% lg:via-48% to-transparent" />
          {/* Gentle vertical gradient at the bottom blending smoothly into the search & stats */}
          <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-[#FAFBF8] via-[#FAFBF8]/85 to-transparent" />
        </div>



        {/* ===== HERO UPPER AREA (Left Typography & Actions) ===== */}
        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-16 xl:px-20 pt-8 sm:pt-14 pb-4">
          <div className="max-w-2xl">
            {/* Main Headline */}
            <h1 className="animate-fade-in-up text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] xl:text-[4.85rem] font-serif font-black tracking-tight text-[#1a1a1a] leading-[1.06]">
              Explore the World,
              <br />
              <span className="text-[#38480e]">Travel Carefree</span>
            </h1>

            {/* Subheading */}
            <p className="animate-fade-in-up-delay mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-[#4e5546] max-w-xl leading-relaxed font-normal">
              Plan, book and explore with confidence. Discover top stays,
              curated itineraries and real traveler advice — all in one place
              for a smoother, smarter journey.
            </p>

            {/* CTA Button Group */}
            <div className="animate-fade-in-up-delay-2 mt-7 flex flex-wrap items-center gap-3.5">
              <Button
                asChild
                className="h-12 rounded-full px-8 text-base font-semibold bg-[#38480e] hover:bg-[#2c390b] text-white shadow-xl shadow-[#38480e]/25 hover:shadow-2xl hover:shadow-[#38480e]/35 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
              >
                <Link href="/llm">
                  Plan My Trip
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-12 rounded-full px-6 text-sm font-semibold border-[#cfd4c5] bg-white/95 hover:bg-[#DFECC6]/40 hover:border-[#38480e] text-[#1a1a1a] shadow-xs hover:shadow-md transition-all duration-300"
              >
                <Link href="/guide-register" className="flex items-center gap-2">
                  <Sparkles className="size-4 text-[#38480e]" />
                  Become a Guide
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* ===== HERO LOWER AREA: FLOATING SEARCH PILL BAR & STATS ===== */}
        <div className="relative z-20 w-full mt-6 sm:mt-10">
          {/* Full-width Search Bar Pill (matching the reference image) */}
          <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl md:rounded-full border border-white/80 shadow-2xl p-2.5 sm:p-3">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-0 md:items-center">

                {/* 1. Where to? */}
                <div className="md:col-span-3 flex items-center gap-3.5 px-4 py-2.5 border-b md:border-b-0 md:border-r border-[#e5e7db]">
                  <div className="flex size-9 items-center justify-center rounded-full bg-[#DFECC6]/70 text-[#38480e] shrink-0">
                    <MapPin className="size-4.5" />
                  </div>
                  <div className="w-full">
                    <label className="block text-[11px] font-bold text-[#1a1a1a]">
                      Where to?
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Kyoto, Japan"
                      value={heroPrompt}
                      onChange={(e) => setHeroPrompt(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm font-normal text-[#1a1a1a] placeholder:text-[#9ca3af] focus:outline-none"
                    />
                  </div>
                </div>

                {/* 2. Travel dates */}
                <div className="md:col-span-2 flex items-center gap-3.5 px-4 py-2.5 border-b md:border-b-0 md:border-r border-[#e5e7db]">
                  <div className="flex size-9 items-center justify-center rounded-full bg-[#DFECC6]/70 text-[#38480e] shrink-0">
                    <Calendar className="size-4.5" />
                  </div>
                  <div className="w-full">
                    <label className="block text-[11px] font-bold text-[#1a1a1a]">
                      Travel dates
                    </label>
                    <select
                      value={selectedDuration}
                      onChange={(e) => setSelectedDuration(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm font-normal text-[#6b7280] focus:outline-none cursor-pointer"
                    >
                      <option value="Any time">Any time</option>
                      <option value="3 Days">3 Days</option>
                      <option value="5 Days">5 Days</option>
                      <option value="7 Days">7 Days</option>
                      <option value="10 Days">10 Days</option>
                      <option value="2 Weeks">2 Weeks</option>
                    </select>
                  </div>
                </div>

                {/* 3. Travelers */}
                <div className="md:col-span-2 flex items-center gap-3.5 px-4 py-2.5 border-b md:border-b-0 md:border-r border-[#e5e7db]">
                  <div className="flex size-9 items-center justify-center rounded-full bg-[#DFECC6]/70 text-[#38480e] shrink-0">
                    <Users className="size-4.5" />
                  </div>
                  <div className="w-full">
                    <label className="block text-[11px] font-bold text-[#1a1a1a]">
                      Travelers
                    </label>
                    <div className="flex items-center justify-between text-xs sm:text-sm font-normal text-[#6b7280]">
                      <span>2 travelers</span>
                      <ChevronRight className="size-3.5 rotate-90 opacity-60" />
                    </div>
                  </div>
                </div>

                {/* 4. Pace */}
                <div className="md:col-span-2 flex items-center gap-3.5 px-4 py-2.5">
                  <div className="flex size-9 items-center justify-center rounded-full bg-[#DFECC6]/70 text-[#38480e] shrink-0">
                    <SlidersHorizontal className="size-4.5" />
                  </div>
                  <div className="w-full">
                    <label className="block text-[11px] font-bold text-[#1a1a1a]">
                      Pace
                    </label>
                    <select
                      value={selectedVibe}
                      onChange={(e) => setSelectedVibe(e.target.value)}
                      className="w-full bg-transparent text-xs sm:text-sm font-normal text-[#6b7280] focus:outline-none cursor-pointer"
                    >
                      <option value="Balanced">Balanced</option>
                      <option value="Relaxed">Relaxed</option>
                      <option value="Active">Active</option>
                    </select>
                  </div>
                </div>

                {/* 5. Search Button */}
                <div className="md:col-span-3 p-1">
                  <Button
                    asChild
                    className="w-full h-12 rounded-full bg-[#38480e] hover:bg-[#2b380b] text-white text-sm font-semibold shadow-md shadow-[#38480e]/20 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Link
                      href={`/llm?destination=${encodeURIComponent(
                        heroPrompt || "Bali"
                      )}&duration=${encodeURIComponent(
                        selectedDuration
                      )}&vibe=${encodeURIComponent(selectedVibe)}`}
                    >
                      <Compass className="size-4.5" />
                      Search Trips
                      <ArrowRight className="size-4 ml-0.5" />
                    </Link>
                  </Button>
                </div>

              </div>
            </div>
          </div>

          {/* Stats Badges Row (Below Search Bar across full width) */}
          <div className="w-full max-w-[1240px] mx-auto px-6 sm:px-8 pt-5 pb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 items-center">

              {/* 50K+ */}
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#DFECC6]/60 text-[#38480e] shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" /></svg>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold text-[#1a1a1a] leading-tight">50K+</div>
                  <div className="text-xs text-[#6b7280]">Curated Destinations</div>
                </div>
              </div>

              {/* 4.8/5 */}
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#DFECC6]/60 text-[#38480e] shrink-0">
                  <Star className="size-5 fill-[#38480e]/20 text-[#38480e]" />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold text-[#1a1a1a] leading-tight">4.8/5</div>
                  <div className="text-xs text-[#6b7280]">Average Rating</div>
                </div>
              </div>

              {/* 100% */}
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#DFECC6]/60 text-[#38480e] shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold text-[#1a1a1a] leading-tight">100%</div>
                  <div className="text-xs text-[#6b7280]">Verified Stays & Routes</div>
                </div>
              </div>

              {/* Lower Costs */}
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#DFECC6]/60 text-[#38480e] shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12c0-3 1.5-6 4-7.5" /><path d="M7 14c2-4 7-6 10-6" /></svg>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold text-[#1a1a1a] leading-tight">Lower Costs</div>
                  <div className="text-xs text-[#6b7280]">with Smart Planning</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. CURATED DESTINATIONS GALLERY                                        */}
      {/* ---------------------------------------------------------------------- */}
      <section id="destinations" className="py-16 sm:py-24 border-b border-[#e5e7db]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#e5e7db]">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#485C11]">
                Curated itineraries
              </p>
              <h2 className="mt-1 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1a1a1a]">
                Popular destinations
              </h2>
            </div>

            {/* Segmented Control */}
            <div className="flex items-center gap-1 p-1 rounded-xl border border-[#e5e7db] bg-white w-fit shadow-2xs">
              {[
                { key: "all", label: "All" },
                { key: "island", label: "Coast & Island" },
                { key: "cultural", label: "Cultural" },
                { key: "culinary", label: "Culinary" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedCategory(tab.key as DestinationCategory)}
                  className={`rounded-lg px-3.5 py-1 text-xs font-medium transition-colors cursor-pointer ${selectedCategory === tab.key
                    ? "bg-[#485C11] text-white shadow-2xs"
                    : "text-[#6b7280] hover:text-[#1a1a1a] hover:bg-[#DFECC6]/30"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Destinations Grid & Detail Split */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Grid (Left 7 Cols) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredDestinations.map((dest) => {
                const isSelected = activeDestination.id === dest.id;
                return (
                  <div
                    key={dest.id}
                    onClick={() => setActiveDestination(dest)}
                    className={`group cursor-pointer rounded-2xl border transition-all duration-200 overflow-hidden ${isSelected
                      ? "border-[#485C11] ring-2 ring-[#485C11]/20 bg-white shadow-md"
                      : "border-[#e5e7db] bg-white hover:border-[#8E9C78]/60 hover:shadow-xs"
                      }`}
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-200">
                      <Image
                        src={dest.image}
                        alt={dest.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-103"
                        sizes="(max-width: 640px) 100vw, 350px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <div className="text-sm font-semibold">{dest.name}</div>
                        <div className="text-xs text-white/80">{dest.country}</div>
                      </div>
                    </div>

                    <div className="p-3.5 flex items-center justify-between text-xs text-[#6b7280]">
                      <div className="flex items-center gap-3">
                        <span className="text-[#1a1a1a] font-medium">{dest.daysIdeal}</span>
                        <span>•</span>
                        <span>{dest.budgetEst}</span>
                      </div>
                      <span className={`text-[11px] font-semibold flex items-center ${isSelected ? "text-[#485C11]" : "text-[#6b7280] group-hover:text-[#485C11]"}`}>
                        {isSelected ? "Selected" : "Details"}
                        <ChevronRight className="size-3 ml-0.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detail Preview (Right 5 Cols) */}
            <div className="lg:col-span-5 sticky top-24">
              <div className="rounded-2xl border border-[#e5e7db] bg-white p-6 shadow-md shadow-[#485C11]/5">
                <div className="flex items-start justify-between pb-4 border-b border-[#e5e7db]">
                  <div>
                    <span className="text-xs text-[#485C11] font-semibold">
                      {activeDestination.categoryLabel}
                    </span>
                    <h3 className="mt-1 text-xl font-serif font-bold text-[#1a1a1a]">
                      {activeDestination.name}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#6b7280] block">Est. Daily</span>
                    <span className="text-sm font-bold text-[#485C11]">
                      {activeDestination.budgetEst}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-xs text-[#6b7280] leading-relaxed font-normal">
                  {activeDestination.tagline}
                </p>

                {/* Highlights */}
                <div className="mt-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a] mb-2">
                    Key stops
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeDestination.highlights.map((h, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-[#FAFBF8] border border-[#e5e7db] px-2.5 py-1 text-xs font-medium text-[#485C11]"
                      >
                        ✓ {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Day Preview Timeline */}
                <div className="mt-5 pt-4 border-t border-[#e5e7db]">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#1a1a1a] mb-3">
                    Sample Day Itinerary
                  </div>
                  <div className="space-y-3">
                    {activeDestination.dayPreview.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-xs">
                        <span className="shrink-0 font-mono text-[#485C11] font-bold">
                          {item.time}
                        </span>
                        <div>
                          <div className="font-semibold text-[#1a1a1a]">{item.title}</div>
                          <div className="text-[#6b7280] text-[11px] mt-0.5">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Button */}
                <div className="mt-6 pt-4 border-t border-[#e5e7db]">
                  <Button
                    asChild
                    className="w-full h-11 rounded-xl bg-[#485C11] hover:bg-[#3a4d0d] text-white text-xs font-semibold shadow-sm cursor-pointer"
                  >
                    <Link href={`/llm?destination=${encodeURIComponent(activeDestination.name)}`}>
                      Build {activeDestination.name} Plan
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. SAMPLE ITINERARY & BUDGET BREAKDOWN                                 */}
      {/* ---------------------------------------------------------------------- */}
      <section id="itinerary-widget" className="py-16 sm:py-24 border-b border-[#e5e7db] bg-gradient-to-b from-transparent via-[#f8faf5] to-transparent">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto">
            <span className="rounded-full bg-[#DFECC6]/50 border border-[#8E9C78]/30 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#485C11]">
              Interactive preview
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1a1a1a]">
              Structured daily itineraries
            </h2>
            <p className="mt-2 text-sm text-[#6b7280] font-normal">
              Every route automatically clusters sights by neighborhood to keep transit minimal.
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-[#e5e7db] bg-white overflow-hidden shadow-lg shadow-[#485C11]/5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[#e5e7db] bg-[#FAFBF8]">
              <div>
                <div className="text-sm font-bold text-[#1a1a1a]">
                  Tokyo: Culinary & Traditional Districts
                </div>
                <div className="text-xs text-[#6b7280] mt-0.5">
                  Day 2 • Asakusa to Akihabara • Walking score: 94/100
                </div>
              </div>
              <div className="text-xs font-bold text-[#485C11]">
                Est. Day Total: ~₹4,500
              </div>
            </div>

            {/* Split */}
            <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[#e5e7db]">
              {/* Timeline (7 cols) */}
              <div className="md:col-span-7 p-6 space-y-5">
                <div className="flex items-start gap-4">
                  <span className="font-mono text-xs text-[#485C11] font-bold shrink-0 mt-0.5">09:00</span>
                  <div>
                    <div className="text-sm font-semibold text-[#1a1a1a]">Senso-ji Temple & Nakamise</div>
                    <div className="text-xs text-[#6b7280] mt-0.5">
                      Early morning visit before crowds. Historic temple grounds and artisan tea stalls.
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-[#6b7280]">
                      <span>Free admission</span>
                      <span>•</span>
                      <span>1.5 hours</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-12 text-[11px] text-[#6b7280]">
                  <span className="size-1 rounded-full bg-[#8E9C78]" />
                  <span>12-minute Ginza Line transit to Kanda</span>
                </div>

                <div className="flex items-start gap-4">
                  <span className="font-mono text-xs text-[#485C11] font-bold shrink-0 mt-0.5">12:30</span>
                  <div>
                    <div className="text-sm font-semibold text-[#1a1a1a]">Kanda Matsuya Soba</div>
                    <div className="text-xs text-[#6b7280] mt-0.5">
                      Historic 1884 soba house. Fresh hand-rolled buckwheat noodles with duck broth.
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-[#6b7280]">
                      <span>~₹1,200 per person</span>
                      <span>•</span>
                      <span>1 hour</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pl-12 text-[11px] text-[#6b7280]">
                  <span className="size-1 rounded-full bg-[#8E9C78]" />
                  <span>8-minute walk to Akihabara electric district</span>
                </div>

                <div className="flex items-start gap-4">
                  <span className="font-mono text-xs text-[#485C11] font-bold shrink-0 mt-0.5">17:30</span>
                  <div>
                    <div className="text-sm font-semibold text-[#1a1a1a]">Kanda River Walk at Dusk</div>
                    <div className="text-xs text-[#6b7280] mt-0.5">
                      Canal bridge viewpoints, vintage arcades, and evening photography.
                    </div>
                  </div>
                </div>
              </div>

              {/* Budget breakdown (5 cols) */}
              <div className="md:col-span-5 p-6 flex flex-col justify-between bg-[#FAFBF8]">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#1a1a1a] mb-4">
                    Trip Cost Breakdown (7 Days)
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#6b7280]">Lodging (6 nights)</span>
                        <span className="text-[#1a1a1a] font-bold">₹60,000</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#e5e7db] overflow-hidden">
                        <div className="h-full bg-[#485C11] rounded-full" style={{ width: "48%" }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#6b7280]">Dining & Street Food</span>
                        <span className="text-[#1a1a1a] font-bold">₹35,000</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#e5e7db] overflow-hidden">
                        <div className="h-full bg-[#6B7F3A] rounded-full" style={{ width: "28%" }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#6b7280]">Activities & Passes</span>
                        <span className="text-[#1a1a1a] font-bold">₹20,000</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#e5e7db] overflow-hidden">
                        <div className="h-full bg-[#8E9C78] rounded-full" style={{ width: "16%" }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#6b7280]">Local Transit</span>
                        <span className="text-[#1a1a1a] font-bold">₹8,500</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#e5e7db] overflow-hidden">
                        <div className="h-full bg-[#DFECC6] rounded-full" style={{ width: "8%" }} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#e5e7db] flex items-baseline justify-between">
                    <span className="text-xs text-[#6b7280]">Total Estimated</span>
                    <span className="text-lg font-bold text-[#485C11]">₹1,23,500</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#e5e7db]">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-9 rounded-lg border-[#e5e7db] hover:bg-[#DFECC6]/30 text-xs font-semibold text-[#485C11]"
                  >
                    <Link href="/mapcalendar">
                      Open Schedule View
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 4. FEATURE COMPARISON                                                  */}
      {/* ---------------------------------------------------------------------- */}
      <section id="comparison" className="py-16 sm:py-24 border-b border-[#e5e7db]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="rounded-full bg-[#DFECC6]/50 border border-[#8E9C78]/30 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#485C11]">
              Comparison
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1a1a1a]">
              Why travelers choose Roamly
            </h2>
          </div>

          <div className="rounded-2xl border border-[#e5e7db] bg-white overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e5e7db] text-[#6b7280] uppercase tracking-wider text-[11px] bg-[#FAFBF8]">
                  <th className="py-4 px-5 font-semibold w-1/3">Feature</th>
                  <th className="py-4 px-5 font-bold text-[#485C11] bg-[#DFECC6]/25 border-x border-[#8E9C78]/20">Roamly</th>
                  <th className="py-4 px-5 font-medium">Spreadsheets & Tabs</th>
                  <th className="py-4 px-5 font-medium">Travel Agencies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7db] text-[#1a1a1a]">
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} className="hover:bg-[#FAFBF8] transition-colors">
                    <td className="py-3.5 px-5 font-medium">{row.feature}</td>
                    <td className="py-3.5 px-5 font-semibold text-[#485C11] bg-[#DFECC6]/15 border-x border-[#8E9C78]/20">
                      <div className="flex items-center gap-1.5">
                        <Check className="size-3.5 text-[#485C11] shrink-0" />
                        <span>{row.roamly}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-[#6b7280]">
                      <div className="flex items-center gap-1.5">
                        <Minus className="size-3.5 text-[#9ca3af] shrink-0" />
                        <span>{row.spreadsheets}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-[#6b7280]">
                      <div className="flex items-center gap-1.5">
                        <Minus className="size-3.5 text-[#9ca3af] shrink-0" />
                        <span>{row.agencies}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 4.5. LOCAL GUIDES & GUIDE REGISTRATION SPOTLIGHT                       */}
      {/* ---------------------------------------------------------------------- */}
      <section className="py-16 sm:py-24 border-b border-[#e5e7db] bg-gradient-to-br from-[#FAFBF8] via-[#f4f7ee] to-[#FAFBF8]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

            <div className="lg:col-span-7">
              <span className="rounded-full bg-[#DFECC6]/60 border border-[#8E9C78]/30 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#38480e] inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-[#38480e]" />
                Roamly Guide Network
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-[#1a1a1a] leading-tight">
                Connect with Verified Local Guides
              </h2>
              <p className="mt-4 text-base text-[#4e5546] leading-relaxed max-w-xl">
                Discover cities through the eyes of certified local experts. From heritage walks and hidden architecture to authentic street food trails — or register your own expertise to host curious travelers.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Button
                  asChild
                  className="h-11 rounded-full px-7 text-sm font-semibold bg-[#38480e] hover:bg-[#2b380b] text-white shadow-md shadow-[#38480e]/20 hover:shadow-lg transition-all cursor-pointer"
                >
                  <Link href="/guide-register">
                    <Sparkles className="mr-2 size-4" />
                    Register as a Local Guide
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="h-11 rounded-full px-6 text-sm font-semibold border-[#cfd4c5] bg-white hover:bg-[#DFECC6]/30 text-[#1a1a1a] transition-all"
                >
                  <Link href="/guides">
                    Explore Guides in Mumbai
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-4 border-t border-[#e5e7db] pt-6 max-w-md">
                <div>
                  <div className="text-xl font-bold text-[#1a1a1a]">100%</div>
                  <div className="text-xs text-[#6b7280]">Verified Credentials</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#1a1a1a]">₹800+</div>
                  <div className="text-xs text-[#6b7280]">Avg Hourly Rate</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#1a1a1a]">Flexible</div>
                  <div className="text-xs text-[#6b7280]">Custom Schedule</div>
                </div>
              </div>
            </div>

            {/* Visual Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl border border-[#dce3d0] bg-white/95 p-6 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-4 border-b border-[#e5e7db] pb-5">
                  <div className="relative size-14 rounded-2xl overflow-hidden border-2 border-[#DFECC6]">
                    <Image
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80"
                      alt="Guide preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#1a1a1a]">Aarav Sharma</span>
                      <span className="text-[10px] font-semibold bg-[#DFECC6] text-[#38480e] px-2 py-0.5 rounded-full">
                        Verified Guide
                      </span>
                    </div>
                    <div className="text-xs text-[#6b7280] flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3 text-[#38480e]" />
                      Gateway of India &amp; Colaba Heritage
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5 text-xs text-[#4e5546]">
                  <div className="flex justify-between py-1 border-b border-[#f0f2eb]">
                    <span className="text-[#6b7280]">Experience</span>
                    <span className="font-semibold text-[#1a1a1a]">6 Years</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#f0f2eb]">
                    <span className="text-[#6b7280]">Languages</span>
                    <span className="font-semibold text-[#1a1a1a]">English, Hindi, Marathi</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#f0f2eb]">
                    <span className="text-[#6b7280]">Rate</span>
                    <span className="font-semibold text-[#38480e]">₹1,200 / hr</span>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-[#f8faf5] p-3 border border-[#e5e7db] text-xs text-[#38480e] flex items-center justify-between">
                  <span className="font-medium">Are you an expert in your city?</span>
                  <Link
                    href="/guide-register"
                    className="font-bold underline hover:text-[#2c390b]"
                  >
                    Register today →
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 5. REVIEWS                                                             */}
      {/* ---------------------------------------------------------------------- */}
      <section className="py-16 sm:py-24 border-b border-[#e5e7db] bg-gradient-to-b from-transparent via-[#f8faf5] to-transparent">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="rounded-full bg-[#DFECC6]/50 border border-[#8E9C78]/30 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#485C11]">
              Community feedback
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1a1a1a]">
              Verified traveler experiences
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REVIEWS.map((rev) => (
              <div
                key={rev.id}
                className="flex flex-col justify-between rounded-2xl border border-[#e5e7db] bg-white p-5 shadow-xs"
              >
                <div>
                  <div className="text-xs text-[#485C11] font-semibold mb-3">
                    {rev.trip}
                  </div>
                  <p className="text-xs text-[#1a1a1a] leading-relaxed font-normal">
                    &ldquo;{rev.quote}&rdquo;
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#e5e7db] flex items-center gap-3">
                  <div className="relative size-8 rounded-full overflow-hidden bg-neutral-200">
                    <Image
                      src={rev.avatar}
                      alt={rev.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1a1a1a]">{rev.name}</div>
                    <div className="text-[11px] text-[#6b7280]">{rev.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 6. CALL TO ACTION                                                      */}
      {/* ---------------------------------------------------------------------- */}
      <section className="py-16 sm:py-20 border-b border-[#e5e7db]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-[#e8ece0] bg-gradient-to-br from-[#f8faf5] via-white to-[#DFECC6]/30 p-10 sm:p-14 text-center">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-[#1a1a1a]">
              Plan your next journey in minutes
            </h2>
            <p className="mt-3 text-sm text-[#6b7280] max-w-md mx-auto">
              Free forever plan available. No card required. Export to calendar whenever you are ready.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                asChild
                className="h-11 rounded-full px-7 text-sm font-semibold bg-[#485C11] hover:bg-[#3a4d0d] text-white shadow-md shadow-[#485C11]/20 hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <Link href="/llm">
                  Start Planning Free
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full px-7 text-sm font-semibold border-[#e5e7db] bg-white hover:bg-[#DFECC6]/30 text-[#1a1a1a] transition-all duration-200"
              >
                <Link href="/community">
                  Browse Community Trips
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- */}
      {/* 7. FOOTER                                                              */}
      {/* ---------------------------------------------------------------------- */}
      <footer className="border-t border-[#e5e7db] bg-white py-12 text-xs text-[#6b7280]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/logo.png"
                alt="Roamly - Travel Smarter Together"
                width={120}
                height={36}
                className="h-8 w-auto object-contain transition-opacity hover:opacity-90"
              />
            </Link>
            <span className="hidden sm:inline text-gray-300">•</span>
            <span className="hidden sm:inline">AI Travel Itinerary Platform</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-[#6b7280]">
            <Link href="/llm" className="hover:text-[#485C11] transition-colors">Planner</Link>
            <Link href="/guides" className="hover:text-[#485C11] transition-colors">Local Guides</Link>
            <Link href="/guide-register" className="hover:text-[#485C11] transition-colors font-medium text-[#485C11]">Become a Guide</Link>
            <Link href="/mapcalendar" className="hover:text-[#485C11] transition-colors">Schedule</Link>
            <Link href="/community" className="hover:text-[#485C11] transition-colors">Community</Link>
          </div>

          <div>
            © {new Date().getFullYear()} Roamly Technologies.
          </div>
        </div>
      </footer>
    </div>
  );
}
