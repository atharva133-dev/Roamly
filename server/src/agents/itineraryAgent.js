/**
 * Itinerary Agent
 *
 * Gemini is the reasoning/synthesis engine ONLY. It receives exclusively
 * pre-verified data (resolvedLocations, candidatePlaces, weatherForecasts,
 * transitRoutes, matchedGuides, budgetAllocations) and must select activities
 * only from candidatePlaces, guides only from matchedGuides, and must never
 * invent a place, price, opening hour, guide, weather value, or route
 * duration. If Gemini is unavailable, rate-limited, or returns output that
 * doesn't parse, a deterministic rule-based scheduler produces a plan from
 * the exact same grounded data — it never invents data either.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const MODEL_FALLBACK_CHAIN = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-2.5-pro"];

function resolveModelChain() {
  const override = process.env.GEMINI_MODEL;
  if (!override) return MODEL_FALLBACK_CHAIN;
  // Configured override goes first; the standard chain remains as fallback.
  return [override, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== override)];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Distribute resolvedLocations across durationDays as evenly as possible,
 * preserving destination order (Delhi -> Agra -> Delhi stays in that order).
 */
function assignLocationsToDays(resolvedLocations, durationDays) {
  if (resolvedLocations.length === 0) return [];
  const perLocation = Math.max(1, Math.floor(durationDays / resolvedLocations.length));
  const assignment = [];

  for (let i = 0; i < resolvedLocations.length; i++) {
    const count = i === resolvedLocations.length - 1 ? durationDays - assignment.length : perLocation;
    for (let j = 0; j < count; j++) assignment.push(resolvedLocations[i]);
  }
  // In case of rounding leftovers, pad with the last location.
  while (assignment.length < durationDays) assignment.push(resolvedLocations[resolvedLocations.length - 1]);
  return assignment.slice(0, durationDays);
}

function findWeatherForDate(weatherForecasts, locationId, dateStr) {
  const forecast = weatherForecasts?.[locationId];
  if (!forecast?.available) {
    return { available: false, reason: forecast?.reason || "FORECAST_UNAVAILABLE" };
  }
  const day = forecast.days.find((d) => d.date === dateStr);
  if (!day) return { available: false, reason: "FORECAST_UNAVAILABLE" };
  return {
    available: true,
    description: day.description,
    temperatureMaxC: day.temperatureMaxC,
    temperatureMinC: day.temperatureMinC,
    precipitationProbabilityMax: day.precipitationProbabilityMax
  };
}

function findTransitLeg(transitRoutes, fromLocationId, toLocationId) {
  return (
    transitRoutes.find((r) => r.fromLocationId === fromLocationId && r.toLocationId === toLocationId) || null
  );
}

const TIME_SLOTS = [
  { slot: "morning", startTime: "09:00", endTime: "11:30" },
  { slot: "afternoon", startTime: "13:00", endTime: "16:00" },
  { slot: "evening", startTime: "17:00", endTime: "19:30" }
];

/**
 * Deterministic rule-based scheduler. Guaranteed to only reference
 * candidatePlaces/matchedGuides/transitRoutes/weatherForecasts that were
 * actually grounded upstream — never invents data.
 */
function buildDeterministicPlan(context) {
  const { resolvedLocations, candidatePlaces, weatherForecasts, transitRoutes, matchedGuides, budgetAllocations, tripRequest } =
    context;

  const durationDays = budgetAllocations.durationDays;
  const dayLocations = assignLocationsToDays(resolvedLocations, durationDays);
  const perDayCategoryBudget = {};
  for (const [cat, amount] of Object.entries(budgetAllocations.categories)) {
    perDayCategoryBudget[cat] = Math.round((amount / durationDays) * 100) / 100;
  }

  const usedPlaceIdsToday = new Set();
  const days = [];
  let previousLocation = null;

  for (let d = 0; d < durationDays; d++) {
    usedPlaceIdsToday.clear();
    const location = dayLocations[d];
    const dateStr = addDays(tripRequest.startDate, d);
    const candidates = (candidatePlaces[location.id] || []).filter((c) => !usedPlaceIdsToday.has(c.placeId));

    const activities = [];
    for (const slot of TIME_SLOTS) {
      const pick = candidates.find((c) => !usedPlaceIdsToday.has(c.placeId));
      if (!pick) break;
      usedPlaceIdsToday.add(pick.placeId);
      activities.push({
        slot: slot.slot,
        placeId: pick.placeId,
        name: pick.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        estimatedCost:
          activities.length + 1 <= 3
            ? Math.round((perDayCategoryBudget.ACTIVITIES || 0) / 3)
            : 0
      });
    }

    const isTravelDay = previousLocation && previousLocation.id !== location.id;
    const transit = isTravelDay ? findTransitLeg(transitRoutes, previousLocation.id, location.id) : null;

    const guidesForLocation = matchedGuides?.[location.id] || [];
    const guide =
      tripRequest.guidePreference !== "NO_GUIDE" && guidesForLocation.length > 0
        ? {
            guideId: guidesForLocation[0].id,
            name: guidesForLocation[0].name,
            isDemo: !!guidesForLocation[0].isDemo,
            isBookable: guidesForLocation[0].isBookable !== false,
            guideSource: guidesForLocation[0].guideSource || "ROAMLY_DATABASE",
            hourlyRate: guidesForLocation[0].hourlyRate || 0,
            cost: Math.round((guidesForLocation[0].hourlyRate || 0) * 3) // ~3hr engagement
          }
        : null;

    const weather = findWeatherForDate(weatherForecasts, location.id, dateStr);

    const accommodationCost = perDayCategoryBudget.HOTEL || 0;
    const foodCost = perDayCategoryBudget.FOOD || 0;
    const transportCost = isTravelDay ? perDayCategoryBudget.TRANSPORT || 0 : 0;
    const activitiesCost = activities.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
    const guideCost = guide?.cost || 0;

    const dayEstimatedCost = accommodationCost + foodCost + transportCost + activitiesCost + guideCost;

    days.push({
      day: `Day ${d + 1}`,
      date: dateStr,
      locationId: location.id,
      city: location.address?.city || location.name,
      activities,
      transit,
      guide,
      weather,
      accommodationCost,
      foodCost,
      transportCost,
      activitiesCost,
      guideCost,
      dayEstimatedCost: Math.round(dayEstimatedCost * 100) / 100
    });

    previousLocation = location;
  }

  const totalEstimatedCost = Math.round(days.reduce((sum, d) => sum + d.dayEstimatedCost, 0) * 100) / 100;

  return {
    destinations: resolvedLocations.map((l) => ({ locationId: l.id, name: l.name, city: l.address?.city || l.name })),
    days,
    totalEstimatedCost
  };
}

