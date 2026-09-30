import { NextResponse } from "next/server";
import { getPlaceDetailsById } from "../../../../server/src/services/googleMapsGateway.js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get("placeId");

    if (!placeId) {
      return NextResponse.json(
        { error: "placeId query parameter is required" },
        { status: 400 }
      );
    }

    const details: any = await getPlaceDetailsById(placeId);

    if (!details) {
      return NextResponse.json(
        { error: "Place not found", placeId },
        { status: 404 }
      );
    }

    return NextResponse.json({
      result: {
        placeId: details.placeId || placeId,
        name: details.name || "Unknown",
        address: details.address || details.formattedAddress || "",
        latitude: details.latitude,
        longitude: details.longitude,
        rating: details.rating || null,
        userRatingCount: details.userRatingCount || 0,
        editorialSummary: details.editorialSummary || null,
        reviews: details.reviews || [],
        regularOpeningHours: details.regularOpeningHours || null,
        currentOpeningHours: details.currentOpeningHours || null,
        primaryType: details.primaryType || "point_of_interest",
        priceLevel: details.priceLevel || null,
        websiteUri: details.websiteUri || details.website || null,
        googleMapsUri: details.googleMapsUri || null,
        photos: details.photos || [],
      },
      source: details.placeId ? "GOOGLE_PLACES" : "FALLBACK",
    });
  } catch (error) {
    console.error("GET /api/places/details error:", error);
    return NextResponse.json(
      { error: "Failed to fetch place details" },
      { status: 500 }
    );
  }
}
