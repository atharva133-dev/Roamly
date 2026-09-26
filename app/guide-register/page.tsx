"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Camera,
  Languages,
  Award,
  Briefcase,
  FileText,
  Calendar,
  Clock,
  IndianRupee,
  MapPin,
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Shield,
  Sparkles,
  CheckCircle2,
  X,
  ImagePlus,
} from "lucide-react";

/* ───────────── Constants ───────────── */

const STEPS = [
  { id: 1, title: "Account", icon: Shield, description: "Verify your identity" },
  { id: 2, title: "Personal Info", icon: User, description: "Your details" },
  { id: 3, title: "Guide Info", icon: Award, description: "Your expertise" },
  { id: 4, title: "Availability", icon: Calendar, description: "Schedule & pricing" },
  { id: 5, title: "Location", icon: MapPin, description: "Working area" },
  { id: 6, title: "Review", icon: FileText, description: "Confirm details" },
  { id: 7, title: "Submit", icon: CheckCircle2, description: "Go live" },
];

const ALL_LANGUAGES = [
  "English", "Hindi", "Marathi", "Gujarati", "Tamil", "Telugu",
  "Kannada", "Malayalam", "Bengali", "Punjabi", "Urdu", "French",
  "Spanish", "German", "Japanese", "Mandarin", "Arabic", "Russian",
];

const ALL_SPECIALIZATIONS = [
  "Historical Tours", "Heritage Sites", "Food Tours", "Adventure Tours",
  "Cultural Tours", "Photography Tours", "Local Shopping", "Nature & Wildlife",
  "Spiritual & Temple Tours", "Street Art Tours", "Night Tours",
  "Architecture Tours", "Museum Tours", "Walking Tours",
];

const DAYS_OF_WEEK = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
  "21:00", "21:30", "22:00",
];

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  const ampm = hr >= 12 ? "PM" : "AM";
  const hr12 = hr % 12 || 12;
  return `${hr12}:${m} ${ampm}`;
}

/* ───────────── Interfaces ───────────── */

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface WorkingLocation {
  name: string;
  formattedAddress: string;
  placeId: string;
  latitude: number | null;
  longitude: number | null;
  city: string;
  state: string;
  country: string;
}

/* ───────────── Main Component ───────────── */

