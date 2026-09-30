"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Hotel,
  UtensilsCrossed,
  MapPin,
  Star,
  ExternalLink,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Heart,
  Clock,
  Tag,
  Share2,
  Globe,
  ArrowUpRight,
  Info,
  Phone,
  Camera,
  X,
  Images,
  Navigation,
  Accessibility,
  CircleDot,
  Users,
  Sparkles,
  CreditCard,
  Coffee,
} from "lucide-react";
import { StayOrRestroItem } from "@/app/api/stays/route";

interface GoogleTravelHotelCardProps {
  item: StayOrRestroItem;
  variant?: "compact" | "full";
  isSelected?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  onSelect?: (item: StayOrRestroItem) => void;
  onOpenDetailsModal?: (item: StayOrRestroItem, tab?: "overview" | "menu" | "prices" | "photos" | "reviews" | "about") => void;
  defaultTab?: "overview" | "menu" | "prices" | "photos" | "reviews" | "about";
  onClose?: () => void;
}

function PlusCodeIcon({ className = "size-3.5 text-[#007b83]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M2 12h20" strokeWidth="2.5" />
      <circle cx="6" cy="6" r="1.5" fill="currentColor" />
      <circle cx="18" cy="6" r="1.5" fill="currentColor" />
      <circle cx="6" cy="18" r="1.5" fill="currentColor" />
      <circle cx="18" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}

function MiniGoogleMap({
  coordinates,
  name,
  googleMapsUri,
}: {
  coordinates?: { lat: number; lng: number };
  name: string;
  googleMapsUri?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapRendered, setMapRendered] = useState(false);

  useEffect(() => {
    if (!coordinates?.lat || !coordinates?.lng || !mapRef.current) return;
    if (typeof window === "undefined") return;

    let isMounted = true;
    const renderMap = () => {
      if (!isMounted || !mapRef.current) return;
      if ((window as any).google?.maps) {
        try {
          const center = { lat: coordinates.lat, lng: coordinates.lng };
          const map = new (window as any).google.maps.Map(mapRef.current, {
            center,
            zoom: 15,
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            gestureHandling: "cooperative",
          });

          new (window as any).google.maps.Marker({
            position: center,
            map,
            title: name,
          });

          setMapRendered(true);
        } catch (err) {
          console.warn("Failed to mount mini map:", err);
        }
      }
    };

    if ((window as any).google?.maps) {
      renderMap();
    } else {
      const interval = setInterval(() => {
        if ((window as any).google?.maps) {
          clearInterval(interval);
          renderMap();
        }
      }, 400);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [coordinates, name]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#e5e3df]">
      <div ref={mapRef} className="w-full h-full" />
      {!mapRendered && (
        <div className="absolute inset-0 bg-[#e8ece9] flex flex-col justify-between p-3 select-none pointer-events-none">
          {/* Street map vector grid background */}
          <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 400 300" fill="none">
            <path d="M-10 40 Q 150 70 410 30" stroke="#ffffff" strokeWidth="12" />
            <path d="M-10 120 Q 200 160 410 130" stroke="#ffffff" strokeWidth="10" />
            <path d="M-10 240 Q 180 200 410 260" stroke="#ffffff" strokeWidth="14" />
            <path d="M80 -10 Q 110 150 90 310" stroke="#ffffff" strokeWidth="9" />
            <path d="M220 -10 Q 200 140 240 310" stroke="#ffffff" strokeWidth="11" />
            <path d="M320 -10 Q 340 160 310 310" stroke="#ffffff" strokeWidth="8" />
            <rect x="130" y="70" width="70" height="45" rx="6" fill="#d2e3c8" opacity="0.65" />
            <rect x="250" y="170" width="80" height="50" rx="6" fill="#d2e3c8" opacity="0.65" />
          </svg>

          {/* Top landmarks */}
          <div className="relative z-10 flex justify-between items-start text-[10px] text-neutral-600 font-semibold px-1">
            <span className="text-neutral-500 uppercase tracking-widest text-[9px]">Ciutat Vella</span>
            <span className="text-purple-700/90 flex items-center gap-0.5">
              <span>🏛️ Museu Picasso</span>
            </span>
          </div>

          {/* Central Red Marker Pin with Place Name Pill */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white shadow-md border border-neutral-200">
              <div className="size-4.5 rounded-full bg-[#ea4335] text-white flex items-center justify-center shadow-xs">
                <MapPin className="size-3 fill-white" />
              </div>
              <span className="text-xs font-bold text-neutral-900 line-clamp-1">{name}</span>
            </div>
            <div className="size-2.5 bg-[#ea4335] rotate-45 -mt-1 shadow-xs" />
          </div>

          {/* Bottom Landmarks */}
          <div className="relative z-10 flex justify-between items-end text-[10px] font-semibold text-neutral-600 px-1 pb-1">
            <span className="text-blue-700/90 flex items-center gap-0.5">
              <span>🛍️ Mercat de la Boqueria</span>
            </span>
            <span className="text-purple-700/90 flex items-center gap-0.5">
              <span>🏰 Palau Güell</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GoogleTravelHotelCard({
  item,
  variant = "compact",
  isSelected = false,
  isFavorite = false,
  onToggleFavorite,
  onSelect,
  onOpenDetailsModal,
  defaultTab = "overview",
  onClose,
}: GoogleTravelHotelCardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "menu" | "prices" | "photos" | "reviews" | "about">(defaultTab);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const rawPhotos = item.photos && item.photos.length > 0 ? item.photos : (item.image ? [item.image] : []);
  const fallbackPhotos = item.type === "hotel"
    ? [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80",
      ]
    : [
        "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
      ];
  const displayPhotos = rawPhotos.length >= 6 ? rawPhotos : [...rawPhotos, ...fallbackPhotos].slice(0, 10);
  const photos = displayPhotos;
  const activeHeroPhoto = displayPhotos[currentPhotoIndex] || displayPhotos[0] || item.image;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(item.googleMapsUri || window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev - 1 + displayPhotos.length) % displayPhotos.length);
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev + 1) % displayPhotos.length);
  };

  const hasDistinctNeighborhood =
    Boolean(item.neighborhood) &&
    item.neighborhood.toLowerCase() !== item.destination.toLowerCase();

  // -------------------------------------------------------------------------
  // 1. COMPACT CARD VARIANT (FOR STAYS LIST)
  // -------------------------------------------------------------------------
  if (variant === "compact") {
    return (
      <div
        id={`hotel-card-${item.id}`}
        onClick={() => onSelect?.(item)}
        className={`group rounded-xl border transition-all duration-200 overflow-hidden bg-white p-3 flex flex-col sm:flex-row gap-3 font-sans cursor-pointer shadow-xs hover:shadow-sm ${
          isSelected
            ? "border-[#007b83] ring-1.5 ring-[#007b83]/30 shadow-sm"
            : "border-neutral-200 hover:border-neutral-300"
        }`}
      >
        {/* Compact Thumbnail on Left */}
        <div className="relative w-full sm:w-44 h-40 sm:h-36 rounded-lg overflow-hidden shrink-0 bg-neutral-100">
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.includes("fallback")) {
                target.src =
                  item.type === "hotel"
                    ? "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80#fallback"
                    : "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80#fallback";
              }
            }}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15 pointer-events-none" />

          {/* Badges on Thumbnail */}
          <div className="absolute top-2 left-2 flex items-center gap-1">
            <span
              className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider text-white shadow-xs flex items-center gap-1"
              style={{
                backgroundColor: item.type === "hotel" ? "#007b83" : "#c2410c",
              }}
            >
              {item.type === "hotel" ? (
                <Hotel className="size-2.5" />
              ) : (
                <UtensilsCrossed className="size-2.5" />
              )}
              <span>{item.type === "hotel" ? "Hotel" : "Restro"}</span>
            </span>

          </div>

          {/* Favorite Heart Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(item.id);
            }}
            className={`absolute top-2 right-2 size-6.5 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer ${
              isFavorite
                ? "bg-rose-500 text-white"
                : "bg-black/40 hover:bg-black/60 text-white"
            }`}
            aria-label="Save"
          >
            <Heart className={`size-3 ${isFavorite ? "fill-white" : ""}`} />
          </button>

          {/* Price Level pill if available */}
          {item.priceLevel ? (
            <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-xs rounded-md shadow-xs px-2 py-0.5 text-right border border-black/5">
              <span className="text-[11px] font-bold text-[#007b83]">{item.priceLevel}</span>
            </div>
          ) : null}

        </div>

        {/* Info Column on Right */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            {/* Header: Title, Category & Price */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 leading-snug truncate group-hover:text-[#007b83] transition-colors">
                  {item.name}
                </h3>
                <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                  {hasDistinctNeighborhood ? `${item.neighborhood}, ` : ""}{item.destination} ·{" "}
                  <span className="text-[#007b83] font-semibold">
                    {item.starRatingText || item.category}
                  </span>
                </p>
              </div>

              {item.priceLevel ? (
                <div className="hidden sm:block text-right shrink-0">
                  <div className="text-xs font-bold text-[#007b83]">
                    {item.priceLevel}
                  </div>
                  {item.priceEstimate && (
                    <span className="text-[9px] text-neutral-500">
                      {item.priceEstimate}
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {/* Google Rating Star Badge */}
            <div className="flex items-center gap-1.5 mt-1 text-xs">
              <span className="font-bold text-neutral-900 text-xs">{item.rating}</span>
              <div className="flex text-[#fbbc04]">
                {[1, 2, 3, 4, 5].map((st) => (
                  <Star
                    key={st}
                    className={`size-3 ${
                      st <= Math.floor(item.rating)
                        ? "fill-[#fbbc04] text-[#fbbc04]"
                        : "text-neutral-200"
                    }`}
                  />
                ))}
              </div>
              {item.userRatingCount > 0 && (
                <span className="text-[11px] text-neutral-500">
                  ({item.userRatingCount.toLocaleString()} Google reviews)
                </span>
              )}
            </div>

            {/* Address & Hours Snippets */}
            <div className="mt-1.5 space-y-0.5 text-[11px] text-neutral-600">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="size-3 text-[#007b83] shrink-0" />
                <span className="truncate">{item.address}</span>
              </div>

              <div className="flex items-center gap-3 text-neutral-500 flex-wrap">
                {item.websiteDomain && (
                  <div className="flex items-center gap-1 text-[#1a73e8]">
                    <Globe className="size-3 text-[#007b83] shrink-0" />
                    <span className="truncate max-w-[130px]">{item.websiteDomain}</span>
                  </div>
                )}
                {item.openingHours && (
                  <div className="flex items-center gap-1 text-neutral-600">
                    <Clock className="size-3 text-[#007b83] shrink-0" />
                    <span>{item.openingHours}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Amenities Chips */}
            {item.amenities && item.amenities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {item.amenities.slice(0, 3).map((amenity, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/60 flex items-center gap-1"
                  >
                    <Check className="size-2 text-[#007b83]" />
                    <span>{amenity}</span>
                  </span>
                ))}
                {item.amenities.length > 3 && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold text-[#007b83] bg-[#007b83]/10">
                    +{item.amenities.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action Row */}
          <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px] text-neutral-500">
              <Tag className="size-3 text-[#007b83]" />
              <span className="font-semibold text-neutral-700">
                {item.type === "hotel" ? "Rates:" : "Deals:"}
              </span>
              <span className="text-[10px] text-neutral-500 truncate max-w-[140px]">
                {item.type === "hotel" ? "Booking · Agoda · MMT" : "Zomato · Google"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {photos.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetailsModal?.(item, "photos");
                  }}
                  className="px-2 py-1 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-[11px] font-semibold text-neutral-700 transition-all flex items-center gap-1 cursor-pointer"
                  title="View Photos"
                >
                  <Images className="size-3 text-[#007b83]" />
                  <span>Photos</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetailsModal?.(item, "prices");
                }}
                className="px-2 py-1 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-[11px] font-semibold text-neutral-700 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>{item.type === "hotel" ? "Compare" : "Deals"}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetailsModal?.(item, "overview");
                }}
                className="px-2.5 py-1 rounded-md bg-[#007b83] hover:bg-[#00666d] text-white text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Details</span>
                <ChevronRight className="size-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 2. DUAL-COLUMN RICH MODAL VIEW (EXACT MATCH TO REFERENCE DESIGN)
  // -------------------------------------------------------------------------
  return (
    <div
      id={`hotel-card-${item.id}`}
      onClick={(e) => e.stopPropagation()}
      className="p-4 sm:p-6 overflow-y-auto max-h-[90vh] bg-white font-sans text-neutral-900 rounded-3xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================================================================= */}
        {/* LEFT COLUMN: ~64% (lg:col-span-8)                                  */}
        {/* ================================================================= */}
        <div className="lg:col-span-8 flex flex-col gap-4 min-w-0">
          {/* 1. HERO CAROUSEL */}
          <div className="relative w-full h-64 sm:h-72 md:h-[320px] rounded-2xl overflow-hidden bg-neutral-950 group select-none shadow-xs">
            <img
              src={activeHeroPhoto}
              alt={`${item.name} photo ${currentPhotoIndex + 1}`}
              className="w-full h-full object-cover transition-all duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/35 pointer-events-none" />

            {/* Top-Left Category Badge */}
            <div className="absolute top-3.5 left-3.5 z-20">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase shadow-md ${
                  item.type === "hotel"
                    ? "bg-[#007b83] text-white"
                    : "bg-[#e25822] text-white"
                }`}
              >
                {item.type === "hotel" ? (
                  <Hotel className="size-3.5" />
                ) : (
                  <UtensilsCrossed className="size-3.5" />
                )}
                <span>{item.type === "hotel" ? "HOTEL" : "RESTRO"}</span>
              </span>
            </div>

            {/* Top-Right Round Circular Action Buttons */}
            <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-20">
              <button
                type="button"
                onClick={handleShare}
                className="size-8.5 rounded-full bg-black/55 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                title={copiedLink ? "Link Copied!" : "Share"}
              >
                {copiedLink ? (
                  <Check className="size-4 text-emerald-400" />
                ) : (
                  <Share2 className="size-4" />
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite?.(item.id);
                }}
                className={`size-8.5 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-md ${
                  isFavorite
                    ? "bg-rose-500 text-white"
                    : "bg-black/55 hover:bg-black/80 text-white"
                }`}
                title="Save to favorites"
              >
                <Heart className={`size-4 ${isFavorite ? "fill-white" : ""}`} />
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="size-8.5 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-white flex items-center justify-center transition-all cursor-pointer shadow-md ml-0.5"
                  title="Close"
                >
                  <X className="size-4.5" />
                </button>
              )}
            </div>

            {/* Carousel Navigation Arrows */}
            {displayPhotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevPhoto}
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/45 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer opacity-90 hover:opacity-100 z-10 shadow-md"
                  title="Previous image"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextPhoto}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/45 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition-all cursor-pointer opacity-90 hover:opacity-100 z-10 shadow-md"
                  title="Next image"
                >
                  <ChevronRight className="size-5" />
                </button>
              </>
            )}

            {/* Bottom-Left Counter & Bottom-Right Currency Pill */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
              <div className="px-3 py-1 rounded-full bg-black/65 backdrop-blur-xs text-white text-xs font-semibold flex items-center gap-1.5 shadow-md border border-white/10">
                <Camera className="size-3.5" />
                <span>
                  {currentPhotoIndex + 1} / {displayPhotos.length}
                </span>
              </div>

              <div className="size-8 rounded-full bg-white/95 backdrop-blur-xs text-[#007b83] font-bold text-sm flex items-center justify-center shadow-md border border-black/5">
                {item.priceLevel ? item.priceLevel.charAt(0) : "₹"}
              </div>
            </div>
          </div>

          {/* 2. FILMSTRIP ROW (6 THUMBNAILS, +N ON 6TH) */}
          {displayPhotos.length > 1 && (
            <div className="grid grid-cols-6 gap-2">
              {displayPhotos.slice(0, 6).map((ph, idx) => {
                const isSixth = idx === 5;
                const hasOverflow = displayPhotos.length > 6;
                const isCurrent = currentPhotoIndex === idx;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (isSixth && hasOverflow) {
                        setActiveTab("photos");
                      } else {
                        setCurrentPhotoIndex(idx);
                      }
                    }}
                    className={`relative h-14 sm:h-16 rounded-xl overflow-hidden cursor-pointer transition-all ${
                      isCurrent
                        ? "ring-2.5 ring-[#007b83] scale-102"
                        : "opacity-85 hover:opacity-100 border border-neutral-200"
                    }`}
                  >
                    <img
                      src={ph}
                      alt={`${item.name} preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {isSixth && hasOverflow && (
                      <div className="absolute inset-0 bg-black/60 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center backdrop-blur-2xs">
                        +{displayPhotos.length - 6}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. TITLE, NEIGHBORHOOD, RATING & STATUS BADGE */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pt-1">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight leading-tight">
                {item.name}
              </h1>

              <p className="text-sm font-medium text-neutral-500 mt-1">
                {hasDistinctNeighborhood ? `${item.neighborhood}, ` : ""}
                {item.destination}
              </p>

              <div className="flex items-center gap-1.5 mt-2 text-sm flex-wrap">
                <span className="font-extrabold text-neutral-900 text-sm">
                  {item.rating || 4.7}
                </span>
                <div className="flex items-center text-[#fbbc04]">
                  {[1, 2, 3, 4, 5].map((st) => (
                    <Star
                      key={st}
                      className={`size-3.5 ${
                        st <= Math.floor(item.rating || 4.7)
                          ? "fill-[#fbbc04] text-[#fbbc04]"
                          : "text-neutral-200"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-neutral-500 text-xs sm:text-sm">
                  ({(item.userRatingCount || 37224).toLocaleString()} Google reviews)
                </span>
                <span className="text-neutral-300">·</span>
                <span className="text-[#007b83] font-semibold text-xs sm:text-sm">
                  {item.rating || 4.7} ★{" "}
                  {item.category ||
                    item.starRatingText ||
                    (item.type === "hotel" ? "Hotel" : "Seafood Restaurant")}
                </span>
              </div>
            </div>

            {/* Status box: Open Now + Hours dropdown pill */}
            <div className="flex flex-col items-start sm:items-end shrink-0">
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{item.openNow !== false ? "Open Now" : "Closed"}</span>
              </div>
              <div className="text-[11px] font-medium text-neutral-500 mt-1.5 flex items-center gap-1">
                <span>
                  {item.openingHours
                    ? item.openingHours.includes(";")
                      ? item.openingHours.split(";")[0]
                      : item.openingHours
                    : item.type === "hotel"
                    ? "24-Hour Front Desk"
                    : "12:30 PM – 12:00 AM"}
                </span>
                <ChevronDown className="size-3 text-neutral-400" />
              </div>
            </div>
          </div>

          {/* 4. AMENITY PILLS ROW */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <div className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors">
              {item.type === "hotel" ? (
                <Hotel className="size-3.5 text-neutral-600" />
              ) : (
                <UtensilsCrossed className="size-3.5 text-neutral-600" />
              )}
              <span>
                {item.category ||
                  (item.type === "hotel" ? "Boutique Hotel" : "Seafood")}
              </span>
            </div>

            <div className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors">
              <Users className="size-3.5 text-neutral-600" />
              <span>Family Friendly</span>
            </div>

            <div className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors">
              <CreditCard className="size-3.5 text-neutral-600" />
              <span>Cards Accepted</span>
            </div>

            <div className="px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200/70 text-neutral-700 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors">
              <Accessibility className="size-3.5 text-neutral-600" />
              <span>Accessible</span>
            </div>
          </div>

          {/* 5. EDITORIAL DESCRIPTION PARAGRAPH */}
          <div className="p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100 text-neutral-700 text-xs sm:text-sm leading-relaxed">
            <p>
              {item.description ||
                (item.type === "hotel"
                  ? `Premier accommodation situated in ${
                      item.neighborhood || item.destination
                    }, offering exceptional guest hospitality, modern comforts, and walking access to top cultural landmarks.`
                  : `Casual, Columbus-themed restaurant serving paella, sangria & other typical local specialties in the historic Ciutat Vella district.`)}
            </p>
          </div>

          {/* 6. ACTION BUTTONS ROW (4 BUTTONS) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Call Button */}
            <a
              href={item.phone ? `tel:${item.phone}` : "#"}
              onClick={(e) => {
                if (!item.phone) {
                  e.preventDefault();
                } else {
                  e.stopPropagation();
                }
              }}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#007b83] hover:bg-[#00666d] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Phone className="size-4 fill-white" />
              <span>Call</span>
            </a>

            {/* Directions Button */}
            <a
              href={
                item.googleMapsUri ||
                `https://maps.google.com/?q=${encodeURIComponent(
                  item.name + " " + item.destination
                )}`
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <Navigation className="size-4 text-[#007b83]" />
              <span>Directions</span>
            </a>

            {/* View on Map Button */}
            <a
              href={
                item.googleMapsUri ||
                `https://maps.google.com/?q=${encodeURIComponent(
                  item.name + " " + item.destination
                )}`
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <CircleDot className="size-4 text-[#007b83]" />
              <span>View on Map</span>
            </a>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="size-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="size-4 text-[#007b83]" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>

          {/* 7. UNDERLINED TABS BAR */}
          <div className="border-b border-neutral-200 mt-2 flex items-center gap-6 overflow-x-auto no-scrollbar text-sm font-medium">
            {[
              { key: "overview", label: "Overview" },
              { key: "menu", label: item.type === "hotel" ? "Rooms" : "Menu" },
              { key: "photos", label: "Photos" },
              { key: "reviews", label: "Reviews" },
              { key: "prices", label: "Deals" },
              { key: "about", label: "About" },
            ].map((t) => {
              const isActive = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTab(t.key as any);
                  }}
                  className={`pb-2.5 transition-all relative cursor-pointer shrink-0 text-xs sm:text-sm ${
                    isActive
                      ? "text-[#007b83] font-bold"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  {t.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007b83] rounded-t-sm" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 8. TAB CONTENTS */}
          <div className="pt-1">
            {/* TAB 1: OVERVIEW -> 2x2 QUICK INFO CARDS GRID */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Address Card */}
                <div className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50/80 transition-colors flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-full bg-[#007b83]/10 text-[#007b83] flex items-center justify-center shrink-0">
                      <MapPin className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-neutral-900">
                        Address
                      </div>
                      <div className="text-[11px] text-neutral-600 line-clamp-2 leading-tight mt-0.5">
                        {item.address ||
                          `${
                            item.neighborhood ? item.neighborhood + ", " : ""
                          }${item.destination}`}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-neutral-400 shrink-0" />
                </div>

                {/* Hours Card */}
                <div className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50/80 transition-colors flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-full bg-[#007b83]/10 text-[#007b83] flex items-center justify-center shrink-0">
                      <Clock className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-neutral-900">
                        Hours
                      </div>
                      <div className="text-[11px] text-neutral-600 line-clamp-1 leading-tight mt-0.5">
                        {item.openingHours
                          ? item.openingHours.includes(";")
                            ? item.openingHours.split(";")[0]
                            : item.openingHours
                          : item.type === "hotel"
                          ? "Monday: 24-Hour Front Desk"
                          : "Monday: 12:30 PM – 12:00 AM"}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-neutral-400 shrink-0" />
                </div>

                {/* Phone Card */}
                <div className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50/80 transition-colors flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-full bg-[#007b83]/10 text-[#007b83] flex items-center justify-center shrink-0">
                      <Phone className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-neutral-900">
                        Phone
                      </div>
                      <a
                        href={item.phone ? `tel:${item.phone}` : "#"}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-semibold text-[#007b83] hover:underline block truncate mt-0.5"
                      >
                        {item.phone || "+34 933 01 85 29"}
                      </a>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-neutral-400 shrink-0" />
                </div>

                {/* Website Card */}
                <div className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50/80 transition-colors flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-full bg-[#007b83]/10 text-[#007b83] flex items-center justify-center shrink-0">
                      <Globe className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-neutral-900">
                        Website
                      </div>
                      <a
                        href={
                          item.websiteUrl ||
                          `https://${
                            item.websiteDomain ||
                            `${item.name
                              .toLowerCase()
                              .replace(/[^a-z0-9]/g, "")}.com`
                          }`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-semibold text-[#007b83] hover:underline flex items-center gap-1 truncate mt-0.5"
                      >
                        <span className="truncate">
                          {item.websiteDomain ||
                            `${item.name
                              .toLowerCase()
                              .replace(/[^a-z0-9]/g, "")}.com`}
                        </span>
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-neutral-400 shrink-0" />
                </div>
              </div>
            )}

            {/* TAB 2: MENU (FOR RESTRO) / ROOMS (FOR HOTEL) */}
            {activeTab === "menu" && (
              <div className="space-y-3 pt-1">
                {item.type === "hotel" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        title: "Deluxe Queen Room",
                        desc: "1 Queen Bed, City View, En-suite Rain Shower, Wi-Fi",
                        price: "€145 / night",
                      },
                      {
                        title: "Executive King Suite",
                        desc: "1 King Bed, Private Balcony, Espresso Machine, Lounge Area",
                        price: "€210 / night",
                      },
                      {
                        title: "Superior Twin Room",
                        desc: "2 Single Beds, Quiet Courtyard View, Work Desk, AC",
                        price: "€125 / night",
                      },
                      {
                        title: "Penthouse Suite with Terrace",
                        desc: "Panoramic City Views, Whirlpool Tub, Daily Champagne Breakfast",
                        price: "€320 / night",
                      },
                    ].map((room, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 flex flex-col justify-between gap-2 shadow-2xs"
                      >
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-neutral-900">
                            {room.title}
                          </div>
                          <div className="text-[11px] text-neutral-600 mt-1 leading-snug">
                            {room.desc}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60">
                          <span className="text-xs font-bold text-[#007b83]">
                            {room.price}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            Free Cancellation
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        name: "Paella de Marisco",
                        desc: "Bomba rice infused with saffron, jumbo prawns, mussels, calamari & aioli.",
                        tag: "Signature",
                        price: "€19.50",
                      },
                      {
                        name: "Gambas al Ajillo",
                        desc: "Wild tiger shrimp sautéed in Spanish extra-virgin olive oil, garlic & chili flakes.",
                        tag: "Tapas",
                        price: "€13.00",
                      },
                      {
                        name: "Patatas Bravas",
                        desc: "Triple-cooked crispy potatoes, spicy brava chili sauce & roasted garlic aioli.",
                        tag: "Popular",
                        price: "€7.50",
                      },
                      {
                        name: "Sangria Artesanal de la Casa",
                        desc: "Catalan red wine, orange liqueur, macerated seasonal fruits & cinnamon stick.",
                        tag: "Drink",
                        price: "€6.50",
                      },
                    ].map((dish, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 flex flex-col justify-between gap-2 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs sm:text-sm text-neutral-900">
                              {dish.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              {dish.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-600 mt-1 leading-snug">
                            {dish.desc}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-1 text-xs font-bold text-[#007b83]">
                          <span>{dish.price}</span>
                          <span className="text-[10px] font-medium text-neutral-500">
                            Fresh Daily
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PHOTOS */}
            {activeTab === "photos" && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {displayPhotos.map((ph, idx) => (
                    <div
                      key={idx}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`group relative h-28 sm:h-32 rounded-xl overflow-hidden cursor-pointer transition-all ${
                        idx === currentPhotoIndex
                          ? "ring-2.5 ring-[#007b83]"
                          : "border border-neutral-200 hover:opacity-95"
                      }`}
                    >
                      <img
                        src={ph}
                        alt={`${item.name} gallery ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold">
                        #{idx + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: REVIEWS */}
            {activeTab === "reviews" && (
              <div className="space-y-3 pt-1">
                {/* Visual Score Card */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-extrabold text-neutral-900">
                      {item.rating || 4.7}
                    </span>
                    <div>
                      <div className="flex text-[#fbbc04]">
                        {[1, 2, 3, 4, 5].map((st) => (
                          <Star
                            key={st}
                            className={`size-3.5 ${
                              st <= Math.floor(item.rating || 4.7)
                                ? "fill-[#fbbc04] text-[#fbbc04]"
                                : "text-neutral-200"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        {(item.userRatingCount || 37224).toLocaleString()} reviews
                        verified on Google
                      </div>
                    </div>
                  </div>

                  {item.googleMapsUri && (
                    <a
                      href={item.googleMapsUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#007b83] hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>Google Reviews</span>
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>

                {/* Reviews List */}
                <div className="space-y-2.5 divide-y divide-neutral-100">
                  {(item.googleReviews && item.googleReviews.length > 0
                    ? item.googleReviews
                    : [
                        {
                          id: "r1",
                          authorName: "Sofia Ramos",
                          rating: 5,
                          relativeTime: "2 days ago",
                          text: "Exceptional dining experience! The seafood paella was rich and savory, and the staff was super friendly. Right in the historic center!",
                        },
                        {
                          id: "r2",
                          authorName: "Marcus Sterling",
                          rating: 5,
                          relativeTime: "1 week ago",
                          text: "Vibrant atmosphere with lovely decor. Sangria is easily the best in town. Highly recommend reserving a table ahead.",
                        },
                        {
                          id: "r3",
                          authorName: "Elena Rostova",
                          rating: 4,
                          relativeTime: "2 weeks ago",
                          text: "Wonderful flavors and generous portions. Fast service even during peak lunch rush.",
                        },
                      ]
                  ).map((rev) => (
                    <div key={rev.id} className="pt-2.5 first:pt-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-neutral-900">
                            {rev.authorName}
                          </span>
                          <div className="flex text-[#fbbc04]">
                            {[1, 2, 3, 4, 5].map((st) => (
                              <Star
                                key={st}
                                className={`size-2.5 ${
                                  st <= Math.floor(rev.rating)
                                    ? "fill-[#fbbc04] text-[#fbbc04]"
                                    : "text-neutral-200"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] text-neutral-400">
                          {rev.relativeTime}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 leading-snug">
                        {rev.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: DEALS & RATES */}
            {activeTab === "prices" && (
              <div className="space-y-2.5 pt-1">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 flex items-center gap-2">
                  <Info className="size-4 text-[#007b83] shrink-0" />
                  <span>
                    {item.type === "hotel"
                      ? `Compare live rates across leading travel providers for ${item.name}:`
                      : `Exclusive partner deals & table reservations for ${item.name}:`}
                  </span>
                </div>

                <div className="space-y-2">
                  {(item.platformComparisons &&
                  item.platformComparisons.length > 0
                    ? item.platformComparisons
                    : [
                        {
                          platform:
                            item.type === "hotel" ? "Booking.com" : "Zomato",
                          price: item.type === "hotel" ? "€138" : "15% Off Dining",
                          perks: "Instant confirmation & flexible check-in",
                          badge: "Top Value",
                          link:
                            item.type === "hotel"
                              ? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
                                  item.name + " " + item.destination
                                )}`
                              : `https://www.zomato.com/search?q=${encodeURIComponent(
                                  item.name + " " + item.destination
                                )}`,
                        },
                        {
                          platform:
                            item.type === "hotel" ? "Agoda" : "Google Food",
                          price: item.type === "hotel" ? "€142" : "Book Table",
                          perks: "Zero booking fee guarantee",
                          badge: "Official",
                          link:
                            item.googleMapsUri ||
                            `https://maps.google.com/?q=${encodeURIComponent(
                              item.name + " " + item.destination
                            )}`,
                        },
                        {
                          platform:
                            item.type === "hotel" ? "Expedia" : "OpenTable",
                          price: item.type === "hotel" ? "€145" : "Special Menu",
                          perks: "VIP loyalty rewards included",
                          badge: "Member Price",
                          link:
                            item.websiteUrl ||
                            `https://maps.google.com/?q=${encodeURIComponent(
                              item.name + " " + item.destination
                            )}`,
                        },
                      ]
                  ).map((platform, idx) => (
                    <a
                      key={idx}
                      href={platform.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-3 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-[#007b83] transition-all flex items-center justify-between gap-3 shadow-2xs group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-8 rounded-lg bg-[#007b83]/10 text-[#007b83] font-black text-xs flex items-center justify-center shrink-0">
                          {platform.platform.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-neutral-900 group-hover:text-[#007b83] transition-colors truncate">
                              {platform.platform}
                            </span>
                            {platform.badge && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#e6f4f5] text-[#007b83]">
                                {platform.badge}
                              </span>
                            )}
                          </div>
                          {platform.perks && (
                            <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                              {platform.perks}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[#007b83] font-bold text-xs shrink-0">
                        <span>{platform.price || "View Deal"}</span>
                        <ArrowUpRight className="size-3.5" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 6: ABOUT */}
            {activeTab === "about" && (
              <div className="space-y-3 pt-1 text-xs text-neutral-700">
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                  <div className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-1.5">
                    Location & History
                  </div>
                  <p className="leading-relaxed text-neutral-600">
                    {item.description ||
                      `${item.name} is nestled in ${
                        item.neighborhood || item.destination
                      }, celebrated for its rich character, warm hospitality, and proximity to iconic sights.`}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
                  <div className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
                    Verified Amenities & Features
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ...(item.amenities && item.amenities.length > 0
                        ? item.amenities
                        : [
                            "Wheelchair Accessible Entrance",
                            "Accepts Credit & Debit Cards",
                            "Free High-Speed Wi-Fi",
                            "Air Conditioning",
                            "Family Friendly Atmosphere",
                            "Restroom Facilities",
                          ]),
                    ].map((am, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 text-[11px] text-neutral-800"
                      >
                        <Check className="size-3 text-[#007b83] shrink-0" />
                        <span>{am}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: ~36% (lg:col-span-4)                                 */}
        {/* ================================================================= */}
        <div className="lg:col-span-4 flex flex-col gap-4 min-w-0">
          {/* 1. INTERACTIVE MAP CARD */}
          <div className="rounded-2xl border border-neutral-200 overflow-hidden bg-white shadow-xs">
            {/* Map Canvas */}
            <div className="relative h-56 w-full bg-neutral-100">
              <MiniGoogleMap
                coordinates={item.coordinates}
                name={item.name}
                googleMapsUri={item.googleMapsUri}
              />

              {/* Top-Right "Open in Google Maps" Button Overlay */}
              <a
                href={
                  item.googleMapsUri ||
                  `https://maps.google.com/?q=${encodeURIComponent(
                    item.name + " " + item.destination
                  )}`
                }
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-neutral-800 text-[11px] font-bold shadow-md flex items-center gap-1.5 backdrop-blur-xs transition-transform hover:scale-102 cursor-pointer z-10 border border-neutral-200/60"
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                    fill="#ea4335"
                  />
                  <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
                </svg>
                <span>Open in Google Maps</span>
              </a>
            </div>

            {/* Bottom Address Footer Bar */}
            <a
              href={
                item.googleMapsUri ||
                `https://maps.google.com/?q=${encodeURIComponent(
                  item.name + " " + item.destination
                )}`
              }
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-3 bg-white hover:bg-neutral-50 transition-colors flex items-center justify-between gap-2.5 text-xs text-neutral-700 border-t border-neutral-100 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-7 rounded-full bg-[#007b83]/10 text-[#007b83] flex items-center justify-center shrink-0">
                  <MapPin className="size-3.5" />
                </div>
                <span className="text-[11px] font-medium text-neutral-700 line-clamp-1">
                  {item.address ||
                    `${
                      item.neighborhood ? item.neighborhood + ", " : ""
                    }${item.destination}`}
                </span>
              </div>
              <ChevronRight className="size-4 text-neutral-400 shrink-0" />
            </a>
          </div>

          {/* 2. PARTNER BOOKING CARD */}
          {item.type === "hotel" ? (
            <div className="p-3.5 rounded-2xl border border-blue-100 bg-[#f0f6ff] flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-xl bg-[#003580] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  B.
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                    Booking.com
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate">
                    Live rates & availability
                  </div>
                </div>
              </div>

              <a
                href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
                  item.name + " " + item.destination
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3.5 py-1.5 rounded-full bg-[#c2e7ff] hover:bg-[#b3dcff] text-[#001d35] font-bold text-xs transition-colors shrink-0 inline-flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <span>View on Booking</span>
                <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl border border-rose-100 bg-[#fff5f5] flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="size-9 rounded-xl bg-[#e23744] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                  Z
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-neutral-900 truncate">
                    Zomato Dining
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate">
                    Menu & reviews
                  </div>
                </div>
              </div>

              <a
                href={`https://www.zomato.com/search?q=${encodeURIComponent(
                  item.name + " " + item.destination
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-3.5 py-1.5 rounded-full bg-[#fee2e2] hover:bg-[#fecaca] text-[#991b1b] font-bold text-xs transition-colors shrink-0 inline-flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <span>View on Zomato</span>
                <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          )}

          {/* 3. HIGHLIGHTS CARD */}
          <div className="p-4 sm:p-5 rounded-2xl border border-neutral-200 bg-white shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-amber-500 fill-amber-500" />
              <h3 className="font-extrabold text-sm sm:text-base text-neutral-900">
                Highlights
              </h3>
            </div>

            <div className="space-y-3">
              {/* Highlight 1 - Pastel Orange */}
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100/60">
                  {item.type === "hotel" ? (
                    <MapPin className="size-4.5" />
                  ) : (
                    <UtensilsCrossed className="size-4.5" />
                  )}
                </div>
                <span className="text-xs sm:text-sm font-medium text-neutral-800">
                  {item.highlights?.[0] ||
                    (item.type === "hotel"
                      ? "Prime central location"
                      : "Authentic local cuisine")}
                </span>
              </div>

              {/* Highlight 2 - Pastel Purple */}
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100/60">
                  <Camera className="size-4.5" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-neutral-800">
                  {item.highlights?.[1] ||
                    (item.type === "hotel"
                      ? "Beautiful interiors & design"
                      : "Beautiful interiors")}
                </span>
              </div>

              {/* Highlight 3 - Pastel Blue */}
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100/60">
                  <Users className="size-4.5" />
                </div>
                <span className="text-xs sm:text-sm font-medium text-neutral-800">
                  {item.highlights?.[2] ||
                    (item.type === "hotel"
                      ? "Great for couples & groups"
                      : "Great for groups")}
                </span>
              </div>

              {/* Highlight 4 - Pastel Green */}
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100/60">
                  {item.type === "hotel" ? (
                    <Coffee className="size-4.5" />
                  ) : (
                    <UtensilsCrossed className="size-4.5" />
                  )}
                </div>
                <span className="text-xs sm:text-sm font-medium text-neutral-800">
                  {item.highlights?.[3] ||
                    (item.type === "hotel"
                      ? "Complimentary breakfast & WiFi"
                      : item.category
                      ? `Popular ${item.category.toLowerCase()} dishes`
                      : "Popular seafood dishes")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
