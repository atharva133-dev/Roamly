import { NextResponse } from "next/server";
import { searchPlaces } from "@/server/src/services/googleMapsGateway.js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (!q.trim()) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = await searchPlaces(q);
    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error("[GET /api/locations/search] Error:", error.message);
    return NextResponse.json(
      { error: "Failed to search locations", suggestions: [] },
      { status: 500 }
    );
  }
}
