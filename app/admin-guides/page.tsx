"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Languages,
  IndianRupee,
  RefreshCw,
  Search,
  Check,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AdminGuideItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  bio: string | null;
  experienceYears: number;
  languages: string[];
  expertise: string[];
  hourlyRate: number;
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
  availabilityStatus: string;
  appliedAt: string;
  currentLocation: string;
  qualifiedLocations: string[];
}

export default function AdminGuideVerificationPage() {
  const [guides, setGuides] = useState<AdminGuideItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const fetchGuides = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/guides");
      if (res.ok) {
        const data = await res.json();
        setGuides(data.guides || []);
      }
    } catch (err) {
      console.error("Error fetching admin guides:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, []);

  const handleVerify = async (id: string, newStatus: "VERIFIED" | "REJECTED" | "SUSPENDED") => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/admin/guides/${id}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setFeedbackMessage(`Guide status updated to ${newStatus}`);
        setGuides(prev =>
          prev.map(g => (g.id === id ? { ...g, verificationStatus: newStatus } : g))
        );
        setTimeout(() => setFeedbackMessage(null), 3000);
      } else {
        const err = await res.json();
        alert(err.error || "Action failed");
      }
    } catch (err) {
      console.error("Error updating guide status:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredGuides = guides.filter(g => {
    if (statusFilter === "ALL") return true;
    return g.verificationStatus === statusFilter;
  });

  const pendingCount = guides.filter(g => g.verificationStatus === "PENDING").length;
  const verifiedCount = guides.filter(g => g.verificationStatus === "VERIFIED").length;

  return (
    <div className="min-h-screen bg-[#FAFBF8] text-[#1a1a1a] py-10 px-6 sm:px-12">
      <div className="max-w-6xl mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e7db] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Super Admin Console
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a]">
              Licensed Guide Verification Portal
            </h1>
            <p className="text-xs sm:text-sm text-[#6b7280] mt-1">
              Review credential documents, verify local accreditation, and approve or suspend guides for public discovery.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={fetchGuides}
            className="border-[#e5e7db] text-xs h-9 rounded-full self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Queue
          </Button>
        </div>

        {feedbackMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            {feedbackMessage}
          </div>
        )}

        {/* Status Filter Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "ALL"
                ? "border-[#485C11] bg-white shadow-xs"
                : "border-[#e5e7db] bg-white/60 hover:bg-white"
            }`}
          >
            <span className="text-xs text-[#6b7280] block">Total Registered</span>
            <span className="text-2xl font-bold text-[#1a1a1a]">{guides.length}</span>
          </button>

          <button
            onClick={() => setStatusFilter("PENDING")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "PENDING"
                ? "border-amber-500 bg-amber-50/50 shadow-xs"
                : "border-[#e5e7db] bg-white/60 hover:bg-white"
            }`}
          >
            <span className="text-xs text-amber-700 block font-semibold flex items-center gap-1">
              <Clock className="w-3 h-3" /> Pending Review
            </span>
            <span className="text-2xl font-bold text-amber-900">{pendingCount}</span>
          </button>

          <button
            onClick={() => setStatusFilter("VERIFIED")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "VERIFIED"
                ? "border-emerald-600 bg-emerald-50/50 shadow-xs"
                : "border-[#e5e7db] bg-white/60 hover:bg-white"
            }`}
          >
            <span className="text-xs text-emerald-700 block font-semibold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Active &amp; Verified
            </span>
            <span className="text-2xl font-bold text-emerald-900">{verifiedCount}</span>
          </button>

          <button
            onClick={() => setStatusFilter("REJECTED")}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === "REJECTED"
                ? "border-rose-500 bg-rose-50/50 shadow-xs"
                : "border-[#e5e7db] bg-white/60 hover:bg-white"
            }`}
          >
            <span className="text-xs text-rose-700 block font-semibold flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Rejected / Suspended
            </span>
            <span className="text-2xl font-bold text-rose-900">
              {guides.filter(g => g.verificationStatus === "REJECTED" || g.verificationStatus === "SUSPENDED").length}
            </span>
          </button>
        </div>

        {/* Guides List */}
        <div className="mt-8 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-36 bg-gray-100 animate-pulse rounded-2xl border border-[#e5e7db]" />
              ))}
            </div>
          ) : filteredGuides.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-[#d6dacb]">
              <ShieldCheck className="w-10 h-10 text-[#9ca3af] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#1a1a1a]">No Guides Matching Current Filter</p>
            </div>
          ) : (
            filteredGuides.map(guide => (
              <div
                key={guide.id}
                className="bg-white rounded-2xl border border-[#e5e7db] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-[#1a1a1a]">{guide.name}</h3>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${
                        guide.verificationStatus === "VERIFIED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : guide.verificationStatus === "PENDING"
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : "bg-rose-50 text-rose-700 border-rose-300"
                      }`}
                    >
                      {guide.verificationStatus}
                    </Badge>
                  </div>

                  <p className="text-xs text-[#6b7280] mt-0.5">{guide.email} • {guide.experienceYears} years experience</p>

                  <p className="text-xs text-[#4b5563] mt-2 max-w-2xl leading-relaxed">
                    {guide.bio || "No detailed bio provided."}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#6b7280]">
                    <div className="flex items-center gap-1">
                      <Languages className="w-3.5 h-3.5 text-[#485C11]" />
                      <span>{guide.languages.join(", ")}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#485C11]" />
                      <span>{guide.qualifiedLocations.join(" • ") || "No locations assigned"}</span>
                    </div>

                    <div className="flex items-center gap-1 font-semibold text-[#1a1a1a]">
                      <IndianRupee className="w-3 h-3 text-[#485C11]" />
                      <span>{guide.hourlyRate}/hr</span>
                    </div>
                  </div>
                </div>

                {/* Verification Controls */}
                <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                  {guide.verificationStatus === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        disabled={actionLoadingId === guide.id}
                        onClick={() => handleVerify(guide.id, "VERIFIED")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 rounded-full px-4"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={actionLoadingId === guide.id}
                        onClick={() => handleVerify(guide.id, "REJECTED")}
                        className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs h-8 rounded-full px-4"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    </>
                  )}

                  {guide.verificationStatus === "VERIFIED" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoadingId === guide.id}
                      onClick={() => handleVerify(guide.id, "SUSPENDED")}
                      className="border-amber-300 text-amber-800 hover:bg-amber-50 text-xs h-8 rounded-full px-4"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Suspend
                    </Button>
                  )}

                  {(guide.verificationStatus === "REJECTED" || guide.verificationStatus === "SUSPENDED") && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoadingId === guide.id}
                      onClick={() => handleVerify(guide.id, "VERIFIED")}
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs h-8 rounded-full px-4"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Re-instate
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
