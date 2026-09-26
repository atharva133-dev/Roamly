import { NextResponse } from "next/server";
import { getLocationById } from "@/server/src/services/googleMapsGateway.js";

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

    return NextResponse.json({ location });
  } catch (error: any) {
    console.error("[GET /api/locations/:id] Error:", error.message);
    return NextResponse.json({ error: "Failed to retrieve location" }, { status: 500 });
  }
}
