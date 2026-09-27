import { NextResponse } from "next/server";
import { enforceRole } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

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
      include: {
        stops: {
          include: { location: true },
          orderBy: { sequence: "asc" },
        },
        selected_guide: {
          include: {
            user: {
              select: {
                user_id: true,
                full_name: true,
                email: true,
                profile_photo_url: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Authorization: User must own the trip (unless SUPER_ADMIN)
    if (
      authContext!.role !== UserRole.SUPER_ADMIN &&
      trip.user_id !== authContext!.userId
    ) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this trip" },
        { status: 403 }
      );
    }

    // Extract hotel if stored as a lodging stop or in metadata
    let hotel = null;
    const regularStops: any[] = [];

    for (const stop of trip.stops) {
      if (stop.location?.type === "lodging" || (stop.location?.type === "hotel")) {
        hotel = {
          id: stop.id,
          locationId: stop.location_id,
          placeId: stop.location.google_place_id || stop.location.place_id,
          name: stop.location.name,
          latitude: stop.location.latitude,
          longitude: stop.location.longitude,
          address: stop.location.formatted_address || stop.location.city,
        };
      } else {
        regularStops.push({
          id: stop.id,
          sequence: stop.sequence,
          arrivalDate: stop.arrival_date,
          departureDate: stop.departure_date,
          locationId: stop.location_id,
          name: stop.location?.name || "Stop",
          placeId: stop.location?.google_place_id || stop.location?.place_id,
          latitude: stop.location?.latitude,
          longitude: stop.location?.longitude,
          address: stop.location?.formatted_address,
          city: stop.location?.city,
          type: stop.location?.type,
        });
      }
    }

    // Guide details: only real guides
    let guide = null;
    if (trip.selected_guide && trip.selected_guide.user) {
      guide = {
        id: trip.selected_guide.id,
        name: trip.selected_guide.user.full_name || "Guide",
        photoUrl: trip.selected_guide.user.profile_photo_url,
        hourlyRate: trip.selected_guide.hourly_rate,
        currency: trip.selected_guide.currency,
        verificationStatus: trip.selected_guide.verification_status,
        availabilityStatus: trip.selected_guide.availability_status,
      };
    }

    return NextResponse.json({
      trip: {
        tripId: trip.trip_id,
        description: trip.description,
        startDate: trip.start_date,
        endDate: trip.end_date,
      },
      stops: regularStops,
      hotel,
      guide,
    });
  } catch (error) {
    console.error("GET /api/trips/[tripId]/map error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
