// app/auth-redirect/route.ts
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // Get full Clerk user to read email
    const clerkUser = await currentUser();
    const email = clerkUser?.primaryEmailAddress?.emailAddress;

    if (!email) {
      console.error("No email found for Clerk user", userId);
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }

    // Try to find the DB user by email
    let dbUser = await prisma.user.findUnique({
      where: { email },
      select: { role: true, clerk_id: true, profile_completed: true },
    });

    // Optionally: create a new user if not found
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email,
          clerk_id: userId,
          full_name: [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null,
          role: "USER",
          profile_photo_url: clerkUser?.imageUrl || null,
        },
        select: { role: true, clerk_id: true, profile_completed: true },
      });
    } else if (!dbUser.clerk_id) {
      await prisma.user.update({
        where: { email },
        data: { clerk_id: userId },
      });
    }

    // Inspect user intent from query param or auth cookie
    const reqUrl = new URL(req.url);
    const queryIntent = reqUrl.searchParams.get("intent");
    const cookieHeader = req.headers.get("cookie") || "";
    const cookieMatch = cookieHeader.match(/roamly_auth_intent=([^;]+)/);
    const cookieIntent = cookieMatch ? decodeURIComponent(cookieMatch[1].trim()) : null;
    const intent = queryIntent || cookieIntent;

    let targetUrl: URL;

    // Database role is authoritative (selected intent never overrides DB authorization)
    if (dbUser.role === "SUPER_ADMIN") {
      targetUrl = new URL("/admin-guides", req.url);
    } else if (dbUser.role === "GUIDE") {
      // Existing GUIDE always proceeds to guide dashboard
      targetUrl = new URL("/guide-dashboard", req.url);
    } else {
      // Role is USER in database
      if (intent === "guide") {
        // User chose "Continue as Guide", but account is registered as a Traveler
        // Show clear message and offer "Register as a Guide" without altering role
        targetUrl = new URL("/choose-role?notice=traveler_account", req.url);
      } else {
        // Standard traveler login flow — always open AI Trip planner (/llm)
        targetUrl = new URL("/llm", req.url);
      }
    }

    const response = NextResponse.redirect(targetUrl);
    // Clear transient auth intent cookie if set
    response.cookies.delete("roamly_auth_intent");
    return response;
  } catch (err) {
    console.error("auth-redirect error:", err);
    // Redirect to AI Trip planner (/llm) instead of landing page
    return NextResponse.redirect(new URL("/llm", req.url));
  }
}
