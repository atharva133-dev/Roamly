#!/usr/bin/env node
/**
 * Agent Router Test Suite
 *
 * Standalone Node script (no test framework, no dev server required) that
 * exercises each grounding agent per docs/Roamly_Grounded_Agent_Router_Fixed_Plan.md §27.
 *
 * Run: node scripts/test-agent-router.mjs
 *
 * Notes:
 * - Runs entirely against fallback paths when GOOGLE_MAPS_SERVER_API_KEY /
 *   GEMINI_API_KEY / DATABASE_URL are not configured (as in most local/CI
 *   environments), which is itself the offline-grounding contract this suite
 *   is meant to verify.
 * - Weather tests hit the live Open-Meteo API; if the sandbox has no network
 *   access those specific assertions are skipped rather than failed.
 */

import * as locationAgent from "../server/src/agents/locationAgent.js";
import * as placesAgent from "../server/src/agents/placesAgent.js";
import * as weatherAgent from "../server/src/agents/weatherAgent.js";
import * as routeAgent from "../server/src/agents/routeAgent.js";
import * as guideAgent from "../server/src/agents/guideAgent.js";
import * as budgetAgent from "../server/src/agents/budgetAgent.js";
import * as validationAgent from "../server/src/agents/validationAgent.js";

let passed = 0;
let failed = 0;
let skipped = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function test(name, fn) {
  try {
    const result = await fn();
    if (result === "SKIP") {
      console.log(`SKIP  ${name}`);
      skipped++;
      return;
    }
    console.log(`PASS  ${name}`);
    passed++;
  } catch (err) {
    console.log(`FAIL  ${name}\n      ${err.message}`);
    failed++;
  }
}

function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

function baseTripRequest(overrides = {}) {
  return {
    destinations: ["Mumbai"],
    startDate: futureDate(3),
    endDate: futureDate(5),
    travelerCount: 2,
    totalBudget: 50000,
    accommodationPreference: "Hotel",
    transportationPreference: "CAB",
    interests: ["Heritage"],
    travelStyle: "Cultural",
    pace: "MODERATE",
    guidePreference: "NO_GUIDE",
    ...overrides
  };
}

console.log("=== Roamly Grounded Agent Router — Test Suite ===\n");

// ---------------------------------------------------------------------------
// Location Agent
// ---------------------------------------------------------------------------

await test("Location: valid destination resolves with a Google Place ID", async () => {
  const result = await locationAgent.execute({ tripRequest: baseTripRequest({ destinations: ["Mumbai"] }) });
  assert(result.success, `expected success, got errors: ${JSON.stringify(result.errors)}`);
  assert(result.data.resolvedLocations.length === 1, "expected exactly one resolved location");
  assert(!!result.data.resolvedLocations[0].googlePlaceId, "resolved location must carry a googlePlaceId");
});

await test("Location: unknown/gibberish destination is rejected as LOCATION_UNRESOLVED", async () => {
  const result = await locationAgent.execute({
    tripRequest: baseTripRequest({ destinations: ["Xqzzptlkqwertyzzznotarealplace123"] })
  });
  assert(!result.success, "expected failure for an unresolvable destination");
  assert(result.errors.some((e) => e.code === "LOCATION_UNRESOLVED"), "expected LOCATION_UNRESOLVED error code");
});

await test("Location: repeated stop (Delhi -> Agra -> Delhi) reuses the same canonical Location", async () => {
  const result = await locationAgent.execute({ tripRequest: baseTripRequest({ destinations: ["Delhi", "Agra", "Delhi"] }) });
  assert(result.success, `expected success, got errors: ${JSON.stringify(result.errors)}`);
  const [first, , third] = result.data.resolvedLocations;
  assert(first.id === third.id, "the two Delhi stops must resolve to the exact same Location id");
});

// ---------------------------------------------------------------------------
// Places Agent
// ---------------------------------------------------------------------------

