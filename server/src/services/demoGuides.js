/**
 * Demo Guide Fallback Catalog
 *
 * Used when the Roamly database is unreachable or has no registered guides
 * for a requested destination. Shared by app/api/guides/route.ts and
 * server/src/agents/guideAgent.js so both paths return consistent, grounded data.
 */

export const DEMO_GUIDES = [
  // --- Mumbai ---
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
    currentLocation: { id: "loc_mum_1", name: "Gateway of India" },
    city: "Mumbai",
    coveredLocations: [
      { id: "loc_mum_1", name: "Gateway of India" },
      { id: "loc_mum_2", name: "Colaba Causeway & Heritage Quarter" },
      { id: "loc_mum_3", name: "Marine Drive Promenade" }
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
    currentLocation: { id: "loc_mum_2", name: "Colaba Causeway & Heritage Quarter" },
    city: "Mumbai",
    coveredLocations: [
      { id: "loc_mum_1", name: "Gateway of India" },
      { id: "loc_mum_2", name: "Colaba Causeway & Heritage Quarter" }
    ]
  },

  // --- Delhi ---
  {
    id: "guide_vikram_malhotra",
    userId: "user_vikram",
    name: "Vikram Malhotra",
    profilePhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    bio: "Historian and author specializing in Mughal Delhi, Shahjahanabad heritage walks, and Chandni Chowk street cuisine.",
    rating: 4.9,
    experienceYears: 9,
    hourlyRate: 750,
    languages: ["English", "Hindi", "Urdu"],
    expertise: ["Mughal Monuments", "Old Delhi Food Walk", "Sufi Shrines", "Photography"],
    verificationStatus: "VERIFIED",
    availabilityStatus: "AVAILABLE",
    isCurrentlyAtLocation: true,
    currentLocation: { id: "loc_del_1", name: "Red Fort" },
    city: "Delhi",
    coveredLocations: [
      { id: "loc_del_1", name: "Red Fort" },
      { id: "loc_del_2", name: "Humayun's Tomb" },
      { id: "loc_del_3", name: "Qutub Minar Complex" }
    ]
  },
  {
    id: "guide_ananya_sen",
    userId: "user_ananya",
    name: "Ananya Sen",
    profilePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    bio: "Curator and architecture graduate exploring Lutyens' Delhi, Hauz Khas Village, and contemporary art galleries.",
    rating: 4.8,
    experienceYears: 6,
    hourlyRate: 700,
    languages: ["English", "Hindi", "Bengali"],
    expertise: ["Lutyens Architecture", "Hauz Khas Heritage", "Art Galleries", "Boutique Shopping"],
    verificationStatus: "VERIFIED",
    availabilityStatus: "AVAILABLE",
    isCurrentlyAtLocation: true,
    currentLocation: { id: "loc_del_2", name: "Humayun's Tomb" },
    city: "Delhi",
    coveredLocations: [
      { id: "loc_del_2", name: "Humayun's Tomb" },
      { id: "loc_del_4", name: "Lodhi Art District" }
    ]
  },

  // --- Jaipur ---
  {
    id: "guide_ratan_singh",
    userId: "user_ratan",
    name: "Ratan Singh Shekhawat",
    profilePhoto: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    bio: "Government-licensed Rajasthan tourism guide with 11 years of experience across Amer Fort, Nahargarh, and the Royal City Palace.",
    rating: 5.0,
    experienceYears: 11,
    hourlyRate: 700,
    languages: ["English", "Hindi", "Rajasthani", "French"],
    expertise: ["Rajput Forts", "Royal History", "Astronomy & Jantar Mantar", "Jewelry Bazaars"],
    verificationStatus: "VERIFIED",
    availabilityStatus: "AVAILABLE",
    isCurrentlyAtLocation: true,
    currentLocation: { id: "loc_jai_1", name: "Amer Fort" },
    city: "Jaipur",
    coveredLocations: [
      { id: "loc_jai_1", name: "Amer Fort" },
      { id: "loc_jai_2", name: "City Palace" },
      { id: "loc_jai_3", name: "Hawa Mahal & Johari Bazaar" }
    ]
  },
  {
    id: "guide_sunita_rathore",
    userId: "user_sunita",
    name: "Sunita Rathore",
    profilePhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    bio: "Specialist in Pink City textile arts, block-printing workshops, and hidden heritage stepwells across Jaipur.",
    rating: 4.9,
    experienceYears: 8,
    hourlyRate: 650,
    languages: ["English", "Hindi", "German"],
    expertise: ["Block Printing", "Stepwells & Baoris", "Blue Pottery", "Local Rajasthani Dining"],
    verificationStatus: "VERIFIED",
    availabilityStatus: "AVAILABLE",
    isCurrentlyAtLocation: true,
    currentLocation: { id: "loc_jai_3", name: "Hawa Mahal & Johari Bazaar" },
    city: "Jaipur",
    coveredLocations: [
      { id: "loc_jai_3", name: "Hawa Mahal & Johari Bazaar" },
      { id: "loc_jai_4", name: "Panna Meena ka Kund" }
    ]
  },

  // --- Agra ---
  {
    id: "guide_tariq_khan",
    userId: "user_tariq",
    name: "Tariq Khan",
    profilePhoto: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80",
    bio: "Archeology scholar and Taj Mahal specialist. Providing VIP sunrise tours, marble inlay history, and Agra Fort architecture walks.",
    rating: 4.9,
    experienceYears: 10,
    hourlyRate: 850,
    languages: ["English", "Hindi", "Spanish", "Urdu"],
    expertise: ["Taj Mahal Sunrise", "Mughal Architecture", "Pietra Dura Inlay", "Agra Fort"],
    verificationStatus: "VERIFIED",
    availabilityStatus: "AVAILABLE",
    isCurrentlyAtLocation: true,
    currentLocation: { id: "loc_agr_1", name: "Taj Mahal" },
    city: "Agra",
    coveredLocations: [
      { id: "loc_agr_1", name: "Taj Mahal" },
      { id: "loc_agr_2", name: "Agra Fort" },
      { id: "loc_agr_3", name: "Mehtab Bagh" }
    ]
  },

  // --- Goa ---
  {
    id: "guide_antonio_dsouza",
    userId: "user_antonio",
    name: "Antonio D'Souza",
    profilePhoto: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
    bio: "Fontainhas Latin Quarter native and coastal explorer. Sharing Portuguese-Goan heritage, secret cove trails, and sunset viewpoints.",
    rating: 4.9,
    experienceYears: 7,
    hourlyRate: 600,
    languages: ["English", "Hindi", "Konkani", "Portuguese"],
    expertise: ["Latin Quarter Walk", "Colonial Churches", "Hidden Beaches", "Goan Seafood Trails"],
    verificationStatus: "VERIFIED",
    availabilityStatus: "AVAILABLE",
    isCurrentlyAtLocation: true,
    currentLocation: { id: "loc_goa_1", name: "Panaji & Fontainhas" },
    city: "Goa",
    coveredLocations: [
      { id: "loc_goa_1", name: "Panaji & Fontainhas" },
      { id: "loc_goa_2", name: "Old Goa Basílica" },
      { id: "loc_goa_3", name: "Fort Aguada & Anjuna" }
    ]
  },
  {
    id: "guide_maya_fernandes",
    userId: "user_maya",
    name: "Maya Fernandes",
    profilePhoto: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80",
    bio: "Naturalist and organic spice farm custodian. Leading spice tours, river island ferry trails, and birdwatching in Chorao.",
    rating: 4.8,
    experienceYears: 6,
    hourlyRate: 550,
    languages: ["English", "Hindi", "Konkani"],
    expertise: ["Spice Plantations", "Birdwatching", "River Island Trails", "Organic Farming"],
    verificationStatus: "VERIFIED",
    availabilityStatus: "AVAILABLE",
    isCurrentlyAtLocation: true,
    currentLocation: { id: "loc_goa_2", name: "Old Goa Basílica" },
    city: "Goa",
    coveredLocations: [
      { id: "loc_goa_2", name: "Old Goa Basílica" },
      { id: "loc_goa_4", name: "Sahakari Spice Farm" }
    ]
  },

  // --- Varanasi ---
  {
    id: "guide_anand_shastri",
    userId: "user_anand",
    name: "Pandit Anand Shastri",
    profilePhoto: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80",
    bio: "Sanskrit scholar & 4th generation Varanasi resident. Guiding sunrise boat rides, evening Ganga Aarti ceremonies, and Vedic philosophy trails.",
    rating: 5.0,
    experienceYears: 12,
    hourlyRate: 700,
    languages: ["English", "Hindi", "Sanskrit"],
    expertise: ["Ganga Aarti Ceremony", "Ghat Heritage", "Sanskrit & Philosophy", "Silk Weaving Alleys"],
    verificationStatus: "VERIFIED",
    availabilityStatus: "AVAILABLE",
    isCurrentlyAtLocation: true,
    currentLocation: { id: "loc_var_1", name: "Dashashwamedh Ghat" },
    city: "Varanasi",
    coveredLocations: [
      { id: "loc_var_1", name: "Dashashwamedh Ghat" },
      { id: "loc_var_2", name: "Assi Ghat" },
      { id: "loc_var_3", name: "Kashi Vishwanath Corridor" }
    ]
  },

  // --- Bengaluru ---
  {
    id: "guide_karthik_raman",
    userId: "user_karthik",
    name: "Karthik Raman",
    profilePhoto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    bio: "Ecologist & urban historian. Host of Cubbon Park botanical walks, Lalbagh flower clock history, and traditional South Indian filter coffee tours.",
    rating: 4.8,
    experienceYears: 6,
    hourlyRate: 600,
    languages: ["English", "Hindi", "Kannada", "Tamil"],
    expertise: ["Botanical Gardens", "Colonial Bangalore", "Filter Coffee Trails", "Tech Heritage"],
    verificationStatus: "VERIFIED",
    availabilityStatus: "AVAILABLE",
    isCurrentlyAtLocation: true,
    currentLocation: { id: "loc_blr_1", name: "Cubbon Park & MG Road" },
    city: "Bengaluru",
    coveredLocations: [
      { id: "loc_blr_1", name: "Cubbon Park & MG Road" },
      { id: "loc_blr_2", name: "Lalbagh Botanical Garden" },
      { id: "loc_blr_3", name: "Bangalore Palace" }
    ]
  },

  // --- Kochi / Kerala ---
  {
    id: "guide_thomas_kurian",
    userId: "user_thomas",
    name: "Thomas Kurian",
    profilePhoto: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80",
    bio: "Spice merchant family descendant and Fort Kochi historian. Chinese fishing nets, Jewish Synagogue, and Mattancherry mural trails.",
    rating: 4.9,
    experienceYears: 8,
    hourlyRate: 650,
    languages: ["English", "Malayalam", "Hindi"],
    expertise: ["Chinese Fishing Nets", "Spice Trade History", "Jewish Town", "Kathakali Arts"],
    verificationStatus: "VERIFIED",
    availabilityStatus: "AVAILABLE",
    isCurrentlyAtLocation: true,
    currentLocation: { id: "loc_koc_1", name: "Fort Kochi" },
    city: "Kochi",
    coveredLocations: [
      { id: "loc_koc_1", name: "Fort Kochi" },
      { id: "loc_koc_2", name: "Mattancherry Palace" },
      { id: "loc_koc_3", name: "Jew Town" }
    ]
  },

  // --- Udaipur ---
  {
    id: "guide_mahendra_singh",
    userId: "user_mahendra",
    name: "Mahendra Singh Mewar",
    profilePhoto: "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?auto=format&fit=crop&w=400&q=80",
    bio: "City of Lakes heritage custodian. Leading exclusive City Palace architecture walks, Jagdish Temple heritage, and Lake Pichola sunset boat tours.",
    rating: 4.9,
    experienceYears: 9,
    hourlyRate: 750,
    languages: ["English", "Hindi", "Rajasthani", "Italian"],
    expertise: ["Lake Pichola", "Mewar Dynasty History", "Miniature Painting", "Palace Architecture"],
    verificationStatus: "VERIFIED",
    availabilityStatus: "AVAILABLE",
    isCurrentlyAtLocation: true,
    currentLocation: { id: "loc_uda_1", name: "City Palace Udaipur" },
    city: "Udaipur",
    coveredLocations: [
      { id: "loc_uda_1", name: "City Palace Udaipur" },
      { id: "loc_uda_2", name: "Lake Pichola & Jagmandir" },
      { id: "loc_uda_3", name: "Saheliyon-ki-Bari" }
    ]
  }
];

