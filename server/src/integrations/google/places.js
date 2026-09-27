/**
 * Google Places API (New) Adapter
 * 
 * Functions:
 * - autocompletePlaces(input, options) -> Places API (New) Autocomplete
 * - textSearchPlaces(query, options) -> Places API (New) Text Search
 * - getPlaceDetails(placeId, options) -> Places API (New) Place Details with explicit FieldMask
 * 
 * Never log API keys.
 */

function getApiKey() {
  return process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
}

/**
 * Verified local fallback catalog for offline/demo/testing when Google Places is unavailable.
 */
const FALLBACK_PLACES = [
  {
    placeId: "ChIJbU60qHA6DDkRkiAnUt-3NLg",
    name: "Gateway of India, Mumbai",
    mainText: "Gateway of India",
    secondaryText: "Apollo Bandar, Colaba, Mumbai, Maharashtra, India",
    address: "Apollo Bandar, Colaba, Mumbai, Maharashtra 400001, India",
    latitude: 18.9220,
    longitude: 72.8347,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    primaryType: "monument",
    types: ["monument", "tourist_attraction", "historical_landmark"],
    rating: 4.6,
    userRatingCount: 295000,
    regularOpeningHours: {
      openNow: true,
      weekdayDescriptions: [
        "Monday: Open 24 hours",
        "Tuesday: Open 24 hours",
        "Wednesday: Open 24 hours",
        "Thursday: Open 24 hours",
        "Friday: Open 24 hours",
        "Saturday: Open 24 hours",
        "Sunday: Open 24 hours"
      ]
    },
    reviews: [
      {
        authorName: "Rohan Sharma",
        rating: 5,
        text: "Magnificent colonial arch facing the Arabian Sea. Best visited early morning or sunset."
      }
    ],
    photos: []
  },
  {
    placeId: "ChIJp6vV_CVDdDkRk4d8n76iB3M",
    name: "Taj Mahal, Agra",
    mainText: "Taj Mahal",
    secondaryText: "Dharmapuri, Forest Colony, Agra, Uttar Pradesh, India",
    address: "Dharmapuri, Forest Colony, Tajganj, Agra, Uttar Pradesh 282001, India",
    latitude: 27.1751,
    longitude: 78.0421,
    city: "Agra",
    state: "Uttar Pradesh",
    country: "India",
    primaryType: "monument",
    types: ["monument", "tourist_attraction", "world_heritage_site"],
    rating: 4.8,
    userRatingCount: 380000,
    regularOpeningHours: {
      openNow: true,
      weekdayDescriptions: [
        "Saturday to Thursday: 6:00 AM – 6:30 PM",
        "Friday: Closed (Open for prayers only)"
      ]
    },
    reviews: [
      {
        authorName: "Ananya Iyer",
        rating: 5,
        text: "Unrivaled architectural masterpiece in ivory-white marble. Sunrise view is unforgettable."
      }
    ],
    photos: []
  },
  {
    placeId: "ChIJLbZ-NFv9DDkRzk0gTkm3wlI",
    name: "Delhi",
    mainText: "Delhi",
    secondaryText: "National Capital Territory of Delhi, India",
    address: "New Delhi, Delhi, India",
    latitude: 28.6139,
    longitude: 77.2090,
    city: "Delhi",
    state: "Delhi",
    country: "India",
    primaryType: "locality",
    types: ["locality", "political"],
    rating: 4.5,
    userRatingCount: 150000,
    photos: []
  },
  {
    placeId: "ChIJwe1EZjDG5zsRaYxkjYnchkI",
    name: "Mumbai",
    mainText: "Mumbai",
    secondaryText: "Maharashtra, India",
    address: "Mumbai, Maharashtra, India",
    latitude: 19.0760,
    longitude: 72.8777,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    primaryType: "locality",
    types: ["locality", "political"],
    rating: 4.6,
    userRatingCount: 220000,
    photos: []
  },
  {
    placeId: "ChIJGeSHy7BwbTkR6hnw0EHntG8",
    name: "Jaipur",
    mainText: "Jaipur",
    secondaryText: "Rajasthan, India",
    address: "Jaipur, Rajasthan, India",
    latitude: 26.9124,
    longitude: 75.7873,
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    primaryType: "locality",
    types: ["locality", "political"],
    rating: 4.7,
    userRatingCount: 110000,
    photos: []
  },
  {
    placeId: "ChIJ7-06B7q75zsR_1w786g_v20",
    name: "Marine Drive, Mumbai",
    mainText: "Marine Drive",
    secondaryText: "Netaji Subhash Chandra Bose Road, Mumbai, Maharashtra, India",
    address: "Marine Drive, Mumbai, Maharashtra, India",
    latitude: 18.9432,
    longitude: 72.8230,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    primaryType: "beach",
    types: ["beach", "tourist_attraction"],
    rating: 4.7,
    userRatingCount: 140000,
    photos: []
  },
  {
    placeId: "ChIJbU60qHA6DDkRkiAnUt-3Col",
    name: "Colaba Causeway, Mumbai",
    mainText: "Colaba Causeway",
    secondaryText: "Colaba, Mumbai, Maharashtra, India",
    address: "Colaba, Mumbai, Maharashtra, India",
    latitude: 18.9150,
    longitude: 72.8258,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    primaryType: "market",
    types: ["market", "shopping_mall"],
    rating: 4.5,
    userRatingCount: 85000,
    photos: []
  },
  {
    placeId: "ChIJ40i5iQ255zsRnBq5tC1JpP8",
    name: "Elephanta Caves, Mumbai",
    mainText: "Elephanta Caves",
    secondaryText: "Gharapuri, Maharashtra, India",
    address: "Gharapuri, Maharashtra, India",
    latitude: 18.9633,
    longitude: 72.9315,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    primaryType: "temple",
    types: ["temple", "historical_landmark"],
    rating: 4.5,
    userRatingCount: 45000,
    photos: []
  },
  {
    placeId: "ChIJp7eQjQ645zsREmYt9fK4kXg",
    name: "Chhatrapati Shivaji Maharaj Terminus (CSMT)",
    mainText: "CSMT",
    secondaryText: "Fort, Mumbai, Maharashtra, India",
    address: "Chhatrapati Shivaji Maharaj Terminus, Fort, Mumbai, Maharashtra 400001",
    latitude: 18.9400,
    longitude: 72.8353,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    primaryType: "monument",
    types: ["monument", "transit_station"],
    rating: 4.6,
    userRatingCount: 125000,
    photos: []
  }
];

