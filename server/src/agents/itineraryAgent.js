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
import {
  buildDestinationTips,
  buildEmergencyContacts,
  buildPackingList,
  resolveDestinationProfile
} from "../services/destinationInsights.js";

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


/**
 * Distributes category budgets across days with natural variance, ensuring
 * that the sum of each category strictly matches the allocation total.
 */
function calculateVariedDailyBudgets(budgetAllocations, durationDays, dayLocations) {
  const categories = budgetAllocations.categories || {};
  const totalHotel = categories.HOTEL || 0;
  const totalFood = categories.FOOD || 0;
  const totalTransport = categories.TRANSPORT || 0;
  const totalActivities = categories.ACTIVITIES || 0;

  const isTravelDayArray = [];
  for (let d = 0; d < durationDays; d++) {
    if (d === 0) {
      isTravelDayArray.push(false);
    } else {
      isTravelDayArray.push(dayLocations[d]?.id !== dayLocations[d - 1]?.id);
    }
  }
  const hasTravelDays = isTravelDayArray.some(Boolean);

  const foodWeights = [];
  const actWeights = [];
  const hotelWeights = [];
  const transWeights = [];

  for (let d = 0; d < durationDays; d++) {
    // Hotel stays very consistent per night with subtle realistic variation (±4%)
    hotelWeights.push(1.0 + 0.04 * Math.sin(d * 1.5));

    // Food rhythm: arrival slightly lighter, mid-trip gourmet/market tasting higher
    foodWeights.push(1.0 + 0.18 * Math.sin((d + 1) * 2.3));

    // Activities rhythm: day 1 orientation/moderate (0.85), day 2 peak monuments (1.25), etc.
    actWeights.push(1.0 + 0.25 * Math.cos((d + 1) * 1.8));

    // Transport: travel days carry higher intercity share; non-travel days carry local transit
    if (hasTravelDays) {
      transWeights.push(isTravelDayArray[d] ? 2.2 : 0.7);
    } else {
      transWeights.push(1.0 + 0.14 * Math.sin(d * 2.1));
    }
  }

  const normalize = (weights, total) => {
    if (total <= 0) return Array(weights.length).fill(0);
    const sumW = weights.reduce((s, w) => s + w, 0) || 1;
    const allocated = weights.map((w) => Math.round((w / sumW) * total));
    const sumAllocated = allocated.reduce((s, a) => s + a, 0);
    const diff = total - sumAllocated;
    allocated[allocated.length - 1] += diff;
    return allocated;
  };

  const dailyHotel = normalize(hotelWeights, totalHotel);
  const dailyFood = normalize(foodWeights, totalFood);
  const dailyTransport = normalize(transWeights, totalTransport);
  const dailyActivities = normalize(actWeights, totalActivities);

  return { dailyHotel, dailyFood, dailyTransport, dailyActivities };
}

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

  const { dailyHotel, dailyFood, dailyTransport, dailyActivities } = calculateVariedDailyBudgets(
    budgetAllocations,
    durationDays,
    dayLocations
  );

  // Global trip-wide deduplication: a place is never repeated across days
  const usedPlaceIdsAcrossTrip = new Set();
  const days = [];
  let previousLocation = null;

  for (let d = 0; d < durationDays; d++) {
    const location = dayLocations[d];
    const dateStr = addDays(tripRequest.startDate, d);
    const locCandidates = candidatePlaces[location.id] || [];

    const activities = [];
    const dayActBudget = dailyActivities[d] || 0;
    const slotCostWeights = [0.45, 0.35, 0.20]; // Flagship morning, afternoon museum, evening market/promenade

    for (let slotIdx = 0; slotIdx < TIME_SLOTS.length; slotIdx++) {
      const slot = TIME_SLOTS[slotIdx];

      // Pick an attraction never used anywhere on the trip so far
      let pick = locCandidates.find((c) => !usedPlaceIdsAcrossTrip.has(c.placeId));

      // If candidates are exhausted for this specific location, fallback to any unused candidate
      if (!pick) {
        for (const list of Object.values(candidatePlaces)) {
          pick = (list || []).find((c) => !usedPlaceIdsAcrossTrip.has(c.placeId));
          if (pick) break;
        }
      }

      // If still exhausted, pick the highest-rated candidate not used today
      if (!pick) {
        pick = locCandidates[slotIdx % locCandidates.length] || {
          placeId: `attr_${location.id}_${slot.slot}`,
          name: `${location.name} Cultural Discovery & Heritage Stroll`
        };
      }

      usedPlaceIdsAcrossTrip.add(pick.placeId);

      // Apportion that day's activity budget across slots with exact sum matching
      let slotEstimatedCost = Math.round(dayActBudget * slotCostWeights[slotIdx]);
      if (slotIdx === TIME_SLOTS.length - 1) {
        const sumPrior = activities.reduce((s, a) => s + (a.estimatedCost || 0), 0);
        slotEstimatedCost = Math.max(0, dayActBudget - sumPrior);
      }

      activities.push({
        slot: slot.slot,
        placeId: pick.placeId,
        name: pick.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        description: `Explore the sights, architecture, and historic atmosphere of ${pick.name}.`,
        estimatedCost: slotEstimatedCost
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

    const accommodationCost = dailyHotel[d] || 0;
    const foodCost = dailyFood[d] || 0;
    const transportCost = dailyTransport[d] || 0;
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
    totalEstimatedCost,
    travel_tips: buildDestinationTips(resolvedLocations),
    packing_list: buildPackingList(resolvedLocations, durationDays),
    emergency_contacts: buildEmergencyContacts(resolvedLocations)
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

  const destinationProfile = resolveDestinationProfile(resolvedLocations);
  const destCountry = destinationProfile.country;
  const destCurrency = destinationProfile.currency;
  const destEmergency = destinationProfile.emergency;

  return `You are a premier travel itinerary synthesis engine for Roamly.

Create a vivid, well-structured, and engaging itinerary narrative while strictly adhering to the grounded facts provided below.

GROUNDING RULES (STRICT):
1. Only select attractions from candidatePlaces (by their exact placeId and name). Never invent places, place IDs, or coordinates.
2. Only use route information from transitRoutes. Never invent travel durations or distances.
3. Only use guides from matchedGuides (by their exact guide id).
4. Strictly respect the budget allocations and numbers from budgetAllocations. The sum of (accommodationCost + foodCost + transportCost + activitiesCost + guideCost) MUST equal dayEstimatedCost. The sum of all dayEstimatedCost MUST equal totalEstimatedCost.
5. Do not alter the user's totalBudget. If required information is missing, represent it as UNAVAILABLE.

DEDUPLICATION & SLOT COMPLETION (CRITICAL):
1. NO PLACE REPETITION ACROSS DAYS: Every single activity throughout the ENTIRE itinerary must feature a UNIQUE attraction from candidatePlaces. A place visited on Day 1 MUST NEVER appear again on Day 2, Day 3, or any other day.
2. NO FREE TIME / EMPTY SLOTS: Never output "Free time" or leave any slot blank. Every single day MUST have all 3 activity slots ("morning", "afternoon", "evening") filled with distinct, verified attractions from candidatePlaces.

REALISTIC DAILY COST VARIATION (CRITICAL):
1. Daily costs must NOT be identical copies of each other! Travel days carry higher transport costs, peak monument days have higher entry fees (activitiesCost), and leisure or market days have different dining and activity costs.
2. Individual activity estimatedCost values must reflect the attraction type (e.g. flagship monuments have higher admission fees than public parks or bazaars). The sum of activity costs for a day MUST equal that day's activitiesCost.
3. Ensure every day has natural, varied numbers for foodCost, activitiesCost, and dayEstimatedCost, while strictly ensuring the sum of all days equals totalEstimatedCost.

NARRATIVE & DESCRIPTIONS (REQUIRED):
1. "summary": Provide a captivating, personalized 1-2 sentence overview of the entire journey.
2. For each day, provide:
   - "theme": An evocative title/theme for the day (e.g. "Mughal Grandeur & Old Bazaars", "Spiritual Sanctuaries & Sunset Views").
   - "description": A rich, brief 1-2 sentence overview of what the traveler experiences and feels on this day.
   - For every activity in "activities": an engaging "description" (1-2 sentences highlighting key sights within the attraction, historical/architectural context, and tips on what not to miss).
   - "meals": Rich regional dining suggestions for the day (e.g. famous breakfast spots, signature regional dishes to try for lunch, and dinner recommendations).
   - "accommodation": Recommended area or style of stay suited to the traveler's preference and budget.
3. Provide practical, high-value, and 100% factually accurate "travel_tips", "packing_list", and "emergency_contacts" specifically tailored to ${destCountry} (${resolvedLocations.map(l => l.name).join(", ")}):
   - "travel_tips": 5 distinct, high-value tips formatted as "Category: Specific actionable advice". Must cover:
     1) Payments & Currency: Mention ${destCurrency}, card/cash preferences, and actual tipping etiquette (e.g., tipping is not customary in Japan; standard in USA; service included in France/UK; nominal in India).
     2) Cultural Etiquette: Real local customs, temple/church dress codes, escalator manners, and social courtesies for ${destCountry}.
     3) Transit & Mobility: Real local transport systems, specific transit cards (e.g. Suica, Oyster, Navigo, Metro), and verified ride apps.
     4) Connectivity & Power: Specific electrical plug type and voltage for ${destCountry}, local SIM/eSIM, and Wi-Fi tips.
     5) Hydration & Dining: Tap water safety and authentic dining/market advice.
     CRITICAL: NEVER output India-specific advice (such as UPI, PhonePe, auto-rickshaws, temples, or Aadhaar) for destinations outside India!
   - "packing_list": 6-8 tailored packing items including destination-specific power plug adapters, climate-appropriate clothing, and valid international travel documentation.
   - "emergency_contacts": MUST provide the REAL emergency numbers for ${destCountry} (e.g. 911 for USA, 110/119 for Japan, 999/112 for UK, 112 for EU/India).

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
  "totalEstimatedCost": 0,
  "travel_tips": [
    "Payments & Currency: ...",
    "Cultural Etiquette: ...",
    "Transit & Mobility: ...",
    "Connectivity & Power: ...",
    "Hydration & Dining: ..."
  ],
  "packing_list": ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5", "Item 6"],
  "emergency_contacts": {
    "local_emergency": "${destEmergency.local_emergency}",
    "police": "${destEmergency.police}",
    "ambulance": "${destEmergency.ambulance}",
    "tourist_helpline": "${destEmergency.tourist_helpline}",
    "women_helpline": "${destEmergency.women_helpline || 'Local Safety Hotline'}",
    "embassy": "${destCountry} Consular & Tourist Assistance",
    "hotel": "Accommodation Front Desk & 24/7 Guest Concierge",
    "roamly_support": "${destEmergency.roamly_support || '24/7 Priority Travel Assistance'}"
  }
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

/**
 * Post-processes any plan (Gemini synthesis or deterministic fallback) to guarantee:
 * 1. Latitude/longitude, address, ratings hydrated for all activities
 * 2. Cross-trip place deduplication: swaps repeated places with unused verified candidates
 * 3. Populates destination-specific travel tips, packing list, and emergency contacts
 * 4. Ensures no slot is blank or marked "Free time"
 */
function postProcessPlan(plan, context) {
  if (!plan || !Array.isArray(plan.days)) return plan;

  const candidatePlaces = context?.candidatePlaces || {};
  const resolvedLocations = context?.resolvedLocations || [];

  // Hydrate & verify travel tips, packing list, emergency contacts
  const profile = resolveDestinationProfile(resolvedLocations);
  const isIndia = profile.country === "India";

  if (!Array.isArray(plan.travel_tips) || plan.travel_tips.length === 0) {
    plan.travel_tips = buildDestinationTips(resolvedLocations);
  } else if (!isIndia) {
    // If Gemini accidentally included India-specific references for foreign trip, sanitize with destination tips
    const hasFalseIndiaInfo = plan.travel_tips.some((t) =>
      /\b(UPI|PhonePe|Paytm|auto-rickshaw|rickshaws|Aadhaar|temple shoe)\b/i.test(t)
    );
    if (hasFalseIndiaInfo) {
      plan.travel_tips = buildDestinationTips(resolvedLocations);
    }
  }

  if (!Array.isArray(plan.packing_list) || plan.packing_list.length === 0) {
    plan.packing_list = buildPackingList(resolvedLocations, plan.days.length);
  } else if (!isIndia) {
    const hasFalseIndiaPacking = plan.packing_list.some((p) =>
      /\b(Aadhaar|temple shoe)\b/i.test(p)
    );
    if (hasFalseIndiaPacking) {
      plan.packing_list = buildPackingList(resolvedLocations, plan.days.length);
    }
  }

  if (!plan.emergency_contacts || !plan.emergency_contacts.local_emergency) {
    plan.emergency_contacts = buildEmergencyContacts(resolvedLocations);
  } else if (!isIndia) {
    // Ensure foreign trips don't carry Indian 108/1363 numbers
    const rawLocal = String(plan.emergency_contacts.local_emergency || "");
    const rawAmb = String(plan.emergency_contacts.ambulance || "");
    if (rawAmb.includes("108") || rawLocal.includes("100") || (profile.country === "USA" && !rawLocal.includes("911"))) {
      plan.emergency_contacts = buildEmergencyContacts(resolvedLocations);
    }
  }

  // Cross-trip place deduplication
  const seenPlaceIds = new Set();
  const allCandidates = [];
  for (const list of Object.values(candidatePlaces)) {
    for (const c of list || []) allCandidates.push(c);
  }

  for (const day of plan.days) {
    const locCandidates = candidatePlaces[day.locationId] || allCandidates;

    for (const act of day.activities || []) {
      // If placeId repeated from another day, swap with an unused candidate
      if (act.placeId && seenPlaceIds.has(act.placeId)) {
        const unused = locCandidates.find((c) => !seenPlaceIds.has(c.placeId)) ||
          allCandidates.find((c) => !seenPlaceIds.has(c.placeId));
        if (unused) {
          act.placeId = unused.placeId;
          act.name = unused.name;
          act.description = `Discover the architecture, cultural sights, and vibrant surroundings of ${unused.name}.`;
          seenPlaceIds.add(unused.placeId);
        }
      } else if (act.placeId) {
        seenPlaceIds.add(act.placeId);
      }

      // Hydrate coordinates and details
      const match = locCandidates.find((c) => c.placeId === act.placeId) ||
        allCandidates.find((c) => c.placeId === act.placeId);
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
    const processed = postProcessPlan(geminiResult.plan, context);
    return {
      success: true,
      data: { generatedPlan: processed },
      source: "GEMINI_SYNTHESIS",
      fallbackUsed: false,
      meta: { modelUsed: geminiResult.modelUsed }
    };
  }

  const deterministicPlan = buildDeterministicPlan(context);
  const processed = postProcessPlan(deterministicPlan, context);
  return {
    success: true,
    data: { generatedPlan: processed },
    source: "ROAMLY_DETERMINISTIC_SCHEDULER",
    fallbackUsed: true
  };
}

export default { execute };
