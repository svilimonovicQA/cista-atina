import { z } from "zod";

import { NOVI_SAD_BOUNDS } from "./constants";

const [[MIN_LAT, MIN_LNG], [MAX_LAT, MAX_LNG]] = NOVI_SAD_BOUNDS;

export const DESCRIPTION_MIN = 3;
export const DESCRIPTION_MAX = 1000;
export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const OUTSIDE_CITY = "Lokacija mora biti na području Novog Sada.";

/** Pravila za novu prijavu. Ista šema važi u formi i u server akciji. */
export const reportSchema = z.object({
  categoryId: z.coerce.number({ message: "Izaberi kategoriju." }).int().positive("Izaberi kategoriju."),
  description: z
    .string()
    .trim()
    .min(DESCRIPTION_MIN, `Opis mora imati bar ${DESCRIPTION_MIN} karaktera.`)
    .max(DESCRIPTION_MAX, `Opis može imati najviše ${DESCRIPTION_MAX} karaktera.`),
  lat: z.coerce.number().min(MIN_LAT, OUTSIDE_CITY).max(MAX_LAT, OUTSIDE_CITY),
  lng: z.coerce.number().min(MIN_LNG, OUTSIDE_CITY).max(MAX_LNG, OUTSIDE_CITY),
  email: z.union([z.literal(""), z.email("Email adresa nije ispravna.")]).default(""),
});

export type ReportInput = z.infer<typeof reportSchema>;

export type ReportField = keyof ReportInput | "photos" | "location";

export function isInsideNoviSad(lat: number, lng: number) {
  return lat >= MIN_LAT && lat <= MAX_LAT && lng >= MIN_LNG && lng <= MAX_LNG;
}

/** Vraća poruku o grešci ili null ako su fotografije u redu. */
export function validatePhotos(photos: File[]): string | null {
  if (photos.length > MAX_PHOTOS) return `Možeš priložiti najviše ${MAX_PHOTOS} fotografije.`;
  for (const photo of photos) {
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) return "Dozvoljene su samo JPG, PNG i WebP fotografije.";
    if (photo.size > MAX_PHOTO_BYTES) return "Fotografija je prevelika (najviše 2 MB).";
  }
  return null;
}
