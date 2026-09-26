import { NextResponse } from "next/server";
import { getCurrentDeviceNetworkLocation, reverseGeocodeCoordinates, findOrCreateLocation } from "@/server/src/services/googleMapsGateway.js";

export async function GET(req: Request) {
  try {
    const rawLoc = await getCurrentDeviceNetworkLocation({ considerIp: true });
    
    let resolvedAddress = null;
    let location = null;

    if (rawLoc.latitude && rawLoc.longitude) {
      const resolvedAddress: any = await reverseGeocodeCoordinates(rawLoc.latitude, rawLoc.longitude);
      
      location = await findOrCreateLocation({
        placeId: resolvedAddress?.placeId,
        name: resolvedAddress?.city || "Current Location",
        latitude: rawLoc.latitude,
        longitude: rawLoc.longitude,
        formattedAddress: resolvedAddress?.formattedAddress,
        city: resolvedAddress?.city,
        state: resolvedAddress?.state,
        country: resolvedAddress?.country,
        postalCode: resolvedAddress?.postalCode,
        type: "current_location"
      });
    }

    return NextResponse.json({
      location,
      deviceLocation: {
        latitude: rawLoc.latitude,
        longitude: rawLoc.longitude,
        accuracyMeters: rawLoc.accuracyMeters,
        source: rawLoc.source,
        isApproximate: (rawLoc.accuracyMeters || 0) > 100
      }
    });
  } catch (error: any) {
    console.error("[GET /api/location/current] Error:", error.message);
    return NextResponse.json(
      { error: "Failed to determine current device location" },
      { status: 500 }
    );
  }
}
