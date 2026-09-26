/**
 * Demo Guide Fallback Catalog
 *
 * Used ONLY when the Roamly database is unreachable. Shared by
 * app/api/guides/route.ts and server/src/agents/guideAgent.js so both paths
 * return the exact same fallback data.
 *
 * Per the grounding rules: demo guides must always be marked isDemo/not
 * bookable, and must never be presented as live, verified Roamly guides.
 */

export const DEMO_GUIDES = [
  {
    id: "guide_rahul_sharma",
    userId: "user_rahul",
    name: "Rahul Sharma",
    profilePhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    bio: "Certified Maharashtra Tourism Department Guide with 7 years of deep archival research into South Mumbai's Indo-Saracenic architecture, Victorian Gothic heritage, and dock history.",
    rating: 4.9,
    experienceYears: 7,
    hourlyRate: 650,
    languages: ["English", "Hindi", "Marathi"],
    expertise: ["Colonial Heritage", "Architecture", "Street Photography", "Harbor Lore"],
    verificationStatus: "VERIFIED",
    availabilityStatus: "AVAILABLE",
    isCurrentlyAtLocation: true,
    currentLocation: { id: "loc_1", name: "Gateway of India" },
    city: "Mumbai",
    coveredLocations: [
      { id: "loc_1", name: "Gateway of India" },
      { id: "loc_2", name: "Colaba Causeway & Heritage Quarter" },
      { id: "loc_3", name: "Marine Drive Promenade" }
    ]
  },
  {
    id: "guide_priya_desai",
    userId: "user_priya",
    name: "Priya Desai",
    profilePhoto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    bio: "Culinary anthropologist & art historian specializing in Parsi cafes, coastal Konkani tasting trails, and the vibrant Kala Ghoda gallery scene.",
    rating: 4.8,
    experienceYears: 5,
    hourlyRate: 800,
    languages: ["English", "Hindi", "Gujarati"],
    expertise: ["Parsi & Konkani Cuisine", "Kala Ghoda Art Walk", "Antique Hunting"],
    verificationStatus: "VERIFIED",
    availabilityStatus: "AVAILABLE",
    isCurrentlyAtLocation: true,
    currentLocation: { id: "loc_2", name: "Colaba Causeway & Heritage Quarter" },
    city: "Mumbai",
    coveredLocations: [
      { id: "loc_1", name: "Gateway of India" },
      { id: "loc_2", name: "Colaba Causeway & Heritage Quarter" }
    ]
  }
];

/**
 * Return demo guides, marked explicitly as demo/non-bookable, optionally
 * filtered by city (case-insensitive substring match).
 *
 * @param {string} [city]
 * @returns {Array<Object>}
 */
export function getDemoGuides(city) {
  const pool = city
    ? DEMO_GUIDES.filter((g) => g.city.toLowerCase() === String(city).toLowerCase())
    : DEMO_GUIDES;

  return pool.map((g) => ({
    ...g,
    isDemo: true,
    isBookable: false,
    guideSource: "ROAMLY_DEMO_FALLBACK"
  }));
}
