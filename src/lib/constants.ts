import type { ReportStatus } from "./types";

export const APP_NAME = "Čista Atina";
export const APP_TAGLINE = "Volonteri za lepši Novi Sad";
export const GITHUB_URL = "https://github.com/svilimonovicQA/cista-atina";

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

/** Tailwind klase za oznaku statusa. */
export const STATUS_BADGE: Record<ReportStatus, string> = {
  new: "bg-amber-100 text-amber-800",
  verified: "bg-sky-100 text-sky-800",
  planned: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-orange-100 text-orange-800",
  done: "bg-emerald-100 text-emerald-800",
  rejected: "bg-slate-100 text-slate-600",
  duplicate: "bg-slate-100 text-slate-600",
};

/** Statusi koji se podrazumevano prikazuju na mapi. */
export const OPEN_STATUSES: ReportStatus[] = ["new", "verified", "planned", "in_progress"];
