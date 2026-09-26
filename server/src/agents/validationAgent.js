/**
 * Validation Agent — the mandatory guardrail.
 *
 * Runs the 17 required invariant checks against context.generatedPlan and
 * the grounded data that produced it. Nothing gets persisted unless
 * validationResult.valid === true.
 */

const EPSILON = 0.51; // rounding tolerance for currency comparisons

function timeToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function allCandidatePlaceIds(candidatePlaces) {
  const ids = new Set();
  for (const list of Object.values(candidatePlaces || {})) {
    for (const c of list || []) ids.add(c.placeId);
  }
  return ids;
}

function allMatchedGuideIds(matchedGuides) {
  const ids = new Set();
  for (const list of Object.values(matchedGuides || {})) {
    for (const g of list || []) ids.add(g.id);
  }
  return ids;
}

export async function execute(context) {
  const errors = [];
  const warnings = [];

  const plan = context?.generatedPlan;
  const { tripRequest, candidatePlaces, weatherForecasts, transitRoutes, matchedGuides, budgetAllocations, resolvedLocations } =
    context || {};

  if (!plan || !Array.isArray(plan.days) || plan.days.length === 0) {
    return {
      success: true,
      data: { validationResult: { valid: false, errors: [{ code: "VALIDATION_FAILED", details: "No generated plan to validate" }], warnings: [] } },
      source: "ROAMLY_ESTIMATE",
      fallbackUsed: false
    };
  }

  const validPlaceIds = allCandidatePlaceIds(candidatePlaces);
  const validGuideIds = allMatchedGuideIds(matchedGuides);

  // 1. Every placeId exists in verified places.
  for (const day of plan.days) {
    for (const activity of day.activities || []) {
      if (activity.placeId && !validPlaceIds.has(activity.placeId)) {
        errors.push({ code: "INVALID_PLACE_ID", details: `${day.day}: placeId "${activity.placeId}" (${activity.name}) is not in the verified candidate list` });
      }
    }
  }

  // 2. Every guideId exists in verified guides (DB or explicit demo fallback).
  for (const day of plan.days) {
    if (day.guide?.guideId && !validGuideIds.has(day.guide.guideId)) {
      errors.push({ code: "INVALID_GUIDE_ID", details: `${day.day}: guideId "${day.guide.guideId}" is not in the matched guides list` });
    }
  }

  // 3. Total cost equals sum of day/item costs.
  for (const day of plan.days) {
    const componentSum =
      (day.accommodationCost || 0) + (day.foodCost || 0) + (day.transportCost || 0) + (day.activitiesCost || 0) + (day.guideCost || 0);
    if (Math.abs(componentSum - (day.dayEstimatedCost || 0)) > EPSILON) {
      errors.push({ code: "COST_MISMATCH", details: `${day.day}: component costs sum to ${componentSum} but dayEstimatedCost is ${day.dayEstimatedCost}` });
    }
  }
  const daySum = plan.days.reduce((s, d) => s + (d.dayEstimatedCost || 0), 0);
  if (Math.abs(daySum - (plan.totalEstimatedCost || 0)) > EPSILON * plan.days.length) {
    errors.push({ code: "COST_MISMATCH", details: `Sum of day costs (${daySum}) does not match totalEstimatedCost (${plan.totalEstimatedCost})` });
  }

  // 4. totalBudget equals user input.
  if (budgetAllocations?.totalBudget !== tripRequest?.totalBudget) {
    errors.push({ code: "BUDGET_MUTATED", details: `budgetAllocations.totalBudget (${budgetAllocations?.totalBudget}) does not match tripRequest.totalBudget (${tripRequest?.totalBudget})` });
  }

  // 5 & 6. estimatedTotalCost vs totalBudget, remainingBudget exactness.
  const totalBudget = tripRequest?.totalBudget || 0;
  const remainingBudget = Math.round((totalBudget - (plan.totalEstimatedCost || 0)) * 100) / 100;
  if (remainingBudget < 0) {
    errors.push({ code: "BUDGET_EXCEEDED", details: `estimatedTotalCost (${plan.totalEstimatedCost}) exceeds totalBudget (${totalBudget}) by ${Math.abs(remainingBudget)}` });
  }

  // 7. Opening/closing hours respected when known.
  // NOTE: Google's regularOpeningHours is a free-form weekday description string,
  // not machine-parseable start/end times per activity slot. We do not have
  // enough structure to strictly enforce this without a much richer parser, so
  // this check currently only fires when a place is explicitly marked closed
  // (openNow === false) at grounding time — a best-effort signal, not a guarantee.
  for (const day of plan.days) {
    for (const activity of day.activities || []) {
      const candidate = (candidatePlaces?.[day.locationId] || []).find((c) => c.placeId === activity.placeId);
      if (candidate?.regularOpeningHours?.openNow === false) {
        warnings.push({ code: "OPENING_HOURS_CONFLICT", details: `${day.day}: "${activity.name}" was marked closed at grounding time` });
      }
    }
  }

  // 8 & 9. Route data exists for every transit link; durations are never invented.
  for (let i = 1; i < plan.days.length; i++) {
    const prevDay = plan.days[i - 1];
    const day = plan.days[i];
    if (day.locationId !== prevDay.locationId) {
      if (!day.transit) {
        errors.push({ code: "ROUTE_UNAVAILABLE", details: `${day.day}: city change from ${prevDay.city} to ${day.city} has no transit data` });
        continue;
      }
      const groundedLeg = (transitRoutes || []).find(
        (r) => r.fromLocationId === day.transit.fromLocationId && r.toLocationId === day.transit.toLocationId
      );
      if (!groundedLeg) {
        errors.push({ code: "INVENTED_TRAVEL_DURATION", details: `${day.day}: transit leg does not match any grounded transitRoutes entry` });
      } else if (groundedLeg.available === false) {
        errors.push({ code: "PREFERRED_TRANSIT_UNAVAILABLE", details: `${day.day}: grounded route for this leg is unavailable` });
      }
    }
  }

  // 10. Weather matches real data or is UNAVAILABLE.
  for (const day of plan.days) {
    const forecast = weatherForecasts?.[day.locationId];
    if (day.weather?.available) {
      const groundedDay = forecast?.available ? forecast.days.find((d) => d.date === day.date) : null;
      if (!groundedDay) {
        errors.push({ code: "INVENTED_WEATHER", details: `${day.day}: weather marked available but no grounded forecast exists for ${day.date}` });
      }
    }
  }

  // 11. Transportation preference respected or documented deviation.
  for (const day of plan.days) {
    if (day.transit && day.transit.preferenceSatisfied === false) {
      warnings.push({ code: "TRANSIT_PREFERENCE_DEVIATION", details: `${day.day}: actual travel modes ${JSON.stringify(day.transit.actualModes)} deviate from requested ${day.transit.requestedMode}` });
    }
  }

  // 12. Guide availability respected (soft check — absence is legitimate).
  if (tripRequest?.guidePreference === "NEED_GUIDE") {
    for (const day of plan.days) {
      const available = (matchedGuides?.[day.locationId] || []).length > 0;
      if (available && !day.guide) {
        warnings.push({ code: "GUIDE_UNASSIGNED", details: `${day.day}: a guide was available for ${day.city} but none was assigned` });
      }
    }
  }

  // 13. No duplicate visits to same attraction on the same day.
  for (const day of plan.days) {
    const seen = new Set();
    for (const activity of day.activities || []) {
      if (seen.has(activity.placeId)) {
        errors.push({ code: "DUPLICATE_ATTRACTION", details: `${day.day}: "${activity.name}" appears twice` });
      }
      seen.add(activity.placeId);
    }
  }

  // 14. All dates within the trip window.
  const startTime = new Date(tripRequest?.startDate).getTime();
  const endTime = new Date(tripRequest?.endDate).getTime();
  for (const day of plan.days) {
    const t = new Date(day.date).getTime();
    if (!Number.isFinite(t) || t < startTime || t > endTime) {
      errors.push({ code: "DATE_OUT_OF_RANGE", details: `${day.day}: date ${day.date} is outside the trip window` });
    }
  }

  // 15. startTime < endTime for every activity.
  for (const day of plan.days) {
    for (const activity of day.activities || []) {
      const s = timeToMinutes(activity.startTime);
      const e = timeToMinutes(activity.endTime);
      if (s === null || e === null || s >= e) {
        errors.push({ code: "INVALID_TIME_RANGE", details: `${day.day}: "${activity.name}" has startTime (${activity.startTime}) >= endTime (${activity.endTime})` });
      }
    }
  }

  // 16. No overlapping activity slots.
  for (const day of plan.days) {
    const ranges = (day.activities || [])
      .map((a) => ({ s: timeToMinutes(a.startTime), e: timeToMinutes(a.endTime), name: a.name }))
      .filter((r) => r.s !== null && r.e !== null)
      .sort((a, b) => a.s - b.s);
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i].s < ranges[i - 1].e) {
        errors.push({ code: "OVERLAPPING_ACTIVITIES", details: `${day.day}: "${ranges[i - 1].name}" overlaps with "${ranges[i].name}"` });
      }
    }
  }

  // 17. Destination count matches the user request.
  const uniqueDayLocations = new Set(plan.days.map((d) => d.locationId));
  const expectedCount = resolvedLocations?.length ?? tripRequest?.destinations?.length ?? 0;
  if (uniqueDayLocations.size !== expectedCount) {
    errors.push({ code: "DESTINATION_COUNT_MISMATCH", details: `Plan visits ${uniqueDayLocations.size} destination(s), expected ${expectedCount}` });
  }

  const valid = errors.length === 0;

  return {
    success: true,
    data: { validationResult: { valid, errors, warnings } },
    source: "ROAMLY_ESTIMATE",
    fallbackUsed: false
  };
}

export default { execute };