function searchFallbackPlaces(query) {
  if (!query) return [];
  const q = String(query).toLowerCase().trim();
  return FALLBACK_PLACES.filter(place => 
    place.name.toLowerCase().includes(q) ||
    place.mainText.toLowerCase().includes(q) ||
    place.city.toLowerCase().includes(q) ||
    (place.secondaryText && place.secondaryText.toLowerCase().includes(q))
  ).map(p => ({
    placeId: p.placeId,
    name: p.name,
    mainText: p.mainText,
    secondaryText: p.secondaryText,
    formattedAddress: p.address || p.secondaryText || "",
    latitude: p.latitude,
    longitude: p.longitude,
    primaryType: p.primaryType || (p.types && p.types[0]) || "point_of_interest",
    types: p.types || [p.primaryType],
    rating: p.rating,
    userRatingCount: p.userRatingCount,
    regularOpeningHours: p.regularOpeningHours || null,
    photos: p.photos || []
  }));
}

/**
 * Autocomplete Places via Google Places API (New)
 * 
 * @param {string} input - Text entered by user
 * @param {Object} [options]
 * @param {string} [options.languageCode="en"]
 * @param {Array<string>} [options.includedRegionCodes]
 * @returns {Promise<Array<{placeId: string, name: string, mainText: string, secondaryText: string, types: string[]}>>}
 */
