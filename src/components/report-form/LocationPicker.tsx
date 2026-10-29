"use client";

import "leaflet/dist/leaflet.css";

import type { Map as LeafletMap } from "leaflet";
import { useCallback, useEffect, useState } from "react";
import { MapContainer, TileLayer, ZoomControl, useMapEvents } from "react-leaflet";

import { NOVI_SAD_BOUNDS, NOVI_SAD_CENTER } from "@/lib/constants";
import { isInsideNoviSad } from "@/lib/validation";

export type LatLng = { lat: number; lng: number };

type Props = {
  onChange: (position: LatLng) => void;
};

/**
 * Pin je fiksiran u centru, a korisnik pomera mapu ispod njega (kao u aplikacijama za taksi).
 * Tako je lakše precizno pogoditi mesto prstom nego prevlačenjem malog pina.
 */
export default function LocationPicker({ onChange }: Props) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [moving, setMoving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: "error" | "info" } | null>(null);

  // Poruka nestaje sama posle nekoliko sekundi.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice]);

  const locate = useCallback(() => {
    if (!map) return;
    if (!navigator.geolocation) {
      setNotice({ text: "Tvoj browser ne podržava određivanje lokacije.", tone: "error" });
      return;
    }
    setLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        if (!isInsideNoviSad(coords.latitude, coords.longitude)) {
          setNotice({
            text: "Browser kaže da nisi u Novom Sadu. Na računaru je lokacija često netačna, pa pomeri mapu ručno do mesta problema.",
            tone: "error",
          });
          return;
        }
        // Računari bez GPS-a procenjuju lokaciju preko mreže, uz grešku i do nekoliko kilometara.
        const rough = coords.accuracy > 200;
        map.setView([coords.latitude, coords.longitude], rough ? 16 : 18);
        if (rough) {
          setNotice({
            text: `Lokacija je približna (±${formatDistance(coords.accuracy)}). Pomeri mapu do tačnog mesta.`,
            tone: "info",
          });
        }
      },
      () => {
        setLocating(false);
        setNotice({ text: "Lokacija nije dostupna. Dozvoli pristup lokaciji ili pomeri mapu ručno.", tone: "error" });
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [map]);

  // Ako je dozvola za lokaciju već data, odmah centriramo mapu na korisnika.
  useEffect(() => {
    if (!map || !navigator.permissions) return;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (status.state === "granted") locate();
      })
      .catch(() => {});
  }, [map, locate]);

  return (
    <div className="relative h-72 overflow-hidden rounded-2xl border border-slate-200 sm:h-80">
      <MapContainer
        ref={setMap}
        center={NOVI_SAD_CENTER}
        zoom={14}
        minZoom={12}
        maxBounds={NOVI_SAD_BOUNDS}
        maxBoundsViscosity={1}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> saradnici'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <ZoomControl position="topright" />
        <MoveTracker onMoving={setMoving} onUserMove={() => setNotice(null)} onChange={onChange} />
      </MapContainer>

      {/* Pin u centru: vrh pina je tačna lokacija */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1000] -translate-x-1/2 -translate-y-full">
        <svg
          viewBox="0 0 32 44"
          className={`h-11 w-8 drop-shadow-lg transition-transform duration-150 ${moving ? "-translate-y-2" : ""}`}
          aria-hidden="true"
        >
          <path d="M16 0C7.2 0 0 7 0 15.6 0 27.3 16 44 16 44s16-16.7 16-28.4C32 7 24.8 0 16 0z" fill="#059669" />
          <circle cx="16" cy="15.5" r="6" fill="white" />
        </svg>
      </div>
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 z-[999] h-1.5 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/30 transition-opacity ${moving ? "opacity-100" : "opacity-0"}`}
      />

      <div className="absolute inset-x-3 bottom-3 z-[1000] flex flex-col items-start gap-2">
        {notice && (
          <div
            role="status"
            className={`max-w-sm rounded-xl bg-white/95 px-3 py-2 text-xs shadow ${notice.tone === "error" ? "text-red-700" : "text-slate-700"}`}
          >
            {notice.text}
          </div>
        )}
        <button
          type="button"
          onClick={locate}
          disabled={!map || locating}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-lg ring-1 ring-black/5 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={`size-4 ${locating ? "animate-pulse text-blue-600" : ""}`} aria-hidden="true">
            <circle cx="12" cy="12" r="3.5" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            <circle cx="12" cy="12" r="7.5" />
          </svg>
          {locating ? "Tražim lokaciju…" : "Koristi moju lokaciju"}
        </button>
      </div>
    </div>
  );
}

type MoveTrackerProps = {
  onMoving: (moving: boolean) => void;
  /** Samo kad korisnik sam pomeri mapu (ne i pri programskom centriranju). */
  onUserMove: () => void;
  onChange: (p: LatLng) => void;
};

function MoveTracker({ onMoving, onUserMove, onChange }: MoveTrackerProps) {
  const map = useMapEvents({
    dragstart: onUserMove,
    movestart: () => onMoving(true),
    moveend: () => {
      onMoving(false);
      const { lat, lng } = map.getCenter();
      onChange({ lat, lng });
    },
  });
  return null;
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1).replace(".", ",")} km` : `${Math.round(meters)} m`;
}
