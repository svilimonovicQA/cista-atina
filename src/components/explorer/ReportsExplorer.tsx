"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";

import { Logo } from "@/components/brand/Logo";
import type { MapFocus } from "@/components/map/MapView";
import { GITHUB_URL, OPEN_STATUSES } from "@/lib/constants";
import { plural } from "@/lib/format";
import type { Category, PublicReport } from "@/lib/types";

import { CategoryChips, StatusTabs, type StatusFilter } from "./Filters";
import { ReportList } from "./ReportList";
import { Stats } from "./Stats";

// Leaflet radi samo u browseru.
const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-500">Učitavam mapu…</div>
  ),
});

type Props = {
  reports: PublicReport[];
  categories: Category[];
  demo: boolean;
  /** Prijava koju treba odmah prikazati (npr. posle slanja forme). */
  initialReportId: string | null;
};

export default function ReportsExplorer({ reports, categories, demo, initialReportId }: Props) {
  const [activeCategories, setActiveCategories] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialReportId);
  const [focus, setFocus] = useState<MapFocus | null>(initialReportId ? { id: initialReportId, seq: 0 } : null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Filtrirano po statusu i pretrazi, ali ne i po kategoriji (za brojeve na čipovima).
  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports
      .filter((r) => {
        if (statusFilter === "active" && !OPEN_STATUSES.includes(r.status)) return false;
        if (statusFilter === "done" && r.status !== "done") return false;
        if (statusFilter === "all" && !OPEN_STATUSES.includes(r.status) && r.status !== "done") return false;
        if (q && !`${r.description} ${r.address ?? ""}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [reports, statusFilter, query]);

  const counts = useMemo(() => {
    const result = new Map<number, number>();
    for (const r of matching) result.set(r.category_id, (result.get(r.category_id) ?? 0) + 1);
    return result;
  }, [matching]);

  const visible = useMemo(
    () => (activeCategories.size === 0 ? matching : matching.filter((r) => activeCategories.has(r.category_id))),
    [matching, activeCategories],
  );

  function toggleCategory(id: number) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const showToast = useCallback((message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  function selectFromList(id: string) {
    setSelectedId(id);
    setFocus({ id, seq: Date.now() });
    setSheetOpen(false);
  }

  const selectFromMap = useCallback((id: string) => {
    setSelectedId(id);
    document.getElementById(`report-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  const chips = (scroll: boolean) => (
    <CategoryChips
      categories={categories}
      counts={counts}
      active={activeCategories}
      onToggle={toggleCategory}
      onClear={() => setActiveCategories(new Set())}
      scroll={scroll}
    />
  );

  const list = (
    <ReportList reports={visible} categoryById={categoryById} selectedId={selectedId} onSelect={selectFromList} />
  );

  return (
    <div className="flex h-dvh bg-slate-50">
      {/* Bočni panel (desktop) */}
      <aside className="hidden w-[400px] shrink-0 flex-col border-r border-slate-200 bg-slate-50 md:flex">
        <div className="space-y-5 border-b border-slate-200 bg-white px-5 pb-5 pt-6">
          <Logo />
          <p className="text-sm text-slate-600">
            Primetio si smeće, oštećenu klupu ili išaranu fasadu? Prijavi mesto, a volonteri će ga srediti.
          </p>
          <Stats reports={reports} />
        </div>

        <div className="space-y-3 border-b border-slate-200 px-5 py-4">
          <SearchInput value={query} onChange={setQuery} />
          <StatusTabs value={statusFilter} onChange={setStatusFilter} />
          {chips(false)}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            {visible.length} {plural(visible.length, ["prijava", "prijave", "prijava"])}
          </div>
          {list}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
          {demo ? <DemoNote /> : <span>Projekat volontera Novog Sada</span>}
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-slate-800">
            GitHub
          </a>
        </footer>
      </aside>

      {/* Mapa */}
      <main className="relative min-w-0 flex-1">
        <MapView
          reports={visible}
          categories={categories}
          focus={focus}
          onSelect={selectFromMap}
          onMessage={showToast}
        />

        {/* Gornji sloj (mobilni) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] space-y-2 p-3 md:hidden">
          <div className="pointer-events-auto flex items-center justify-between rounded-2xl bg-white/90 px-3 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur">
            <Logo compact />
            {demo && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">Demo</span>}
          </div>
          <div className="pointer-events-auto">{chips(true)}</div>
        </div>

        {/* Dugme za prijavu */}
        <Link
          href="/prijavi"
          className="absolute bottom-[92px] left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 active:scale-95 md:bottom-auto md:left-auto md:right-5 md:top-5 md:translate-x-0"
        >
          <PlusIcon />
          Prijavi problem
        </Link>

        {/* Donji panel (mobilni) */}
        <div className="absolute inset-x-0 bottom-0 z-[1001] rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] md:hidden">
          <button
            type="button"
            onClick={() => setSheetOpen((open) => !open)}
            aria-expanded={sheetOpen}
            className="flex w-full flex-col items-center px-5 pb-4 pt-2"
          >
            <span className="mb-2 h-1 w-10 rounded-full bg-slate-300" />
            <span className="flex w-full items-center justify-between text-sm">
              <span className="font-semibold text-slate-900">
                {visible.length} {plural(visible.length, ["prijava", "prijave", "prijava"])}
              </span>
              <span className="flex items-center gap-1 text-emerald-700">
                {sheetOpen ? "Sakrij listu" : "Prikaži listu"}
                <ChevronIcon up={!sheetOpen} />
              </span>
            </span>
          </button>
          {sheetOpen && (
            <div className="max-h-[60dvh] space-y-4 overflow-y-auto px-4 pb-6">
              <Stats reports={reports} />
              <SearchInput value={query} onChange={setQuery} />
              <StatusTabs value={statusFilter} onChange={setStatusFilter} />
              {list}
              {demo && <DemoNote />}
            </div>
          )}
        </div>

        {toast && (
          <div
            role="status"
            className="absolute left-1/2 top-32 z-[1002] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm text-white shadow-xl md:top-20"
          >
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="relative block">
      <span className="sr-only">Pretraga prijava</span>
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.39l3.08 3.08a.75.75 0 11-1.06 1.06l-3.08-3.08A7 7 0 012 9z"
          clipRule="evenodd"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Pretraži po opisu ili adresi…"
        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
      />
    </label>
  );
}

function DemoNote() {
  return (
    <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-800">
      Demo podaci (Supabase nije podešen)
    </span>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  );
}

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={`size-4 transition ${up ? "" : "rotate-180"}`} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.83l-3.71 3.94a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}
