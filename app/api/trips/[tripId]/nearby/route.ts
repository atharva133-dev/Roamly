import { NextResponse } from "next/server";
import { enforceRole } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { searchNearbyPlaces } from "../../../../../server/src/services/googleMapsGateway.js";

export async function GET(
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
      include: { stops: { include: { location: true } } },
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

    const { searchParams } = new URL(req.url);
    let lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : null;
    let lng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : null;
    const radiusMeters = searchParams.get("radius")
      ? parseInt(searchParams.get("radius")!, 10)
      : 1500;

    // Default to first valid stop or hotel coordinate
    if (lat === null || lng === null) {
      for (const stop of trip.stops) {
        if (stop.location?.latitude && stop.location?.longitude) {
          lat = stop.location.latitude;
          lng = stop.location.longitude;
          break;
        }
      }
    }

    if (lat === null || lng === null) {
      return NextResponse.json(
        { error: "No coordinates available to search nearby places" },
        { status: 400 }
      );
    }

    // Exclude places already selected in the trip
    const excludedPlaceIds = trip.stops
      .map((s) => s.location?.google_place_id || s.location?.place_id)
      .filter(Boolean) as string[];

    const nearbyPlaces = await searchNearbyPlaces({
      latitude: lat,
      longitude: lng,
      radiusMeters,
      excludedPlaceIds,
      maxResultCount: 10,
    });

    return NextResponse.json({
      places: nearbyPlaces,
      center: { lat, lng },
      radiusMeters,
    });
  } catch (error) {
    console.error("GET /api/trips/[tripId]/nearby error:", error);
    return NextResponse.json(
      { error: "Failed to search nearby places" },
      { status: 500 }
    );
  }
}
