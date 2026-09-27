import { NextResponse } from "next/server";
import { enforceRole } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getPlaceDetailsById } from "../../../../../../server/src/services/googleMapsGateway.js";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

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
    const { placeIds } = body;

    if (!Array.isArray(placeIds) || placeIds.length < 2 || placeIds.length > 5) {
      return NextResponse.json(
        { error: "Please provide between 2 and 5 placeIds to compare" },
        { status: 400 }
      );
    }

    // Get reference coordinates (average of trip stops)
    const validStopCoords = trip.stops
      .filter((s) => s.location?.latitude && s.location?.longitude && s.location?.type !== "lodging")
      .map((s) => ({ lat: s.location!.latitude!, lng: s.location!.longitude! }));

    const centerLat =
      validStopCoords.length > 0
        ? validStopCoords.reduce((sum, c) => sum + c.lat, 0) / validStopCoords.length
        : null;
    const centerLng =
      validStopCoords.length > 0
        ? validStopCoords.reduce((sum, c) => sum + c.lng, 0) / validStopCoords.length
        : null;

    const comparisonResults = await Promise.all(
      placeIds.map(async (pid: string) => {
        const details: any = await getPlaceDetailsById(pid);
        if (!details) {
          return { placeId: pid, error: "Details unavailable" };
        }

        let distanceFromCenterKm = null;
        if (
          centerLat !== null &&
          centerLng !== null &&
          details.latitude &&
          details.longitude
        ) {
          distanceFromCenterKm = haversineKm(
            centerLat,
            centerLng,
            details.latitude,
            details.longitude
          );
        }

        return {
          placeId: details.placeId || pid,
          name: details.name || "Hotel",
          rating: details.rating || null,
          userRatingCount: details.userRatingCount || 0,
          priceLevel: details.priceLevel || "Unavailable",
          address: details.address || details.formattedAddress || "",
          latitude: details.latitude,
          longitude: details.longitude,
          distanceFromTripAreaKm: distanceFromCenterKm,
          googleMapsUri: details.googleMapsUri || null,
          reviews: (details.reviews || []).slice(0, 3).map((r: any) => ({
            authorName: r.authorName || r.author_name,
            rating: r.rating,
            text: r.text,
            relativeTimeDescription: r.relativeTimeDescription || r.relative_time_description,
          })),
        };
      })
    );

    return NextResponse.json({
      comparison: comparisonResults,
      count: comparisonResults.length,
      note: "Ratings and reviews are factual data from Google Places. Price level reflects relative expense category, not a live nightly room rate.",
    });
  } catch (error) {
    console.error("POST /api/trips/[tripId]/hotels/compare error:", error);
    return NextResponse.json(
      { error: "Failed to compare hotels" },
      { status: 500 }
    );
  }
}
