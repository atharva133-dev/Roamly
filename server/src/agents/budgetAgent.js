/**
 * Budget Agent
 *
 * Deterministic constraint engine. The user's totalBudget is immutable —
 * Gemini never sees an opportunity to change it, only to spend within the
 * envelopes this agent computes.
 */

const CATEGORY_SPLIT = {
  HOTEL: 0.35,
  TRANSPORT: 0.25,
  FOOD: 0.20,
  ACTIVITIES: 0.15,
  CONTINGENCY: 0.05
};

function durationDaysFor(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, days);
}

/**
 * Split totalBudget across CATEGORY_SPLIT with deterministic rounding.
 * Any rounding remainder is folded into CONTINGENCY so the categories always
 * sum EXACTLY to totalBudget (required invariant).
 */
function computeCategoryAllocations(totalBudget) {
  const categories = {};
  let allocated = 0;

  const keys = Object.keys(CATEGORY_SPLIT);
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const amount = Math.round(totalBudget * CATEGORY_SPLIT[key]);
    categories[key] = amount;
    allocated += amount;
  }

  const lastKey = keys[keys.length - 1]; // CONTINGENCY absorbs rounding remainder
  categories[lastKey] = Math.round((totalBudget - allocated) * 100) / 100;

  return categories;
}

export async function execute(context) {
  const tripRequest = context?.tripRequest || {};
  const totalBudget = Number(tripRequest.totalBudget);
  const travelerCount = Math.max(1, Number(tripRequest.travelerCount) || 1);

  if (!Number.isFinite(totalBudget) || totalBudget <= 0) {
    return {
      success: false,
      data: {},
      errors: [{ code: "OVER_BUDGET", details: "totalBudget must be a positive number" }],
      source: "ROAMLY_ESTIMATE",
      fallbackUsed: false
    };
  }

  const durationDays = durationDaysFor(tripRequest.startDate, tripRequest.endDate);
  const budgetPerPersonPerDay =
    Math.round((totalBudget / (travelerCount * durationDays)) * 100) / 100;

  const categories = computeCategoryAllocations(totalBudget);
  const categorySum = Object.values(categories).reduce((a, b) => a + b, 0);

  const budgetAllocations = {
    totalBudget,
    travelerCount,
    durationDays,
    budgetPerPersonPerDay,
    categories,
    categorySum
  };

  return {
    success: true,
    data: { budgetAllocations },
    source: "ROAMLY_ESTIMATE",
    fallbackUsed: false
  };
}

export default { execute };
