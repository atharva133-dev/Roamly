import { NextResponse } from "next/server";
import { geocode, findOrCreateLocation } from "@/server/src/services/googleMapsGateway.js";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { address, placeId, name } = body;

    const query = address || name || "";
    if (!query.trim() && !placeId) {
      return NextResponse.json(
        { error: "Address, name, or placeId is required" },
        { status: 400 }
      );
    }

    const location = await findOrCreateLocation({
      placeId,
      name: query,
      formattedAddress: address
    });

    return NextResponse.json({ location });
  } catch (error: any) {
    console.error("[POST /api/locations/geocode] Error:", error.message);
    return NextResponse.json(
      { error: "Failed to geocode address" },
      { status: 500 }
    );
  }
}