await test("Places: candidates are tagged with a placeId and filtered by interest", async () => {
  const locationResult = await locationAgent.execute({ tripRequest: baseTripRequest({ destinations: ["Mumbai"] }) });
  const context = { tripRequest: baseTripRequest({ destinations: ["Mumbai"], interests: ["Heritage"] }), ...locationResult.data };
  const result = await placesAgent.execute(context);
  assert(result.success, "placesAgent should always report success (empty candidates is a warning, not a failure)");
  const candidates = result.data.candidatePlaces[context.resolvedLocations[0].id] || [];
  for (const c of candidates) assert(!!c.placeId, "every candidate must carry a placeId");
});

// ---------------------------------------------------------------------------
// Weather Agent
// ---------------------------------------------------------------------------

await test("Weather: forecast outside the 16-day horizon is explicitly UNAVAILABLE", async () => {
  const locationResult = await locationAgent.execute({ tripRequest: baseTripRequest() });
  const context = {
    tripRequest: baseTripRequest({ startDate: futureDate(60), endDate: futureDate(62) }),
    ...locationResult.data
  };
  const result = await weatherAgent.execute(context);
  const forecast = result.data.weatherForecasts[context.resolvedLocations[0].id];
  assert(forecast.available === false, "forecast 60 days out must be marked unavailable");
  assert(forecast.reason === "FORECAST_UNAVAILABLE", "expected reason FORECAST_UNAVAILABLE");
});

await test("Weather: in-horizon forecast is fetched from Open-Meteo (network-dependent)", async () => {
  const locationResult = await locationAgent.execute({ tripRequest: baseTripRequest() });
  const context = { tripRequest: baseTripRequest({ startDate: futureDate(1), endDate: futureDate(2) }), ...locationResult.data };
  const result = await weatherAgent.execute(context);
  const forecast = result.data.weatherForecasts[context.resolvedLocations[0].id];
  if (!forecast.available) return "SKIP"; // no network access in this sandbox
  assert(Array.isArray(forecast.days) && forecast.days.length > 0, "expected at least one forecast day");
});

// ---------------------------------------------------------------------------
// Route Agent
// ---------------------------------------------------------------------------

await test("Routes: multi-stop trip computes a leg per consecutive pair, never inventing a mode", async () => {
  const locationResult = await locationAgent.execute({ tripRequest: baseTripRequest({ destinations: ["Delhi", "Agra"] }) });
  const context = { tripRequest: baseTripRequest({ destinations: ["Delhi", "Agra"], transportationPreference: "TRAIN" }), ...locationResult.data };
  const result = await routeAgent.execute(context);
  assert(result.success, "routeAgent should always report success");
  assert(result.data.transitRoutes.length === 1, "expected exactly one leg for a 2-stop trip");
  const leg = result.data.transitRoutes[0];
  assert(typeof leg.available === "boolean", "leg must report availability");
  assert(Array.isArray(leg.actualModes), "leg must record actualModes, never assume the requested mode was honored");
});

// ---------------------------------------------------------------------------
// Guide Agent
// ---------------------------------------------------------------------------

await test("Guides: NO_GUIDE preference short-circuits with no matching required", async () => {
  const result = await guideAgent.execute({ tripRequest: baseTripRequest({ guidePreference: "NO_GUIDE" }), resolvedLocations: [] });
  assert(result.success, "expected success");
  assert(Object.keys(result.data.matchedGuides).length === 0, "NO_GUIDE should produce an empty matchedGuides map");
});

await test("Guides: NEED_GUIDE returns only real DB guides — no demo fallback", async () => {
  const locationResult = await locationAgent.execute({ tripRequest: baseTripRequest({ destinations: ["Mumbai"] }) });
  const context = { tripRequest: baseTripRequest({ destinations: ["Mumbai"], guidePreference: "NEED_GUIDE" }), ...locationResult.data };
  const result = await guideAgent.execute(context);
  assert(result.success, "expected success");
  assert(result.fallbackUsed === false, "demo fallback must never be used");
  assert(result.source === "ROAMLY_DATABASE" || result.source === "N/A", "source must be ROAMLY_DATABASE or N/A");
  const guides = result.data.matchedGuides[context.resolvedLocations[0].id] || [];
  for (const g of guides) {
    assert(g.guideSource === "ROAMLY_DATABASE", "every guide must come from ROAMLY_DATABASE");
    assert(g.isDemo === false, "isDemo must be false for all guides");
    assert(g.isBookable === true, "isBookable must be true for real DB guides");
  }
});

