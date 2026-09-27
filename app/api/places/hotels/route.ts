import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";
import { searchHotels } from "../../../../server/src/services/googleMapsGateway.js";

export async function GET(req: Request) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (authContext.role === UserRole.GUIDE) {
      return NextResponse.json({ error: "Guides cannot access traveler trip planning" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("latitude") || searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("longitude") || searchParams.get("lng") || "");
    const radius = parseInt(searchParams.get("radius") || "5000", 10);
    const maxResults = parseInt(searchParams.get("maxResults") || "10", 10);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Valid latitude and longitude are required" }, { status: 400 });
    }

    const hotels = await searchHotels({
      latitude: lat,
      longitude: lng,
      radiusMeters: Math.min(radius, 50000),
      maxResultCount: Math.min(maxResults, 20),
    });

    return NextResponse.json({
      hotels,
      total: hotels.length,
      center: { latitude: lat, longitude: lng },
      radiusMeters: radius,
    });
  } catch (error) {
    console.error("GET /api/places/hotels error:", error);
    return NextResponse.json({ error: "Failed to search hotels" }, { status: 500 });
  }
}
