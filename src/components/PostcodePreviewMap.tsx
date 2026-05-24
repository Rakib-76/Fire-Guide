import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import type { GeocodeResult, GeocodeStatus } from "../hooks/useNominatimGeocode";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

/** Approximate UK centre when nothing is geocoded yet */
const UK_CENTER: [number, number] = [54.2361, -4.5481];
const UK_ZOOM = 6;
const FOCUS_ZOOM = 13;

function MapFocus({
  center,
  zoom,
  hasMarker,
}: {
  center: [number, number];
  zoom: number;
  hasMarker: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center[0], center[1], zoom, hasMarker]);
  return null;
}

function milesToMeters(miles: number): number {
  return miles * 1609.344;
}

export interface PostcodePreviewMapProps {
  geocodeStatus: GeocodeStatus;
  geocode: GeocodeResult | null;
  /** When set, draws a search-radius circle (meters). Omit for "entire region". */
  radiusMeters?: number | null;
  className?: string;
}

export function PostcodePreviewMap({ geocodeStatus, geocode, radiusMeters, className }: PostcodePreviewMapProps) {
  const hasMarker = geocode != null && geocodeStatus === "ok";
  const center: [number, number] = hasMarker ? [geocode.lat, geocode.lon] : UK_CENTER;
  const zoom = hasMarker ? FOCUS_ZOOM : UK_ZOOM;

  return (
    <div className={`relative h-full min-h-[280px] w-full rounded-lg overflow-hidden ${className ?? ""}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full z-0"
        scrollWheelZoom
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFocus center={center} zoom={zoom} hasMarker={hasMarker} />
        {hasMarker && (
          <>
            <Marker position={[geocode.lat, geocode.lon]}>
              <Popup>
                <span className="text-sm">{geocode.displayName}</span>
              </Popup>
            </Marker>
            {radiusMeters != null && radiusMeters > 0 && (
              <Circle
                center={[geocode.lat, geocode.lon]}
                radius={radiusMeters}
                pathOptions={{
                  color: "#dc2626",
                  fillColor: "#dc2626",
                  fillOpacity: 0.12,
                  weight: 2,
                }}
              />
            )}
          </>
        )}
      </MapContainer>

      {geocodeStatus === "loading" && (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-white/40">
          <p className="rounded-md bg-white/90 px-3 py-1.5 text-sm text-gray-700 shadow">Finding location…</p>
        </div>
      )}

      {(geocodeStatus === "not_found" || geocodeStatus === "error") && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[400] rounded-md bg-amber-50 px-3 py-2 text-center text-xs text-amber-900 shadow border border-amber-200">
          {geocodeStatus === "not_found"
            ? "We could not find that place. Try a full UK postcode or add the town."
            : "Location lookup failed. Check your connection and try again."}
        </div>
      )}
    </div>
  );
}

export function radiusValueToMeters(radiusKey: string): number | null {
  if (radiusKey === "entire") return null;
  const m = radiusKey.match(/(\d+)/);
  if (!m) return null;
  return milesToMeters(parseInt(m[1], 10));
}
