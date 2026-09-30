"use client";

import React, { useEffect, useRef, useState } from "react";
import { StayOrRestroItem } from "@/app/api/stays/route";
import { Loader2, MapPin } from "lucide-react";

interface GoogleStaysMapProps {
  items: StayOrRestroItem[];
  center: { lat: number; lng: number };
  selectedItem: StayOrRestroItem | null;
  onSelectItem: (item: StayOrRestroItem) => void;
}

export default function GoogleStaysMap({
  items,
  center,
  selectedItem,
  onSelectItem,
}: GoogleStaysMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // 1. Load Google Maps Browser JavaScript API (Same as ItineraryMapPanel)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const apiKey =
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      "";

    if (!apiKey) {
      setMapError("Google Maps API key is not configured.");
      return;
    }

    if ((window as any).google?.maps) {
      setMapLoaded(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => setMapLoaded(true));
      existingScript.addEventListener("error", () =>
        setMapError("Failed to load Google Maps script.")
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () =>
      setMapError("Failed to load Google Maps script. Check network or API key.");
    document.head.appendChild(script);
  }, []);

  // 2. Initialize Map Instance
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const mapCenter =
        items.length > 0
          ? { lat: items[0].coordinates.lat, lng: items[0].coordinates.lng }
          : center || { lat: 28.6139, lng: 77.209 };

      const map = new (window as any).google.maps.Map(mapContainerRef.current, {
        zoom: 13,
        center: mapCenter,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "simplified" }],
          },
        ],
      });

      infoWindowRef.current = new (window as any).google.maps.InfoWindow();
      mapInstanceRef.current = map;
    } catch (e: any) {
      console.error("Google Maps initialization error in GoogleStaysMap:", e);
      setMapError(e.message || "Failed to initialize Google Maps");
    }
  }, [mapLoaded, center, items]);

  // 3. Pan and zoom map when destination center changes
  useEffect(() => {
    if (!mapInstanceRef.current || !center) return;
    if (!selectedItem) {
      mapInstanceRef.current.panTo({ lat: center.lat, lng: center.lng });
      mapInstanceRef.current.setZoom(13);
    }
  }, [center]);

  // 4. Update Markers & Popups when items or selectedItem change
  useEffect(() => {
    if (!mapInstanceRef.current || !(window as any).google?.maps) return;

    const map = mapInstanceRef.current;
    const infoWindow = infoWindowRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const bounds = new (window as any).google.maps.LatLngBounds();
    let hasPoints = false;

    items.forEach((item, index) => {
      if (!item.coordinates?.lat || !item.coordinates?.lng) return;

      const position = { lat: item.coordinates.lat, lng: item.coordinates.lng };
      bounds.extend(position);
      hasPoints = true;

      const isSelected = selectedItem?.id === item.id;
      const isHotel = item.type === "hotel";
      const markerColor = isHotel
        ? isSelected
          ? "#233306"
          : "#485C11"
        : isSelected
        ? "#9a3412"
        : "#c2410c";

      // Custom Google Maps SVG Icon matching the Roamly Map style
      const svgIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="${isSelected ? "38" : "32"}" height="${isSelected ? "46" : "40"}" viewBox="0 0 34 42">
            <path d="M17 0C7.61 0 0 7.61 0 17c0 11.25 17 25 17 25s17-13.75 17-25C34 7.61 26.39 0 17 0z" fill="${markerColor}" stroke="#ffffff" stroke-width="${isSelected ? "2.5" : "1.8"}"/>
            <circle cx="17" cy="16" r="11" fill="#ffffff"/>
            <text x="17" y="20" font-size="11" font-weight="bold" font-family="sans-serif" text-anchor="middle" fill="${markerColor}">${isHotel ? "🏨" : "🍽️"}</text>
          </svg>
        `)}`,
        scaledSize: new (window as any).google.maps.Size(
          isSelected ? 38 : 32,
          isSelected ? 46 : 40
        ),
        anchor: new (window as any).google.maps.Point(
          isSelected ? 19 : 16,
          isSelected ? 46 : 40
        ),
      };

      const marker = new (window as any).google.maps.Marker({
        position,
        map,
        title: item.name,
        icon: svgIcon,
        zIndex: isSelected ? 100 : 10 + index,
      });

      const openInfoWindow = () => {
        if (!infoWindow) return;
        infoWindow.setContent(`
          <div style="font-family: sans-serif; padding: 4px; max-width: 230px;">
            <div style="position: relative; width: 100%; height: 95px; border-radius: 8px; overflow: hidden; margin-bottom: 6px;">
              <img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;" />
              <span style="position: absolute; top: 4px; left: 4px; background: ${markerColor}; color: white; font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 9999px; text-transform: uppercase;">
                ${isHotel ? "Hotel" : "Restro"}
              </span>
            </div>
            <h4 style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #111827; line-height: 1.2;">
              ${item.name}
            </h4>
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
              <span style="color: #f59e0b; font-weight: bold;">★ ${item.rating} (${item.userRatingCount.toLocaleString()})</span>
              <span style="color: #007b83; font-weight: 700;">${item.priceEstimate || item.starRatingText || item.category}</span>
            </div>
            <p style="margin: 0; font-size: 10px; color: #6b7280; line-height: 1.3;">
              📍 ${item.address}
            </p>
          </div>
        `);
        infoWindow.open(map, marker);
      };

      marker.addListener("click", () => {
        onSelectItem(item);
        openInfoWindow();
      });

      // If this marker is selected, open info window automatically
      if (isSelected) {
        openInfoWindow();
      }

      markersRef.current.push(marker);
    });

    // Fit bounds if multiple points and no specific item selected
    if (hasPoints && !selectedItem && items.length > 1) {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [items, selectedItem, mapLoaded]);

  // 5. Smoothly pan & focus when selectedItem changes
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedItem?.coordinates) return;
    mapInstanceRef.current.panTo({
      lat: selectedItem.coordinates.lat,
      lng: selectedItem.coordinates.lng,
    });
    mapInstanceRef.current.setZoom(15);
  }, [selectedItem]);

  if (mapError) {
    return (
      <div className="w-full h-full min-h-[380px] bg-red-50/50 rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-red-200">
        <MapPin className="size-8 text-red-500 mb-2" />
        <h4 className="text-xs font-bold text-red-800 mb-1">Google Maps Unavailable</h4>
        <p className="text-[11px] text-red-600 max-w-xs">{mapError}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[380px] lg:min-h-full rounded-2xl overflow-hidden shadow-inner border border-[#e5e7db] relative">
      {!mapLoaded && (
        <div className="absolute inset-0 z-10 bg-neutral-100 flex flex-col items-center justify-center text-[#6b7280]">
          <Loader2 className="size-8 text-[#485C11] animate-spin mb-2" />
          <span className="text-xs font-medium">Loading Google Map...</span>
        </div>
      )}

      {/* Google Map Container Element */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />

      {/* Floating Map Legend */}
      <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-md border border-[#e5e7db] text-[11px] flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-2">
          <span className="size-3.5 rounded-full bg-[#485C11] flex items-center justify-center text-white text-[8px] font-bold">
            🏨
          </span>
          <span className="font-medium text-[#1a1a1a]">Hotels & Stays</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-3.5 rounded-full bg-[#c2410c] flex items-center justify-center text-white text-[8px] font-bold">
            🍽️
          </span>
          <span className="font-medium text-[#1a1a1a]">Restaurants & Cafes</span>
        </div>
      </div>
    </div>
  );
}
