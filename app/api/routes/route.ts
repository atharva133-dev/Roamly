import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";

interface StopInput {
  lat: number;
  lng: number;
  name?: string;
  placeId?: string;
}

interface RoutesRequestBody {
  mode?: string;
  stops?: StopInput[];
}

const SUPPORTED_MODES = ["CAB", "PUBLIC_TRANSIT", "TRAIN", "WALKING", "TWO_WHEELER"] as const;
type SupportedMode = typeof SUPPORTED_MODES[number];

function normalizeMode(rawMode?: string): SupportedMode {
  if (!rawMode) return "CAB";
  const upper = rawMode.toUpperCase().trim();
  if (upper === "CAR" || upper === "DRIVE" || upper === "CAB") return "CAB";
  if (upper === "TRANSIT" || upper === "PUBLIC_TRANSIT" || upper === "BUS") return "PUBLIC_TRANSIT";
  if (upper === "TRAIN" || upper === "RAIL") return "TRAIN";
  if (upper === "WALK" || upper === "WALKING") return "WALKING";
  if (upper === "TWO_WHEELER" || upper === "2-WHEELER" || upper === "BIKE" || upper === "MOTORCYCLE") return "TWO_WHEELER";
  return "CAB";
}

function getGoogleTravelMode(mode: SupportedMode): string {
  switch (mode) {
    case "CAB":
      return "DRIVE";
    case "PUBLIC_TRANSIT":
    case "TRAIN":
      return "TRANSIT";
    case "WALKING":
      return "WALK";
    case "TWO_WHEELER":
      return "TWO_WHEELER";
    default:
      return "DRIVE";
  }
}

function haversineDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(R * c);
}

function computeDeterministicLegEstimate(origin: StopInput, destination: StopInput, mode: SupportedMode) {
  const distanceMeters = haversineDistanceMeters(origin, destination);
  const distanceKm = distanceMeters / 1000;

  const AVG_SPEED_KMH: Record<SupportedMode, number> = {
    TRAIN: 50,
    PUBLIC_TRANSIT: 25,
    CAB: 35,
    TWO_WHEELER: 30,
    WALKING: 4.5,
  };

  const FARE_PER_KM_INR: Record<SupportedMode, number> = {
    TRAIN: 2,
    PUBLIC_TRANSIT: 3,
    CAB: 16,
    TWO_WHEELER: 6,
    WALKING: 0,
  };

  const speed = AVG_SPEED_KMH[mode] || 35;
  const durationSeconds = Math.round((distanceKm / speed) * 3600);
  const fare = mode === "WALKING" ? 0 : Math.round(Math.max(30, distanceKm * (FARE_PER_KM_INR[mode] ?? 12)));

  return {
    distanceMeters,
    durationSeconds,
    routeSource: "ROAMLY_ESTIMATE",
    fare,
    currency: "INR",
    actualTravelModes: [mode],
    encodedPolyline: null as string | null,
    preferenceSatisfied: true,
  };
}