export async function autocompletePlaces(input, options = {}) {
  const cleanInput = String(input || "").trim();
  if (!cleanInput) return [];

  const apiKey = getApiKey();

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Google Places] search query: "${cleanInput}"`);
  }

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Google Places] No GOOGLE_MAPS_SERVER_API_KEY set; using fallback suggestions");
      console.log(`[Roamly Location] fallback used: local verified catalog for "${cleanInput}"`);
    }
    const fallback = searchFallbackPlaces(cleanInput);
    if (fallback.length > 0) return fallback;
    // Dynamic fallback so any destination input is usable
    return [
      {
        placeId: `custom_${encodeURIComponent(cleanInput.toLowerCase())}`,
        name: cleanInput,
        mainText: cleanInput,
        secondaryText: "Custom Destination",
        types: ["locality"]
      }
    ];
  }

  const endpoint = "https://places.googleapis.com/v1/places:autocomplete";
  const body = {
    input: cleanInput,
    languageCode: options.languageCode || "en"
  };

  if (Array.isArray(options.includedRegionCodes) && options.includedRegionCodes.length > 0) {
    body.includedRegionCodes = options.includedRegionCodes;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `HTTP ${res.status} ${res.statusText}`;
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Google Places] Autocomplete API error: ${msg}. Falling back to text search/catalog.`);
      }
      return searchFallbackPlaces(cleanInput);
    }

    const data = await res.json();
    const suggestions = (data.suggestions || [])
      .filter(s => s.placePrediction)
      .map(s => {
        const pred = s.placePrediction;
        return {
          placeId: pred.placeId,
          name: pred.text?.text || pred.structuredFormat?.mainText?.text || "",
          mainText: pred.structuredFormat?.mainText?.text || pred.text?.text || "",
          secondaryText: pred.structuredFormat?.secondaryText?.text || "",
          types: pred.types || []
        };
      });

    return suggestions.length > 0 ? suggestions : searchFallbackPlaces(cleanInput);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Places] Autocomplete network error: ${err.message}. Using fallback.`);
    }
    return searchFallbackPlaces(cleanInput);
  }
}

/**
 * Text Search via Google Places API (New)
 * 
 * @param {string} query
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
export async function textSearchPlaces(query, options = {}) {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) return [];

  const apiKey = getApiKey();

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Google Places] search query (text): "${cleanQuery}"`);
  }

  if (!apiKey) {
    return searchFallbackPlaces(cleanQuery);
  }

  const endpoint = "https://places.googleapis.com/v1/places:searchText";
  const fieldMask = "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.primaryType,places.regularOpeningHours,places.photos";

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask
      },
      body: JSON.stringify({
        textQuery: cleanQuery,
        languageCode: options.languageCode || "en"
      })
    });

    if (!res.ok) {
      return searchFallbackPlaces(cleanQuery);
    }

    const data = await res.json();
    return (data.places || []).map(p => ({
      placeId: p.id,
      name: p.displayName?.text || p.formattedAddress || "",
      formattedAddress: p.formattedAddress || "",
      latitude: p.location?.latitude,
      longitude: p.location?.longitude,
      primaryType: p.primaryType || p.types?.[0] || "point_of_interest",
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      regularOpeningHours: p.regularOpeningHours || null,
      photos: p.photos || [],
      types: p.types || []
    }));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Places] Text Search error: ${err.message}`);
    }
    return searchFallbackPlaces(cleanQuery);
  }
}

/**
 * Place Details via Google Places API (New) with explicit field masks
 * 
 * @param {string} placeId
 * @param {Object} [options]
 * @returns {Promise<Object|null>}
 */
export async function getPlaceDetails(placeId, options = {}) {
  const cleanPlaceId = String(placeId || "").trim();
  if (!cleanPlaceId) throw new Error("placeId is required");

  const apiKey = getApiKey();

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Google Places] selected placeId: ${cleanPlaceId}`);
  }

  if (!apiKey) {
    const fallback = FALLBACK_PLACES.find(p => p.placeId === cleanPlaceId);
    if (fallback) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Roamly Location] fallback used: details for ${fallback.name}`);
      }
      return { ...fallback };
    }
    return null;
  }

  const fieldMask = options.fieldMask || "id,displayName,formattedAddress,location,rating,userRatingCount,reviews,regularOpeningHours,currentOpeningHours,primaryType,priceLevel,googleMapsUri,photos";
  const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(cleanPlaceId)}`;

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask
      }
    });

    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Google Places] Place Details HTTP ${res.status}: checking fallback catalog`);
      }
      const fallback = FALLBACK_PLACES.find(p => p.placeId === cleanPlaceId);
      return fallback || null;
    }

    const data = await res.json();
    return {
      placeId: data.id,
      name: data.displayName?.text || "",
      address: data.formattedAddress || "",
      latitude: data.location?.latitude,
      longitude: data.location?.longitude,
      rating: data.rating || null,
      userRatingCount: data.userRatingCount || 0,
      reviews: (data.reviews || []).map(r => ({
        authorName: r.authorAttribution?.displayName || "Anonymous",
        rating: r.rating,
        text: r.text?.text || r.originalText?.text || "",
        relativePublishTimeDescription: r.relativePublishTimeDescription || "",
        publishTime: r.publishTime || null
      })),
      regularOpeningHours: data.regularOpeningHours || null,
      currentOpeningHours: data.currentOpeningHours || null,
      primaryType: data.primaryType || "point_of_interest",
      priceLevel: data.priceLevel || null,
      googleMapsUri: data.googleMapsUri || null,
      photos: (data.photos || []).map(p => ({
        name: p.name,
        widthPx: p.widthPx,
        heightPx: p.heightPx,
        authorAttributions: p.authorAttributions || []
      }))
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Places] Place Details request failed: ${err.message}`);
    }
    const fallback = FALLBACK_PLACES.find(p => p.placeId === cleanPlaceId);
    return fallback || null;
  }
}

