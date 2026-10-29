import ReportsExplorer from "@/components/explorer/ReportsExplorer";
import { DEMO_CATEGORIES, DEMO_REPORTS } from "@/lib/demo-data";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Category, PublicReport } from "@/lib/types";

export const dynamic = "force-dynamic";

const PHOTO_BUCKET = "report-photos";

async function loadData(): Promise<{ reports: PublicReport[]; categories: Category[]; demo: boolean }> {
  if (!isSupabaseConfigured()) {
    return { reports: DEMO_REPORTS, categories: DEMO_CATEGORIES, demo: true };
  }

  const supabase = await createClient();
  const [reports, categories, photos] = await Promise.all([
    supabase.from("reports_public").select("*").neq("status", "rejected").neq("status", "duplicate"),
    supabase.from("categories").select("*").eq("active", true).order("sort_order"),
    supabase.from("report_photos").select("report_id, path").eq("kind", "before").order("created_at"),
  ]);

  const error = reports.error ?? categories.error ?? photos.error;
  if (error) {
    throw new Error(`Supabase greška ${error.code}: ${error.message}${error.hint ? ` (${error.hint})` : ""}`);
  }

  // Prva fotografija svake prijave.
  const photoByReport = new Map<string, string>();
  for (const photo of photos.data ?? []) {
    if (!photoByReport.has(photo.report_id)) {
      photoByReport.set(photo.report_id, supabase.storage.from(PHOTO_BUCKET).getPublicUrl(photo.path).data.publicUrl);
    }
  }

  return {
    reports: (reports.data ?? []).map((r) => ({ ...r, photo_url: photoByReport.get(r.id) ?? null })),
    categories: categories.data ?? [],
    demo: false,
  };
}

export default async function Home({ searchParams }: { searchParams: Promise<{ prijava?: string }> }) {
  const [{ reports, categories, demo }, { prijava }] = await Promise.all([loadData(), searchParams]);
  return <ReportsExplorer reports={reports} categories={categories} demo={demo} initialReportId={prijava ?? null} />;
}
