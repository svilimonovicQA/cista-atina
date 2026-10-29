import type { Metadata } from "next";
import Link from "next/link";

import { LogoMark } from "@/components/brand/Logo";
import { ReportForm } from "@/components/report-form/ReportForm";
import { APP_NAME } from "@/lib/constants";
import { DEMO_CATEGORIES } from "@/lib/demo-data";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

export const metadata: Metadata = {
  title: `Prijavi problem · ${APP_NAME}`,
};

async function loadCategories(): Promise<{ categories: Category[]; demo: boolean }> {
  if (!isSupabaseConfigured()) return { categories: DEMO_CATEGORIES, demo: true };

  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("*").eq("active", true).order("sort_order");
  if (error) throw new Error(`Supabase greška ${error.code}: ${error.message}`);
  return { categories: data ?? [], demo: false };
}

export default async function ReportPage() {
  const { categories, demo } = await loadCategories();

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            aria-label="Nazad na mapu"
            className="flex size-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.6l4.2 3.9a.75.75 0 11-1.02 1.1l-5.5-5.1a.75.75 0 010-1.1l5.5-5.1a.75.75 0 011.02 1.1l-4.2 3.9h10.65A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
          <LogoMark className="size-8" />
          <div className="leading-tight">
            <h1 className="font-semibold text-slate-900">Prijavi problem</h1>
            <p className="text-xs text-slate-500">Traje manje od minut</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        <ReportForm categories={categories} demo={demo} />
      </main>
    </div>
  );
}
