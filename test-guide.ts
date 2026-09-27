import { PrismaClient, UserRole, VerificationStatus, AvailabilityStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
  console.log("Starting test...");
  
  // Create a dummy user
  const email = "test_guide_" + Date.now() + "@example.com";
  let user = await prisma.user.create({
    data: {
      email,
      full_name: "Test Guide",
      role: UserRole.USER,
    }
  });

  console.log("Created user:", user.user_id);
  
  const authContext = { userId: user.user_id };

  const body = {
    fullName: "Test Guide",
    phone: "9876543210",
    bio: "Test bio",
    languages: ["English"],
    expertise: ["Historical Tours"],
    experienceYears: "5",
    hourlyRate: "500",
    currency: "INR",
    availableDays: ["Monday"],
    availableTimeFrom: "09:00",
    availableTimeTo: "18:00",
    profilePhoto: null,
    workingLocation: {
      name: "Gateway of India",
      formattedAddress: "Apollo Bandar, Colaba, Mumbai",
      placeId: "ChIJW2u3W2zO5zsRgV_394Vn_P0", // dummy
      latitude: 18.9219841,
      longitude: 72.8346543,
      city: "Mumbai",
      state: "Maharashtra",
      country: "India"
    }
  };

  try {
    const {
        fullName,
        phone,
        bio,
        languages = [],
        expertise = [],
        experienceYears = 0,
        hourlyRate = 500,
        currency = "INR",
        availableDays = [],
        availableTimeFrom,
        availableTimeTo,
        profilePhoto,
        workingLocation,
      } = body;
  
      console.log("Updating user role...");
      await prisma.user.update({
        where: { user_id: authContext.userId },
        data: {
          role: UserRole.GUIDE,
          full_name: fullName || undefined,
          profile_photo_url: profilePhoto || undefined,
          profile_completed: true,
        },
      });
  
      console.log("Upserting guide profile...");
      const guideProfile = await prisma.guideProfile.upsert({
        where: { user_id: authContext.userId },
        create: {
          user_id: authContext.userId,
          phone: phone || null,
          bio,
          languages,
          expertise,
          experience_years: parseInt(String(experienceYears)) || 0,
          hourly_rate: parseFloat(String(hourlyRate)) || 500,
          currency: currency || "INR",
          available_days: availableDays,
          available_time_from: availableTimeFrom || null,
          available_time_to: availableTimeTo || null,
          profile_photo: profilePhoto || null,
          verification_status: VerificationStatus.PENDING,
          availability_status: AvailabilityStatus.AVAILABLE,
        },
        update: {
          phone: phone || undefined,
          bio,
          languages,
          expertise,
          experience_years: parseInt(String(experienceYears)) || 0,
          hourly_rate: parseFloat(String(hourlyRate)) || 500,
          currency: currency || "INR",
          available_days: availableDays,
          available_time_from: availableTimeFrom || undefined,
          available_time_to: availableTimeTo || undefined,
          profile_photo: profilePhoto || undefined,
        },
      });
  
      console.log("Upserted profile. Processing location...");
      if (workingLocation && workingLocation.placeId) {
        let location = await prisma.location.findUnique({
          where: { google_place_id: workingLocation.placeId },
        });
  
        if (!location) {
          location = await prisma.location.create({
            data: {
              name: workingLocation.name || workingLocation.formattedAddress,
              city: workingLocation.city || "",
              state: workingLocation.state || null,
              country: workingLocation.country || "India",
              google_place_id: workingLocation.placeId,
              formatted_address: workingLocation.formattedAddress || null,
              latitude: workingLocation.latitude || null,
              longitude: workingLocation.longitude || null,
              type: "attraction",
              is_active: true,
            },
          });
        }
  
        await prisma.guideLocation.deleteMany({
          where: { guide_id: guideProfile.id },
        });
  
        await prisma.guideLocation.create({
          data: {
            guide_id: guideProfile.id,
            location_id: location.id,
            is_active: true,
            available_from: availableTimeFrom || "09:00",
            available_to: availableTimeTo || "18:00",
          },
        });
  
        await prisma.guideProfile.update({
          where: { id: guideProfile.id },
          data: {
            current_location_id: location.id,
            last_location_update: new Date(),
          },
        });
      }
  
      console.log("Success!");
  } catch (error) {
    console.error("Test Error:", error);
  } finally {
    // cleanup
    await prisma.user.delete({ where: { user_id: authContext.userId } });
    await prisma.$disconnect();
  }
}

test();
