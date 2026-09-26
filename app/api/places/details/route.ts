import { NextResponse } from "next/server";

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

    // NOTE: GOOGLE_API_KEY is the Gemini/Generative Language key used elsewhere
    // in this codebase — it is NOT a Maps Platform key and must not be reused
    // here. GOOGLE_MAPS_SERVER_API_KEY is the shared key name used by every
    // other Maps integration (server/src/integrations/google/*.js).
    const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

    // Mock data for known place IDs when no API key is available
    const mockDetails: Record<string, object> = {
      ChIJwe1EZjDG5zsRaYxkjY_tpF0: {
        name: "Gateway of India",
        formatted_address:
          "Apollo Bandar, Colaba, Mumbai, Maharashtra 400001, India",
        place_id: "ChIJwe1EZjDG5zsRaYxkjY_tpF0",
        geometry: { location: { lat: 18.9217, lng: 72.8347 } },
        address_components: [
          { long_name: "Mumbai", types: ["locality"] },
          { long_name: "Maharashtra", types: ["administrative_area_level_1"] },
          { long_name: "India", types: ["country"] },
        ],
      },
      ChIJH3mwTE7H5zsRPcgzUcK7cRQ: {
        name: "Chhatrapati Shivaji Maharaj Terminus",
        formatted_address:
          "Chhatrapati Shivaji Maharaj Terminus Area, Fort, Mumbai, Maharashtra 400001, India",
        place_id: "ChIJH3mwTE7H5zsRPcgzUcK7cRQ",
        geometry: { location: { lat: 18.9398, lng: 72.8354 } },
        address_components: [
          { long_name: "Mumbai", types: ["locality"] },
          { long_name: "Maharashtra", types: ["administrative_area_level_1"] },
          { long_name: "India", types: ["country"] },
        ],
      },
      ChIJRYBjxHrH5zsREm7M5PjM3BI: {
        name: "Marine Drive",
        formatted_address: "Netaji Subhash Chandra Bose Road, Mumbai, Maharashtra 400020, India",
        place_id: "ChIJRYBjxHrH5zsREm7M5PjM3BI",
        geometry: { location: { lat: 18.9432, lng: 72.8235 } },
        address_components: [
          { long_name: "Mumbai", types: ["locality"] },
          { long_name: "Maharashtra", types: ["administrative_area_level_1"] },
          { long_name: "India", types: ["country"] },
        ],
      },
      ChIJZ81elU3H5zsRD7AsNLBWx8k: {
        name: "Elephanta Caves",
        formatted_address: "Elephanta Island, Mumbai, Maharashtra 400094, India",
        place_id: "ChIJZ81elU3H5zsRD7AsNLBWx8k",
        geometry: { location: { lat: 18.9633, lng: 72.9315 } },
        address_components: [
          { long_name: "Mumbai", types: ["locality"] },
          { long_name: "Maharashtra", types: ["administrative_area_level_1"] },
          { long_name: "India", types: ["country"] },
        ],
      },
      "ChIJ39WHdKnH5zsRe3J_abS-OPg": {
        name: "Colaba Causeway",
        formatted_address: "Colaba Causeway, Colaba, Mumbai, Maharashtra 400005, India",
        place_id: "ChIJ39WHdKnH5zsRe3J_abS-OPg",
        geometry: { location: { lat: 18.9186, lng: 72.8314 } },
        address_components: [
          { long_name: "Mumbai", types: ["locality"] },
          { long_name: "Maharashtra", types: ["administrative_area_level_1"] },
          { long_name: "India", types: ["country"] },
        ],
      },
    };

    if (!apiKey) {
      const mock = mockDetails[placeId];
      if (mock) {
        return NextResponse.json({ result: mock, isMock: true });
      }
      // Return a generic mock for unknown place IDs
      return NextResponse.json({
        result: {
          name: "Selected Location",
          formatted_address: "Mumbai, Maharashtra, India",
          place_id: placeId,
          geometry: { location: { lat: 19.076, lng: 72.8777 } },
          address_components: [
            { long_name: "Mumbai", types: ["locality"] },
            { long_name: "Maharashtra", types: ["administrative_area_level_1"] },
            { long_name: "India", types: ["country"] },
          ],
        },
        isMock: true,
      });
    }

    // Real Google Places Details API call
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/details/json"
    );
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("key", apiKey);
    url.searchParams.set(
      "fields",
      "name,formatted_address,place_id,geometry,address_components"
    );

    const response = await fetch(url.toString());
    const data = await response.json();

    return NextResponse.json({
      result: data.result || null,
      isMock: false,
    });
  } catch (error) {
    console.error("Places detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch place details" },
      { status: 500 }
    );
  }
}
