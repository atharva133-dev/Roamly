/**
 * Google Geocoding API Adapter
 * 
 * Functions:
 * - geocodeAddress(address) -> Forward geocoding
 * - reverseGeocode(latitude, longitude) -> Reverse geocoding
 * - geocodePlaceId(placeId) -> Resolution by Google Place ID
 * 
 * Normalizes all responses into Roamly domain primitives:
 * { placeId, formattedAddress, latitude, longitude, city, state, country, postalCode }
 */

function getApiKey() {
  return process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
}

/**
 * Curated fallback dictionary for offline/demo/testing when Google Geocoding is unavailable.
 */
const FALLBACK_GEOCODE_DATA = [
  {
    matchTerms: ["delhi", "new delhi", "ncr"],
    placeId: "ChIJLbZ-NFv9DDkRzk0gTkm3wlI",
    formattedAddress: "New Delhi, Delhi, India",
    latitude: 28.6139,
    longitude: 77.2090,
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    postalCode: "110001"
  },
  {
    matchTerms: ["mumbai", "bombay"],
    placeId: "ChIJwe1EZjDG5zsRaYxkjYnchkI",
    formattedAddress: "Mumbai, Maharashtra, India",
    latitude: 19.0760,
    longitude: 72.8777,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    postalCode: "400001"
  },
  {
    matchTerms: ["agra", "taj mahal"],
    placeId: "ChIJp6vV_CVDdDkRk4d8n76iB3M",
    formattedAddress: "Agra, Uttar Pradesh, India",
    latitude: 27.1767,
    longitude: 78.0081,
    city: "Agra",
    state: "Uttar Pradesh",
    country: "India",
    postalCode: "282001"
  },
  {
    matchTerms: ["jaipur", "pink city"],
    placeId: "ChIJGeSHy7BwbTkR6hnw0EHntG8",
    formattedAddress: "Jaipur, Rajasthan, India",
    latitude: 26.9124,
    longitude: 75.7873,
    city: "Jaipur",
    state: "Rajasthan",
    country: "India",
    postalCode: "302001"
  },
  {
    matchTerms: ["gateway of india"],
    placeId: "ChIJbU60qHA6DDkRkiAnUt-3NLg",
    formattedAddress: "Apollo Bandar, Colaba, Mumbai, Maharashtra 400001, India",
    latitude: 18.9220,
    longitude: 72.8347,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    postalCode: "400001"
  },
  {
    matchTerms: ["bangalore", "bengaluru"],
    placeId: "ChIJbU60qHA6DDkRkiAnUt-3NL1",
    formattedAddress: "Bengaluru, Karnataka, India",
    latitude: 12.9716,
    longitude: 77.5946,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    postalCode: "560001"
  },
  {
    matchTerms: ["goa", "panaji"],
    placeId: "ChIJL-NWfqjPuzsR8b_k_c9Z_p8",
    formattedAddress: "Panaji, Goa, India",
    latitude: 15.2993,
    longitude: 74.1240,
    city: "Goa",
    state: "Goa",
    country: "India",
    postalCode: "403001"
  },
  {
    matchTerms: ["paris"],
    placeId: "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
    formattedAddress: "Paris, France",
    latitude: 48.8566,
    longitude: 2.3522,
    city: "Paris",
    state: "Île-de-France",
    country: "France",
    postalCode: "75001"
  },
  {
    matchTerms: ["london"],
    placeId: "ChIJdd4hrwug2EcRmSrV3Vo6llI",
    formattedAddress: "London, UK",
    latitude: 51.5074,
    longitude: -0.1278,
    city: "London",
    state: "England",
    country: "United Kingdom",
    postalCode: "SW1A 1AA"
  },
  {
    matchTerms: ["tokyo"],
    placeId: "ChIJ513GhQKfGGAR0TLpipeZXPh",
    formattedAddress: "Tokyo, Japan",
    latitude: 35.6762,
    longitude: 139.6503,
    city: "Tokyo",
    state: "Tokyo",
    country: "Japan",
    postalCode: "100-0001"
  }
];

function findFallbackByQuery(query) {
  if (!query) return null;
  const q = String(query).toLowerCase().trim();
  for (const item of FALLBACK_GEOCODE_DATA) {
    if (item.matchTerms.some(term => q.includes(term) || term.includes(q))) {
      return { ...item };
    }
  }
  return null;
}

function findFallbackByCoords(lat, lng) {
  if (lat == null || lng == null) return null;
  let closest = null;
  let minDistance = Infinity;

  for (const item of FALLBACK_GEOCODE_DATA) {
    const dLat = item.latitude - lat;
    const dLng = item.longitude - lng;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = item;
    }
  }

  // If reasonably close (< 2.5 degrees roughly ~250km), return closest
  if (closest && minDistance < 2.5) {
    return { ...closest };
  }
  // Otherwise return general location
  return {
    placeId: `loc_${Math.round(lat * 100)}_${Math.round(lng * 100)}`,
    formattedAddress: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    latitude: lat,
    longitude: lng,
    city: "Approximate Area",
    state: "Unknown",
    country: "India",
    postalCode: ""
  };
}

/**
 * Parse standard Google Geocoding address_components into clean normalized fields
 */
