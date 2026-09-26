import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/rbac";
import { RequestStatus, UserRole } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !Object.values(RequestStatus).includes(status)) {
      return NextResponse.json(
        { error: "Valid status required: ACCEPTED, REJECTED, CANCELLED, COMPLETED" },
        { status: 400 }
      );
    }

    const existingRequest = await prisma.guideRequest.findUnique({
      where: { id },
      include: {
        guide: true,
      }
    });

    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Guide can accept/reject/complete; User can cancel
    if (authContext.role === UserRole.GUIDE) {
      if (existingRequest.guide.user_id !== authContext.userId) {
        return NextResponse.json({ error: "Forbidden: Not your request" }, { status: 403 });
      }
    } else if (authContext.role === UserRole.USER) {
      if (existingRequest.user_id !== authContext.userId) {
        return NextResponse.json({ error: "Forbidden: Not your request" }, { status: 403 });
      }
      if (status !== RequestStatus.CANCELLED) {
        return NextResponse.json({ error: "Users can only cancel requests" }, { status: 400 });
      }
    }

    const updated = await prisma.guideRequest.update({
      where: { id },
      data: { status },
      include: {
        guide: {
          include: {
            user: {
              select: { full_name: true, email: true }
            }
          }
        },
        location: true,
      }
    });

    return NextResponse.json({
      message: `Request status updated to ${status}`,
      request: {
        id: updated.id,
        status: updated.status,
        guideName: updated.guide.user.full_name,
        locationName: updated.location.name,
      }
    });
  } catch (error) {
    console.error("PATCH /api/guide-requests/[id] error:", error);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
