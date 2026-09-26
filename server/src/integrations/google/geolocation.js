/**
 * Google Geolocation API Adapter
 * 
 * IMPORTANT:
 * - Uses Google Geolocation API ONLY for determining approximate device location from network/cell/Wi-Fi info.
 * - Does NOT perform destination searches (Places API is used for destination search).
 * - Never log API keys.
 */

function getApiKey() {
  return process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
}

/**
 * Determine approximate device location via Google Geolocation API.
 * 
 * @param {Object} [options]
 * @param {boolean} [options.considerIp=true] - Whether to use the client IP address as fallback
 * @param {Array} [options.wifiAccessPoints] - Array of Wi-Fi access point objects
 * @param {Array} [options.cellTowers] - Array of cell tower objects
 * @returns {Promise<{latitude: number, longitude: number, accuracyMeters: number, source: string}>}
 */
export async function getCurrentDeviceLocation(options = {}) {
  const apiKey = getApiKey();

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Google Geolocation] No GOOGLE_MAPS_SERVER_API_KEY set; using fallback network location");
      console.log("[Roamly Location] fallback used: default network approximation (Mumbai)");
    }
    // Safe default approximate location for development/offline
    return {
      latitude: 19.0760,
      longitude: 72.8777,
      accuracyMeters: 25000,
      source: "APPROXIMATE_FALLBACK"
    };
  }

  const endpoint = `https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`;
  const payload = {
    considerIp: options.considerIp !== undefined ? options.considerIp : true,
  };

  if (Array.isArray(options.wifiAccessPoints) && options.wifiAccessPoints.length > 0) {
    payload.wifiAccessPoints = options.wifiAccessPoints;
  }
  if (Array.isArray(options.cellTowers) && options.cellTowers.length > 0) {
    payload.cellTowers = options.cellTowers;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || `HTTP ${res.status} ${res.statusText}`;
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Google Geolocation] API error (${errorMsg}); falling back`);
        console.log("[Roamly Location] fallback used: network location fallback");
      }
      return {
        latitude: 19.0760,
        longitude: 72.8777,
        accuracyMeters: 25000,
        source: "APPROXIMATE_FALLBACK"
      };
    }

    const data = await res.json();
    const result = {
      latitude: data.location?.lat,
      longitude: data.location?.lng,
      accuracyMeters: Math.round(data.accuracy || 1000),
      source: "GOOGLE_GEOLOCATION"
    };

    if (process.env.NODE_ENV !== "production") {
      console.log(`[Google Geolocation] coordinates: lat=${result.latitude}, lng=${result.longitude}`);
      console.log(`[Google Geolocation] accuracy: ${result.accuracyMeters}m`);
    }

    return result;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Google Geolocation] Network request failed: ${err.message}`);
      console.log("[Roamly Location] fallback used: network location fallback");
    }
    return {
      latitude: 19.0760,
      longitude: 72.8777,
      accuracyMeters: 25000,
      source: "APPROXIMATE_FALLBACK"
    };
  }
}
