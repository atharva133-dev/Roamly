import { NextResponse } from "next/server";
import { searchAttractions } from "@/server/src/services/googleMapsGateway.js";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || searchParams.get("query") || "";

    if (!q.trim()) {
      return NextResponse.json({ places: [] });
    }

    const places = await searchAttractions(q);
    return NextResponse.json({ places: places || [] });
  } catch (error: any) {
    console.error("[GET /api/places/search] Error:", error?.message);
    return NextResponse.json(
      { error: "Failed to search places", places: [] },
      { status: 500 }
    );
  }
}
