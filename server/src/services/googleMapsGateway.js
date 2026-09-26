/**
 * Google Maps Gateway Service
 * 
 * Boundary layer between Roamly domain logic and Google Maps Platform APIs.
 * 
 * Rules:
 * - No React component or API route may invoke Google APIs directly.
 * - All responses are normalized into standard Roamly primitives.
 * - Prevents duplicate Location records for repeated visits (Delhi -> Agra -> Delhi).
 * - Safe in-memory caching to avoid repeated API quota consumption.
 * - Never log secrets or API keys.
 */

import { autocompletePlaces, textSearchPlaces, getPlaceDetails } from "../integrations/google/places.js";
import { geocodeAddress, reverseGeocode, geocodePlaceId } from "../integrations/google/geocoding.js";
import { getCurrentDeviceLocation } from "../integrations/google/geolocation.js";
import { computeRoute } from "../integrations/google/routes.js";

// Dynamically resolve Prisma client across Next.js and standalone Node runtime
let prismaClientInstance = null;
export async function getPrismaClient() {
  if (prismaClientInstance) return prismaClientInstance;
  try {
    const mod = await import("@/lib/prisma").catch(() => null);
    if (mod) {
      prismaClientInstance = mod.default || mod;
      return prismaClientInstance;
    }
  } catch (e) {}
  try {
    const mod = await import("../../../lib/prisma.ts").catch(() => null);
    if (mod) {
      prismaClientInstance = mod.default || mod;
      return prismaClientInstance;
    }
  } catch (e) {}
  return null;
}

// Safe in-memory cache for recent queries to save Google quota & speed up queries
const placeSearchCache = new Map();
const geocodeCache = new Map();
const detailsCache = new Map();
const inMemoryLocations = new Map(); // Resilient fallback store when DB is offline

/**
 * Standard Normalized Location Structure for Roamly
 * 
 * @typedef {Object} RoamlyLocation
 * @property {string} id - Roamly internal Location ID
 * @property {string} name - Human-readable name
 * @property {string} [googlePlaceId] - External Google Place ID
 * @property {{lat: number, lng: number}} coordinates - Geospatial coordinates
 * @property {{formatted: string, city: string, state: string, country: string, postalCode: string}} address - Address details
 * @property {string} [type] - Place type (monument, beach, locality, etc.)
 * @property {boolean} isActive - Active flag
 */

/**
 * Search places by query text using Google Places (New)
 * 
 * @param {string} query
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
export async function searchPlaces(query, options = {}) {
  const clean = String(query || "").trim();
  if (!clean) return [];

  const cacheKey = clean.toLowerCase();
  if (placeSearchCache.has(cacheKey)) {
    return placeSearchCache.get(cacheKey);
  }

  const results = await autocompletePlaces(clean, options);
  placeSearchCache.set(cacheKey, results);

  // Set timeout to evict after 1 hour (3600000 ms)
  setTimeout(() => placeSearchCache.delete(cacheKey), 3600000);

  return results;
}

/**
 * Text-search candidate attractions/places (e.g. "museums in Delhi") using
 * Google Places API (New) Text Search. Distinct from searchPlaces(), which is
 * destination-name autocomplete.
 *
 * @param {string} query
 * @param {Object} [options]
 * @returns {Promise<Array<Object>>}
 */
export async function searchAttractions(query, options = {}) {
  const clean = String(query || "").trim();
  if (!clean) return [];

  const cacheKey = `text:${clean.toLowerCase()}`;
  if (placeSearchCache.has(cacheKey)) {
    return placeSearchCache.get(cacheKey);
  }

  const results = await textSearchPlaces(clean, options);
  placeSearchCache.set(cacheKey, results);
  setTimeout(() => placeSearchCache.delete(cacheKey), 3600000);

  return results;
}

/**
 * Get place details with explicit field masks
 *
 * @param {string} placeId
 * @param {Object} [options]
 * @returns {Promise<Object|null>}
 */
export async function getPlaceDetailsById(placeId, options = {}) {
  const cleanId = String(placeId || "").trim();
  if (!cleanId) return null;

  if (detailsCache.has(cleanId)) {
    return detailsCache.get(cleanId);
  }

  const details = await getPlaceDetails(cleanId, options);
  if (details) {
    detailsCache.set(cleanId, details);
    setTimeout(() => detailsCache.delete(cleanId), 3600000);
  }

  return details;
}

/**
 * Forward Geocoding: address -> normalized coordinates
 * 
 * @param {string} address
 * @returns {Promise<Object|null>}
 */
export async function geocode(address) {
  const clean = String(address || "").trim();
  if (!clean) return null;

  const cacheKey = clean.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const geo = await geocodeAddress(clean);
  if (geo) {
    geocodeCache.set(cacheKey, geo);
    setTimeout(() => geocodeCache.delete(cacheKey), 3600000);
  }

  return geo;
}

