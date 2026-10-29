"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import L from "leaflet";
import "leaflet.markercluster";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";

import { DEFAULT_ZOOM, NOVI_SAD_BOUNDS, NOVI_SAD_CENTER, STATUS_LABELS } from "@/lib/constants";
import type { Category, PublicReport } from "@/lib/types";

type Props = {
  reports: PublicReport[];
  categories: Category[];
};

export default function MapView({ reports, categories }: Props) {
  return (
    <MapContainer
      center={NOVI_SAD_CENTER}
      zoom={DEFAULT_ZOOM}
      minZoom={11}
      maxBounds={NOVI_SAD_BOUNDS}
      maxBoundsViscosity={0.8}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> saradnici'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ReportClusters reports={reports} categories={categories} />
    </MapContainer>
  );
}

/** react-leaflet nema zvaničan cluster sloj, pa ga vezujemo direktno na Leaflet mapu. */
function ReportClusters({ reports, categories }: Props) {
  const map = useMap();

  useEffect(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 50 });

    for (const report of reports) {
      const category = byId.get(report.category_id);
      const marker = L.marker([report.lat, report.lng], {
        icon: categoryIcon(category, report.status === "done"),
        title: category?.name_sr,
      });
      marker.bindPopup(popupHtml(report, category));
      cluster.addLayer(marker);
    }

    map.addLayer(cluster);
    return () => {
      map.removeLayer(cluster);
    };
  }, [map, reports, categories]);

  return null;
}

function categoryIcon(category: Category | undefined, done: boolean) {
  const color = done ? "#9ca3af" : (category?.color ?? "#64748b");
  return L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
    html: `<div class="report-pin" style="--pin:${color}"><span>${category?.icon ?? "📍"}</span></div>`,
  });
}

function popupHtml(report: PublicReport, category: Category | undefined) {
  const date = new Date(report.created_at).toLocaleDateString("sr-Latn-RS");
  return `
    <div class="report-popup">
      <strong>${escapeHtml(category?.name_sr ?? "Prijava")}</strong>
      <span class="status status-${report.status}">${STATUS_LABELS[report.status]}</span>
      <p>${escapeHtml(report.description)}</p>
      ${report.address ? `<small>${escapeHtml(report.address)}</small><br/>` : ""}
      <small>${date}</small>
    </div>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}
