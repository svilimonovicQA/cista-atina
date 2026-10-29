import { STATUS_BADGE, STATUS_LABELS } from "@/lib/constants";
import { timeAgo } from "@/lib/format";
import type { Category, PublicReport } from "@/lib/types";

type Props = {
  reports: PublicReport[];
  categoryById: Map<number, Category>;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function ReportList({ reports, categoryById, selectedId, onSelect }: Props) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center">
        <div className="mb-2 text-3xl" aria-hidden="true">
          🌿
        </div>
        <p className="text-sm font-medium text-slate-700">Nema prijava za izabrane filtere</p>
        <p className="mt-1 text-xs text-slate-500">Promeni filtere ili budi prvi koji će prijaviti mesto.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {reports.map((report) => {
        const category = categoryById.get(report.category_id);
        const selected = report.id === selectedId;
        return (
          <li key={report.id} id={`report-${report.id}`}>
            <button
              type="button"
              onClick={() => onSelect(report.id)}
              aria-current={selected || undefined}
              className={`flex w-full gap-3 rounded-2xl border p-3 text-left transition ${
                selected
                  ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              {report.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- slike iz Supabase Storage-a
                <img src={report.photo_url} alt="" loading="lazy" className="size-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <span
                  className="flex size-14 shrink-0 items-center justify-center rounded-xl text-xl"
                  style={{ backgroundColor: `${category?.color ?? "#64748b"}1f` }}
                  aria-hidden="true"
                >
                  {category?.icon ?? "📍"}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-900">{category?.name_sr ?? "Prijava"}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE[report.status]}`}>
                    {STATUS_LABELS[report.status]}
                  </span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-sm text-slate-600">{report.description}</span>
                <span className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
                  <PinIcon />
                  <span className="truncate">{report.address ?? "Bez adrese"}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={report.created_at} suppressHydrationWarning className="shrink-0">
                    {timeAgo(report.created_at)}
                  </time>
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-3.5 shrink-0" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18s6-5.3 6-10a6 6 0 10-12 0c0 4.7 6 10 6 10zm0-7.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
