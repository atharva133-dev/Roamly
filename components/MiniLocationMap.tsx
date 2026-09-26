"use client";

import React from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default marker icon lookup (same fix as components/MapView.tsx —
// Leaflet's bundled icon URLs break under Next.js's asset pipeline).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MiniLocationMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
}

/**
 * Small, read-only map preview: tiles + a single marker at (latitude, longitude),
 * no popups, no search overlay, no interactivity. Uses OpenStreetMap tiles via
 * Leaflet — no Google Maps API key required (unlike the Static Maps image this
 * replaces, which silently failed whenever NEXT_PUBLIC_GOOGLE_MAPS_KEY wasn't set).
 *
 * Must be imported with `next/dynamic(() => import(...), { ssr: false })` —
 * Leaflet touches `window`/`document` and cannot be server-rendered.
 */
export default function MiniLocationMap({ latitude, longitude, zoom = 15 }: MiniLocationMapProps) {
  const position: [number, number] = [latitude, longitude];

  return (
    <MapContainer
      center={position}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={position} />
    </MapContainer>
  );
}