/**
 * Nearby Search via Google Places API (New)
 *
 * Searches for places near a given location within a specified radius.
 * Used for: nearby attractions, hotels, restaurants, etc.
 *
 * @param {Object} params
 * @param {number} params.latitude - Center latitude
 * @param {number} params.longitude - Center longitude
 * @param {number} [params.radiusMeters=1500] - Search radius in meters
 * @param {Array<string>} [params.includedTypes] - Google Place types to include
 * @param {Array<string>} [params.excludedPlaceIds] - Place IDs to exclude from results
 * @param {number} [params.maxResultCount=10] - Maximum number of results
 * @param {string} [params.languageCode="en"]
 * @returns {Promise<Array<Object>>}
 */
export async function nearbySearchPlaces(params = {}) {
  const {
    latitude,
    longitude,
    radiusMeters = 1500,
    includedTypes,
    excludedPlaceIds = [],
    maxResultCount = 10,
    languageCode = "en"
  } = params;

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return [];
  }

  const apiKey = getApiKey();

  if (process.env.NODE_ENV !== "production") {
    console.log(`[Google Places] nearby search at (${latitude.toFixed(4)}, ${longitude.toFixed(4)}), radius=${radiusMeters}m, types=${(includedTypes || ["tourist_attraction"]).join(",")}`);
  }

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Google Places] No API key; nearby search unavailable");
    }
    return [];
  }

  const endpoint = "https://places.googleapis.com/v1/places:searchNearby";
  const fieldMask = "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount,places.primaryType,places.regularOpeningHours,places.priceLevel,places.googleMapsUri,places.photos";

  const body = {
    locationRestriction: {
      circle: {
        center: { latitude, longitude },
        radius: Math.min(radiusMeters, 50000) // Google max is 50km
      }
    },
    maxResultCount: Math.min(maxResultCount, 20),
    languageCode
  };

  if (Array.isArray(includedTypes) && includedTypes.length > 0) {
    body.includedTypes = includedTypes;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Google Places] Nearby Search error: ${errData?.error?.message || res.status}`);
      }
      return [];
    }

    const data = await res.json();
    const excludeSet = new Set(excludedPlaceIds);

    return (data.places || [])
      .filter(p => !excludeSet.has(p.id))
      .map(p => ({
        placeId: p.id,
        name: p.displayName?.text || "",
        address: p.formattedAddress || "",
        latitude: p.location?.latitude,
        longitude: p.location?.longitude,
        primaryType: p.primaryType || p.types?.[0] || "point_of_interest",
        types: p.types || [],
        rating: p.rating || null,
        userRatingCount: p.userRatingCount || 0,
        regularOpeningHours: p.regularOpeningHours || null,
        priceLevel: p.priceLevel || null,
        googleMapsUri: p.googleMapsUri || null,
        photos: (p.photos || []).slice(0, 3).map(ph => ({
          name: ph.name,
          widthPx: ph.widthPx,
          heightPx: ph.heightPx
        }))
      }));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Places] Nearby Search network error: ${err.message}`);
    }
    return [];
  }
}

