import ReportsExplorer from "@/components/map/ReportsExplorer";
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

  if (reports.error) throw reports.error;
  if (categories.error) throw categories.error;

  return { reports: reports.data, categories: categories.data, demo: false };
}

export default async function Home() {
  const { reports, categories, demo } = await loadData();

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold leading-tight">Čista Atina</h1>
          <p className="text-xs text-gray-500">Prijavi mesto koje treba ulepšati, a volonteri će ga srediti.</p>
        </div>
        <button
          type="button"
          disabled
          title="Forma za prijavu stiže u sledećem koraku"
          className="rounded-full bg-green-600 px-4 py-2 text-sm font-medium text-white shadow disabled:opacity-60"
        >
          + Prijavi
        </button>
      </header>

      {demo && (
        <div className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800">
          Demo podaci: popuni <code>.env.local</code> i pokreni migraciju da bi se prikazale prave prijave.
        </div>
      )}

      <main className="min-h-0 flex-1">
        <ReportsExplorer reports={reports} categories={categories} />
      </main>
    </div>
  );
}
