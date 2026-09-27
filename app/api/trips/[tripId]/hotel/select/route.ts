import { NextResponse } from "next/server";
import { enforceRole } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { findOrCreateLocation } from "../../../../../../server/src/services/googleMapsGateway.js";

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

    const body = await req.json();
    const { placeId, name, latitude, longitude, address, city } = body;

    if (!name || (!placeId && (!latitude || !longitude))) {
      return NextResponse.json(
        { error: "name and placeId or coordinates are required" },
        { status: 400 }
      );
    }

    // Canonical location for hotel
    const hotelLocation = await findOrCreateLocation({
      placeId,
      name,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      formattedAddress: address,
      city: city || "Destination",
      type: "lodging",
    });

    // Remove any previous hotel stop for this trip
    const existingHotelStops = trip.stops.filter(
      (s) => s.location?.type === "lodging" || s.sequence === 0
    );
    for (const hs of existingHotelStops) {
      await prisma.stop.delete({ where: { id: hs.id } });
    }

    // Create new hotel anchor stop (sequence 0)
    const newStop = await prisma.stop.create({
      data: {
        trip_id: parsedTripId,
        location_id: hotelLocation.id,
        sequence: 0,
      },
      include: { location: true },
    });

    return NextResponse.json({
      success: true,
      hotel: {
        id: newStop.id,
        locationId: hotelLocation.id,
        placeId: hotelLocation.googlePlaceId || (hotelLocation as any).placeId || placeId,
        name: hotelLocation.name,
        latitude: hotelLocation.coordinates?.lat ?? latitude,
        longitude: hotelLocation.coordinates?.lng ?? longitude,
        address: hotelLocation.address?.formatted || address,
      },
    });
  } catch (error) {
    console.error("POST /api/trips/[tripId]/hotel/select error:", error);
    return NextResponse.json(
      { error: "Failed to select hotel" },
      { status: 500 }
    );
  }
}