/**
 * Clean and normalize a destination/city search string
 * e.g. "Jaipur, Rajasthan, India" -> "Jaipur"
 */
function cleanCityName(raw) {
  if (!raw) return "";
  const first = raw.split(",")[0].trim();
  // Strip common suffixes
  return first.replace(/\b(city|district|state|division)\b/gi, "").trim();
}

/**
 * Return demo guides, marked explicitly as demo/non-bookable,
 * filtered by city with substring matching and dynamic fallback.
 *
 * @param {string} [city]
 * @returns {Array<Object>}
 */
export function getDemoGuides(city) {
  const clean = cleanCityName(city);
  const targetLower = clean.toLowerCase();

  let pool = [];

  if (targetLower) {
    // 1. Exact or substring match in catalog
    pool = DEMO_GUIDES.filter((g) => {
      const gCity = g.city.toLowerCase();
      return (
        gCity === targetLower ||
        gCity.includes(targetLower) ||
        targetLower.includes(gCity) ||
        (city && city.toLowerCase().includes(gCity))
      );
    });
  }

  // 2. If no direct match in catalog, dynamically generate 2 qualified guides for this destination
  if (pool.length === 0 && clean) {
    const capitalizedCity = clean.charAt(0).toUpperCase() + clean.slice(1);
    pool = [
      {
        id: `guide_${targetLower.replace(/[^a-z0-9]/g, "_")}_expert1`,
        userId: `user_${targetLower.replace(/[^a-z0-9]/g, "_")}_1`,
        name: `Rajesh V. (${capitalizedCity} Expert)`,
        profilePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        bio: `Certified local tourism specialist with 7+ years of experience guiding walking tours, historic monuments, and cultural landmarks across ${capitalizedCity}.`,
        rating: 4.9,
        experienceYears: 7,
        hourlyRate: 650,
        languages: ["English", "Hindi", "Regional Dialect"],
        expertise: [`${capitalizedCity} Heritage`, "Monuments & Temples", "Local Food Trails", "Photography"],
        verificationStatus: "VERIFIED",
        availabilityStatus: "AVAILABLE",
        isCurrentlyAtLocation: true,
        currentLocation: { id: `loc_${targetLower}_1`, name: `${capitalizedCity} City Center` },
        city: capitalizedCity,
        coveredLocations: [
          { id: `loc_${targetLower}_1`, name: `${capitalizedCity} City Center` },
          { id: `loc_${targetLower}_2`, name: `${capitalizedCity} Heritage District` }
        ]
      },
      {
        id: `guide_${targetLower.replace(/[^a-z0-9]/g, "_")}_expert2`,
        userId: `user_${targetLower.replace(/[^a-z0-9]/g, "_")}_2`,
        name: `Meera K. (${capitalizedCity} Cultural Guide)`,
        profilePhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
        bio: `Art historian and culinary storyteller specializing in secret markets, artisanal crafts, and neighborhood walks throughout ${capitalizedCity}.`,
        rating: 4.8,
        experienceYears: 5,
        hourlyRate: 550,
        languages: ["English", "Hindi"],
        expertise: ["Artisan Bazaars", "Culinary Tastings", "Architecture", "Hidden Alleys"],
        verificationStatus: "VERIFIED",
        availabilityStatus: "AVAILABLE",
        isCurrentlyAtLocation: true,
        currentLocation: { id: `loc_${targetLower}_2`, name: `${capitalizedCity} Heritage District` },
        city: capitalizedCity,
        coveredLocations: [
          { id: `loc_${targetLower}_2`, name: `${capitalizedCity} Heritage District` }
        ]
      }
    ];
  }

  // If still empty (e.g. no city provided at all), return all available catalog guides
  if (pool.length === 0) {
    pool = DEMO_GUIDES;
  }

  return pool.map((g) => ({
    ...g,
    isDemo: true,
    isBookable: false,
    guideSource: "ROAMLY_DEMO_FALLBACK"
  }));
}
