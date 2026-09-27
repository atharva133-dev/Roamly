/**
 * Transport Cost Estimator
 *
 * Produces transparent, clearly-labeled cost estimates for various transport modes.
 * NEVER presents a Roamly estimate as a live taxi fare or exact price.
 *
 * Sources:
 * - Google Routes API: toll costs, transit fares (when available)
 * - Roamly Estimate: configurable per-km rates for private vehicles
 */

// Configurable per-km rates (INR) — used only for Roamly estimates
const RATE_PER_KM: Record<string, { min: number; max: number }> = {
  DRIVE: { min: 12, max: 18 },      // Car/Cab
  TWO_WHEELER: { min: 4, max: 7 },  // Two-wheeler
  TRANSIT: { min: 1.5, max: 4 },    // Public transit (fallback if no Google fare)
  WALK: { min: 0, max: 0 },         // Free
  BICYCLE: { min: 0, max: 0 },      // Free
};

// Base fares (INR)
const BASE_FARE: Record<string, number> = {
  DRIVE: 50,
  TWO_WHEELER: 25,
  TRANSIT: 10,
  WALK: 0,
  BICYCLE: 0,
};

export interface TransportCostEstimate {
  min: number;
  max: number;
  currency: string;
  source: "Google transit fare" | "Google toll" | "Roamly estimate" | "Free";
  tollCost: number | null;
  transitFare: number | null;
  distanceKm: number;
  mode: string;
  breakdown: string;
}

export interface CostEstimatorInput {
  mode: string;
  distanceKm: number;
  tollCost?: number | null;
  transitFare?: number | null;
  transitFareSource?: string;
}

/**
 * Estimate transport cost for a leg.
 *
 * @param input - mode, distanceKm, optional toll/transit fare from Google
 * @returns TransportCostEstimate with clearly labeled source
 */
export function estimateTransportCost(input: CostEstimatorInput): TransportCostEstimate {
  const { mode, distanceKm, tollCost = null, transitFare = null, transitFareSource } = input;

  const normalizedMode = normalizeMode(mode);

  // Free modes
  if (normalizedMode === "WALK" || normalizedMode === "BICYCLE") {
    return {
      min: 0,
      max: 0,
      currency: "INR",
      source: "Free",
      tollCost: null,
      transitFare: null,
      distanceKm,
      mode: normalizedMode,
      breakdown: `${normalizedMode.toLowerCase()} — no cost`,
    };
  }

  // Transit with Google-provided fare
  if (normalizedMode === "TRANSIT" && transitFare != null && transitFare > 0) {
    const total = transitFare + (tollCost || 0);
    return {
      min: Math.round(total),
      max: Math.round(total),
      currency: "INR",
      source: "Google transit fare",
      tollCost: tollCost || null,
      transitFare,
      distanceKm,
      mode: normalizedMode,
      breakdown: `Transit fare: ₹${Math.round(transitFare)}${tollCost ? ` + toll: ₹${Math.round(tollCost)}` : ""}`,
    };
  }

  // Roamly estimate for private vehicles or transit without Google fare
  const rates = RATE_PER_KM[normalizedMode] || RATE_PER_KM.DRIVE;
  const base = BASE_FARE[normalizedMode] || BASE_FARE.DRIVE;

  const minCost = Math.round(base + distanceKm * rates.min + (tollCost || 0));
  const maxCost = Math.round(base + distanceKm * rates.max + (tollCost || 0));

  const tollStr = tollCost ? ` + toll: ₹${Math.round(tollCost)}` : "";
  const fareStr = normalizedMode === "TRANSIT" ? " (transit fare unavailable)" : "";

  return {
    min: minCost,
    max: maxCost,
    currency: "INR",
    source: tollCost ? "Google toll" : "Roamly estimate",
    tollCost: tollCost || null,
    transitFare: null,
    distanceKm,
    mode: normalizedMode,
    breakdown: `Base: ₹${base} + ${distanceKm.toFixed(1)}km × ₹${rates.min}-${rates.max}/km${tollStr}${fareStr}`,
  };
}

/**
 * Estimate total trip transport cost across multiple legs.
 */
export function estimateTripTransportCost(
  legs: CostEstimatorInput[]
): { legs: TransportCostEstimate[]; total: { min: number; max: number; currency: string; distanceKm: number } } {
  const estimates = legs.map(estimateTransportCost);
  return {
    legs: estimates,
    total: {
      min: estimates.reduce((sum, e) => sum + e.min, 0),
      max: estimates.reduce((sum, e) => sum + e.max, 0),
      currency: "INR",
      distanceKm: estimates.reduce((sum, e) => sum + e.distanceKm, 0),
    },
  };
}

function normalizeMode(mode: string): string {
  const m = (mode || "DRIVE").toUpperCase();
  const MAP: Record<string, string> = {
    CAB: "DRIVE",
    CAR: "DRIVE",
    DRIVE: "DRIVE",
    DRIVING: "DRIVE",
    TWO_WHEELER: "TWO_WHEELER",
    MOTORCYCLE: "TWO_WHEELER",
    TRANSIT: "TRANSIT",
    PUBLIC_TRANSIT: "TRANSIT",
    TRAIN: "TRANSIT",
    BUS: "TRANSIT",
    WALK: "WALK",
    WALKING: "WALK",
    BICYCLE: "BICYCLE",
    CYCLING: "BICYCLE",
  };
  return MAP[m] || "DRIVE";
}
