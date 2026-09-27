import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/rbac";

export async function GET() {
  try {
    const authContext = await getAuthenticatedUser();
    if (!authContext) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        userId: authContext.userId,
        email: authContext.email,
        fullName: authContext.fullName,
        role: authContext.role,
        isVerifiedGuide: authContext.isVerifiedGuide,
      },
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { authenticated: false, user: null, error: "Failed to retrieve user status" },
      { status: 500 }
    );
  }
}
