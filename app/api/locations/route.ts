import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { enforceRole } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";
import { findOrCreateLocation } from "@/server/src/services/googleMapsGateway.js";

// Initial seed locations if database is empty or offline
const INITIAL_LOCATIONS = [
  {
    id: "loc_1",
    name: "Gateway of India",
    city: "Mumbai",
    country: "India",
    latitude: 18.9220,
    longitude: 72.8347,
    type: "monument",
    place_id: "ChIJbU60qHA6DDkRkiAnUt-3NLg",
    activeGuidesCount: 2
  },
  {
    id: "loc_2",
    name: "Colaba Causeway & Heritage Quarter",
    city: "Mumbai",
    country: "India",
    latitude: 18.9150,
    longitude: 72.8258,
    type: "market",
    place_id: "ChIJbU60qHA6DDkRkiAnUt-3Col",
    activeGuidesCount: 2
  },
  {
    id: "loc_3",
    name: "Marine Drive Promenade",
    city: "Mumbai",
    country: "India",
    latitude: 18.9432,
    longitude: 72.8230,
    type: "beach",
    place_id: "ChIJ7-06B7q75zsR_1w786g_v20",
    activeGuidesCount: 1
  },
  {
    id: "loc_4",
    name: "Elephanta Caves",
    city: "Mumbai",
    country: "India",
    latitude: 18.9633,
    longitude: 72.9315,
    type: "temple",
    place_id: "ChIJ40i5iQ255zsRnBq5tC1JpP8",
    activeGuidesCount: 1
  },
  {
    id: "loc_5",
    name: "Chhatrapati Shivaji Maharaj Terminus (CSMT)",
    city: "Mumbai",
    country: "India",
    latitude: 18.9400,
    longitude: 72.8353,
    type: "monument",
    place_id: "ChIJp7eQjQ645zsREmYt9fK4kXg",
    activeGuidesCount: 1
  }
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get("city");
    const query = searchParams.get("query") || searchParams.get("q");

    if (query && query.trim()) {
      try {
        const cleanQuery = query.trim();
        const loc: any = await findOrCreateLocation({ name: cleanQuery, formattedAddress: cleanQuery });
        if (loc) {
          const lat = loc.coordinates?.lat ?? loc.latitude;
          const lng = loc.coordinates?.lng ?? loc.longitude;
          return NextResponse.json({
            locations: [loc],
            location: loc,
            latitude: lat,
            longitude: lng,
            formattedAddress: loc.address?.formatted || loc.formattedAddress || cleanQuery,
          });
        }
      } catch (err: any) {
        console.warn("[GET /api/locations] query geocoding failed:", err.message);
      }
    }

    let count = 0;
    try {
      count = await prisma.location.count();
      if (count === 0) {
        await prisma.location.createMany({
          data: INITIAL_LOCATIONS.map(loc => ({
            name: loc.name,
            city: loc.city,
            country: loc.country,
            latitude: loc.latitude,
            longitude: loc.longitude,
            type: loc.type,
            place_id: loc.place_id,
            is_active: true,
          }))
        });
      }
    } catch {
      // Prisma offline or table missing
      return NextResponse.json({
        locations: INITIAL_LOCATIONS.map(loc => ({
          ...loc,
          googlePlaceId: loc.place_id,
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
      locations: INITIAL_LOCATIONS.map(loc => ({
        ...loc,
        googlePlaceId: loc.place_id,
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

    const location = await prisma.location.create({
      data: {
        name: name || "Unknown Location",
        city: city || "Mumbai",
        country,
        latitude,
        longitude,
        type: type || "monument",
        place_id: placeId,
        google_place_id: placeId,
        formatted_address: formattedAddress,
        is_active: true,
      }
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/locations error:", error.message);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}
