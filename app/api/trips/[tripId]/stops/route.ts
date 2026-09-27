import { NextResponse } from "next/server";
import { enforceRole } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  findOrCreateLocation,
  getPlaceDetailsById,
} from "../../../../../server/src/services/googleMapsGateway.js";

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return -1;
  const parts = timeStr.trim().split(":");
  if (parts.length !== 2) return -1;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { errorResponse, authContext } = await enforceRole([
      UserRole.USER,
      UserRole.SUPER_ADMIN,
    ]);
    if (errorResponse) return errorResponse;

    const { tripId } = await params;
    const parsedTripId = parseInt(tripId, 10);
    if (isNaN(parsedTripId)) {
      return NextResponse.json({ error: "Invalid trip ID" }, { status: 400 });
    }

    const trip = await prisma.trip.findUnique({
      where: { trip_id: parsedTripId },
      include: { stops: { include: { location: true }, orderBy: { sequence: "asc" } } },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (
      authContext!.role !== UserRole.SUPER_ADMIN &&
      trip.user_id !== authContext!.userId
    ) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this trip" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      placeId,
      name,
      latitude,
      longitude,
      address,
      city,
      type,
      dayNumber = 1,
      startTime,
      endTime,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Place name is required" }, { status: 400 });
    }

    // Schedule Validation (B11)
    let arrivalDate: Date | null = null;
    let departureDate: Date | null = null;
    let durationMinutes: number | null = null;

    if (startTime && endTime) {
      const startMin = parseTimeToMinutes(startTime);
      const endMin = parseTimeToMinutes(endTime);

      if (startMin < 0 || endMin < 0) {
        return NextResponse.json(
          { error: "Invalid time format. Please use HH:mm (e.g. 09:30)" },
          { status: 400 }
        );
      }

      if (endMin <= startMin) {
        return NextResponse.json(
          { error: "End time must be strictly after start time" },
          { status: 400 }
        );
      }

      durationMinutes = endMin - startMin;

      // Check overlap against existing stops on the same day
      const baseTripDate = trip.start_date || new Date();
      const targetDate = new Date(baseTripDate);
      targetDate.setDate(targetDate.getDate() + (dayNumber - 1));

      arrivalDate = new Date(targetDate);
      arrivalDate.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

      departureDate = new Date(targetDate);
      departureDate.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

      for (const existingStop of trip.stops) {
        if (existingStop.arrival_date && existingStop.departure_date) {
          const exStart = new Date(existingStop.arrival_date).getTime();
          const exEnd = new Date(existingStop.departure_date).getTime();
          const newStart = arrivalDate.getTime();
          const newEnd = departureDate.getTime();

          // Check if same calendar day and overlapping
          const sameDay =
            new Date(existingStop.arrival_date).toDateString() ===
            arrivalDate.toDateString();

          if (sameDay && ((newStart < exEnd && newEnd > exStart))) {
            return NextResponse.json(
              {
                error: `Schedule conflict: overlaps with existing activity "${existingStop.location?.name || 'Stop'}" scheduled from ${new Date(existingStop.arrival_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${new Date(existingStop.departure_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                conflictWith: existingStop.id,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    // Opening-hours check (B12)
    let openingHoursWarning = null;
    if (placeId && startTime && endTime) {
      const details: any = await getPlaceDetailsById(placeId);
      if (details?.regularOpeningHours?.periods) {
        // Find day period
        const dayOfWeek = (arrivalDate || new Date()).getDay();
        const period = details.regularOpeningHours.periods.find(
          (p: any) => p.open?.day === dayOfWeek
        );
        if (period?.open && period?.close) {
          const openMin = period.open.hour * 60 + period.open.minute;
          const closeMin = period.close.hour * 60 + period.close.minute;
          const startMin = parseTimeToMinutes(startTime);
          const endMin = parseTimeToMinutes(endTime);

          if (startMin < openMin || endMin > closeMin) {
            openingHoursWarning = {
              code: "SCHEDULE_HOURS_MISMATCH",
              status: "PARTIAL_OVERLAP",
              message: `Warning: Scheduled activity (${startTime}–${endTime}) extends beyond opening hours (${period.open.hour.toString().padStart(2, '0')}:${period.open.minute.toString().padStart(2, '0')}–${period.close.hour.toString().padStart(2, '0')}:${period.close.minute.toString().padStart(2, '0')})`,
              openingHours: `${period.open.hour}:${period.open.minute} to ${period.close.hour}:${period.close.minute}`,
            };
          }
        }
      }
    }

    // Create or find canonical Location
    const location = await findOrCreateLocation({
      placeId,
      name,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
      formattedAddress: address,
      city: city || "Trip Destination",
      type: type || "tourist_attraction",
    });

    // Calculate next sequence number
    const maxSeq = trip.stops.reduce((max, s) => Math.max(max, s.sequence), 0);
    const nextSequence = maxSeq + 1;

    // Create Stop in PostgreSQL
    const newStop = await prisma.stop.create({
      data: {
        trip_id: parsedTripId,
        location_id: location.id,
        sequence: nextSequence,
        arrival_date: arrivalDate,
        departure_date: departureDate,
      },
      include: {
        location: true,
      },
    });

    return NextResponse.json({
      success: true,
      stop: {
        id: newStop.id,
        sequence: newStop.sequence,
        dayNumber,
        startTime: startTime || null,
        endTime: endTime || null,
        durationMinutes,
        location: {
          id: location.id,
          placeId: location.googlePlaceId || (location as any).placeId || placeId,
          name: location.name,
          latitude: location.coordinates?.lat ?? latitude,
          longitude: location.coordinates?.lng ?? longitude,
          address: location.address?.formatted || address,
          city: location.address?.city || city,
          type: location.type,
        },
      },
      warning: openingHoursWarning,
    });
  } catch (error) {
    console.error("POST /api/trips/[tripId]/stops error:", error);
    return NextResponse.json(
      { error: "Failed to add stop to trip" },
      { status: 500 }
    );
  }
}
