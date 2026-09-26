import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { enforceRole } from "@/lib/auth/rbac";
import { UserRole, VerificationStatus } from "@prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { errorResponse } = await enforceRole([UserRole.SUPER_ADMIN]);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !Object.values(VerificationStatus).includes(status)) {
      return NextResponse.json(
        { error: "Valid status required: PENDING, VERIFIED, REJECTED, SUSPENDED" },
        { status: 400 }
      );
    }

    const updatedGuide = await prisma.guideProfile.update({
      where: { id },
      data: {
        verification_status: status,
      },
      include: {
        user: {
          select: {
            full_name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json({
      message: `Guide verification status successfully updated to ${status}`,
      guide: {
        id: updatedGuide.id,
        name: updatedGuide.user.full_name,
        verificationStatus: updatedGuide.verification_status,
      }
    });
  } catch (error) {
    console.error("PATCH /api/admin/guides/[id]/verify error:", error);
    return NextResponse.json({ error: "Failed to update guide verification status" }, { status: 500 });
  }
}
