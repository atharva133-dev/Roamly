import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UserRole, VerificationStatus, AvailabilityStatus } from "@prisma/client";

export async function POST() {
  try {
    // 1. Ensure Mumbai locations exist
    const gateway = await prisma.location.upsert({
      where: { id: "loc_gateway_of_india" },
      create: {
        id: "loc_gateway_of_india",
        name: "Gateway of India",
        city: "Mumbai",
        country: "India",
        latitude: 18.9220,
        longitude: 72.8347,
        type: "monument",
        is_active: true,
      },
      update: { is_active: true }
    });

    const colaba = await prisma.location.upsert({
      where: { id: "loc_colaba_causeway" },
      create: {
        id: "loc_colaba_causeway",
        name: "Colaba Causeway & Art District",
        city: "Mumbai",
        country: "India",
        latitude: 18.9150,
        longitude: 72.8258,
        type: "market",
        is_active: true,
      },
      update: { is_active: true }
    });

    const marineDrive = await prisma.location.upsert({
      where: { id: "loc_marine_drive" },
      create: {
        id: "loc_marine_drive",
        name: "Marine Drive Promenade",
        city: "Mumbai",
        country: "India",
        latitude: 18.9432,
        longitude: 72.8230,
        type: "beach",
        is_active: true,
      },
      update: { is_active: true }
    });

    const elephanta = await prisma.location.upsert({
      where: { id: "loc_elephanta_caves" },
      create: {
        id: "loc_elephanta_caves",
        name: "Elephanta Caves Sanctuary",
        city: "Mumbai",
        country: "India",
        latitude: 18.9633,
        longitude: 72.9315,
        type: "temple",
        is_active: true,
      },
      update: { is_active: true }
    });

    // 2. Create or update Demo Guide: Rahul Sharma
    const rahulUser = await prisma.user.upsert({
      where: { email: "rahul.sharma@roamlyguides.in" },
      create: {
        email: "rahul.sharma@roamlyguides.in",
        full_name: "Rahul Sharma",
        role: UserRole.GUIDE,
        profile_completed: true,
        profile_photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      },
      update: {
        full_name: "Rahul Sharma",
        role: UserRole.GUIDE,
      }
    });

    const rahulGuide = await prisma.guideProfile.upsert({
      where: { user_id: rahulUser.user_id },
      create: {
        user_id: rahulUser.user_id,
        bio: "Certified Maharashtra Tourism Department Guide with 7 years of deep archival research into South Mumbai's Indo-Saracenic architecture, Victorian Gothic heritage, and dock history.",
        languages: ["English", "Hindi", "Marathi"],
        expertise: ["Colonial Heritage", "Architecture", "Street Photography", "Harbor Lore"],
        experience_years: 7,
        hourly_rate: 650,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        current_location_id: gateway.id,
        last_location_update: new Date(),
      },
      update: {
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        current_location_id: gateway.id,
      }
    });

    // Associate Rahul with Gateway, Colaba, and Marine Drive
    await prisma.guideLocation.upsert({
      where: {
        guide_id_location_id: {
          guide_id: rahulGuide.id,
          location_id: gateway.id
        }
      },
      create: { guide_id: rahulGuide.id, location_id: gateway.id, is_active: true },
      update: { is_active: true }
    });

    await prisma.guideLocation.upsert({
      where: {
        guide_id_location_id: {
          guide_id: rahulGuide.id,
          location_id: colaba.id
        }
      },
      create: { guide_id: rahulGuide.id, location_id: colaba.id, is_active: true },
      update: { is_active: true }
    });

    await prisma.guideLocation.upsert({
      where: {
        guide_id_location_id: {
          guide_id: rahulGuide.id,
          location_id: marineDrive.id
        }
      },
      create: { guide_id: rahulGuide.id, location_id: marineDrive.id, is_active: true },
      update: { is_active: true }
    });

    // 3. Create or update Demo Guide: Priya Desai (Culinary & Art)
    const priyaUser = await prisma.user.upsert({
      where: { email: "priya.desai@roamlyguides.in" },
      create: {
        email: "priya.desai@roamlyguides.in",
        full_name: "Priya Desai",
        role: UserRole.GUIDE,
        profile_completed: true,
        profile_photo_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
      },
      update: {
        full_name: "Priya Desai",
        role: UserRole.GUIDE,
      }
    });

    const priyaGuide = await prisma.guideProfile.upsert({
      where: { user_id: priyaUser.user_id },
      create: {
        user_id: priyaUser.user_id,
        bio: "Culinary anthropologist & art historian specializing in Parsi cafes, coastal Konkani tasting trails, and the Kala Ghoda gallery scene.",
        languages: ["English", "Hindi", "Gujarati"],
        expertise: ["Parsi & Konkani Cuisine", "Kala Ghoda Art Walk", "Antique Hunting"],
        experience_years: 5,
        hourly_rate: 800,
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        current_location_id: colaba.id,
        last_location_update: new Date(),
      },
      update: {
        verification_status: VerificationStatus.VERIFIED,
        availability_status: AvailabilityStatus.AVAILABLE,
        current_location_id: colaba.id,
      }
    });

    await prisma.guideLocation.upsert({
      where: {
        guide_id_location_id: {
          guide_id: priyaGuide.id,
          location_id: colaba.id
        }
      },
      create: { guide_id: priyaGuide.id, location_id: colaba.id, is_active: true },
      update: { is_active: true }
    });

    await prisma.guideLocation.upsert({
      where: {
        guide_id_location_id: {
          guide_id: priyaGuide.id,
          location_id: gateway.id
        }
      },
      create: { guide_id: priyaGuide.id, location_id: gateway.id, is_active: true },
      update: { is_active: true }
    });

    // 4. Create a PENDING applicant for Admin Demo testing
    const vikramUser = await prisma.user.upsert({
      where: { email: "vikram.jadhav@roamlyguides.in" },
      create: {
        email: "vikram.jadhav@roamlyguides.in",
        full_name: "Vikram Jadhav",
        role: UserRole.GUIDE,
        profile_completed: true,
      },
      update: { role: UserRole.GUIDE }
    });

    const vikramGuide = await prisma.guideProfile.upsert({
      where: { user_id: vikramUser.user_id },
      create: {
        user_id: vikramUser.user_id,
        bio: "Specialized in naval archaeology and Elephanta Caves rock sculpture iconography.",
        languages: ["English", "Hindi", "Marathi", "German"],
        expertise: ["Rock-cut Architecture", "Ancient Mythology"],
        experience_years: 4,
        hourly_rate: 550,
        verification_status: VerificationStatus.PENDING,
        availability_status: AvailabilityStatus.AVAILABLE,
      },
      update: {
        verification_status: VerificationStatus.PENDING
      }
    });

    await prisma.guideLocation.upsert({
      where: {
        guide_id_location_id: {
          guide_id: vikramGuide.id,
          location_id: elephanta.id
        }
      },
      create: { guide_id: vikramGuide.id, location_id: elephanta.id, is_active: true },
      update: { is_active: true }
    });

    return NextResponse.json({
      message: "Seed data initialized successfully",
      locations: ["Gateway of India", "Colaba Causeway", "Marine Drive", "Elephanta Caves"],
      verifiedGuides: ["Rahul Sharma (Active at Gateway)", "Priya Desai (Active at Colaba)"],
      pendingGuides: ["Vikram Jadhav (Pending Admin Verification)"]
    });
  } catch (error) {
    console.error("POST /api/setup/seed-guides error:", error);
    return NextResponse.json({ error: "Failed to seed guide data" }, { status: 500 });
  }
}
