import { NextResponse } from "next/server";
import { enforceRole } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  getRouteBetween,
  computeMultiStopRoute,
} from "../../../../../server/src/services/googleMapsGateway.js";
import {
  estimateTripTransportCost,
  estimateTransportCost,
} from "@/lib/transport/cost-estimator";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { errorResponse, authContext } = await enforceRole([
      UserRole.USER,
      UserRole.SUPER_ADMIN,
    ]);
    if (errorResponse) return errorResponse;

    const { tripId } = await params;
    const parsedTripId = parseInt(tripId, 10);
    if (isNaN(parsedTripId)) {
      return NextResponse.json({ error: "Invalid trip ID" }, { status: 400 });
    }

    const trip = await prisma.trip.findUnique({
      where: { trip_id: parsedTripId },
      include: {
        stops: {
          include: { location: true },
          orderBy: { sequence: "asc" },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (
      authContext!.role !== UserRole.SUPER_ADMIN &&
      trip.user_id !== authContext!.userId
    ) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this trip" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      travelMode = "DRIVE",
      optimizeOrder = false,
      customOrigin,
      dayNumber,
    } = body;

    // Separate hotel stop (anchor) and activity stops
    const hotelStop = trip.stops.find(
      (s) => s.location?.type === "lodging" || s.sequence === 0
    );
    let activityStops = trip.stops.filter(
      (s) => s.location?.type !== "lodging" && s.sequence > 0
    );

    // If dayNumber specified, filter stops
    if (dayNumber && dayNumber > 0 && trip.start_date) {
      const baseTripDate = new Date(trip.start_date);
      activityStops = activityStops.filter((s) => {
        if (!s.arrival_date) return true;
        const diffDays = Math.floor(
          (new Date(s.arrival_date).getTime() - baseTripDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        return diffDays + 1 === dayNumber;
      });
    }

    // Determine Origin: customOrigin -> hotel -> first stop
    let origin: { lat: number; lng: number } | null = null;

    if (customOrigin && Number.isFinite(customOrigin.lat) && Number.isFinite(customOrigin.lng)) {
      origin = { lat: Number(customOrigin.lat), lng: Number(customOrigin.lng) };
    } else if (hotelStop?.location?.latitude && hotelStop?.location?.longitude) {
      origin = {
        lat: Number(hotelStop.location.latitude),
        lng: Number(hotelStop.location.longitude),
      };
    } else if (activityStops.length > 0 && activityStops[0].location?.latitude && activityStops[0].location?.longitude) {
      origin = {
        lat: Number(activityStops[0].location.latitude),
        lng: Number(activityStops[0].location.longitude),
      };
    }

    if (!origin) {
      return NextResponse.json(
        { error: "Origin location unavailable for route calculation" },
        { status: 400 }
      );
    }

    // Waypoints from activity stops
    const waypoints = activityStops
      .filter((s) => s.location?.latitude && s.location?.longitude)
      .map((s) => ({
        lat: Number(s.location!.latitude),
        lng: Number(s.location!.longitude),
        name: s.location!.name,
      }));

    // If return to hotel is appropriate (hotel exists as anchor), destination is origin
    const destination = hotelStop?.location?.latitude && hotelStop?.location?.longitude
      ? { lat: Number(hotelStop.location.latitude), lng: Number(hotelStop.location.longitude) }
      : (waypoints.length > 0 ? waypoints[waypoints.length - 1] : origin);

    // Map internal transport mode
    const modeMap: Record<string, "TRAIN" | "PUBLIC_TRANSIT" | "CAB" | "WALKING"> = {
      DRIVE: "CAB",
      CAR: "CAB",
      TRANSIT: "PUBLIC_TRANSIT",
      WALK: "WALKING",
      TWO_WHEELER: "CAB",
      BICYCLE: "WALKING",
    };
    const internalMode = modeMap[travelMode.toUpperCase()] || "CAB";

    if (waypoints.length === 0) {
      return NextResponse.json({
        route: {
          available: false,
          detail: "No stops to route",
          totalDistanceKm: 0,
          totalDurationMinutes: 0,
          legs: [],
        },
        cost: {
          min: 0,
          max: 0,
          currency: "INR",
          source: "Free",
          breakdown: "No travel required",
        },
        travelMode,
      });
    }

    // For single stop: origin -> stop
    if (waypoints.length === 1 && (!destination || (destination.lat === waypoints[0].lat && destination.lng === waypoints[0].lng))) {
      const leg: any = await getRouteBetween({
        origin,
        destination: waypoints[0],
        mode: internalMode,
      });

      const distanceKm = leg.distanceMeters ? leg.distanceMeters / 1000 : 0;
      const cost = estimateTransportCost({
        mode: travelMode,
        distanceKm,
        tollCost: null,
        transitFare: leg.fare || null,
        transitFareSource: leg.fareSource,
      });

      return NextResponse.json({
        route: {
          available: leg.available,
          totalDistanceKm: Math.round(distanceKm * 10) / 10,
          totalDurationMinutes: leg.durationSeconds ? Math.round(leg.durationSeconds / 60) : 0,
          legs: [
            {
              from: origin,
              to: waypoints[0],
              distanceKm: Math.round(distanceKm * 10) / 10,
              durationMinutes: leg.durationSeconds ? Math.round(leg.durationSeconds / 60) : null,
              cost,
              routeSource: leg.routeSource,
            },
          ],
          routeSource: leg.routeSource,
        },
        cost,
        travelMode,
      });
    }

    // Multi-stop routing
    const multiRoute: any = await computeMultiStopRoute({
      origin,
      waypoints: waypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
      destination,
      mode: internalMode,
      optimizeOrder,
    });

    // Leg cost calculations
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
          cost: tripCost.legs[i],
          routeSource: leg.routeSource,
          available: leg.available,
        })),
        optimizedOrder: multiRoute.optimizedOrder,
        routeSource: multiRoute.routeSource,
      },
      cost: tripCost.total,
      travelMode,
      originType: customOrigin ? "CUSTOM" : hotelStop ? "HOTEL" : "FIRST_STOP",
    });
  } catch (error) {
    console.error("POST /api/trips/[tripId]/route error:", error);
    return NextResponse.json(
      { error: "Failed to compute trip route" },
      { status: 500 }
    );
  }
}
