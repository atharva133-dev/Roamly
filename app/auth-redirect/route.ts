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
      select: { role: true, profile_completed: true },
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
        select: { role: true, profile_completed: true },
      });
    }

    if (dbUser.role === "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/admin-guides", req.url));
    } else if (dbUser.role === "GUIDE" && dbUser.profile_completed) {
      return NextResponse.redirect(new URL("/guides", req.url));
    } else {
      return NextResponse.redirect(new URL("/landing_page", req.url));
    }
  } catch (err) {
    console.error("auth-redirect error:", err);
    return NextResponse.redirect(new URL("/", req.url));
  }
}
