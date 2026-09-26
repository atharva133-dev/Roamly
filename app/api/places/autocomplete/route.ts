import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const input = searchParams.get("input");

    if (!input || input.length < 2) {
      return NextResponse.json({ predictions: [] });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      // Return mock suggestions when no API key configured
      const mockPlaces = [
        {
          place_id: "ChIJwe1EZjDG5zsRaYxkjY_tpF0",
          description: "Gateway of India, Apollo Bandar, Colaba, Mumbai, Maharashtra, India",
          structured_formatting: {
            main_text: "Gateway of India",
            secondary_text: "Apollo Bandar, Colaba, Mumbai, Maharashtra, India",
          },
        },
        {
          place_id: "ChIJH3mwTE7H5zsRPcgzUcK7cRQ",
          description: "Chhatrapati Shivaji Maharaj Terminus, Fort, Mumbai, Maharashtra, India",
          structured_formatting: {
            main_text: "Chhatrapati Shivaji Maharaj Terminus",
            secondary_text: "Fort, Mumbai, Maharashtra, India",
          },
        },
        {
          place_id: "ChIJRYBjxHrH5zsREm7M5PjM3BI",
          description: "Marine Drive, Mumbai, Maharashtra, India",
          structured_formatting: {
            main_text: "Marine Drive",
            secondary_text: "Mumbai, Maharashtra, India",
          },
        },
        {
          place_id: "ChIJZ81elU3H5zsRD7AsNLBWx8k",
          description: "Elephanta Caves, Elephanta Island, Mumbai, Maharashtra, India",
          structured_formatting: {
            main_text: "Elephanta Caves",
            secondary_text: "Elephanta Island, Mumbai, Maharashtra, India",
          },
        },
        {
          place_id: "ChIJ39WHdKnH5zsRe3J_abS-OPg",
          description: "Colaba Causeway, Colaba, Mumbai, Maharashtra, India",
          structured_formatting: {
            main_text: "Colaba Causeway",
            secondary_text: "Colaba, Mumbai, Maharashtra, India",
          },
        },
      ].filter(
        (p) =>
          p.description.toLowerCase().includes(input.toLowerCase()) ||
          p.structured_formatting.main_text.toLowerCase().includes(input.toLowerCase())
      );

      return NextResponse.json({ predictions: mockPlaces, isMock: true });
    }

    // Real Google Places Autocomplete API call
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/autocomplete/json"
    );
    url.searchParams.set("input", input);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("types", "establishment|geocode");
    url.searchParams.set("language", "en");

    const response = await fetch(url.toString());
    const data = await response.json();

    return NextResponse.json({
      predictions: data.predictions || [],
      isMock: false,
    });
  } catch (error) {
    console.error("Places autocomplete error:", error);
    return NextResponse.json(
      { error: "Failed to fetch places", predictions: [] },
      { status: 500 }
    );
  }
}
