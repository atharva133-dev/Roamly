"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  MapPin,
  Languages,
  IndianRupee,
  Calendar,
  User,
  Phone,
  Briefcase,
  CheckCircle2,
  RefreshCw,
  Save,
  Loader2,
  Sparkles,
  Award,
  ExternalLink,
} from "lucide-react";

interface GuideProfileData {
  id: string;
  phone: string | null;
  bio: string | null;
  profilePhoto: string | null;
  languages: string[];
  expertise: string[];
  experienceYears: number;
  hourlyRate: number;
  currency: string;
  availableDays: string[];
  availableTimeFrom: string | null;
  availableTimeTo: string | null;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  availabilityStatus: "AVAILABLE" | "BUSY" | "OFFLINE";
  isEmailVerified: boolean;
  emailVerifiedAt: string | null;
  currentLocation?: {
    id: string;
    name: string;
    city: string;
  } | null;
  locations?: Array<{
    id: string;
    name: string;
    city: string;
    availableFrom: string | null;
    availableTo: string | null;
  }>;
}

interface UserData {
  fullName: string | null;
  email: string;
  profilePhoto: string | null;
}

interface GuideRequestItem {
  id: string;
  userName: string;
  userEmail: string;
  locationName: string;
  date: string;
  startTime: string;
  duration: number;
  totalCost: number;
  message: string | null;
  status: string;
  createdAt: string;
}

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

