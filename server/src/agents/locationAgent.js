/**
 * Location Agent
 *
 * Resolves each user-supplied destination string into a canonical Roamly
 * `Location` record (Google Place ID + verified coordinates), reusing the
 * existing googleMapsGateway.js deduplication logic so repeated stops
 * (Delhi -> Agra -> Delhi) reuse the exact same Location row.
 *
 * Rules:
 * - Never fabricates coordinates or formatted addresses.
 * - A destination that cannot be matched to a real Google place is rejected
 *   with LOCATION_UNRESOLVED rather than silently guessing.
 */

import {
  searchPlaces,
  getPlaceDetailsById,
  findOrCreateLocation
} from "../services/googleMapsGateway.js";

/**
 * @param {string} destination Raw user-entered destination text
 * @returns {Promise<{success: boolean, location?: Object, reason?: string, detail?: string}>}
 */
async function resolveDestination(destination) {
  const clean = String(destination || "").trim();
  if (!clean) {
    return { success: false, reason: "LOCATION_UNRESOLVED", detail: "Empty destination" };
  }

  const suggestions = await searchPlaces(clean);
  const top = suggestions?.[0];

  if (!top || !top.placeId || String(top.placeId).startsWith("custom_")) {
    // No real Google match — refuse to fabricate a location.
    return { success: false, reason: "LOCATION_UNRESOLVED", detail: `No verified place found for "${clean}"` };
  }

  // Autocomplete results normally lack coordinates; the local demo catalog
  // fallback happens to include them. Fetch place details when missing.
  let latitude = top.latitude;
  let longitude = top.longitude;
  let formattedAddress = top.address || top.formattedAddress || null;
  let primaryType = top.primaryType || top.types?.[0] || "locality";

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    const details = await getPlaceDetailsById(top.placeId);
    if (!details || !Number.isFinite(details.latitude) || !Number.isFinite(details.longitude)) {
      return { success: false, reason: "LOCATION_UNRESOLVED", detail: `Could not verify coordinates for "${clean}"` };
    }
    latitude = details.latitude;
    longitude = details.longitude;
    formattedAddress = details.address || formattedAddress;
    primaryType = details.primaryType || primaryType;
  }

  const location = await findOrCreateLocation({
    placeId: top.placeId,
    name: top.mainText || top.name || clean,
    latitude,
    longitude,
    formattedAddress,
    type: primaryType
  });

  return { success: true, location };
}

export async function execute(context) {
  const destinations = context?.tripRequest?.destinations || [];

  if (!Array.isArray(destinations) || destinations.length === 0) {
    return {
      success: false,
      data: {},
      errors: [{ code: "LOCATION_UNRESOLVED", details: "No destinations provided" }],
      source: "GOOGLE_PLACES",
      fallbackUsed: false
    };
  }

  const seen = new Map(); // dedupe by resolved Location id (Delhi -> Agra -> Delhi)
  const resolvedLocations = [];
  const unresolved = [];

  for (const destination of destinations) {
    const key = String(destination || "").trim().toLowerCase();
    if (seen.has(key)) {
      resolvedLocations.push(seen.get(key));
      continue;
    }

    const result = await resolveDestination(destination);
    if (!result.success) {
      unresolved.push({ destination, reason: result.reason, detail: result.detail });
      continue;
    }

    resolvedLocations.push(result.location);
    seen.set(key, result.location);
  }

  if (unresolved.length > 0) {
    return {
      success: false,
      data: { resolvedLocations },
      errors: unresolved.map((u) => ({
        code: "LOCATION_UNRESOLVED",
        details: `"${u.destination}": ${u.detail}`
      })),
      source: "GOOGLE_PLACES",
      fallbackUsed: false
    };
  }

  return {
    success: true,
    data: { resolvedLocations },
    source: "GOOGLE_PLACES",
    fallbackUsed: false
  };
}

export default { execute };
