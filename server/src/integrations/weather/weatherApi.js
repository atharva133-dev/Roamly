/**
 * Open-Meteo Weather Adapter
 *
 * Boundary layer for hyper-local weather forecasts.
 *
 * Rules:
 * - No API key required (Open-Meteo is free/open for non-commercial use).
 * - Forecasts are only available up to a 16-day horizon from "today". Dates
 *   outside that horizon MUST return { available: false, reason: "FORECAST_UNAVAILABLE" }.
 * - Never fabricate or interpolate a forecast for a date the API did not return.
 * - Never log API keys (there are none here, but keep the pattern consistent
 *   with the other integrations in server/src/integrations/).
 */

const OPEN_METEO_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const MAX_FORECAST_HORIZON_DAYS = 16;

/**
 * WMO Weather interpretation codes (subset used for traveler-facing descriptions).
 * https://open-meteo.com/en/docs
 */
const WMO_CODE_DESCRIPTIONS = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail"
};

function describeWeatherCode(code) {
  if (code === undefined || code === null) return "Unknown";
  return WMO_CODE_DESCRIPTIONS[code] || `Unknown (WMO code ${code})`;
}

function toDateOnly(d) {
  const date = d instanceof Date ? d : new Date(d);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function daysBetween(a, b) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((toDateOnly(b).getTime() - toDateOnly(a).getTime()) / MS_PER_DAY);
}

/**
 * Check whether [startDate, endDate] falls entirely within the supported
 * Open-Meteo forecast horizon (today .. today + MAX_FORECAST_HORIZON_DAYS).
 *
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {{ withinHorizon: boolean, daysFromToday: number }}
 */
export function checkForecastHorizon(startDate, endDate) {
  const today = toDateOnly(new Date());
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);

  const startOffset = daysBetween(today, start);
  const endOffset = daysBetween(today, end);

  const withinHorizon =
    startOffset >= 0 &&
    endOffset >= startOffset &&
    endOffset <= MAX_FORECAST_HORIZON_DAYS;

  return { withinHorizon, daysFromToday: startOffset };
}

/**
 * Fetch a daily forecast for a coordinate over a date range.
 *
 * @param {Object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {string} params.startDate - "YYYY-MM-DD"
 * @param {string} params.endDate - "YYYY-MM-DD"
 * @returns {Promise<{available: boolean, reason?: string, days?: Array<Object>}>}
 */
export async function getDailyForecast({ latitude, longitude, startDate, endDate }) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { available: false, reason: "FORECAST_UNAVAILABLE", detail: "Invalid coordinates" };
  }
  if (!startDate || !endDate) {
    return { available: false, reason: "FORECAST_UNAVAILABLE", detail: "Missing date range" };
  }

  const { withinHorizon } = checkForecastHorizon(startDate, endDate);
  if (!withinHorizon) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[Open-Meteo] Requested range ${startDate}..${endDate} is outside the ${MAX_FORECAST_HORIZON_DAYS}-day forecast horizon.`
      );
    }
    return { available: false, reason: "FORECAST_UNAVAILABLE", detail: "Outside 16-day forecast horizon" };
  }

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_probability_max",
      "weathercode"
    ].join(","),
    timezone: "auto",
    start_date: startDate,
    end_date: endDate
  });

  const endpoint = `${OPEN_METEO_ENDPOINT}?${params.toString()}`;

  try {
    const res = await fetch(endpoint, { method: "GET" });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Open-Meteo] API error: HTTP ${res.status} ${errBody?.reason || res.statusText}`);
      }
      return { available: false, reason: "FORECAST_UNAVAILABLE", detail: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const daily = data?.daily;
    if (!daily || !Array.isArray(daily.time)) {
      return { available: false, reason: "FORECAST_UNAVAILABLE", detail: "Malformed Open-Meteo response" };
    }

    const days = daily.time.map((date, i) => ({
      date,
      temperatureMaxC: daily.temperature_2m_max?.[i] ?? null,
      temperatureMinC: daily.temperature_2m_min?.[i] ?? null,
      precipitationProbabilityMax: daily.precipitation_probability_max?.[i] ?? null,
      weatherCode: daily.weathercode?.[i] ?? null,
      description: describeWeatherCode(daily.weathercode?.[i])
    }));

    return { available: true, days, source: "OPEN_METEO" };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Open-Meteo] Network error: ${err.message}`);
    }
    return { available: false, reason: "FORECAST_UNAVAILABLE", detail: err.message };
  }
}
