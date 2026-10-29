import type { Category } from "@/lib/types";

export type StatusFilter = "active" | "done" | "all";

const STATUS_OPTIONS: [StatusFilter, string][] = [
  ["active", "Aktivne"],
  ["done", "Rešene"],
  ["all", "Sve"],
];

export function StatusTabs({ value, onChange }: { value: StatusFilter; onChange: (value: StatusFilter) => void }) {
  return (
    <div role="tablist" aria-label="Status prijava" className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-sm">
      {STATUS_OPTIONS.map(([option, label]) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option)}
            className={`rounded-lg py-1.5 font-medium transition ${
              selected ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

type CategoryChipsProps = {
  categories: Category[];
  counts: Map<number, number>;
  active: Set<number>;
  onToggle: (id: number) => void;
  onClear: () => void;
  /** Jedan red sa horizontalnim skrolom (mobilni) umesto prelamanja. */
  scroll?: boolean;
};

export function CategoryChips({ categories, counts, active, onToggle, onClear, scroll = false }: CategoryChipsProps) {
  const chip =
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition";
  const idle = "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50";

  return (
    <div className={scroll ? "no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1" : "flex flex-wrap gap-2"}>
      <button
        type="button"
        aria-pressed={active.size === 0}
        onClick={onClear}
        className={`${chip} ${active.size === 0 ? "border-slate-900 bg-slate-900 text-white" : idle}`}
      >
        Sve kategorije
      </button>
      {categories.map((category) => {
        const on = active.has(category.id);
        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(category.id)}
            className={`${chip} ${on ? "border-transparent text-white shadow-sm" : idle}`}
            style={on ? { backgroundColor: category.color } : undefined}
          >
            <span aria-hidden="true">{category.icon}</span>
            {category.name_sr}
            <span
              className={`rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}
            >
              {counts.get(category.id) ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
