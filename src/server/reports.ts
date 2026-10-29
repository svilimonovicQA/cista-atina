"use server";

import { createHash, randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { ZodError } from "zod";

import { reverseGeocode, type Place } from "@/lib/geocoding";
import { createAdminClient, createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import type { PublicReport } from "@/lib/types";
import { isInsideNoviSad, reportSchema, validatePhotos, type ReportField } from "@/lib/validation";

const PHOTO_BUCKET = "report-photos";
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

export type CreateReportResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<ReportField, string>> };

export async function createReport(formData: FormData): Promise<CreateReportResult> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: "Prijave trenutno nisu moguće jer baza nije podešena (demo režim)." };
  }

  const parsed = reportSchema.safeParse({
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    email: formData.get("email") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, error: "Proveri označena polja.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const photos = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const photoError = validatePhotos(photos);
  if (photoError) return { ok: false, error: photoError, fieldErrors: { photos: photoError } };

  const ip = await clientIp();
  if (!(await verifyTurnstile(String(formData.get("turnstileToken") ?? ""), ip))) {
    return { ok: false, error: "Provera da nisi robot nije uspela. Osveži stranicu i pokušaj ponovo." };
  }

  const admin = createAdminClient();
  const ipHash = ip ? hashIp(ip) : null;

  if (ipHash) {
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count } = await admin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_ip_hash", ipHash)
      .gte("created_at", since);
    if ((count ?? 0) >= RATE_LIMIT) {
      return { ok: false, error: "Poslao/la si više prijava u kratkom roku. Pokušaj ponovo za desetak minuta." };
    }
  }

  const { categoryId, description, lat, lng, email } = parsed.data;
  const [place, reporterId] = await Promise.all([reverseGeocode(lat, lng), currentUserId()]);

  const { data: report, error } = await admin
    .from("reports")
    .insert({
      category_id: categoryId,
      description,
      location: `SRID=4326;POINT(${lng} ${lat})`,
      address: place?.address ?? null,
      district: place?.district ?? null,
      reporter_id: reporterId,
      reporter_email: email || null,
      reporter_ip_hash: ipHash,
    })
    .select("id")
    .single();

  if (error || !report) {
    console.error("createReport: insert", error);
    return { ok: false, error: "Prijava nije sačuvana. Pokušaj ponovo." };
  }

  const uploaded: string[] = [];
  for (const photo of photos) {
    const path = `${report.id}/${randomUUID()}.${photo.type.split("/")[1]}`;
    const upload = await admin.storage.from(PHOTO_BUCKET).upload(path, photo, { contentType: photo.type });
    if (upload.error) {
      console.error("createReport: upload", upload.error);
      // Bez delimično sačuvanih prijava: brišemo i prijavu i već poslate slike.
      if (uploaded.length) await admin.storage.from(PHOTO_BUCKET).remove(uploaded);
      await admin.from("reports").delete().eq("id", report.id);
      return { ok: false, error: "Fotografija nije poslata. Pokušaj ponovo." };
    }
    uploaded.push(path);
  }

  if (uploaded.length) {
    const { error: photosError } = await admin
      .from("report_photos")
      .insert(uploaded.map((path) => ({ report_id: report.id, path, kind: "before" })));
    if (photosError) console.error("createReport: report_photos", photosError);
  }

  revalidatePath("/");
  return { ok: true, id: report.id };
}

/** Adresa za trenutni položaj pina u formi. */
export async function lookupAddress(lat: number, lng: number): Promise<Place | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !isInsideNoviSad(lat, lng)) return null;
  return reverseGeocode(lat, lng);
}

/** Otvorene prijave iste kategorije u krugu od 30 m (upozorenje o mogućem duplikatu). */
export async function findNearbyReports(lat: number, lng: number, categoryId: number): Promise<PublicReport[]> {
  if (!isSupabaseConfigured() || !isInsideNoviSad(lat, lng) || !Number.isInteger(categoryId)) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("nearby_reports", { lat, lng, cat: categoryId, radius_m: 30 })
    .limit(3);
  if (error) {
    console.error("findNearbyReports", error);
    return [];
  }
  return (data ?? []) as PublicReport[];
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

function hashIp(ip: string) {
  // Service-role ključ služi kao tajna "so", da se heš ne bi mogao vratiti u IP adresu.
  return createHash("sha256").update(`${ip}:${process.env.SUPABASE_SERVICE_ROLE_KEY}`).digest("hex");
}

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function toFieldErrors(error: ZodError): Partial<Record<ReportField, string>> {
  const result: Partial<Record<ReportField, string>> = {};
  for (const issue of error.issues) {
    let field = issue.path[0] as ReportField;
    if (field === "lat" || field === "lng") field = "location";
    result[field] ??= issue.message;
  }
  return result;
}
