/**
 * Route Agent
 *
 * Computes travel distance/duration between consecutive resolved stops using
 * Google Routes API (v2), respecting the user's transportation preference.
 *
 * Per the "critical transit rule": a transportation preference is a request,
 * not a guarantee. Every leg records the actual travel mode(s) Google
 * returned and whether the preference was actually satisfied — Gemini and
 * validationAgent both see this, never a silently-assumed match.
 */

import { getRouteBetween } from "../services/googleMapsGateway.js";

export async function execute(context) {
  const resolvedLocations = context?.resolvedLocations || [];
  const mode = context?.tripRequest?.transportationPreference || "CAB";

  const transitRoutes = [];
  let usedFallback = false;
  let anyUnavailable = false;

  for (let i = 0; i < resolvedLocations.length - 1; i++) {
    const from = resolvedLocations[i];
    const to = resolvedLocations[i + 1];

    // Repeated stops (Delhi -> Agra -> Delhi) will recompute the same leg in
    // reverse; getRouteBetween's short-lived cache keeps this cheap.
    const result = await getRouteBetween({
      origin: from.coordinates,
      destination: to.coordinates,
      mode
    });

    if (result.routeSource === "ROAMLY_ESTIMATE") usedFallback = true;
    if (!result.available) anyUnavailable = true;

    transitRoutes.push({
      fromLocationId: from.id,
      toLocationId: to.id,
      fromName: from.name,
      toName: to.name,
      ...result
    });
  }

  return {
    success: true,
    data: { transitRoutes },
    warnings: anyUnavailable
      ? [{ code: "ROUTE_UNAVAILABLE", details: "One or more legs have no available route for the requested transit mode" }]
      : [],
    source: usedFallback ? "ROAMLY_ESTIMATE" : "GOOGLE_ROUTES",
    fallbackUsed: usedFallback
  };
}

export default { execute };
