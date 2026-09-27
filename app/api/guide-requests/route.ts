import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/rbac";
import { UserRole, RequestStatus, VerificationStatus, AvailabilityStatus } from "@prisma/client";
import { calculateHaversineDistanceKm, DEFAULT_GUIDE_MATCH_RADIUS_KM } from "@/lib/guides/guide-matching";

export async function POST(req: Request) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return NextResponse.json(
        { error: "Authentication required to book a guide", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // Role boundary: Only travelers (USER) can request guides. Guides cannot book guides (TEST 14/15).
    if (authContext.role === UserRole.GUIDE) {
      return NextResponse.json(
        { error: "Forbidden: Guides cannot submit traveler guide requests", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const userId = authContext.userId;
    const body = await req.json();
    const { guideId, locationId, date, startTime, duration = 2, message, tourId } = body;

    if (!guideId || !locationId || !date || !startTime) {
      return NextResponse.json(
        { error: "guideId, locationId, date, and startTime are required" },
        { status: 400 }
      );
    }

    const durationNum = parseInt(String(duration), 10) || 2;

    // Stale Availability & Eligibility Re-check against PostgreSQL (Rule 17 & 18):
    // 1. Guide must exist in database
    // 2. Guide user role must be GUIDE
    // 3. Guide verification_status must be VERIFIED
    // 4. Guide availability_status must be AVAILABLE
    // 5. Guide must have operating location matching or nearby requested location
    const guide = await prisma.guideProfile.findUnique({
      where: { id: guideId },
      include: {
        user: true,
        locations: {
          where: { is_active: true },
          include: { location: true },
        },
        current_location: true,
      },
    });

    if (!guide || !guide.user || guide.user.role !== UserRole.GUIDE) {
      return NextResponse.json(
        { error: "Guide not found or inactive", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (guide.verification_status !== VerificationStatus.VERIFIED) {
      return NextResponse.json(
        { error: "This guide is currently not available for bookings (unverified account)" },
        { status: 400 }
      );
    }

    if (guide.availability_status !== AvailabilityStatus.AVAILABLE) {
      return NextResponse.json(
        { error: `This guide is currently not available for bookings (status: ${guide.availability_status})` },
        { status: 400 }
      );
    }

    // Verify target operating location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Verify guide operates at or near this location
    const activeLocations = guide.locations
      .filter((gl) => gl.is_active && gl.location && gl.location.is_active)
      .map((gl) => gl.location);

    if (guide.current_location && guide.current_location.is_active) {
      if (!activeLocations.some((l) => l.id === guide.current_location!.id)) {
        activeLocations.push(guide.current_location);
      }
    }

    const matchesLocation = activeLocations.some((loc) => {
      if (loc.id === location.id) return true;
      if (loc.city.toLowerCase() === location.city.toLowerCase()) return true;
      if (
        loc.latitude != null &&
        loc.longitude != null &&
        location.latitude != null &&
        location.longitude != null
      ) {
        const dist = calculateHaversineDistanceKm(
          location.latitude,
          location.longitude,
          loc.latitude,
          loc.longitude
        );
        return dist <= DEFAULT_GUIDE_MATCH_RADIUS_KM;
      }
      return false;
    });

    if (!matchesLocation) {
      return NextResponse.json(
        { error: "Guide does not operate in or near this location" },
        { status: 400 }
      );
    }

    // Associate with traveler Trip if tourId is provided
    let validTourId: number | null = null;
    if (tourId) {
      const parsedTourId = parseInt(String(tourId), 10);
      if (!isNaN(parsedTourId)) {
        const userTrip = await prisma.trip.findFirst({
          where: { trip_id: parsedTourId, user_id: userId },
        });
        if (userTrip) {
          validTourId = parsedTourId;
          // Persist selected guide relationship on Trip
          await prisma.trip.update({
            where: { trip_id: validTourId },
            data: { selected_guide_id: guide.id },
          });
        }
      }
    }

    const hourlyRate = guide.hourly_rate ?? 500;
    const totalCost = hourlyRate * durationNum;

    const request = await prisma.guideRequest.create({
      data: {
        user_id: userId,
        guide_id: guide.id,
        location_id: location.id,
        tour_id: validTourId,
        date: new Date(date),
        start_time: startTime,
        duration: durationNum,
        message: message || null,
        total_cost: totalCost,
        status: RequestStatus.PENDING,
      },
      include: {
        guide: {
          include: {
            user: {
              select: { full_name: true, email: true, profile_photo_url: true },
            },
          },
        },
        location: true,
      },
    });

    return NextResponse.json(
      {
        message: "Guide request sent successfully",
        request: {
          id: request.id,
          guideName: request.guide.user.full_name || "Licensed Guide",
          locationName: request.location.name,
          date: request.date,
          startTime: request.start_time,
          duration: request.duration,
          totalCost: request.total_cost,
          status: request.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/guide-requests error:", error);
    return NextResponse.json(
      { error: "Failed to send guide request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // If user is a guide, return their received requests; otherwise return sent requests
    if (authContext.role === UserRole.GUIDE) {
      const guideProfile = await prisma.guideProfile.findUnique({
        where: { user_id: authContext.userId },
      });

      if (!guideProfile) {
        return NextResponse.json({ requests: [] });
      }

      const receivedRequests = await prisma.guideRequest.findMany({
        where: { guide_id: guideProfile.id },
        include: {
          user: {
            select: { full_name: true, email: true, profile_photo_url: true },
          },
          location: true,
        },
        orderBy: { created_at: "desc" },
      });

      return NextResponse.json({
        role: "GUIDE",
        requests: receivedRequests.map((r) => ({
          id: r.id,
          userName: r.user.full_name || "Traveler",
          userEmail: r.user.email,
          locationName: r.location.name,
          date: r.date,
          startTime: r.start_time,
          duration: r.duration,
          totalCost: r.total_cost,
          message: r.message,
          status: r.status,
          createdAt: r.created_at,
        })),
      });
    } else {
      // Normal traveler requests
      const sentRequests = await prisma.guideRequest.findMany({
        where: { user_id: authContext.userId },
        include: {
          guide: {
            include: {
              user: {
                select: { full_name: true, email: true, profile_photo_url: true },
              },
            },
          },
          location: true,
        },
        orderBy: { created_at: "desc" },
      });

      return NextResponse.json({
        role: "USER",
        requests: sentRequests.map((r) => ({
          id: r.id,
          guideName: r.guide.user.full_name || "Licensed Guide",
          guidePhoto: r.guide.profile_photo || r.guide.user.profile_photo_url,
          locationName: r.location.name,
          date: r.date,
          startTime: r.start_time,
          duration: r.duration,
          totalCost: r.total_cost,
          status: r.status,
          createdAt: r.created_at,
        })),
      });
    }
  } catch (error) {
    console.error("GET /api/guide-requests error:", error);
    return NextResponse.json({ error: "Failed to fetch guide requests" }, { status: 500 });
  }
}
