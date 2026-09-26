import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

export interface AuthenticatedUserContext {
  userId: string;
  clerkId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  isVerifiedGuide: boolean;
}

/**
 * Retrieves the currently authenticated user from Clerk and synchronizes with local PostgreSQL User record.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUserContext | null> {
  const session = await auth();
  if (!session?.userId) {
    return null;
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses?.[0]?.emailAddress ||
    session.sessionClaims?.email as string ||
    `user_${session.userId}@roamly.local`;

  const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || clerkUser?.username || null;

  try {
    // Retrieve user or create initial user record if missing
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { clerk_id: session.userId },
          { email: email }
        ]
      },
      include: {
        guideProfile: true,
        userProfile: true,
      }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          clerk_id: session.userId,
          email: email,
          full_name: fullName,
          role: UserRole.USER,
          profile_photo_url: clerkUser?.imageUrl || null,
        },
        include: {
          guideProfile: true,
          userProfile: true,
        }
      });
    } else if (!user.clerk_id) {
      // Link clerkId if created earlier by email
      user = await prisma.user.update({
        where: { user_id: user.user_id },
        data: { clerk_id: session.userId, full_name: fullName || user.full_name },
        include: {
          guideProfile: true,
          userProfile: true,
        }
      });
    }

    const isVerifiedGuide = user.role === UserRole.GUIDE && user.guideProfile?.verification_status === "VERIFIED";

    return {
      userId: user.user_id,
      clerkId: session.userId,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isVerifiedGuide,
    };
  } catch (dbError) {
    console.warn("DB connection offline in getAuthenticatedUser, providing session fallback:", dbError);
    return {
      userId: session.userId,
      clerkId: session.userId,
      email: email,
      fullName: fullName || "Traveler",
      role: UserRole.USER,
      isVerifiedGuide: false,
    };
  }
}

/**
 * Enforces Role-Based Access Control on API Route Handlers.
 */
export async function enforceRole(allowedRoles: UserRole[]): Promise<{
  errorResponse?: NextResponse;
  authContext?: AuthenticatedUserContext;
}> {
  const authContext = await getAuthenticatedUser();

  if (!authContext) {
    return {
      errorResponse: NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    };
  }

  if (!allowedRoles.includes(authContext.role)) {
    return {
      errorResponse: NextResponse.json(
        { 
          error: "Forbidden: You do not have permission to access this resource", 
          code: "FORBIDDEN",
          currentRole: authContext.role,
          requiredRoles: allowedRoles 
        },
        { status: 403 }
      )
    };
  }

  return { authContext };
}