function GuideDashboardContent() {
  const searchParams = useSearchParams();
  const verifiedParam = searchParams.get("verified");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<GuideProfileData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [requests, setRequests] = useState<GuideRequestItem[]>([]);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Editable Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(500);
  const [availabilityStatus, setAvailabilityStatus] = useState<"AVAILABLE" | "BUSY" | "OFFLINE">("AVAILABLE");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableTimeFrom, setAvailableTimeFrom] = useState("09:00");
  const [availableTimeTo, setAvailableTimeTo] = useState("18:00");

  // Resend Verification State
  const [isResending, setIsResending] = useState(false);
  const [resendNotice, setResendNotice] = useState<string | null>(null);
  const [directVerificationUrl, setDirectVerificationUrl] = useState<string | null>(null);

  const fetchGuideData = async () => {
    try {
      setLoading(true);
      const [profRes, reqRes] = await Promise.all([
        fetch("/api/guides/profile"),
        fetch("/api/guide-requests"),
      ]);

      if (profRes.ok) {
        const data = await profRes.json();
        if (data.profile) {
          setProfile(data.profile);
          setPhone(data.profile.phone || "");
          setBio(data.profile.bio || "");
          setExperienceYears(data.profile.experienceYears || 0);
          setHourlyRate(data.profile.hourlyRate || 500);
          setAvailabilityStatus(data.profile.availabilityStatus || "AVAILABLE");
          setSelectedLanguages(data.profile.languages || []);
          setSelectedExpertise(data.profile.expertise || []);
          setAvailableDays(data.profile.availableDays || []);
          setAvailableTimeFrom(data.profile.availableTimeFrom || "09:00");
          setAvailableTimeTo(data.profile.availableTimeTo || "18:00");
        }
        if (data.user) {
          setUser(data.user);
          setFullName(data.user.fullName || "");
        }
      }

      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData.requests || []);
      }
    } catch (err) {
      console.error("Error loading guide dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuideData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccessNotice(null);

    try {
      const res = await fetch("/api/guides/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          bio,
          experienceYears: parseInt(String(experienceYears)) || 0,
          hourlyRate: parseFloat(String(hourlyRate)) || 0,
          availabilityStatus,
          languages: selectedLanguages,
          expertise: selectedExpertise,
          availableDays,
          availableTimeFrom,
          availableTimeTo,
        }),
      });

      if (res.ok) {
        setSaveSuccessNotice("Profile updated successfully!");
        fetchGuideData();
        setTimeout(() => setSaveSuccessNotice(null), 3500);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update profile");
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendNotice(null);
    try {
      const res = await fetch("/api/guides/verify/resend", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResendNotice("Verification email generated! Check your inbox or click the link below.");
        if (data.verificationUrl) {
          setDirectVerificationUrl(data.verificationUrl);
        }
      } else {
        setResendNotice(data.error || "Failed to resend verification email.");
      }
    } catch {
      setResendNotice("Network error. Please try again later.");
    } finally {
      setIsResending(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const toggleExpertise = (exp: string) => {
    setSelectedExpertise((prev) =>
      prev.includes(exp) ? prev.filter((e) => e !== exp) : [...prev, exp]
    );
  };

  const toggleDay = (day: string) => {
    setAvailableDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFBF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-[#485C11] animate-spin" />
          <p className="text-sm text-[#6b7280]">Loading Guide Dashboard...</p>
        </div>
      </div>
    );
  }

  const isVerified = profile?.isEmailVerified || profile?.verificationStatus === "VERIFIED";

  return (
    <div className="min-h-screen bg-[#FAFBF8] text-[#1a1a1a] pb-16">
      {/* Top Header */}
      <div className="bg-white border-b border-[#e5e7db] sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#485C11] to-[#6b8a1a] flex items-center justify-center text-white font-bold shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1a1a1a]">Guide Portal</h1>
              <p className="text-xs text-[#6b7280]">
                {user?.fullName || "Local Expert"} • {user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Email Verification Status Pill */}
            {isVerified ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Email verification: ✓ Verified
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Email verification: ⚠ Pending
              </div>
            )}

            <Link
              href="/guides"
              className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[#e5e7db] hover:bg-gray-50 text-[#485C11] font-medium"
            >
              Public Directory <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        {/* Verification Success Toast / Notification */}
        {verifiedParam === "true" && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                <strong>Email verified successfully!</strong> Your guide account is now active and publicly discoverable.
              </span>
            </div>
          </div>
        )}

        {/* Verification Pending Banner */}
        {!isVerified && (
          <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-3xl shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Email verification is pending
                </div>
                <p className="text-xs text-amber-800 leading-relaxed max-w-2xl">
                  Please check your inbox at <strong>{user?.email}</strong> and click the verification button to activate public discoverability and receive booking requests.
                  <br />
                  <span className="font-semibold text-[#485C11]">
                    Note: Admin approval is NOT required. Your profile goes live immediately upon email verification.
                  </span>
                </p>
                {resendNotice && (
                  <p className="text-xs font-semibold text-emerald-700 mt-2 bg-white/60 p-1.5 rounded-lg inline-block">
                    {resendNotice}
                  </p>
                )}

                {directVerificationUrl && (
                  <div className="mt-3 p-3 bg-white border border-emerald-300 rounded-2xl text-xs flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
                    <span className="text-[#1a1a1a] font-medium">
                      Instant Verification Link (Dev Mode):
                    </span>
                    <a
                      href={directVerificationUrl}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-1.5 rounded-full text-xs shadow-xs transition-all"
                    >
                      Verify Account Now →
                    </a>
                  </div>
                )}
              </div>

              <button
                onClick={handleResendEmail}
                disabled={isResending}
                className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-[#485C11] hover:bg-[#3a4d0d] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isResending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Resend Verification Email
              </button>
            </div>
          </div>
        )}

        {saveSuccessNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {saveSuccessNotice}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Edit Column */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl border border-[#e5e7db] p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-[#f0f4e8] pb-4">
                <div>
                  <h2 className="text-base font-bold text-[#1a1a1a]">Edit Guide Profile</h2>
                  <p className="text-xs text-[#6b7280]">
                    Customize your rates, schedule, and tour specializations. Changes apply immediately.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 bg-[#485C11] hover:bg-[#3a4d0d] text-white text-xs font-semibold px-5 py-2 rounded-full shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Profile
                </button>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#e5e7db] rounded-xl focus:outline-none focus:border-[#485C11]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-xs border border-[#e5e7db] rounded-xl focus:outline-none focus:border-[#485C11]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Hourly Price (INR)</label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 text-[#6b7280] absolute left-3 top-2.5" />
                    <input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-[#e5e7db] rounded-xl focus:outline-none focus:border-[#485C11]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-[#e5e7db] rounded-xl focus:outline-none focus:border-[#485C11]"
                  />
                </div>
              </div>

              {/* Availability Status */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1a1a] mb-2">Live Availability Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["AVAILABLE", "BUSY", "OFFLINE"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAvailabilityStatus(st)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        availabilityStatus === st
                          ? st === "AVAILABLE"
                            ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                            : st === "BUSY"
                            ? "bg-amber-50 border-amber-500 text-amber-800"
                            : "bg-gray-100 border-gray-400 text-gray-700"
                          : "border-[#e5e7db] bg-white text-[#6b7280] hover:bg-gray-50"
                      }`}
                    >
                      {st === "AVAILABLE" ? "🟢 Available" : st === "BUSY" ? "🟡 Busy" : "⚪ Offline"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Guide Bio / Summary</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell travelers about your background, favorite spots, and tour style..."
                  className="w-full px-3 py-2 text-xs border border-[#e5e7db] rounded-xl focus:outline-none focus:border-[#485C11]"
                />
              </div>

              {/* Working Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Available From</label>
                  <input
                    type="time"
                    value={availableTimeFrom}
                    onChange={(e) => setAvailableTimeFrom(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#e5e7db] rounded-xl focus:outline-none focus:border-[#485C11]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1a1a1a] mb-1">Available To</label>
                  <input
                    type="time"
                    value={availableTimeTo}
                    onChange={(e) => setAvailableTimeTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-[#e5e7db] rounded-xl focus:outline-none focus:border-[#485C11]"
                  />
                </div>
              </div>

              {/* Available Days */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1a1a] mb-1.5">Available Days</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = availableDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#485C11] border-[#485C11] text-white"
                            : "bg-[#f4f7ee] border-[#e5e7db] text-[#4b5563] hover:bg-[#eef3e4]"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1a1a] mb-1.5">Languages Spoken</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_LANGUAGES.map((lang) => {
                    const isSelected = selectedLanguages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`text-xs px-3 py-1 rounded-full border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#485C11] border-[#485C11] text-white"
                            : "bg-white border-[#e5e7db] text-[#4b5563] hover:bg-[#f4f7ee]"
                        }`}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Specializations */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1a1a] mb-1.5">Tour Specializations</label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_SPECIALIZATIONS.map((spec) => {
                    const isSelected = selectedExpertise.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleExpertise(spec)}
                        className={`text-xs px-3 py-1 rounded-full border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#485C11] border-[#485C11] text-white"
                            : "bg-white border-[#e5e7db] text-[#4b5563] hover:bg-[#f4f7ee]"
                        }`}
                      >
                        {spec}
                      </button>
                    );
                  })}
                </div>
              </div>
            </form>
          </div>

          {/* Right Column: Status & Received Booking Requests */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-3xl border border-[#e5e7db] p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-[#1a1a1a]">Account Verification Status</h3>

              <div className="p-4 rounded-2xl border border-[#e5e7db] bg-[#FAFBF8] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6b7280]">Verification Type:</span>
                  <span className="font-semibold text-[#1a1a1a]">Email Link Verification</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6b7280]">Email Verified:</span>
                  <span className={`font-semibold ${isVerified ? "text-emerald-700" : "text-amber-700"}`}>
                    {isVerified ? "Yes ✓" : "Pending ⚠"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6b7280]">Admin Approval Required:</span>
                  <span className="font-semibold text-emerald-700">No (Self-Service)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6b7280]">Public Bookability:</span>
                  <span className={`font-semibold ${isVerified ? "text-emerald-700" : "text-gray-500"}`}>
                    {isVerified ? "Active" : "Inactive (Verify Email)"}
                  </span>
                </div>
              </div>

              {profile?.currentLocation && (
                <div className="text-xs text-[#6b7280] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#485C11]" />
                  <span>Primary Location: {profile.currentLocation.name} ({profile.currentLocation.city})</span>
                </div>
              )}
            </div>

            {/* Received Booking Requests */}
            <div className="bg-white rounded-3xl border border-[#e5e7db] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1a1a1a]">Booking Requests</h3>
                <span className="text-xs bg-[#f4f7ee] text-[#485C11] font-semibold px-2.5 py-0.5 rounded-full">
                  {requests.length} received
                </span>
              </div>

              {requests.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#6b7280]">
                  <Clock className="w-8 h-8 text-[#9ca3af] mx-auto mb-2 opacity-50" />
                  No booking requests received yet.
                  {!isVerified && (
                    <p className="text-amber-700 mt-1 font-medium">
                      Verify your email to start receiving requests from travelers!
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {requests.map((r) => (
                    <div key={r.id} className="p-3 bg-[#FAFBF8] border border-[#e5e7db] rounded-2xl text-xs space-y-1">
                      <div className="flex items-center justify-between font-semibold text-[#1a1a1a]">
                        <span>{r.userName}</span>
                        <span className="text-[#485C11]">₹{r.totalCost}</span>
                      </div>
                      <p className="text-[#6b7280]">{r.locationName} • {r.duration} hrs</p>
                      <p className="text-[#9ca3af]">{new Date(r.date).toLocaleDateString()} at {r.startTime}</p>
                      <div className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                        {r.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuideDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFBF8] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#485C11] animate-spin" />
        </div>
      }
    >
      <GuideDashboardContent />
    </Suspense>
  );
}