export default function GuideRegistrationPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Step 2: Personal Information
  const [fullName, setFullName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Step 3: Guide Information
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  // Step 4: Availability & Pricing
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [timeFrom, setTimeFrom] = useState("09:00");
  const [timeTo, setTimeTo] = useState("18:00");
  const [hourlyRate, setHourlyRate] = useState("");

  // Step 5: Working Location
  const [locationSearch, setLocationSearch] = useState("");
  const [locationPredictions, setLocationPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [workingLocation, setWorkingLocation] = useState<WorkingLocation | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pre-fill data from Clerk
  useEffect(() => {
    if (isLoaded && user) {
      setFullName(user.fullName || "");
    }
  }, [isLoaded, user]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ── Phone validation ── */
  const validatePhone = useCallback((value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) {
      setPhoneError("Phone number is required");
      return false;
    }
    if (digits.length < 10 || digits.length > 15) {
      setPhoneError("Enter a valid phone number (10-15 digits)");
      return false;
    }
    setPhoneError("");
    return true;
  }, []);

  /* ── Location search ── */
  const handleLocationSearch = useCallback(async (input: string) => {
    setLocationSearch(input);
    if (input.length < 2) {
      setLocationPredictions([]);
      setShowDropdown(false);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
        const data = await res.json();
        setLocationPredictions(data.predictions || []);
        setShowDropdown(true);
      } catch {
        console.error("Location search failed");
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handleSelectPlace = useCallback(async (prediction: PlacePrediction) => {
    setShowDropdown(false);
    setLocationSearch(prediction.structured_formatting.main_text);
    setIsSearching(true);

    try {
      const res = await fetch(`/api/places/details?placeId=${prediction.place_id}`);
      const data = await res.json();
      const result = data.result;

      if (result) {
        const addressComponents = result.address_components || [];
        let city = "";
        let state = "";
        let country = "";

        for (const comp of addressComponents) {
          if (comp.types.includes("locality")) city = comp.long_name;
          if (comp.types.includes("administrative_area_level_1")) state = comp.long_name;
          if (comp.types.includes("country")) country = comp.long_name;
        }

        setWorkingLocation({
          name: result.name || prediction.structured_formatting.main_text,
          formattedAddress: result.formatted_address || prediction.description,
          placeId: prediction.place_id,
          latitude: result.geometry?.location?.lat || null,
          longitude: result.geometry?.location?.lng || null,
          city,
          state,
          country,
        });
      }
    } catch {
      console.error("Failed to fetch place details");
    } finally {
      setIsSearching(false);
    }
  }, []);

  /* ── Profile Photo ── */
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  /* ── Step validation ── */
  const isStepValid = useCallback(
    (step: number): boolean => {
      switch (step) {
        case 1:
          return isSignedIn === true;
        case 2:
          return fullName.trim().length > 0 && validatePhone(phoneNumber);
        case 3:
          return selectedLanguages.length > 0;
        case 4:
          return availableDays.length > 0 && hourlyRate.trim().length > 0 && Number(hourlyRate) >= 0;
        case 5:
          return workingLocation !== null;
        case 6:
          return true;
        default:
          return true;
      }
    },
    [isSignedIn, fullName, phoneNumber, selectedLanguages, availableDays, hourlyRate, workingLocation, validatePhone]
  );

  /* ── Submit ── */
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/guides/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone: phoneNumber,
          bio,
          languages: selectedLanguages,
          expertise: selectedSpecializations,
          experienceYears: parseInt(yearsOfExperience) || 0,
          hourlyRate: parseFloat(hourlyRate) || 500,
          currency: "INR",
          availableDays,
          availableTimeFrom: timeFrom,
          availableTimeTo: timeTo,
          profilePhoto,
          workingLocation,
        }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          router.push("/guides");
        }, 3000);
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to create guide profile. Please try again.");
      }
    } catch {
      alert("An error occurred. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── Navigation ── */
  const goNext = () => {
    if (currentStep < 7) setCurrentStep((s) => s + 1);
    if (currentStep === 6) handleSubmit();
  };

  const goPrev = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  /* ── Loading state ── */
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#FAFBF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#485C11] animate-spin" />
          <p className="text-sm text-[#6b7280]">Loading...</p>
        </div>
      </div>
    );
  }

  /* ── Not signed in ── */
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#FAFBF8] flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl border border-[#e5e7db] shadow-lg max-w-md w-full p-8 text-center">
          <Shield className="w-14 h-14 text-[#485C11] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2">Sign In Required</h2>
          <p className="text-sm text-[#6b7280] mb-6">
            You need to sign in with Google to register as a guide on Roamly.
          </p>
          <button
            onClick={() => router.push("/sign-in")}
            className="bg-[#485C11] text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-[#3a4d0d] transition-all"
          >
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  const email = user?.primaryEmailAddress?.emailAddress || "";

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAFBF8] via-[#f5f7f0] to-[#eef3e4]">
      {/* ─── Header ─── */}
      <div className="border-b border-[#e5e7db] bg-white/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#485C11] to-[#6b8a1a] flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#1a1a1a]">Become a Guide</h1>
              <p className="text-xs text-[#6b7280]">Register as a verified local expert</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 text-xs text-[#6b7280]">
            <span>Step {currentStep} of 7</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ─── Sidebar Steps ─── */}
          <div className="lg:w-64 shrink-0">
            <div className="bg-white rounded-3xl border border-[#e5e7db] p-4 shadow-sm lg:sticky lg:top-24">
              <div className="space-y-1">
                {STEPS.map((step) => {
                  const Icon = step.icon;
                  const isActive = step.id === currentStep;
                  const isComplete = step.id < currentStep;
                  const isFuture = step.id > currentStep;

                  return (
                    <button
                      key={step.id}
                      onClick={() => {
                        if (isComplete) setCurrentStep(step.id);
                      }}
                      disabled={isFuture}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all duration-300 ${
                        isActive
                          ? "bg-[#485C11] text-white shadow-md scale-[1.02]"
                          : isComplete
                          ? "bg-[#DFECC6]/50 text-[#485C11] hover:bg-[#DFECC6]/80 cursor-pointer"
                          : "text-[#9ca3af] cursor-not-allowed"
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                          isActive
                            ? "bg-white/20"
                            : isComplete
                            ? "bg-[#485C11]/10"
                            : "bg-gray-100"
                        }`}
                      >
                        {isComplete ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 hidden lg:block">
                        <p className="text-xs font-semibold truncate">{step.title}</p>
                        <p
                          className={`text-[10px] truncate ${
                            isActive ? "text-white/70" : "text-[#9ca3af]"
                          }`}
                        >
                          {step.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ─── Main Content ─── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-3xl border border-[#e5e7db] shadow-sm overflow-hidden">
              {/* Progress Bar */}
              <div className="h-1.5 bg-[#f0f4e8]">
                <div
                  className="h-full bg-gradient-to-r from-[#485C11] to-[#6b8a1a] rounded-r-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentStep - 1) / 6) * 100}%` }}
                />
              </div>

              <div className="p-6 sm:p-8">
                {/* ═══ STEP 1: Account ═══ */}
                {currentStep === 1 && (
                  <div className="animate-fade-in-up space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1a1a1a]">Account Verified</h2>
                      <p className="text-sm text-[#6b7280] mt-1">
                        Your identity has been confirmed via Google authentication.
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-[#f4f7ee] to-[#eef3e4] rounded-2xl p-6 border border-[#e5e7db]">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white shadow-md flex items-center justify-center border border-[#e5e7db] overflow-hidden">
                          {user?.imageUrl ? (
                            <img
                              src={user.imageUrl}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-8 h-8 text-[#485C11]" />
                          )}
                        </div>
                        <div>
                          <p className="text-base font-bold text-[#1a1a1a]">
                            {user?.fullName || "Traveler"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Mail className="w-3.5 h-3.5 text-[#485C11]" />
                            <p className="text-sm text-[#6b7280]">{email}</p>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <p className="text-xs font-medium text-emerald-700">
                              Google Verified
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                      <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800">
                          Email is read-only
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          Your email ({email}) was obtained from Clerk authentication and cannot be changed here.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══ STEP 2: Personal Information ═══ */}
                {currentStep === 2 && (
                  <div className="animate-fade-in-up space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1a1a1a]">Personal Information</h2>
                      <p className="text-sm text-[#6b7280] mt-1">
                        Share your details to build your guide profile.
                      </p>
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
                        <User className="w-4 h-4 text-[#485C11]" />
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full px-4 py-3 rounded-2xl border border-[#e5e7db] text-sm focus:border-[#485C11] focus:ring-2 focus:ring-[#485C11]/10 outline-none transition-all bg-[#FAFBF8]"
                      />
                    </div>

                    {/* Profile Photo */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
                        <Camera className="w-4 h-4 text-[#485C11]" />
                        Profile Photo
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-[#d6dacb] bg-[#FAFBF8] flex items-center justify-center overflow-hidden group hover:border-[#485C11] transition-all cursor-pointer">
                          {profilePhoto ? (
                            <>
                              <img
                                src={profilePhoto}
                                alt="Profile preview"
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => setProfilePhoto(null)}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : user?.imageUrl ? (
                            <img
                              src={user.imageUrl}
                              alt="Google profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImagePlus className="w-8 h-8 text-[#9ca3af] group-hover:text-[#485C11] transition-colors" />
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                        <div className="text-xs text-[#6b7280]">
                          <p className="font-medium text-[#374151]">Upload a professional photo</p>
                          <p>Used on your public profile and search results</p>
                          <p>JPG, PNG • Max 5MB</p>
                        </div>
                      </div>
                    </div>

                    {/* Email (Read-only) */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
                        <Mail className="w-4 h-4 text-[#485C11]" />
                        Email
                        <span className="text-[10px] bg-[#DFECC6] text-[#485C11] px-2 py-0.5 rounded-full font-medium">
                          Auto-filled from Clerk
                        </span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        readOnly
                        className="w-full px-4 py-3 rounded-2xl border border-[#e5e7db] text-sm bg-[#f0f4e8] text-[#6b7280] cursor-not-allowed"
                      />
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
                        <Phone className="w-4 h-4 text-[#485C11]" />
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <div className="shrink-0 flex items-center px-3 py-3 rounded-2xl border border-[#e5e7db] bg-[#f0f4e8] text-sm text-[#6b7280]">
                          +91
                        </div>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^\d\s\-()]/g, "");
                            setPhoneNumber(val);
                            if (val.length > 0) validatePhone(val);
                          }}
                          onBlur={() => validatePhone(phoneNumber)}
                          placeholder="9876543210"
                          className={`flex-1 px-4 py-3 rounded-2xl border text-sm outline-none transition-all bg-[#FAFBF8] ${
                            phoneError
                              ? "border-red-400 focus:ring-2 focus:ring-red-200"
                              : "border-[#e5e7db] focus:border-[#485C11] focus:ring-2 focus:ring-[#485C11]/10"
                          }`}
                        />
                      </div>
                      {phoneError && (
                        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                          <X className="w-3 h-3" /> {phoneError}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ═══ STEP 3: Guide Information ═══ */}
                {currentStep === 3 && (
                  <div className="animate-fade-in-up space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1a1a1a]">Guide Information</h2>
                      <p className="text-sm text-[#6b7280] mt-1">
                        Tell travelers about your expertise and experience.
                      </p>
                    </div>

                    {/* Languages */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
                        <Languages className="w-4 h-4 text-[#485C11]" />
                        Languages Spoken <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-[#6b7280] mb-3">
                        Select at least one language you can guide in.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ALL_LANGUAGES.map((lang) => {
                          const selected = selectedLanguages.includes(lang);
                          return (
                            <button
                              key={lang}
                              type="button"
                              onClick={() =>
                                setSelectedLanguages((prev) =>
                                  selected
                                    ? prev.filter((l) => l !== lang)
                                    : [...prev, lang]
                                )
                              }
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                                selected
                                  ? "bg-[#485C11] text-white border-[#485C11] shadow-sm scale-105"
                                  : "bg-white text-[#4b5563] border-[#e5e7db] hover:border-[#485C11]/40 hover:bg-[#f4f7ee]"
                              }`}
                            >
                              {selected && <Check className="w-3 h-3 inline mr-1 -mt-0.5" />}
                              {lang}
                            </button>
                          );
                        })}
                      </div>
                      {selectedLanguages.length === 0 && (
                        <p className="text-xs text-amber-600 mt-2">
                          Please select at least one language
                        </p>
                      )}
                    </div>

                    {/* Years of Experience */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
                        <Award className="w-4 h-4 text-[#485C11]" />
                        Years of Experience
                      </label>
                      <div className="relative max-w-xs">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          value={yearsOfExperience}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || (Number(val) >= 0 && Number(val) <= 50)) {
                              setYearsOfExperience(val);
                            }
                          }}
                          placeholder="e.g. 5"
                          className="w-full px-4 py-3 pr-16 rounded-2xl border border-[#e5e7db] text-sm focus:border-[#485C11] focus:ring-2 focus:ring-[#485C11]/10 outline-none transition-all bg-[#FAFBF8]"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#6b7280]">
                          years
                        </span>
                      </div>
                    </div>

                    {/* Specializations */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
                        <Briefcase className="w-4 h-4 text-[#485C11]" />
                        Areas / Specializations
                      </label>
                      <p className="text-xs text-[#6b7280] mb-3">
                        Select the tour types you specialize in.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ALL_SPECIALIZATIONS.map((spec) => {
                          const selected = selectedSpecializations.includes(spec);
                          return (
                            <button
                              key={spec}
                              type="button"
                              onClick={() =>
                                setSelectedSpecializations((prev) =>
                                  selected
                                    ? prev.filter((s) => s !== spec)
                                    : [...prev, spec]
                                )
                              }
                              className={`px-3 py-2.5 rounded-2xl text-xs font-medium transition-all duration-200 border text-left ${
                                selected
                                  ? "bg-[#485C11] text-white border-[#485C11] shadow-sm"
                                  : "bg-white text-[#4b5563] border-[#e5e7db] hover:border-[#485C11]/40 hover:bg-[#f4f7ee]"
                              }`}
                            >
                              {selected && <Check className="w-3 h-3 inline mr-1 -mt-0.5" />}
                              {spec}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
                        <FileText className="w-4 h-4 text-[#485C11]" />
                        Short Bio / About You
                      </label>
                      <textarea
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="I am a local Mumbai guide with 5 years of experience specializing in heritage, culture, and food tours..."
                        className="w-full px-4 py-3 rounded-2xl border border-[#e5e7db] text-sm focus:border-[#485C11] focus:ring-2 focus:ring-[#485C11]/10 outline-none transition-all bg-[#FAFBF8] resize-none"
                      />
                      <p className="text-[10px] text-[#9ca3af] mt-1 text-right">
                        {bio.length}/500 characters
                      </p>
                    </div>
                  </div>
                )}

                {/* ═══ STEP 4: Availability & Pricing ═══ */}
                {currentStep === 4 && (
                  <div className="animate-fade-in-up space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1a1a1a]">Availability & Pricing</h2>
                      <p className="text-sm text-[#6b7280] mt-1">
                        Set your working schedule and hourly rate.
                      </p>
                    </div>

                    {/* Available Days */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
                        <Calendar className="w-4 h-4 text-[#485C11]" />
                        Available Days <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => {
                          const selected = availableDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() =>
                                setAvailableDays((prev) =>
                                  selected
                                    ? prev.filter((d) => d !== day)
                                    : [...prev, day]
                                )
                              }
                              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 border ${
                                selected
                                  ? "bg-[#485C11] text-white border-[#485C11] shadow-sm"
                                  : "bg-white text-[#4b5563] border-[#e5e7db] hover:border-[#485C11]/40"
                              }`}
                            >
                              {selected && <Check className="w-3 h-3 inline mr-1 -mt-0.5" />}
                              {day.substring(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setAvailableDays(
                            availableDays.length === 7 ? [] : [...DAYS_OF_WEEK]
                          )
                        }
                        className="mt-2 text-xs text-[#485C11] font-medium hover:underline"
                      >
                        {availableDays.length === 7 ? "Deselect All" : "Select All Days"}
                      </button>
                    </div>

                    {/* Time Range */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
                        <Clock className="w-4 h-4 text-[#485C11]" />
                        Available Time
                      </label>
                      <div className="flex items-center gap-3 max-w-md">
                        <select
                          value={timeFrom}
                          onChange={(e) => setTimeFrom(e.target.value)}
                          className="flex-1 px-4 py-3 rounded-2xl border border-[#e5e7db] text-sm focus:border-[#485C11] outline-none bg-[#FAFBF8]"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {formatTime(t)}
                            </option>
                          ))}
                        </select>
                        <span className="text-sm font-medium text-[#6b7280]">to</span>
                        <select
                          value={timeTo}
                          onChange={(e) => setTimeTo(e.target.value)}
                          className="flex-1 px-4 py-3 rounded-2xl border border-[#e5e7db] text-sm focus:border-[#485C11] outline-none bg-[#FAFBF8]"
                        >
                          {TIME_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {formatTime(t)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Hourly Rate */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
                        <IndianRupee className="w-4 h-4 text-[#485C11]" />
                        Charges per Hour <span className="text-red-500">*</span>
                      </label>
                      <div className="relative max-w-xs">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-sm font-semibold text-[#485C11]">
                          ₹
                        </div>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={hourlyRate}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || Number(val) >= 0) setHourlyRate(val);
                          }}
                          placeholder="500"
                          className="w-full pl-8 pr-20 py-3 rounded-2xl border border-[#e5e7db] text-sm focus:border-[#485C11] focus:ring-2 focus:ring-[#485C11]/10 outline-none transition-all bg-[#FAFBF8]"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-[#6b7280] bg-[#f0f4e8] px-2 py-0.5 rounded-lg">
                          INR / hour
                        </span>
                      </div>
                      {hourlyRate && (
                        <p className="text-xs text-[#6b7280] mt-2">
                          Example: ₹{Number(hourlyRate).toLocaleString("en-IN")} / hour
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ═══ STEP 5: Working Location ═══ */}
                {currentStep === 5 && (
                  <div className="animate-fade-in-up space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1a1a1a]">Working Location</h2>
                      <p className="text-sm text-[#6b7280] mt-1">
                        Search and select the location where you provide your guide services.
                      </p>
                    </div>

                    {/* Location Search */}
                    <div ref={dropdownRef} className="relative">
                      <label className="flex items-center gap-1.5 text-sm font-semibold text-[#374151] mb-2">
                        <Search className="w-4 h-4 text-[#485C11]" />
                        Search Location <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={locationSearch}
                          onChange={(e) => handleLocationSearch(e.target.value)}
                          onFocus={() => {
                            if (locationPredictions.length > 0) setShowDropdown(true);
                          }}
                          placeholder="e.g. Gateway of India, Mumbai"
                          className="w-full px-4 py-3 pl-10 rounded-2xl border border-[#e5e7db] text-sm focus:border-[#485C11] focus:ring-2 focus:ring-[#485C11]/10 outline-none transition-all bg-[#FAFBF8]"
                        />
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                        {isSearching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#485C11] animate-spin" />
                        )}
                      </div>

                      {/* Dropdown */}
                      {showDropdown && locationPredictions.length > 0 && (
                        <div className="absolute z-30 mt-2 w-full bg-white rounded-2xl border border-[#e5e7db] shadow-xl overflow-hidden">
                          {locationPredictions.map((prediction) => (
                            <button
                              key={prediction.place_id}
                              onClick={() => handleSelectPlace(prediction)}
                              className="w-full px-4 py-3 text-left hover:bg-[#f4f7ee] transition-colors flex items-start gap-3 border-b border-[#f0f4e8] last:border-0"
                            >
                              <MapPin className="w-4 h-4 text-[#485C11] shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-[#1a1a1a]">
                                  {prediction.structured_formatting.main_text}
                                </p>
                                <p className="text-xs text-[#6b7280]">
                                  {prediction.structured_formatting.secondary_text}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Location Card */}
                    {workingLocation && (
                      <div className="bg-gradient-to-br from-[#f4f7ee] to-[#eef3e4] rounded-2xl p-5 border border-[#d6dacb]">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#485C11] flex items-center justify-center shadow">
                              <MapPin className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-[#1a1a1a]">
                                {workingLocation.name}
                              </h4>
                              <p className="text-xs text-[#6b7280] mt-0.5">
                                {workingLocation.formattedAddress}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {workingLocation.city && (
                                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-lg border border-[#e5e7db] text-[#485C11] font-medium">
                                    {workingLocation.city}
                                  </span>
                                )}
                                {workingLocation.state && (
                                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-lg border border-[#e5e7db] text-[#6b7280]">
                                    {workingLocation.state}
                                  </span>
                                )}
                                {workingLocation.country && (
                                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-lg border border-[#e5e7db] text-[#6b7280]">
                                    {workingLocation.country}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setWorkingLocation(null);
                              setLocationSearch("");
                            }}
                            className="w-7 h-7 rounded-lg bg-white border border-[#e5e7db] flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors"
                          >
                            <X className="w-3.5 h-3.5 text-[#9ca3af]" />
                          </button>
                        </div>

                        {/* Mini Map Preview */}
                        {workingLocation.latitude && workingLocation.longitude && (
                          <div className="mt-4 rounded-xl overflow-hidden border border-[#d6dacb] h-40 bg-[#e5e7db]">
                            <img
                              src={`https://maps.googleapis.com/maps/api/staticmap?center=${workingLocation.latitude},${workingLocation.longitude}&zoom=15&size=600x200&markers=color:green%7C${workingLocation.latitude},${workingLocation.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""}`}
                              alt="Location map"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                            <div className="w-full h-full flex items-center justify-center text-xs text-[#6b7280]">
                              <div className="text-center">
                                <MapPin className="w-6 h-6 text-[#485C11] mx-auto mb-1" />
                                <p>
                                  {workingLocation.latitude?.toFixed(4)},{" "}
                                  {workingLocation.longitude?.toFixed(4)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Stored Data Preview */}
                        <div className="mt-3 p-3 bg-white/80 rounded-xl border border-[#e5e7db]">
                          <p className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1.5">
                            Stored Location Data
                          </p>
                          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                            <div>
                              <span className="text-[#9ca3af]">Place ID:</span>{" "}
                              <span className="text-[#374151] font-mono text-[10px]">
                                {workingLocation.placeId.substring(0, 20)}...
                              </span>
                            </div>
                            <div>
                              <span className="text-[#9ca3af]">City:</span>{" "}
                              <span className="text-[#374151]">{workingLocation.city || "—"}</span>
                            </div>
                            <div>
                              <span className="text-[#9ca3af]">Lat:</span>{" "}
                              <span className="text-[#374151]">
                                {workingLocation.latitude?.toFixed(6) || "—"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[#9ca3af]">Lng:</span>{" "}
                              <span className="text-[#374151]">
                                {workingLocation.longitude?.toFixed(6) || "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ STEP 6: Review ═══ */}
                {currentStep === 6 && (
                  <div className="animate-fade-in-up space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1a1a1a]">Review Your Profile</h2>
                      <p className="text-sm text-[#6b7280] mt-1">
                        Verify all your information before submitting.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Profile Header */}
                      <div className="bg-gradient-to-br from-[#f4f7ee] to-[#eef3e4] rounded-2xl p-5 border border-[#d6dacb]">
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white shadow-md border border-[#e5e7db]">
                            {profilePhoto ? (
                              <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                            ) : user?.imageUrl ? (
                              <img src={user.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <User className="w-10 h-10 text-[#9ca3af]" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-[#1a1a1a]">{fullName || "—"}</h3>
                            <p className="text-sm text-[#6b7280]">{email}</p>
                            {phoneNumber && (
                              <p className="text-sm text-[#6b7280] flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" /> +91 {phoneNumber}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Languages */}
                        <ReviewCard
                          icon={<Languages className="w-4 h-4" />}
                          title="Languages"
                          content={
                            selectedLanguages.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {selectedLanguages.map((l) => (
                                  <span key={l} className="text-[10px] px-2 py-0.5 bg-[#DFECC6] text-[#485C11] rounded-lg font-medium">
                                    {l}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[#9ca3af]">Not specified</span>
                            )
                          }
                        />

                        {/* Experience */}
                        <ReviewCard
                          icon={<Award className="w-4 h-4" />}
                          title="Experience"
                          content={
                            <span className="text-sm font-bold text-[#1a1a1a]">
                              {yearsOfExperience || "0"} years
                            </span>
                          }
                        />

                        {/* Specializations */}
                        <ReviewCard
                          icon={<Briefcase className="w-4 h-4" />}
                          title="Specializations"
                          content={
                            selectedSpecializations.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {selectedSpecializations.map((s) => (
                                  <span key={s} className="text-[10px] px-2 py-0.5 bg-[#f0f4e8] text-[#374151] rounded-lg border border-[#e5e7db]">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[#9ca3af]">Not specified</span>
                            )
                          }
                        />

                        {/* Hourly Rate */}
                        <ReviewCard
                          icon={<IndianRupee className="w-4 h-4" />}
                          title="Charges per Hour"
                          content={
                            <span className="text-sm font-bold text-[#485C11]">
                              ₹{Number(hourlyRate || 0).toLocaleString("en-IN")} / hour
                            </span>
                          }
                        />

                        {/* Availability */}
                        <ReviewCard
                          icon={<Calendar className="w-4 h-4" />}
                          title="Availability"
                          content={
                            <div>
                              <div className="flex flex-wrap gap-1 mb-1">
                                {availableDays.map((d) => (
                                  <span key={d} className="text-[10px] px-1.5 py-0.5 bg-[#DFECC6] text-[#485C11] rounded font-medium">
                                    {d.substring(0, 3)}
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-[#6b7280]">
                                {formatTime(timeFrom)} – {formatTime(timeTo)}
                              </p>
                            </div>
                          }
                        />

                        {/* Location */}
                        <ReviewCard
                          icon={<MapPin className="w-4 h-4" />}
                          title="Working Location"
                          content={
                            workingLocation ? (
                              <div>
                                <p className="text-sm font-semibold text-[#1a1a1a]">
                                  {workingLocation.name}
                                </p>
                                <p className="text-xs text-[#6b7280] mt-0.5">
                                  {workingLocation.city}
                                  {workingLocation.state ? `, ${workingLocation.state}` : ""}
                                </p>
                              </div>
                            ) : (
                              <span className="text-[#9ca3af]">Not selected</span>
                            )
                          }
                        />
                      </div>

                      {/* Bio */}
                      {bio && (
                        <div className="bg-[#FAFBF8] rounded-2xl p-4 border border-[#e5e7db]">
                          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#485C11]" />
                            About
                          </p>
                          <p className="text-sm text-[#374151] leading-relaxed italic">
                            &ldquo;{bio}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ═══ STEP 7: Submit ═══ */}
                {currentStep === 7 && (
                  <div className="animate-fade-in-up py-8 text-center space-y-6">
                    {submitSuccess ? (
                      <>
                        <div className="relative w-24 h-24 mx-auto">
                          <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-30" />
                          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl">
                            <CheckCircle2 className="w-12 h-12 text-white" />
                          </div>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-[#1a1a1a]">
                            Profile Created Successfully! 🎉
                          </h2>
                          <p className="text-sm text-[#6b7280] mt-2 max-w-md mx-auto">
                            Your guide profile has been submitted for verification. You&apos;ll receive a notification once approved.
                          </p>
                        </div>
                        <div className="bg-[#f4f7ee] rounded-2xl p-4 max-w-sm mx-auto border border-[#d6dacb]">
                          <p className="text-xs text-[#485C11] font-semibold">
                            Verification Status: PENDING
                          </p>
                          <p className="text-xs text-[#6b7280] mt-1">
                            Redirecting to Guide Dashboard...
                          </p>
                        </div>
                      </>
                    ) : isSubmitting ? (
                      <>
                        <Loader2 className="w-16 h-16 text-[#485C11] animate-spin mx-auto" />
                        <div>
                          <h2 className="text-xl font-bold text-[#1a1a1a]">
                            Creating Your Guide Profile...
                          </h2>
                          <p className="text-sm text-[#6b7280] mt-1">
                            Setting up your profile and linking location data.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                          <X className="w-10 h-10 text-red-500" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-[#1a1a1a]">
                            Something went wrong
                          </h2>
                          <p className="text-sm text-[#6b7280] mt-1">
                            Your profile submission encountered an issue. Please try again.
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setCurrentStep(6);
                          }}
                          className="bg-[#485C11] text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-[#3a4d0d] transition-all"
                        >
                          Go Back & Retry
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* ─── Navigation Buttons ─── */}
                {currentStep < 7 && (
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#f0f4e8]">
                    <button
                      onClick={goPrev}
                      disabled={currentStep === 1}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                        currentStep === 1
                          ? "text-[#d6dacb] cursor-not-allowed"
                          : "text-[#485C11] hover:bg-[#f4f7ee] border border-[#e5e7db]"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>

                    <button
                      onClick={goNext}
                      disabled={!isStepValid(currentStep)}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
                        isStepValid(currentStep)
                          ? "bg-[#485C11] text-white hover:bg-[#3a4d0d] hover:shadow-md"
                          : "bg-[#d6dacb] text-[#9ca3af] cursor-not-allowed"
                      }`}
                    >
                      {currentStep === 6 ? (
                        <>
                          Submit Profile
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          Continue
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Review Card Sub-component ───────────── */

function ReviewCard({
  icon,
  title,
  content,
}: {
  icon: React.ReactNode;
  title: string;
  content: React.ReactNode;
}) {
  return (
    <div className="bg-[#FAFBF8] rounded-2xl p-4 border border-[#e5e7db]">
      <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <span className="text-[#485C11]">{icon}</span>
        {title}
      </p>
      <div>{content}</div>
    </div>
  );
}
