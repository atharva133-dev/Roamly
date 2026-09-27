import { NextResponse } from "next/server";
import { enforceRole } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return -1;
  const parts = timeStr.trim().split(":");
  if (parts.length !== 2) return -1;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return -1;
  return h * 60 + m;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tripId: string; stopId: string }> }
) {
  try {
    const { errorResponse, authContext } = await enforceRole([
      UserRole.USER,
      UserRole.SUPER_ADMIN,
    ]);
    if (errorResponse) return errorResponse;

    const { tripId, stopId } = await params;
    const parsedTripId = parseInt(tripId, 10);
    const parsedStopId = parseInt(stopId, 10);

    if (isNaN(parsedTripId) || isNaN(parsedStopId)) {
      return NextResponse.json({ error: "Invalid trip or stop ID" }, { status: 400 });
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

    const targetStop = trip.stops.find((s) => s.id === parsedStopId);
    if (!targetStop) {
      return NextResponse.json({ error: "Stop not found" }, { status: 404 });
    }

    const body = await req.json();
    const { startTime, endTime, dayNumber, sequence } = body;

    const updateData: any = {};

    if (sequence !== undefined && typeof sequence === "number") {
      updateData.sequence = sequence;
    }

    if (startTime && endTime) {
      const startMin = parseTimeToMinutes(startTime);
      const endMin = parseTimeToMinutes(endTime);

      if (startMin < 0 || endMin < 0) {
        return NextResponse.json(
          { error: "Invalid time format. Please use HH:mm" },
          { status: 400 }
        );
      }

      if (endMin <= startMin) {
        return NextResponse.json(
          { error: "End time must be strictly after start time" },
          { status: 400 }
        );
      }

      const day = dayNumber || 1;
      const baseTripDate = trip.start_date || new Date();
      const targetDate = new Date(baseTripDate);
      targetDate.setDate(targetDate.getDate() + (day - 1));

      const arrivalDate = new Date(targetDate);
      arrivalDate.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

      const departureDate = new Date(targetDate);
      departureDate.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);

      // Overlap check
      for (const other of trip.stops) {
        if (other.id !== parsedStopId && other.arrival_date && other.departure_date) {
          const exStart = new Date(other.arrival_date).getTime();
          const exEnd = new Date(other.departure_date).getTime();
          const sameDay =
            new Date(other.arrival_date).toDateString() ===
            arrivalDate.toDateString();

          if (sameDay && ((arrivalDate.getTime() < exEnd && departureDate.getTime() > exStart))) {
            return NextResponse.json(
              {
                error: `Schedule conflict: overlaps with "${other.location?.name || 'Stop'}"`,
                conflictWith: other.id,
              },
              { status: 400 }
            );
          }
        }
      }

      updateData.arrival_date = arrivalDate;
      updateData.departure_date = departureDate;
    }

    const updated = await prisma.stop.update({
      where: { id: parsedStopId },
      data: updateData,
      include: { location: true },
    });

    return NextResponse.json({
      success: true,
      stop: updated,
    });
  } catch (error) {
    console.error("PATCH /api/trips/[tripId]/stops/[stopId] error:", error);
    return NextResponse.json(
      { error: "Failed to update stop" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ tripId: string; stopId: string }> }
) {
  try {
    const { errorResponse, authContext } = await enforceRole([
      UserRole.USER,
      UserRole.SUPER_ADMIN,
    ]);
    if (errorResponse) return errorResponse;

    const { tripId, stopId } = await params;
    const parsedTripId = parseInt(tripId, 10);
    const parsedStopId = parseInt(stopId, 10);

    if (isNaN(parsedTripId) || isNaN(parsedStopId)) {
      return NextResponse.json({ error: "Invalid trip or stop ID" }, { status: 400 });
    }

    const trip = await prisma.trip.findUnique({
      where: { trip_id: parsedTripId },
      include: { stops: { orderBy: { sequence: "asc" } } },
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

    const stopExists = trip.stops.some((s) => s.id === parsedStopId);
    if (!stopExists) {
      return NextResponse.json({ error: "Stop not found" }, { status: 404 });
    }

    await prisma.stop.delete({ where: { id: parsedStopId } });

    // Re-sequence remaining stops
    const remaining = trip.stops.filter((s) => s.id !== parsedStopId);
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].sequence !== i + 1) {
        await prisma.stop.update({
          where: { id: remaining[i].id },
          data: { sequence: i + 1 },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Stop deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/trips/[tripId]/stops/[stopId] error:", error);
    return NextResponse.json(
      { error: "Failed to delete stop" },
      { status: 500 }
    );
  }
}
