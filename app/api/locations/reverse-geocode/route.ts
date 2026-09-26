import { NextResponse } from "next/server";
import { reverseGeocodeCoordinates, findOrCreateLocation } from "@/server/src/services/googleMapsGateway.js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");

    if (!latStr || !lngStr) {
      return NextResponse.json(
        { error: "Both lat and lng parameters are required" },
        { status: 400 }
      );
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Latitude and longitude must be valid numbers" },
        { status: 400 }
      );
    }

    const geoResult: any = await reverseGeocodeCoordinates(lat, lng);
    if (!geoResult) {
      return NextResponse.json(
        { error: "Unable to reverse geocode the given coordinates" },
        { status: 404 }
      );
    }

    const location = await findOrCreateLocation({
      placeId: geoResult.placeId,
      name: geoResult.city || geoResult.formattedAddress.split(",")[0],
      latitude: geoResult.latitude,
      longitude: geoResult.longitude,
      formattedAddress: geoResult.formattedAddress,
      city: geoResult.city,
      state: geoResult.state,
      country: geoResult.country,
      postalCode: geoResult.postalCode
    });

    return NextResponse.json({ location });
  } catch (error: any) {
    console.error("[GET /api/locations/reverse-geocode] Error:", error.message);
    return NextResponse.json(
      { error: "Failed to reverse geocode location" },
      { status: 500 }
    );
  }
}