export async function POST(req: Request) {
  try {
    const authContext = await getAuthenticatedUser().catch(() => null);
    if (authContext && authContext.role === UserRole.GUIDE) {
      return NextResponse.json({ error: "Guides cannot access traveler routing" }, { status: 403 });
    }

    const body: RoutesRequestBody = await req.json().catch(() => ({}));
    const rawMode = body.mode;
    const mode = normalizeMode(rawMode);
    const googleTravelMode = getGoogleTravelMode(mode);

    const rawStops = Array.isArray(body.stops) ? body.stops : [];
    const validStops = rawStops.filter(
      (s): s is StopInput =>
        Boolean(s) &&
        typeof s.lat === "number" &&
        typeof s.lng === "number" &&
        Number.isFinite(s.lat) &&
        Number.isFinite(s.lng)
    );

    if (validStops.length < 2) {
      return NextResponse.json(
        {
          error: "At least 2 stops with valid latitude and longitude coordinates are required to compute a route.",
          receivedStopsCount: validStops.length,
        },
        { status: 400 }
      );
    }

    const apiKey = (process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "").trim();
    const endpoint = "https://routes.googleapis.com/directions/v2:computeRoutes";
    const fieldMask = [
      "routes.duration",
      "routes.distanceMeters",
      "routes.travelAdvisory.transitFare",
      "routes.legs.steps.travelMode",
      "routes.polyline.encodedPolyline",
    ].join(",");

    const legs = [];
    let hasGoogleSource = false;
    let hasEstimateSource = false;

    for (let i = 0; i < validStops.length - 1; i++) {
      const origin = validStops[i];
      const destination = validStops[i + 1];

      let legResult: {
        distanceMeters: number | null;
        durationSeconds: number | null;
        routeSource: string;
        fare: number | null;
        currency: string | null;
        actualTravelModes: string[];
        encodedPolyline: string | null;
      } | null = null;

      if (apiKey) {
        try {
          const requestPayload: any = {
            origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
            destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
            travelMode: googleTravelMode,
          };

          if (googleTravelMode === "DRIVE") {
            requestPayload.routingPreference = "TRAFFIC_AWARE";
          } else if (mode === "TRAIN") {
            requestPayload.transitPreferences = { allowedTravelModes: ["TRAIN", "RAIL"] };
          }

          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": fieldMask,
            },
            body: JSON.stringify(requestPayload),
          });

          if (res.ok) {
            const data = await res.json();
            const route = data?.routes?.[0];
            if (route) {
              const stepModes = new Set<string>();
              for (const leg of route.legs || []) {
                for (const step of leg.steps || []) {
                  if (step.travelMode) stepModes.add(step.travelMode);
                }
              }
              const actualModes = stepModes.size > 0 ? Array.from(stepModes) : [googleTravelMode];
              const durationSeconds = route.duration
                ? parseInt(String(route.duration).replace("s", ""), 10)
                : null;
              const transitFare = route.travelAdvisory?.transitFare;

              // Calculate fare for taxi/two-wheeler if not transit
              let fareAmount: number | null = null;
              if (transitFare) {
                fareAmount = Number(transitFare.units || 0) + Number(transitFare.nanos || 0) / 1e9;
              } else if (mode === "CAB" && route.distanceMeters) {
                const km = route.distanceMeters / 1000;
                fareAmount = Math.round(50 + km * 15);
              } else if (mode === "TWO_WHEELER" && route.distanceMeters) {
                const km = route.distanceMeters / 1000;
                fareAmount = Math.round(25 + km * 6);
              } else if (mode === "WALKING") {
                fareAmount = 0;
              }

              legResult = {
                distanceMeters: route.distanceMeters ?? null,
                durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
                routeSource: "GOOGLE_ROUTES",
                fare: fareAmount,
                currency: transitFare?.currencyCode || "INR",
                actualTravelModes: actualModes,
                encodedPolyline: route.polyline?.encodedPolyline || null,
              };
              hasGoogleSource = true;
            }
          }
        } catch (err: any) {
          console.warn(`[POST /api/routes] Google Routes API call failed for leg ${i}:`, err.message);
        }
      }

      // If Google call was unavailable or failed, fall back to deterministic estimate without fabricating polyline
      if (!legResult) {
        legResult = computeDeterministicLegEstimate(origin, destination, mode);
        hasEstimateSource = true;
      }

      legs.push({
        fromIndex: i,
        toIndex: i + 1,
        fromName: origin.name || `Stop ${i + 1}`,
        toName: destination.name || `Stop ${i + 2}`,
        fromCoords: { lat: origin.lat, lng: origin.lng },
        toCoords: { lat: destination.lat, lng: destination.lng },
        fromPlaceId: origin.placeId || null,
        toPlaceId: destination.placeId || null,
        distanceMeters: legResult.distanceMeters,
        durationSeconds: legResult.durationSeconds,
        routeSource: legResult.routeSource,
        fare: legResult.fare,
        currency: legResult.currency || "INR",
        actualTravelModes: legResult.actualTravelModes,
        encodedPolyline: legResult.encodedPolyline,
      });
    }

    const totalDistanceMeters = legs.reduce((acc, leg) => acc + (leg.distanceMeters || 0), 0);
    const totalDurationSeconds = legs.reduce((acc, leg) => acc + (leg.durationSeconds || 0), 0);
    const totalFare = legs.some((leg) => leg.fare !== null)
      ? legs.reduce((acc, leg) => acc + (leg.fare || 0), 0)
      : null;

    const overallRouteSource =
      hasGoogleSource && !hasEstimateSource
        ? "Google Routes"
        : !hasGoogleSource && hasEstimateSource
        ? "Roamly Estimate"
        : "Google Routes (partial)";

    const distanceKm = Math.round((totalDistanceMeters / 1000) * 10) / 10;
    const durationMinutes = Math.round(totalDurationSeconds / 60);

    const distanceText = `${distanceKm} km`;
    const durationText =
      durationMinutes >= 60
        ? `${Math.floor(durationMinutes / 60)} hr ${durationMinutes % 60} min`
        : `${durationMinutes} min`;
    const fareText = totalFare !== null ? `₹${Math.round(totalFare)}` : "Unavailable";

    return NextResponse.json({
      success: true,
      mode,
      googleTravelMode,
      summary: {
        totalDistanceMeters,
        totalDurationSeconds,
        totalFare,
        currency: "INR",
        routeSource: overallRouteSource,
        distanceText,
        durationText,
        fareText,
      },
      legs,
      polylines: legs.map((l) => l.encodedPolyline).filter((p): p is string => Boolean(p)),
    });
  } catch (error: any) {
    console.error("[POST /api/routes] Unhandled error:", error);
    return NextResponse.json({ error: "Failed to compute routes", details: error.message }, { status: 500 });
  }
}