/**
 * Reverse Geocoding: (lat, lng) -> normalized address
 * 
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<Object|null>}
 */
export async function reverseGeocodeCoordinates(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lng)) return null;

  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const geo = await reverseGeocode(lat, lng);
  if (geo) {
    geocodeCache.set(cacheKey, geo);
    setTimeout(() => geocodeCache.delete(cacheKey), 3600000);
  }

  return geo;
}

/**
 * Approximate device location via Google Geolocation API
 * 
 * @param {Object} [options]
 * @returns {Promise<{latitude: number, longitude: number, accuracyMeters: number, source: string}>}
 */
export async function getCurrentDeviceNetworkLocation(options = {}) {
  return getCurrentDeviceLocation(options);
}

// Short-lived route cache: identical origin/destination/mode lookups within a
// single itinerary generation happen repeatedly across re-optimization passes.
const routeCache = new Map();
const ROUTE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Compute a route between two canonical Roamly Locations (or raw coordinates)
 * using Google Routes API (v2), with a deterministic Roamly-estimate fallback.
 *
 * Never fabricates a duration/distance as Google-sourced when it isn't.
 *
 * @param {Object} params
 * @param {{lat: number, lng: number}} params.origin
 * @param {{lat: number, lng: number}} params.destination
 * @param {"TRAIN"|"PUBLIC_TRANSIT"|"CAB"|"WALKING"} [params.mode="CAB"]
 * @returns {Promise<Object>}
 */
export async function getRouteBetween({ origin, destination, mode = "CAB" }) {
  if (!origin || !destination) {
    return { available: false, reason: "ROUTE_UNAVAILABLE", detail: "Missing origin/destination" };
  }

  const cacheKey = `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}|${mode}`;
  const cached = routeCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < ROUTE_CACHE_TTL_MS) {
    return cached.result;
  }

  const result = await computeRoute({ origin, destination, mode });
  routeCache.set(cacheKey, { result, cachedAt: Date.now() });
  return result;
}

/**
 * Standardize any location data into Roamly normalized object format
 */
export function formatNormalizedLocation(loc) {
  if (!loc) return null;

  const lat = loc.latitude ?? loc.lat ?? loc.coordinates?.lat ?? 0;
  const lng = loc.longitude ?? loc.lng ?? loc.coordinates?.lng ?? 0;

  return {
    id: loc.id || `loc_${loc.googlePlaceId || loc.google_place_id || loc.name}`,
    name: loc.name || loc.city || "Unknown Location",
    googlePlaceId: loc.googlePlaceId || loc.google_place_id || loc.place_id || null,
    coordinates: {
      lat: Number(lat),
      lng: Number(lng)
    },
    address: {
      formatted: loc.formattedAddress || loc.formatted_address || loc.address?.formatted || "",
      city: loc.city || loc.address?.city || "",
      state: loc.state || loc.address?.state || "",
      country: loc.country || loc.address?.country || "India",
      postalCode: loc.postalCode || loc.postal_code || loc.address?.postalCode || ""
    },
    type: loc.type || "locality",
    isActive: loc.is_active !== undefined ? Boolean(loc.is_active) : (loc.isActive !== undefined ? Boolean(loc.isActive) : true)
  };
}

/**
 * Find or create a canonical Roamly Location
 * 
 * Guarantees:
 * - No duplicate Location records when a place is referenced multiple times.
 * - Prioritizes Google Place ID as external identifier.
 * - Works gracefully with DB or in-memory fallback.
 * 
 * @param {Object} params
 * @param {string} [params.placeId]
 * @param {string} [params.name]
 * @param {number} [params.latitude]
 * @param {number} [params.longitude]
 * @param {string} [params.formattedAddress]
 * @param {string} [params.city]
 * @param {string} [params.state]
 * @param {string} [params.country]
 * @param {string} [params.postalCode]
 * @param {string} [params.type]
 * @returns {Promise<RoamlyLocation>}
 */
