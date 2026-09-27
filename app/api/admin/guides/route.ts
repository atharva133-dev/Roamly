import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { enforceRole } from "@/lib/auth/rbac";
import { UserRole } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { errorResponse } = await enforceRole([UserRole.SUPER_ADMIN]);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};
    if (status) {
      whereClause.verification_status = status;
    }

    const guides = await prisma.guideProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            full_name: true,
            email: true,
            created_at: true,
          }
        },
        locations: {
          include: {
            location: true,
          }
        },
        current_location: true,
      },
      orderBy: { created_at: "desc" }
    });

    const counts = await prisma.guideProfile.groupBy({
      by: ["verification_status"],
      _count: true,
    });

    return NextResponse.json({
      guides: guides.map(g => ({
        id: g.id,
        userId: g.user_id,
        name: g.user.full_name || "Applicant",
        email: g.user.email,
        bio: g.bio,
        experienceYears: g.experience_years,
        languages: g.languages,
        expertise: g.expertise,
        hourlyRate: g.hourly_rate,
        verificationStatus: g.verification_status,
        isEmailVerified: g.verification_status === "VERIFIED",
        emailVerifiedAt: g.email_verified_at,
        availabilityStatus: g.availability_status,
        appliedAt: g.created_at,
        currentLocation: g.current_location?.name || "Not Set",
        qualifiedLocations: g.locations.map(l => l.location.name),
      })),
      stats: counts.reduce((acc, curr) => {
        acc[curr.verification_status] = curr._count;
        return acc;
      }, {} as Record<string, number>)
    });
  } catch (error) {
    console.error("GET /api/admin/guides error:", error);
    return NextResponse.json({ error: "Failed to fetch guides for admin" }, { status: 500 });
  }
}
