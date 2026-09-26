/**
 * Agent Router — registry, DAG coordinator, targeted re-optimizer, and
 * persistence gate for the grounded itinerary-planning pipeline.
 *
 * Sequence:
 *   locationAgent
 *     -> [placesAgent || weatherAgent] (parallel)
 *     -> routeAgent -> guideAgent -> budgetAgent
 *     -> itineraryAgent -> validationAgent
 *     -> PASS: persist Trip/Stop/Budget
 *        FAIL: targeted re-optimization (max 2 iterations), else structured failure
 */

import * as locationAgent from "./locationAgent.js";
import * as placesAgent from "./placesAgent.js";
import * as weatherAgent from "./weatherAgent.js";
import * as routeAgent from "./routeAgent.js";
import * as guideAgent from "./guideAgent.js";
import * as budgetAgent from "./budgetAgent.js";
import * as itineraryAgent from "./itineraryAgent.js";
import * as validationAgent from "./validationAgent.js";
import { getPrismaClient, recordTripStop } from "../services/googleMapsGateway.js";

const MAX_REOPTIMIZATIONS = 2;

function createInitialContext({ requestId, user, tripRequest }) {
  return {
    requestId,
    user,
    tripRequest,
    resolvedLocations: [],
    candidatePlaces: {},
    weatherForecasts: {},
    transitRoutes: [],
    matchedGuides: {},
    budgetAllocations: {},
    generatedPlan: null,
    validationResult: { valid: false, errors: [] },
    persistedTripId: null,
    sources: {
      locationSource: null,
      placesSource: null,
      weatherSource: null,
      routeSource: null,
      fareSource: null,
      guideSource: null,
      costSource: null
    },
    routerTrace: []
  };
}

/**
 * Run a single agent, merge its data into the shared context, and record a
 * router trace entry. Returns the raw agent result (success/errors/warnings)
 * so the caller can decide whether to abort or continue.
 */
async function runAgent(context, agentModule, name, sourceKey, options) {
  const startedAt = new Date().toISOString();
  let result;
  try {
    result = await agentModule.execute(context, options);
  } catch (err) {
    result = {
      success: false,
      data: {},
      errors: [{ code: "AGENT_EXCEPTION", details: `${name} threw: ${err.message}` }],
      source: "ROAMLY_ESTIMATE",
      fallbackUsed: false
    };
  }
  const completedAt = new Date().toISOString();

  Object.assign(context, result.data || {});
  if (sourceKey && result.source) context.sources[sourceKey] = result.source;

  context.routerTrace.push({
    agent: name,
    startedAt,
    completedAt,
    success: result.success,
    fallbackUsed: !!result.fallbackUsed,
    source: result.source || null
  });

  return result;
}

function collectAgentsExecuted(context) {
  return context.routerTrace.map((t) => t.agent);
}

function anyFallbackUsed(context) {
  return context.routerTrace.some((t) => t.fallbackUsed);
}

/**
 * Decide which agents need to re-run based on the specific validation error
 * codes seen, per the plan's targeted re-optimization table. Falls back to
 * regenerating just the itinerary (forcing the deterministic scheduler on the
 * final attempt) when no more specific strategy applies.
 */
async function reoptimize(context, errors, attemptNumber) {
  const codes = new Set(errors.map((e) => e.code));
  const isLastAttempt = attemptNumber >= MAX_REOPTIMIZATIONS;

  if (codes.has("ROUTE_UNAVAILABLE") || codes.has("PREFERRED_TRANSIT_UNAVAILABLE") || codes.has("INVENTED_TRAVEL_DURATION")) {
    await runAgent(context, routeAgent, "routeAgent", "routeSource");
  }

  if (codes.has("INVALID_GUIDE_ID")) {
    await runAgent(context, guideAgent, "guideAgent", "guideSource");
  }

  // BUDGET_EXCEEDED and any itinerary-shape defects (invalid place ids, cost
  // mismatches, duplicate/overlapping activities, bad dates, etc.) all get
  // resolved by regenerating the itinerary from the same grounded data. On
  // the final permitted attempt, force the deterministic scheduler, which is
  // correct-by-construction against the grounded context.
  await runAgent(context, itineraryAgent, "itineraryAgent", "costSource", {
    forceDeterministic: isLastAttempt
  });

  return runAgent(context, validationAgent, "validationAgent", null);
}

/**
 * Persist the validated plan as Trip/Stop/Budget rows. This runs strictly
 * after validation PASSED (see the persistence gate in planItinerary below),
 * but the database itself can still be unreachable at write time — that's an
 * infra failure, not a grounding failure, so it must degrade the same way
 * every other agent does (return persisted:false) rather than crash the
 * whole request and throw away an otherwise-valid, already-validated plan.
 */
