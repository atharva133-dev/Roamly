import { headers } from "next/headers";
import { Webhook, WebhookRequiredHeaders } from "svix";
import type { WebhookEvent } from "@clerk/clerk-sdk-node";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Missing svix headers", { status: 400 });
  }

  const payload = await req.text();

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;
  try {
    evt = await wh.verify(payload, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    } as WebhookRequiredHeaders)as WebhookEvent;
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const eventType = evt.type;
  console.log("Received Clerk webhook:", eventType, evt.data);

  if (eventType === "user.created") {
    const { id: clerk_id, email_addresses} = evt.data;
    const email = email_addresses?.[0]?.email_address ?? null;

    try {
      await prisma.user.create({
        data: {
          user_id: clerk_id,
          email: email!,
          password_hash: null,
        },
      });
      console.log("User inserted into database:", email);
    } catch (error) {
      console.error("Error inserting user into DB:", error);
      return new NextResponse("Database error", { status: 500 });
    }

  } else if (eventType === "user.deleted") {
    const { id: clerk_id } = evt.data;

    try {
      await prisma.user.delete({
        where: { clerk_id: clerk_id },
      });
      console.log("User deleted from database:", clerk_id);
    } catch (error) {
      console.error("Error deleting user from DB:", error);
      // If the user doesn't exist in DB, just acknowledge
      return new NextResponse("User not found in DB", { status: 200 });
    }
  }

  return new NextResponse("Webhook received", { status: 200 });
}
