/**
 * Google Routes API Adapter
 *
 * Functions:
 * - computeRoute({ origin, destination, mode }) -> Routes API (v2) computeRoutes
 *
 * Rules:
 * - Never fabricate a route duration/distance as if it came from Google when it did not.
 * - If no API key is configured or the request fails, fall back to a deterministic
 *   haversine-distance estimate, explicitly labeled fareSource/durationSource = "ROAMLY_ESTIMATE".
 * - Never log API keys.
 */

function getApiKey() {
  return process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
}

/**
 * Roamly transportation preference -> Google Routes API travelMode
 * https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes#travelmode
 */
const TRAVEL_MODE_MAP = {
  TRAIN: "TRANSIT",
  PUBLIC_TRANSIT: "TRANSIT",
  CAB: "DRIVE",
  WALKING: "WALK"
};

/**
 * For TRANSIT mode, restrict Google's transit preferences to match the user's
 * requested mode where Google supports that granularity. PUBLIC_TRANSIT leaves
 * all transit sub-modes allowed.
 */
const TRANSIT_ALLOWED_MODES = {
  TRAIN: ["TRAIN", "RAIL"],
  PUBLIC_TRANSIT: undefined // no restriction
};

const EARTH_RADIUS_KM = 6371;

function haversineDistanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/**
 * Deterministic fallback estimate. NEVER presented as a Google-sourced value.
 * Typical average speeds are used only to produce a plausible planning estimate.
 */
function estimateRouteDeterministically(origin, destination, requestedMode) {
  const distanceKm = haversineDistanceKm(origin, destination);

  const AVG_SPEED_KMH = {
    TRAIN: 55,
    PUBLIC_TRANSIT: 30,
    CAB: 40,
    WALKING: 4.5
  };

  const speed = AVG_SPEED_KMH[requestedMode] || 40;
  const durationHours = distanceKm / speed;

  // Very rough INR/km estimate, only used when Google fare data is unavailable.
  const FARE_PER_KM_INR = {
    TRAIN: 2,
    PUBLIC_TRANSIT: 3,
    CAB: 15,
    WALKING: 0
  };
  const fareEstimate = Math.round(distanceKm * (FARE_PER_KM_INR[requestedMode] ?? 10));

  return {
    available: true,
    distanceMeters: Math.round(distanceKm * 1000),
    durationSeconds: Math.round(durationHours * 3600),
    requestedMode,
    actualModes: [requestedMode],
    preferenceSatisfied: true,
    routeSource: "ROAMLY_ESTIMATE",
    fareSource: "ROAMLY_ESTIMATE",
    fare: fareEstimate,
    currency: "INR"
  };
}

/**
 * Compute a route between two coordinates using Google Routes API (v2).
 *
 * @param {Object} params
 * @param {{lat: number, lng: number}} params.origin
 * @param {{lat: number, lng: number}} params.destination
 * @param {"TRAIN"|"PUBLIC_TRANSIT"|"CAB"|"WALKING"} params.mode
 * @returns {Promise<Object>} normalized route result, or { available: false, reason }
 */
export async function computeRoute({ origin, destination, mode = "CAB" }) {
  if (
    !origin || !destination ||
    !Number.isFinite(origin.lat) || !Number.isFinite(origin.lng) ||
    !Number.isFinite(destination.lat) || !Number.isFinite(destination.lng)
  ) {
    return { available: false, reason: "ROUTE_UNAVAILABLE", detail: "Invalid origin/destination coordinates" };
  }

  const requestedMode = TRAVEL_MODE_MAP[mode] ? mode : "CAB";
  const travelMode = TRAVEL_MODE_MAP[requestedMode] || "DRIVE";
  const apiKey = getApiKey();

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Google Routes] No GOOGLE_MAPS_SERVER_API_KEY set; using deterministic Roamly estimate");
    }
    return estimateRouteDeterministically(origin, destination, requestedMode);
  }

  const endpoint = "https://routes.googleapis.com/directions/v2:computeRoutes";
  const fieldMask = [
    "routes.duration",
    "routes.distanceMeters",
    "routes.travelAdvisory.transitFare",
    "routes.legs.steps.travelMode",
    "routes.legs.steps.transitDetails.transitLine.vehicle.type"
  ].join(",");

  const body = {
    origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
    destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
    travelMode
  };

  if (travelMode === "TRANSIT") {
    const allowedTravelModes = TRANSIT_ALLOWED_MODES[requestedMode];
    body.transitPreferences = allowedTravelModes ? { allowedTravelModes } : {};
  } else if (travelMode === "DRIVE") {
    body.routingPreference = "TRAFFIC_AWARE";
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
      const msg = errData?.error?.message || `HTTP ${res.status} ${res.statusText}`;
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Google Routes] computeRoutes error: ${msg}. Falling back to deterministic estimate.`);
      }
      return estimateRouteDeterministically(origin, destination, requestedMode);
    }

    const data = await res.json();
    const route = data?.routes?.[0];

    if (!route) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Google Routes] No route returned for mode ${travelMode}; marking unavailable.`);
      }
      return { available: false, reason: "PREFERRED_TRANSIT_UNAVAILABLE", detail: "Google returned no route for requested mode" };
    }

    // Inspect the actual leg/step travel modes so we never blindly claim the
    // user's preferred mode was honored end-to-end (per the "critical transit rule").
    const stepModes = new Set();
    for (const leg of route.legs || []) {
      for (const step of leg.steps || []) {
        if (step.travelMode) stepModes.add(step.travelMode);
      }
    }
    const actualModes = stepModes.size > 0 ? Array.from(stepModes) : [travelMode];
    const preferenceSatisfied =
      travelMode !== "TRANSIT" || actualModes.every((m) => m === "TRANSIT" || m === "WALK");

    const durationSeconds = route.duration ? parseInt(String(route.duration).replace("s", ""), 10) : null;
    const transitFare = route.travelAdvisory?.transitFare;

    return {
      available: true,
      distanceMeters: route.distanceMeters ?? null,
      durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
      requestedMode,
      actualModes,
      preferenceSatisfied,
      routeSource: "GOOGLE_ROUTES",
      fareSource: transitFare ? "GOOGLE" : "UNAVAILABLE",
      fare: transitFare ? Number(transitFare.units || 0) + Number(transitFare.nanos || 0) / 1e9 : null,
      currency: transitFare?.currencyCode || null
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Routes] Network error: ${err.message}. Falling back to deterministic estimate.`);
    }
    return estimateRouteDeterministically(origin, destination, requestedMode);
  }
}
