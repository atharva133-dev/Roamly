import { NextResponse } from "next/server";
import { getLocationById, getPlaceDetailsById } from "@/server/src/services/googleMapsGateway.js";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    }

    const location = await getLocationById(id);
    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    let details = null;
    if (location.googlePlaceId) {
      details = await getPlaceDetailsById(location.googlePlaceId);
    }

    return NextResponse.json({
      location,
      details: details || {
        placeId: location.googlePlaceId,
        name: location.name,
        address: location.address?.formatted || location.name,
        latitude: location.coordinates?.lat,
        longitude: location.coordinates?.lng,
        rating: null,
        userRatingCount: 0,
        reviews: [],
        regularOpeningHours: null,
        primaryType: location.type || "locality",
        photos: []
      }
    });
  } catch (error: any) {
    console.error("[GET /api/locations/:id/details] Error:", error.message);
    return NextResponse.json({ error: "Failed to retrieve location details" }, { status: 500 });
  }
}