function parseAddressComponents(components = []) {
  let city = "";
  let state = "";
  let country = "India";
  let postalCode = "";

  for (const comp of components) {
    const types = comp.types || [];
    if (types.includes("locality")) {
      city = comp.long_name;
    } else if (!city && (types.includes("administrative_area_level_2") || types.includes("postal_town"))) {
      city = comp.long_name;
    }
    if (types.includes("administrative_area_level_1")) {
      state = comp.long_name;
    }
    if (types.includes("country")) {
      country = comp.long_name;
    }
    if (types.includes("postal_code")) {
      postalCode = comp.long_name;
    }
  }

  return { city, state, country, postalCode };
}

function normalizeGeocodeResult(rawResult) {
  if (!rawResult || !rawResult.geometry || !rawResult.geometry.location) {
    return null;
  }

  const { city, state, country, postalCode } = parseAddressComponents(rawResult.address_components);

  return {
    placeId: rawResult.place_id || "",
    formattedAddress: rawResult.formatted_address || "",
    latitude: rawResult.geometry.location.lat,
    longitude: rawResult.geometry.location.lng,
    city: city || (rawResult.formatted_address ? rawResult.formatted_address.split(",")[0].trim() : ""),
    state: state || "",
    country: country || "India",
    postalCode: postalCode || ""
  };
}

/**
 * Forward Geocoding: address string -> normalized coordinates & address details
 * 
 * @param {string} address
 * @returns {Promise<Object|null>}
 */
export async function geocodeAddress(address) {
  const cleanAddress = String(address || "").trim();
  if (!cleanAddress) {
    throw new Error("Address is required for geocoding");
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    const fallback = findFallbackByQuery(cleanAddress);
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Geocoding] No GOOGLE_MAPS_SERVER_API_KEY set; using fallback for "${cleanAddress}"`);
      console.log(`[Roamly Location] fallback used: "${cleanAddress}" -> lat=${fallback?.latitude}, lng=${fallback?.longitude}`);
    }
    return fallback || {
      placeId: `gen_${Date.now()}`,
      formattedAddress: cleanAddress,
      latitude: 20.5937,
      longitude: 78.9629,
      city: cleanAddress.split(",")[0].trim(),
      state: "",
      country: "India",
      postalCode: ""
    };
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cleanAddress)}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google Geocoding HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.status === "ZERO_RESULTS" || !data.results || data.results.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Google Geocoding] Zero results for: "${cleanAddress}", checking fallback`);
      }
      const fallback = findFallbackByQuery(cleanAddress);
      return fallback || null;
    }

    if (data.status !== "OK") {
      throw new Error(`Google Geocoding API returned status ${data.status}: ${data.error_message || "Unknown error"}`);
    }

    const normalized = normalizeGeocodeResult(data.results[0]);

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Google Geocoding] address: "${cleanAddress}"`);
      console.log(`[Google Geocoding] coordinates: lat=${normalized.latitude}, lng=${normalized.longitude}`);
    }

    return normalized;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Geocoding] Error geocoding address "${cleanAddress}": ${err.message}. Using fallback.`);
    }
    const fallback = findFallbackByQuery(cleanAddress);
    return fallback || null;
  }
}

/**
 * Reverse Geocoding: (latitude, longitude) -> normalized address & place details
 * 
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object|null>}
 */
export async function reverseGeocode(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    throw new Error("Valid numeric latitude and longitude are required for reverse geocoding");
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    const fallback = findFallbackByCoords(lat, lng);
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Geocoding] No GOOGLE_MAPS_SERVER_API_KEY set; using reverse geocode fallback for (${lat}, ${lng})`);
      console.log(`[Roamly Location] fallback used: (${lat}, ${lng}) -> ${fallback?.formattedAddress}`);
    }
    return fallback;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google Geocoding HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.status === "ZERO_RESULTS" || !data.results || data.results.length === 0) {
      return findFallbackByCoords(lat, lng);
    }

    if (data.status !== "OK") {
      throw new Error(`Google Geocoding API returned status ${data.status}: ${data.error_message || "Unknown error"}`);
    }

    const normalized = normalizeGeocodeResult(data.results[0]);

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Google Geocoding] coordinates: lat=${lat}, lng=${lng}`);
      console.log(`[Google Geocoding] address: "${normalized.formattedAddress}"`);
    }

    return normalized;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Geocoding] Error reverse geocoding (${lat}, ${lng}): ${err.message}. Using fallback.`);
    }
    return findFallbackByCoords(lat, lng);
  }
}

/**
 * Geocode by Google Place ID
 * 
 * @param {string} placeId
 * @returns {Promise<Object|null>}
 */
export async function geocodePlaceId(placeId) {
  const cleanPlaceId = String(placeId || "").trim();
  if (!cleanPlaceId) {
    throw new Error("placeId is required");
  }

  const apiKey = getApiKey();

  if (!apiKey) {
    const fallback = FALLBACK_GEOCODE_DATA.find(f => f.placeId === cleanPlaceId);
    return fallback || null;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(cleanPlaceId)}&key=${apiKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Google Geocoding HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return null;
    }

    return normalizeGeocodeResult(data.results[0]);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Geocoding] Error geocoding placeId "${cleanPlaceId}": ${err.message}`);
    }
    return null;
  }
}