export async function persistItinerary(context) {
  const { tripRequest, resolvedLocations, budgetAllocations, generatedPlan, user } = context;

  try {
    const prisma = await getPrismaClient();
    if (!prisma) {
      return { persisted: false, reason: "Database unavailable" };
    }

    const trip = await prisma.trip.create({
      data: {
        user_id: user.id,
        start_date: new Date(tripRequest.startDate),
        end_date: new Date(tripRequest.endDate),
        description: `Trip to ${resolvedLocations.map((l) => l.name).join(", ")}`
      }
    });

    for (let i = 0; i < resolvedLocations.length; i++) {
      const location = resolvedLocations[i];
      const daysAtLocation = generatedPlan.days.filter((d) => d.locationId === location.id);
      const arrivalDate = daysAtLocation[0]?.date || tripRequest.startDate;
      const departureDate = daysAtLocation[daysAtLocation.length - 1]?.date || tripRequest.endDate;

      await recordTripStop({
        tripId: trip.trip_id,
        locationId: location.id,
        sequence: i,
        arrivalDate,
        departureDate
      });
    }

    for (const [category, amount] of Object.entries(budgetAllocations.categories)) {
      await prisma.budget.create({
        data: { trip_id: trip.trip_id, amount, category }
      });
    }

    return { persisted: true, tripId: trip.trip_id };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Agent Router] Persistence failed (${err.message}); returning the validated plan unsaved.`);
    }
    return { persisted: false, reason: `Database write failed: ${err.message}` };
  }
}

/**
 * Run the full grounded-agent pipeline for a single itinerary request.
 *
 * @param {Object} params
 * @param {string} params.requestId
 * @param {{id: string, role?: string}} params.user Authenticated Clerk user
 * @param {Object} params.tripRequest See docs/Roamly_Grounded_Agent_Router_Fixed_Plan.md §4
 * @returns {Promise<any>} API-response-shaped result (success/failure)
 */
export async function planItinerary({ requestId, user, tripRequest }) {
  const context = createInitialContext({ requestId, user, tripRequest });

  // Step 1: Location resolution (hard gate — no recovery strategy for
  // unresolvable destinations; that's a request-shape problem, not a
  // transient one).
  const locationResult = await runAgent(context, locationAgent, "locationAgent", "locationSource");
  if (!locationResult.success) {
    return buildFailureResponse(context, locationResult.errors);
  }

  // Step 2: Places + Weather run concurrently — independent of each other.
  const [placesResult, weatherResult] = await Promise.all([
    runAgent(context, placesAgent, "placesAgent", "placesSource"),
    runAgent(context, weatherAgent, "weatherAgent", "weatherSource")
  ]);
  void placesResult;
  void weatherResult;

  // Step 3: Routes -> Guides -> Budget (sequential; each depends on prior grounding).
  await runAgent(context, routeAgent, "routeAgent", "routeSource");
  await runAgent(context, guideAgent, "guideAgent", "guideSource");
  const budgetResult = await runAgent(context, budgetAgent, "budgetAgent", "costSource");
  if (!budgetResult.success) {
    return buildFailureResponse(context, budgetResult.errors);
  }

  // Step 4: Itinerary synthesis (Gemini + deterministic fallback) -> Validation.
  await runAgent(context, itineraryAgent, "itineraryAgent", "costSource");
  await runAgent(context, validationAgent, "validationAgent", null);

  // Step 5: Targeted re-optimization loop (capped at MAX_REOPTIMIZATIONS).
  let reOptimizations = 0;
  while (!context.validationResult.valid && reOptimizations < MAX_REOPTIMIZATIONS) {
    reOptimizations++;
    await reoptimize(context, context.validationResult.errors, reOptimizations);
  }

  if (!context.validationResult.valid) {
    return buildFailureResponse(context, context.validationResult.errors, reOptimizations);
  }

  // Step 6: Persistence gate — only ever reached after PASS.
  const persistResult = await persistItinerary(context);
  context.persistedTripId = persistResult.tripId || null;

  return buildSuccessResponse(context, reOptimizations, persistResult);
}

function buildSuccessResponse(context, reOptimizations, persistResult) {
  const plan = context.generatedPlan;
  const remainingBudget =
    Math.round((context.budgetAllocations.totalBudget - plan.totalEstimatedCost) * 100) / 100;

  return {
    success: true,
    tripId: context.persistedTripId,
    tripSummary: {
      totalBudget: context.budgetAllocations.totalBudget,
      estimatedTotalCost: plan.totalEstimatedCost,
      remainingBudget,
      travelerCount: context.budgetAllocations.travelerCount,
      durationDays: context.budgetAllocations.durationDays,
      budgetPerPersonPerDay: context.budgetAllocations.budgetPerPersonPerDay
    },
    budgetBreakdown: context.budgetAllocations.categories,
    destinations: plan.destinations,
    days: plan.days,
    sources: context.sources,
    routerTrace: {
      agentsExecuted: collectAgentsExecuted(context),
      fallbackUsed: anyFallbackUsed(context),
      validationStatus: "PASSED",
      reOptimizations
    },
    warnings: context.validationResult.warnings || [],
    persistence: persistResult
  };
}

function buildFailureResponse(context, errors, reOptimizations = 0) {
  return {
    success: false,
    error: {
      code: errors?.[0]?.code || "VALIDATION_FAILED",
      message: errors?.[0]?.details || "Itinerary generation failed validation",
      details: errors
    },
    routerTrace: {
      agentsExecuted: collectAgentsExecuted(context),
      fallbackUsed: anyFallbackUsed(context),
      validationStatus: "FAILED",
      reOptimizations
    }
  };
}

export default { planItinerary, persistItinerary };
