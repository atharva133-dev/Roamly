import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";
import { searchNearbyPlaces } from "../../../../server/src/services/googleMapsGateway.js";

export async function GET(req: Request) {
  try {
    // Auth: if authenticated, prevent GUIDE from traveler features
    const authContext = await getAuthenticatedUser().catch(() => null);
    if (authContext && authContext.role === UserRole.GUIDE) {
      return NextResponse.json({ error: "Guides cannot access traveler trip planning" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("latitude") || searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("longitude") || searchParams.get("lng") || "");
    const radius = parseInt(searchParams.get("radius") || "1500", 10);
    const typesParam = searchParams.get("types") || "tourist_attraction";
    const excludeParam = searchParams.get("exclude") || "";
    const maxResults = parseInt(searchParams.get("maxResults") || "10", 10);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Valid latitude and longitude are required" }, { status: 400 });
    }

    const includedTypes = typesParam.split(",").map(s => s.trim()).filter(Boolean);
    const excludedPlaceIds = excludeParam.split(",").map(s => s.trim()).filter(Boolean);

    const places = await searchNearbyPlaces({
      latitude: lat,
      longitude: lng,
      radiusMeters: Math.min(radius, 50000),
      includedTypes,
      excludedPlaceIds,
      maxResultCount: Math.min(maxResults, 20),
    });

    return NextResponse.json({
      places,
      total: places.length,
      center: { latitude: lat, longitude: lng },
      radiusMeters: radius,
    });
  } catch (error) {
    console.error("GET /api/places/nearby error:", error);
    return NextResponse.json({ error: "Failed to search nearby places" }, { status: 500 });
  }
}