export async function findOrCreateLocation(params = {}) {
  let {
    placeId,
    name,
    latitude,
    longitude,
    formattedAddress,
    city,
    state,
    country = "India",
    postalCode,
    type = "locality"
  } = params;

  // 1. If only query or name provided without coordinates, resolve via Geocoding
  if ((!latitude || !longitude) && (placeId || name)) {
    let resolved = null;
    if (placeId) {
      resolved = await geocodePlaceId(placeId);
    }
    if (!resolved && name) {
      resolved = await geocodeAddress(name);
    }

    if (resolved) {
      placeId = placeId || resolved.placeId;
      latitude = latitude || resolved.latitude;
      longitude = longitude || resolved.longitude;
      formattedAddress = formattedAddress || resolved.formattedAddress;
      city = city || resolved.city;
      state = state || resolved.state;
      country = country || resolved.country;
      postalCode = postalCode || resolved.postalCode;
    }
  }

  const cleanName = (name || city || formattedAddress || "Unknown Location").trim();
  const cleanCity = (city || cleanName.split(",")[0] || "Unknown").trim();

  // 2. Try looking up in database first (by google_place_id or name+city)
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      throw new Error("Prisma client unavailable");
    }

    let existing = null;

    if (placeId) {
      existing = await prisma.location.findFirst({
        where: {
          OR: [
            { google_place_id: placeId },
            { place_id: placeId }
          ]
        }
      });
    }

    if (!existing && cleanName) {
      existing = await prisma.location.findFirst({
        where: {
          name: { equals: cleanName, mode: "insensitive" },
          city: { equals: cleanCity, mode: "insensitive" }
        }
      });
    }

    if (existing) {
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Roamly Location] created/found: (reused existing) id=${existing.id}, name="${existing.name}", placeId=${existing.google_place_id || existing.place_id}`);
      }
      return formatNormalizedLocation(existing);
    }

    // Create new location in DB
    const created = await prisma.location.create({
      data: {
        name: cleanName,
        city: cleanCity,
        state: state || null,
        country: country || "India",
        postal_code: postalCode || null,
        google_place_id: placeId || null,
        place_id: placeId || null,
        formatted_address: formattedAddress || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        type: type || "locality",
        is_active: true
      }
    });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Roamly Location] created/found: (new DB entry) id=${created.id}, name="${created.name}", placeId=${created.google_place_id || created.place_id}`);
    }
    return formatNormalizedLocation(created);
  } catch (dbErr) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Roamly Location] DB storage offline or error: ${dbErr.message}. Storing in memory cache.`);
    }

    // 3. Fallback: In-memory store (prevents duplicates during offline demo)
    const memKey = placeId || `${cleanName.toLowerCase()}_${cleanCity.toLowerCase()}`;
    if (inMemoryLocations.has(memKey)) {
      const existingMem = inMemoryLocations.get(memKey);
      if (process.env.NODE_ENV !== "production") {
        console.log(`[Roamly Location] created/found: (in-memory cached) id=${existingMem.id}, name="${existingMem.name}"`);
      }
      return existingMem;
    }

    const mockId = `loc_${inMemoryLocations.size + 1}_${Date.now()}`;
    const newLoc = formatNormalizedLocation({
      id: mockId,
      name: cleanName,
      googlePlaceId: placeId,
      latitude: latitude || 20.5937,
      longitude: longitude || 78.9629,
      formattedAddress: formattedAddress || cleanName,
      city: cleanCity,
      state: state || "",
      country: country || "India",
      postalCode: postalCode || "",
      type: type || "locality",
      isActive: true
    });

    inMemoryLocations.set(memKey, newLoc);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Roamly Location] created/found: (new in-memory) id=${newLoc.id}, name="${newLoc.name}"`);
    }
    return newLoc;
  }
}

/**
 * Get internal Location record by ID
 * 
 * @param {string} id
 * @returns {Promise<RoamlyLocation|null>}
 */
export async function getLocationById(id) {
  const cleanId = String(id || "").trim();
  if (!cleanId) return null;

  try {
    const prisma = await getPrismaClient();
    if (prisma) {
      const loc = await prisma.location.findUnique({
        where: { id: cleanId }
      });
      if (loc) return formatNormalizedLocation(loc);
    }
  } catch (e) {
    // If DB offline, search in-memory
    for (const memLoc of inMemoryLocations.values()) {
      if (memLoc.id === cleanId) return memLoc;
    }
  }

  for (const memLoc of inMemoryLocations.values()) {
    if (memLoc.id === cleanId) return memLoc;
  }

  return null;
}

/**
 * Record a Trip Stop referencing an existing canonical Location
 * (Ensures multi-city trips like Delhi -> Agra -> Delhi reuse the same Location record)
 * 
 * @param {Object} params
 * @param {number} params.tripId
 * @param {string} params.locationId
 * @param {number} params.sequence
 * @param {Date|string} [params.arrivalDate]
 * @param {Date|string} [params.departureDate]
 * @returns {Promise<Object>}
 */
export async function recordTripStop({ tripId, locationId, sequence, arrivalDate, departureDate }) {
  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      throw new Error("Prisma client unavailable");
    }
    const stop = await prisma.stop.create({
      data: {
        trip_id: tripId,
        location_id: locationId,
        sequence: sequence,
        arrival_date: arrivalDate ? new Date(arrivalDate) : null,
        departure_date: departureDate ? new Date(departureDate) : null
      }
    });
    return stop;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Roamly Location] Unable to record stop in DB: ${err.message}`);
    }
    return {
      id: Math.floor(Math.random() * 100000),
      tripId,
      locationId,
      sequence,
      arrivalDate,
      departureDate
    };
  }
}
