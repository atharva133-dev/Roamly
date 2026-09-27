import { NextResponse } from "next/server";
import { enforceRole } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { searchHotels } from "../../../../../server/src/services/googleMapsGateway.js";

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
      : 5000;

    // If coordinates not provided in query, infer from first trip stop
    if ((lat === null || lng === null) && trip.stops.length > 0) {
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
        { error: "Coordinates not available for hotel search" },
        { status: 400 }
      );
    }

    const hotels = await searchHotels({
      latitude: lat,
      longitude: lng,
      radiusMeters,
      maxResultCount: 10,
    });

    return NextResponse.json({
      hotels: (hotels || []).map((h: any) => ({
        placeId: h.placeId,
        name: h.name,
        latitude: h.latitude,
        longitude: h.longitude,
        address: h.address || h.formattedAddress,
        rating: h.rating,
        userRatingCount: h.userRatingCount,
        priceLevel: h.priceLevel,
        googleMapsUri: h.googleMapsUri,
        photos: h.photos,
      })),
      center: { lat, lng },
    });
  } catch (error) {
    console.error("GET /api/trips/[tripId]/hotels error:", error);
    return NextResponse.json(
      { error: "Failed to search hotels" },
      { status: 500 }
    );
  }
}
