import type { ReportStatus } from "./types";

export const NOVI_SAD_CENTER: [number, number] = [45.2671, 19.8335];
export const DEFAULT_ZOOM = 13;

/** Grubi okvir grada: Futog, Veternik, Kać, Petrovaradin, Sremska Kamenica. */
export const NOVI_SAD_BOUNDS: [[number, number], [number, number]] = [
  [45.17, 19.65],
  [45.35, 20.0],
];

export const STATUS_LABELS: Record<ReportStatus, string> = {
  new: "Nova",
  verified: "Proverena",
  planned: "Planirana",
  in_progress: "U toku",
  done: "Završena",
  rejected: "Odbijena",
  duplicate: "Duplikat",
};

/** Statusi koji se podrazumevano prikazuju na mapi. */
export const OPEN_STATUSES: ReportStatus[] = ["new", "verified", "planned", "in_progress"];
