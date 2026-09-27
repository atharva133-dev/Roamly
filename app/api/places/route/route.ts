import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";
import { getRouteBetween, computeMultiStopRoute } from "../../../../server/src/services/googleMapsGateway.js";
import { estimateTransportCost, estimateTripTransportCost } from "@/lib/transport/cost-estimator";

export async function POST(req: Request) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (authContext.role === UserRole.GUIDE) {
      return NextResponse.json({ error: "Guides cannot access traveler trip planning" }, { status: 403 });
    }

    const body = await req.json();
    const { origin, stops, destination, travelMode = "DRIVE", optimizeOrder = false } = body;

    if (!origin || !origin.lat || !origin.lng) {
      return NextResponse.json({ error: "origin with lat/lng is required" }, { status: 400 });
    }

    // Map Google-style travelMode to our internal mode
    const modeMap: Record<string, string> = {
      DRIVE: "CAB",
      CAR: "CAB",
      TRANSIT: "PUBLIC_TRANSIT",
      WALK: "WALKING",
      TWO_WHEELER: "CAB", // Routes API only supports DRIVE for vehicles
      BICYCLE: "WALKING", // Routes API doesn't support bicycle, use walk as approximation
    };
    const internalMode = (modeMap[travelMode.toUpperCase()] || "CAB") as "TRAIN" | "PUBLIC_TRANSIT" | "CAB" | "WALKING";

    // Single-stop route
    if (!stops || stops.length === 0) {
      if (!destination || !destination.lat || !destination.lng) {
        return NextResponse.json({ error: "destination with lat/lng is required for single-stop route" }, { status: 400 });
      }

      const route: any = await getRouteBetween({
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        mode: internalMode,
      });

      const distanceKm = route.distanceMeters ? route.distanceMeters / 1000 : 0;
      const cost = estimateTransportCost({
        mode: travelMode,
        distanceKm,
        tollCost: null,
        transitFare: route.fare || null,
        transitFareSource: route.fareSource,
      });

      return NextResponse.json({
        route: {
          ...route,
          distanceKm: Math.round(distanceKm * 10) / 10,
          durationMinutes: route.durationSeconds ? Math.round(route.durationSeconds / 60) : null,
        },
        cost,
        travelMode,
      });
    }

    // Multi-stop route
    const waypoints = stops
      .filter((s: any) => s && Number.isFinite(s.lat) && Number.isFinite(s.lng))
      .map((s: any) => ({ lat: s.lat, lng: s.lng }));

    const dest = destination && destination.lat && destination.lng
      ? { lat: destination.lat, lng: destination.lng }
      : { lat: origin.lat, lng: origin.lng }; // Return to origin if no destination

    const multiRoute: any = await computeMultiStopRoute({
      origin: { lat: origin.lat, lng: origin.lng },
      waypoints,
      destination: dest,
      mode: internalMode,
      optimizeOrder,
    });

    // Compute per-leg costs
    const legCostInputs = multiRoute.legs.map((leg: any) => ({
      mode: travelMode,
      distanceKm: leg.distanceMeters ? leg.distanceMeters / 1000 : 0,
      tollCost: null,
      transitFare: leg.fare || null,
    }));

    const tripCost = estimateTripTransportCost(legCostInputs);

    return NextResponse.json({
      route: {
        available: multiRoute.available,
        totalDistanceKm: Math.round((multiRoute.totalDistanceMeters / 1000) * 10) / 10,
        totalDurationMinutes: Math.round(multiRoute.totalDurationSeconds / 60),
        legs: multiRoute.legs.map((leg: any, i: number) => ({
          from: leg.from,
          to: leg.to,
          distanceKm: leg.distanceMeters ? Math.round((leg.distanceMeters / 1000) * 10) / 10 : null,
          durationMinutes: leg.durationSeconds ? Math.round(leg.durationSeconds / 60) : null,
          available: leg.available,
          routeSource: leg.routeSource,
          cost: tripCost.legs[i],
        })),
        optimizedOrder: multiRoute.optimizedOrder,
        routeSource: multiRoute.routeSource,
      },
      cost: tripCost.total,
      travelMode,
    });
  } catch (error) {
    console.error("POST /api/places/route error:", error);
    return NextResponse.json({ error: "Failed to compute route" }, { status: 500 });
  }
}
