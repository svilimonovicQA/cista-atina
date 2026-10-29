import ReportsExplorer from "@/components/explorer/ReportsExplorer";
import { DEMO_CATEGORIES, DEMO_REPORTS } from "@/lib/demo-data";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Category, PublicReport } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadData(): Promise<{ reports: PublicReport[]; categories: Category[]; demo: boolean }> {
  if (!isSupabaseConfigured()) {
    return { reports: DEMO_REPORTS, categories: DEMO_CATEGORIES, demo: true };
  }

  const supabase = await createClient();
  const [reports, categories] = await Promise.all([
    supabase.from("reports_public").select("*").neq("status", "rejected").neq("status", "duplicate"),
    supabase.from("categories").select("*").eq("active", true).order("sort_order"),
  ]);

  const error = reports.error ?? categories.error;
  if (error) {
    throw new Error(`Supabase greška ${error.code}: ${error.message}${error.hint ? ` (${error.hint})` : ""}`);
  }

  return { reports: reports.data ?? [], categories: categories.data ?? [], demo: false };
}

export default async function Home() {
  const { reports, categories, demo } = await loadData();
  return <ReportsExplorer reports={reports} categories={categories} demo={demo} />;
}
