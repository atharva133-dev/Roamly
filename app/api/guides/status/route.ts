import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/rbac";
import { AvailabilityStatus } from "@prisma/client";

export async function PATCH(req: Request) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { availabilityStatus, currentLocationId } = body;

    const guideProfile = await prisma.guideProfile.findUnique({
      where: { user_id: authContext.userId }
    });

    if (!guideProfile) {
      return NextResponse.json({ error: "Guide profile not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (availabilityStatus && Object.values(AvailabilityStatus).includes(availabilityStatus)) {
      updateData.availability_status = availabilityStatus;
    }

    if (currentLocationId !== undefined) {
      updateData.current_location_id = currentLocationId || null;
      updateData.last_location_update = new Date();
    }

    const updatedProfile = await prisma.guideProfile.update({
      where: { id: guideProfile.id },
      data: updateData,
      include: {
        current_location: true,
      }
    });

    return NextResponse.json({
      message: "Guide status updated successfully",
      availabilityStatus: updatedProfile.availability_status,
      currentLocation: updatedProfile.current_location,
    });
  } catch (error) {
    console.error("PATCH /api/guides/status error:", error);
    return NextResponse.json({ error: "Failed to update guide status" }, { status: 500 });
  }
}
