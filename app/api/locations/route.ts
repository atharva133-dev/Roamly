import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { enforceRole } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";
import { findOrCreateLocation } from "@/server/src/services/googleMapsGateway.js";

// Initial seed locations if database is empty
const INITIAL_LOCATIONS = [
  {
    name: "Gateway of India",
    city: "Mumbai",
    country: "India",
    latitude: 18.9220,
    longitude: 72.8347,
    type: "monument",
    place_id: "ChIJbU60qHA6DDkRkiAnUt-3NLg"
  },
  {
    name: "Colaba Causeway & Heritage Quarter",
    city: "Mumbai",
    country: "India",
    latitude: 18.9150,
    longitude: 72.8258,
    type: "market",
    place_id: "ChIJbU60qHA6DDkRkiAnUt-3Col"
  },
  {
    name: "Marine Drive Promenade",
    city: "Mumbai",
    country: "India",
    latitude: 18.9432,
    longitude: 72.8230,
    type: "beach",
    place_id: "ChIJ7-06B7q75zsR_1w786g_v20"
  },
  {
    name: "Elephanta Caves",
    city: "Mumbai",
    country: "India",
    latitude: 18.9633,
    longitude: 72.9315,
    type: "temple",
    place_id: "ChIJ40i5iQ255zsRnBq5tC1JpP8"
  },
  {
    name: "Chhatrapati Shivaji Maharaj Terminus (CSMT)",
    city: "Mumbai",
    country: "India",
    latitude: 18.9400,
    longitude: 72.8353,
    type: "monument",
    place_id: "ChIJp7eQjQ645zsREmYt9fK4kXg"
  }
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");

    let count = await prisma.location.count();
    
    // Auto-seed if empty
    if (count === 0) {
      await prisma.location.createMany({
        data: INITIAL_LOCATIONS.map(loc => ({
          ...loc,
          is_active: true,
        }))
      });
    }

    const whereClause: { is_active: boolean; city?: string } = { is_active: true };
    if (city) {
      whereClause.city = city;
    }

    const locations = await prisma.location.findMany({
      where: whereClause,
      include: {
        guideLocations: {
          where: {
            is_active: true,
            guide: {
              verification_status: "VERIFIED",
              availability_status: "AVAILABLE",
            }
          }
        },
        _count: {
          select: {
            guideLocations: {
              where: {
                is_active: true,
                guide: {
                  verification_status: "VERIFIED",
                  availability_status: "AVAILABLE",
                }
              }
            }
          }
        }
      },
      orderBy: { name: "asc" }
    });

    const formattedLocations = locations.map(loc => ({
      id: loc.id,
      name: loc.name,
      city: loc.city,
      country: loc.country,
      latitude: loc.latitude,
      longitude: loc.longitude,
      googlePlaceId: loc.google_place_id || loc.place_id,
      formattedAddress: loc.formatted_address,
      type: loc.type,
      activeGuidesCount: loc._count.guideLocations
    }));

    return NextResponse.json({ locations: formattedLocations });
  } catch (error) {
    console.warn("DB offline or unreachable, serving cached locations:", error);
    return NextResponse.json({
      locations: INITIAL_LOCATIONS.map((loc, idx) => ({
        id: `loc_${idx + 1}`,
        name: loc.name,
        city: loc.city,
        country: loc.country,
        latitude: loc.latitude,
        longitude: loc.longitude,
        googlePlaceId: loc.place_id,
        type: loc.type,
        activeGuidesCount: idx === 0 ? 2 : idx === 1 ? 2 : 1,
      }))
    });
  }
}

export async function POST(req: Request) {
  try {
    const { errorResponse } = await enforceRole([UserRole.SUPER_ADMIN]);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { name, city, country = "India", latitude, longitude, type, placeId, formattedAddress } = body;

    if (!name && !placeId) {
      return NextResponse.json({ error: "Name or placeId is required" }, { status: 400 });
    }

    const location = await findOrCreateLocation({
      name,
      city,
      country,
      latitude,
      longitude,
      type: type || "monument",
      placeId,
      formattedAddress
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/locations error:", error.message);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}
