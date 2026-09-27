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

const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash",
  "gemini-3.8-flash"
];

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
        description: `Explore the sights, architecture, and historic atmosphere of ${pick.name}.`,
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
      theme: `${location.name} Cultural Highlights & Exploration`,
      description: `Discover premier landmarks, vibrant local markets, and cultural heritage across ${location.name}.`,
      activities,
      transit,
      guide,
      weather,
      meals: `Sample authentic regional culinary delights and traditional street specialties in ${location.name}.`,
      accommodation: `${tripRequest.accommodationPreference || "Hotel"} stay conveniently situated near central ${location.name}.`,
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
    summary: `Curated ${durationDays}-day journey across ${resolvedLocations.map((l) => l.name).join(", ")} featuring top cultural attractions, comfortable accommodations, and authentic local experiences.`,
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

  return `You are a premier travel itinerary synthesis engine for Roamly.

Create a vivid, well-structured, and engaging itinerary narrative while strictly adhering to the grounded facts provided below.

GROUNDING RULES (STRICT):
1. Only select attractions from candidatePlaces (by their exact placeId and name). Never invent places, place IDs, or coordinates.
2. Only use route information from transitRoutes. Never invent travel durations or distances.
3. Only use guides from matchedGuides (by their exact guide id).
4. Strictly respect the budget allocations and numbers from budgetAllocations. The sum of (accommodationCost + foodCost + transportCost + activitiesCost + guideCost) MUST equal dayEstimatedCost. The sum of all dayEstimatedCost MUST equal totalEstimatedCost.
5. Do not alter the user's totalBudget. If required information is missing, represent it as UNAVAILABLE.

NARRATIVE & DESCRIPTIONS (REQUIRED):
1. "summary": Provide a captivating, personalized 1-2 sentence overview of the entire journey.
2. For each day, provide:
   - "theme": An evocative title/theme for the day (e.g. "Mughal Grandeur & Old Bazaars", "Spiritual Sanctuaries & Sunset Views").
   - "description": A rich, brief 1-2 sentence overview of what the traveler experiences and feels on this day.
   - For every activity in "activities": an engaging "description" (1-2 sentences highlighting key sights within the attraction, historical/architectural context, and tips on what not to miss).
   - "meals": Rich regional dining suggestions for the day (e.g. famous breakfast spots, signature regional dishes to try for lunch, and dinner recommendations).
   - "accommodation": Recommended area or style of stay suited to the traveler's preference and budget (e.g. "Heritage boutique stay near Connaught Place / South Delhi with easy transit access").

Respond with ONLY valid JSON matching exactly this shape, no markdown, no backticks:
{
  "summary": "...",
  "destinations": [{ "locationId": "...", "name": "...", "city": "..." }],
  "days": [
    {
      "day": "Day 1",
      "date": "YYYY-MM-DD",
      "locationId": "...",
      "city": "...",
      "theme": "...",
      "description": "...",
      "activities": [
        {
          "slot": "morning|afternoon|evening",
          "placeId": "...",
          "name": "...",
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "description": "...",
          "estimatedCost": 0
        }
      ],
      "transit": { "fromLocationId": "...", "toLocationId": "...", "distanceMeters": 0, "durationSeconds": 0, "requestedMode": "...", "actualModes": [], "preferenceSatisfied": true } or null,
      "guide": { "guideId": "...", "name": "...", "isDemo": false, "isBookable": true, "hourlyRate": 0, "cost": 0 } or null,
      "weather": { "available": true, "description": "...", "temperatureMaxC": 0, "temperatureMinC": 0, "precipitationProbabilityMax": 0 } or { "available": false, "reason": "FORECAST_UNAVAILABLE" },
      "meals": "...",
      "accommodation": "...",
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

function hydrateActivityCoordinates(plan, candidatePlaces) {
  if (!plan || !Array.isArray(plan.days)) return plan;
  for (const day of plan.days) {
    const candidates = candidatePlaces?.[day.locationId] || [];
    for (const act of day.activities || []) {
      const match = candidates.find((c) => c.placeId === act.placeId);
      if (match) {
        if (act.latitude === undefined && match.latitude != null) act.latitude = match.latitude;
        if (act.longitude === undefined && match.longitude != null) act.longitude = match.longitude;
        if (!act.address && match.formattedAddress) act.address = match.formattedAddress;
        if (act.rating === undefined && match.rating != null) act.rating = match.rating;
        if (act.userRatingCount === undefined && match.userRatingCount != null) act.userRatingCount = match.userRatingCount;
        if (!act.primaryType && match.primaryType) act.primaryType = match.primaryType;
      }
    }
  }
  return plan;
}

export async function execute(context, options = {}) {
  const geminiResult = options.forceDeterministic
    ? null
    : await attemptGeminiSynthesis(context).catch(() => null);

  if (geminiResult) {
    const hydrated = hydrateActivityCoordinates(geminiResult.plan, context.candidatePlaces);
    return {
      success: true,
      data: { generatedPlan: hydrated },
      source: "GEMINI_SYNTHESIS",
      fallbackUsed: false,
      meta: { modelUsed: geminiResult.modelUsed }
    };
  }

  const deterministicPlan = buildDeterministicPlan(context);
  const hydrated = hydrateActivityCoordinates(deterministicPlan, context.candidatePlaces);
  return {
    success: true,
    data: { generatedPlan: hydrated },
    source: "ROAMLY_DETERMINISTIC_SCHEDULER",
    fallbackUsed: true
  };
}

export default { execute };
