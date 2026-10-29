import { OPEN_STATUSES } from "@/lib/constants";
import type { PublicReport } from "@/lib/types";

export function Stats({ reports }: { reports: PublicReport[] }) {
  let fresh = 0;
  let inWork = 0;
  let done = 0;
  for (const report of reports) {
    if (report.status === "new" || report.status === "verified") fresh++;
    else if (OPEN_STATUSES.includes(report.status)) inWork++;
    else if (report.status === "done") done++;
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat label="Nove" value={fresh} dot="bg-amber-400" />
      <Stat label="U radu" value={inWork} dot="bg-sky-500" />
      <Stat label="Rešene" value={done} dot="bg-emerald-500" />
    </div>
  );
}

function Stat({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="text-2xl font-semibold tabular-nums text-slate-900">{value}</div>
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className={`size-1.5 rounded-full ${dot}`} />
        {label}
      </div>
    </div>
  );
}
