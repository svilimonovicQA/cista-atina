"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { OPEN_STATUSES } from "@/lib/constants";
import type { Category, PublicReport } from "@/lib/types";

// Leaflet radi samo u browseru.
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-gray-500">Učitavam mapu…</div>,
});

type Props = {
  reports: PublicReport[];
  categories: Category[];
};

export default function ReportsExplorer({ reports, categories }: Props) {
  const [activeCategories, setActiveCategories] = useState<Set<number>>(new Set());
  const [showDone, setShowDone] = useState(false);

  const visible = useMemo(
    () =>
      reports.filter(
        (r) =>
          (activeCategories.size === 0 || activeCategories.has(r.category_id)) &&
          (OPEN_STATUSES.includes(r.status) || (showDone && r.status === "done")),
      ),
    [reports, activeCategories, showDone],
  );

  function toggleCategory(id: number) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="relative h-full w-full">
      <MapView reports={visible} categories={categories} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-3">
        <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => {
            const active = activeCategories.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCategory(c.id)}
                aria-pressed={active}
                className="shrink-0 rounded-full border bg-white px-3 py-1.5 text-sm shadow-sm transition"
                style={active ? { background: c.color, borderColor: c.color, color: "white" } : undefined}
              >
                {c.icon} {c.name_sr}
              </button>
            );
          })}
          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-sm shadow-sm">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
            Prikaži završene
          </label>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-md bg-white/90 px-2 py-1 text-xs text-gray-700 shadow">
        {visible.length} {pluralPrijava(visible.length)} na mapi
      </div>
    </div>
  );
}

/** 1 prijava, 2–4 prijave, 5+ prijava (uz izuzetak 12–14). */
function pluralPrijava(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  return mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "prijave" : "prijava";
}
