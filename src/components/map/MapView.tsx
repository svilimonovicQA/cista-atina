"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap } from "react-leaflet";

import { DEFAULT_ZOOM, NOVI_SAD_BOUNDS, NOVI_SAD_CENTER, STATUS_LABELS } from "@/lib/constants";
import type { Category, PublicReport } from "@/lib/types";

/** Zahtev da mapa priđe prijavi; `seq` omogućava ponovni fokus iste prijave. */
export type MapFocus = { id: string; seq: number };

type Props = {
  reports: PublicReport[];
  categories: Category[];
  focus: MapFocus | null;
  onSelect: (id: string) => void;
  onMessage: (message: string) => void;
};

export default function MapView({ reports, categories, focus, onSelect, onMessage }: Props) {
  return (
    <MapContainer
      center={NOVI_SAD_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={11}
      maxBounds={NOVI_SAD_BOUNDS}
      maxBoundsViscosity={0.8}
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> saradnici'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ZoomControl position="bottomright" />
      <LocateControl onMessage={onMessage} />
      <ReportClusters reports={reports} categories={categories} focus={focus} onSelect={onSelect} />
    </MapContainer>
  );
}

/** react-leaflet nema zvaničan cluster sloj, pa ga vezujemo direktno na Leaflet mapu. */
function ReportClusters({ reports, categories, focus, onSelect }: Omit<Props, "onMessage">) {
  const map = useMap();
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const markers = new Map<string, L.Marker>();
    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: (c) =>
        L.divIcon({ html: `<div class="cluster-bubble">${c.getChildCount()}</div>`, className: "", iconSize: [42, 42] }),
    });

    for (const report of reports) {
      const category = byId.get(report.category_id);
      const marker = L.marker([report.lat, report.lng], {
        icon: categoryIcon(category, report.status === "done"),
        title: category?.name_sr,
      });
      marker.bindPopup(popupHtml(report, category), {
        maxWidth: 260,
        // Ostavlja mesta za plutajuće elemente na mobilnom (gornji i donji panel).
        autoPanPaddingTopLeft: [16, 140],
        autoPanPaddingBottomRight: [16, 110],
      });
      marker.on("click", () => onSelectRef.current(report.id));
      cluster.addLayer(marker);
      markers.set(report.id, marker);
    }

    map.addLayer(cluster);
    clusterRef.current = cluster;
    markersRef.current = markers;
    return () => {
      map.removeLayer(cluster);
    };
  }, [map, reports, categories]);

  useEffect(() => {
    const cluster = clusterRef.current;
    const marker = focus && markersRef.current.get(focus.id);
    if (!cluster || !marker) return;

    const reveal = () => cluster.zoomToShowLayer(marker, () => marker.openPopup());
    if (map.getZoom() < 16) {
      map.once("moveend", reveal);
      map.flyTo(marker.getLatLng(), 16, { duration: 0.6 });
    } else {
      reveal();
    }
  }, [map, focus]);

  return null;
}

/** Dugme „moja lokacija“ kao Leaflet kontrola, iznad zum dugmića. */
function LocateControl({ onMessage }: { onMessage: (message: string) => void }) {
  const map = useMap();

  useEffect(() => {
    let userMarker: L.CircleMarker | null = null;
    const bounds = L.latLngBounds(NOVI_SAD_BOUNDS);
    const control = new L.Control({ position: "bottomright" });

    control.onAdd = () => {
      const button = L.DomUtil.create("button", "leaflet-bar locate-button") as HTMLButtonElement;
      button.type = "button";
      button.title = "Moja lokacija";
      button.setAttribute("aria-label", "Prikaži moju lokaciju");
      button.innerHTML = LOCATE_ICON;
      L.DomEvent.disableClickPropagation(button);

      L.DomEvent.on(button, "click", () => {
        if (!navigator.geolocation) {
          onMessage("Tvoj browser ne podržava određivanje lokacije.");
          return;
        }
        button.classList.add("is-loading");
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            button.classList.remove("is-loading");
            const position = L.latLng(coords.latitude, coords.longitude);
            if (!bounds.contains(position)) {
              onMessage("Izgleda da trenutno nisi u Novom Sadu 🙂");
              return;
            }
            userMarker?.remove();
            userMarker = L.circleMarker(position, {
              radius: 8,
              color: "#ffffff",
              weight: 3,
              fillColor: "#2563eb",
              fillOpacity: 1,
            }).addTo(map);
            map.flyTo(position, 16, { duration: 0.8 });
          },
          () => {
            button.classList.remove("is-loading");
            onMessage("Nije moguće odrediti lokaciju. Proveri dozvolu za lokaciju u browseru.");
          },
          { enableHighAccuracy: true, timeout: 10_000 },
        );
      });

      return button;
    };

    control.addTo(map);
    return () => {
      control.remove();
      userMarker?.remove();
    };
  }, [map, onMessage]);

  return null;
}

const LOCATE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/></svg>`;

function categoryIcon(category: Category | undefined, done: boolean) {
  const color = done ? "#94a3b8" : (category?.color ?? "#64748b");
  return L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32],
    html: `<div class="report-pin" style="--pin:${color}"><span>${category?.icon ?? "📍"}</span></div>`,
  });
}

function popupHtml(report: PublicReport, category: Category | undefined) {
  const date = new Date(report.created_at).toLocaleDateString("sr-Latn-RS", { day: "numeric", month: "long" });
  const color = category?.color ?? "#64748b";
  return `
    <div class="report-popup">
      ${report.photo_url ? `<img class="report-popup-photo" src="${escapeHtml(report.photo_url)}" alt="" loading="lazy" />` : ""}
      <div class="report-popup-head">
        <span class="report-popup-icon" style="background:${color}1f">${category?.icon ?? "📍"}</span>
        <div>
          <div class="report-popup-title">${escapeHtml(category?.name_sr ?? "Prijava")}</div>
          <span class="report-popup-status status-${report.status}">${STATUS_LABELS[report.status]}</span>
        </div>
      </div>
      <p class="report-popup-desc">${escapeHtml(report.description)}</p>
      <div class="report-popup-meta">${report.address ? `${escapeHtml(report.address)} · ` : ""}${date}</div>
    </div>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}