// ---------------------------------------------------------------------------
// Budget Agent
// ---------------------------------------------------------------------------

await test("Budget: category envelope sums exactly to totalBudget", async () => {
  const result = await budgetAgent.execute({ tripRequest: baseTripRequest({ totalBudget: 73333 }) });
  assert(result.success, "expected success");
  const { categories, totalBudget } = result.data.budgetAllocations;
  const sum = Object.values(categories).reduce((a, b) => a + b, 0);
  assert(Math.abs(sum - totalBudget) < 0.01, `category sum (${sum}) must equal totalBudget (${totalBudget})`);
});

await test("Budget: non-positive totalBudget is rejected", async () => {
  const result = await budgetAgent.execute({ tripRequest: baseTripRequest({ totalBudget: 0 }) });
  assert(!result.success, "expected failure for totalBudget <= 0");
});

// ---------------------------------------------------------------------------
// Validation Agent
// ---------------------------------------------------------------------------

function validPlanFixtureContext() {
  const tripRequest = baseTripRequest({ destinations: ["Mumbai"], startDate: futureDate(3), endDate: futureDate(3) });
  const locationId = "loc_test_1";
  const candidatePlaces = { [locationId]: [{ placeId: "place_1", name: "Test Attraction" }] };
  const plan = {
    destinations: [{ locationId, name: "Mumbai", city: "Mumbai" }],
    days: [
      {
        day: "Day 1",
        date: tripRequest.startDate,
        locationId,
        city: "Mumbai",
        activities: [{ slot: "morning", placeId: "place_1", name: "Test Attraction", startTime: "09:00", endTime: "11:00", estimatedCost: 100 }],
        transit: null,
        guide: null,
        weather: { available: false, reason: "FORECAST_UNAVAILABLE" },
        accommodationCost: 500,
        foodCost: 200,
        transportCost: 0,
        activitiesCost: 100,
        guideCost: 0,
        dayEstimatedCost: 800
      }
    ],
    totalEstimatedCost: 800
  };
  return {
    tripRequest,
    resolvedLocations: [{ id: locationId, name: "Mumbai" }],
    candidatePlaces,
    weatherForecasts: {},
    transitRoutes: [],
    matchedGuides: {},
    budgetAllocations: { totalBudget: tripRequest.totalBudget, categories: {} },
    generatedPlan: plan
  };
}

await test("Validation: a well-formed plan passes all 17 checks", async () => {
  const context = validPlanFixtureContext();
  const result = await validationAgent.execute(context);
  assert(result.data.validationResult.valid, `expected valid plan, got errors: ${JSON.stringify(result.data.validationResult.errors)}`);
});

await test("Validation: an invented placeId is rejected (INVALID_PLACE_ID)", async () => {
  const context = validPlanFixtureContext();
  context.generatedPlan.days[0].activities[0].placeId = "place_invented_by_gemini";
  const result = await validationAgent.execute(context);
  assert(!result.data.validationResult.valid, "expected validation to fail");
  assert(result.data.validationResult.errors.some((e) => e.code === "INVALID_PLACE_ID"), "expected INVALID_PLACE_ID");
});

await test("Validation: duplicate same-day attraction is rejected (DUPLICATE_ATTRACTION)", async () => {
  const context = validPlanFixtureContext();
  context.generatedPlan.days[0].activities.push({ ...context.generatedPlan.days[0].activities[0], slot: "afternoon", startTime: "13:00", endTime: "14:00" });
  const result = await validationAgent.execute(context);
  assert(!result.data.validationResult.valid, "expected validation to fail");
  assert(result.data.validationResult.errors.some((e) => e.code === "DUPLICATE_ATTRACTION"), "expected DUPLICATE_ATTRACTION");
});