function buildGeminiPrompt(context) {
  const { tripRequest, resolvedLocations, candidatePlaces, weatherForecasts, transitRoutes, matchedGuides, budgetAllocations } =
    context;

  const groundedData = {
    tripRequest,
    resolvedLocations: resolvedLocations.map((l) => ({ id: l.id, name: l.name, city: l.address?.city })),
    candidatePlaces,
    weatherForecasts,
    transitRoutes,
    matchedGuides,
    budgetAllocations
  };

  return `You are a travel itinerary synthesis engine for Roamly.

You may only use facts contained in the supplied grounded data below. Never invent places, place IDs, coordinates, prices, opening hours, guide details, route durations, weather, or availability. Do not alter the user's totalBudget. If required information is missing, represent it as UNAVAILABLE. Only select attractions from candidatePlaces (by their exact placeId). Only use route information from transitRoutes. Only use guides from matchedGuides (by their exact guide id). Only use budget values from budgetAllocations.

Respond with ONLY valid JSON matching exactly this shape, no markdown, no backticks:
{
  "destinations": [{ "locationId": "...", "name": "...", "city": "..." }],
  "days": [
    {
      "day": "Day 1",
      "date": "YYYY-MM-DD",
      "locationId": "...",
      "city": "...",
      "activities": [{ "slot": "morning|afternoon|evening", "placeId": "...", "name": "...", "startTime": "HH:MM", "endTime": "HH:MM", "estimatedCost": 0 }],
      "transit": { "fromLocationId": "...", "toLocationId": "...", "distanceMeters": 0, "durationSeconds": 0, "requestedMode": "...", "actualModes": [], "preferenceSatisfied": true } or null,
      "guide": { "guideId": "...", "name": "...", "isDemo": false, "isBookable": true, "hourlyRate": 0, "cost": 0 } or null,
      "weather": { "available": true, "description": "...", "temperatureMaxC": 0, "temperatureMinC": 0, "precipitationProbabilityMax": 0 } or { "available": false, "reason": "FORECAST_UNAVAILABLE" },
      "accommodationCost": 0,
      "foodCost": 0,
      "transportCost": 0,
      "activitiesCost": 0,
      "guideCost": 0,
      "dayEstimatedCost": 0
    }
  ],
  "totalEstimatedCost": 0
}

GROUNDED DATA:
${JSON.stringify(groundedData)}`;
}

function extractJson(text) {
  let cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) return null;
    const slice = cleaned.substring(first, last + 1);
    try {
      return JSON.parse(slice);
    } catch (e2) {
      try {
        return JSON.parse(slice.replace(/,\s*([\]}])/g, "$1"));
      } catch (e3) {
        return null;
      }
    }
  }
}

function isPlausiblePlanShape(plan) {
  return !!(plan && Array.isArray(plan.days) && plan.days.length > 0 && Array.isArray(plan.destinations));
}

async function attemptGeminiSynthesis(context) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const prompt = buildGeminiPrompt(context);
  const models = resolveModelChain();

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json" }
      });
      const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
      const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      if (!text) continue;

      const plan = extractJson(text);
      if (isPlausiblePlanShape(plan)) {
        return { plan, modelUsed: modelName };
      }
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Itinerary Agent] Gemini model ${modelName} failed (${err.message}). Trying next...`);
      }
    }
  }

  return null;
}

export async function execute(context, options = {}) {
  const geminiResult = options.forceDeterministic
    ? null
    : await attemptGeminiSynthesis(context).catch(() => null);

  if (geminiResult) {
    return {
      success: true,
      data: { generatedPlan: geminiResult.plan },
      source: "GEMINI_SYNTHESIS",
      fallbackUsed: false,
      meta: { modelUsed: geminiResult.modelUsed }
    };
  }

  const deterministicPlan = buildDeterministicPlan(context);
  return {
    success: true,
    data: { generatedPlan: deterministicPlan },
    source: "ROAMLY_DETERMINISTIC_SCHEDULER",
    fallbackUsed: true
  };
}

export default { execute };
