/**
 * Weather Agent
 *
 * Grounds the itinerary in a real Open-Meteo forecast for each resolved
 * destination over the trip's date range. If the trip falls outside the
 * 16-day forecast horizon, the destination is explicitly marked UNAVAILABLE
 * rather than guessing — Gemini must see and preserve that state.
 */

import { getDailyForecast } from "../integrations/weather/weatherApi.js";

export async function execute(context) {
  const resolvedLocations = context?.resolvedLocations || [];
  const { startDate, endDate } = context?.tripRequest || {};

  const weatherForecasts = {};
  let anyUnavailable = false;

  for (const location of resolvedLocations) {
    const forecast = await getDailyForecast({
      latitude: location.coordinates?.lat,
      longitude: location.coordinates?.lng,
      startDate,
      endDate
    });

    weatherForecasts[location.id] = forecast;
    if (!forecast.available) anyUnavailable = true;
  }

  // Weather being unavailable for some/all destinations is an expected,
  // explicit state — never a hard failure of the whole router.
  return {
    success: true,
    data: { weatherForecasts },
    warnings: anyUnavailable
      ? [{ code: "FORECAST_UNAVAILABLE", details: "One or more destinations are outside the 16-day forecast horizon" }]
      : [],
    source: "OPEN_METEO",
    fallbackUsed: false
  };
}

export default { execute };