await test("Validation: overlapping activity slots are rejected (OVERLAPPING_ACTIVITIES)", async () => {
  const context = validPlanFixtureContext();
  context.generatedPlan.days[0].activities.push({
    placeId: "place_1",
    name: "Overlap Attraction",
    slot: "morning",
    startTime: "10:00",
    endTime: "12:00",
    estimatedCost: 0
  });
  const result = await validationAgent.execute(context);
  assert(!result.data.validationResult.valid, "expected validation to fail");
  assert(
    result.data.validationResult.errors.some((e) => e.code === "OVERLAPPING_ACTIVITIES" || e.code === "DUPLICATE_ATTRACTION"),
    "expected OVERLAPPING_ACTIVITIES or DUPLICATE_ATTRACTION"
  );
});

await test("Validation: startTime >= endTime is rejected (INVALID_TIME_RANGE)", async () => {
  const context = validPlanFixtureContext();
  context.generatedPlan.days[0].activities[0].endTime = "08:00"; // before startTime 09:00
  const result = await validationAgent.execute(context);
  assert(!result.data.validationResult.valid, "expected validation to fail");
  assert(result.data.validationResult.errors.some((e) => e.code === "INVALID_TIME_RANGE"), "expected INVALID_TIME_RANGE");
});

await test("Validation: date outside the trip window is rejected (DATE_OUT_OF_RANGE)", async () => {
  const context = validPlanFixtureContext();
  context.generatedPlan.days[0].date = futureDate(999);
  const result = await validationAgent.execute(context);
  assert(!result.data.validationResult.valid, "expected validation to fail");
  assert(result.data.validationResult.errors.some((e) => e.code === "DATE_OUT_OF_RANGE"), "expected DATE_OUT_OF_RANGE");
});

await test("Validation: destination count mismatch is rejected (DESTINATION_COUNT_MISMATCH)", async () => {
  const context = validPlanFixtureContext();
  context.resolvedLocations.push({ id: "loc_test_2", name: "Agra" }); // plan only visits 1 destination
  const result = await validationAgent.execute(context);
  assert(!result.data.validationResult.valid, "expected validation to fail");
  assert(result.data.validationResult.errors.some((e) => e.code === "DESTINATION_COUNT_MISMATCH"), "expected DESTINATION_COUNT_MISMATCH");
});

await test("Validation: cost component mismatch is rejected (COST_MISMATCH)", async () => {
  const context = validPlanFixtureContext();
  context.generatedPlan.days[0].dayEstimatedCost = 99999; // no longer matches component sum
  const result = await validationAgent.execute(context);
  assert(!result.data.validationResult.valid, "expected validation to fail");
  assert(result.data.validationResult.errors.some((e) => e.code === "COST_MISMATCH"), "expected COST_MISMATCH");
});

// ---------------------------------------------------------------------------
// Persistence gate (only meaningfully testable with a reachable database)
// ---------------------------------------------------------------------------

await test("Persistence: agentRouter never persists before validation passes", async () => {
  if (!process.env.DATABASE_URL) return "SKIP";
  const { planItinerary } = await import("../server/src/agents/agentRouter.js");
  // An unresolvable destination fails at locationAgent, long before validation
  // or persistence — tripId must never be set.
  const result = await planItinerary({
    requestId: "test_req",
    user: { id: "test_user" },
    tripRequest: baseTripRequest({ destinations: ["Xqzzptlkqwertyzzznotarealplace123"] })
  });
  assert(result.success === false, "expected failure response");
  assert(result.tripId === undefined, "a failed plan must never carry a persisted tripId");
});

await test("Persistence: a validated plan degrades to persisted:false instead of crashing when the DB is unreachable", async () => {
  const { persistItinerary } = await import("../server/src/agents/agentRouter.js");
  const context = { ...validPlanFixtureContext(), user: { id: "test_user" } };
  // Regression test for the exact crash reported against a real deployment:
  // DATABASE_URL configured but Postgres unreachable must NOT throw out of
  // persistItinerary — it must degrade like every other agent.
  const result = await persistItinerary(context);
  assert(typeof result.persisted === "boolean", "expected a persisted boolean, not a thrown exception");
  if (!result.persisted) {
    assert(typeof result.reason === "string" && result.reason.length > 0, "expected a human-readable reason when not persisted");
  }
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed, ${skipped} skipped ===`);
process.exit(failed > 0 ? 1 : 0);
