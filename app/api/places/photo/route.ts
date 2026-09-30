import { NextRequest, NextResponse } from "next/server";

// In-memory cache for resolved Google Photo CDN URLs
const photoCdnCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_SERVER_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY ||
    ""
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoName = searchParams.get("name");
    const maxHeight = searchParams.get("maxHeight") || "1000";
    const maxWidth = searchParams.get("maxWidth") || "1600";

    if (!photoName) {
      return NextResponse.json({ error: "Photo resource 'name' parameter is required" }, { status: 400 });
    }

    const cleanName = photoName.trim();
    const cacheKey = `${cleanName}_h${maxHeight}_w${maxWidth}`;

    const cached = photoCdnCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.redirect(cached.url, { status: 307 });
    }

    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: "Google Maps API key not configured" }, { status: 500 });
    }

    // Google Places API (New) photo media endpoint
    const googleMediaEndpoint = `https://places.googleapis.com/v1/${cleanName}/media?maxHeightPx=${maxHeight}&maxWidthPx=${maxWidth}&key=${apiKey}`;

    const res = await fetch(googleMediaEndpoint, {
      method: "GET",
      redirect: "manual",
    });

    if (res.status === 302 || res.status === 301 || res.status === 307) {
      const redirectLocation = res.headers.get("location");
      if (redirectLocation) {
        photoCdnCache.set(cacheKey, {
          url: redirectLocation,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return NextResponse.redirect(redirectLocation, {
          status: 307,
          headers: {
            "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
          },
        });
      }
    }

    // If Google returned the image binary directly (200 OK)
    if (res.ok) {
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    }

    return NextResponse.json({ error: "Failed to resolve photo from Google Places" }, { status: res.status });
  } catch (error) {
    console.error("[/api/places/photo] Error fetching photo:", error);
    return NextResponse.json({ error: "Internal server error fetching photo" }, { status: 500 });
  }
}
