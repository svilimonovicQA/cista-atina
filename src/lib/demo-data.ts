import demoReports from "../../supabase/demo-reports.json";

import type { Category, PublicReport, ReportStatus } from "./types";

// Prikazuje se samo dok Supabase nije podešen (.env.local), da bi mapa odmah radila.
// Iste prijave u bazu upisuje `npm run seed:demo`.

export const DEMO_CATEGORIES: Category[] = [
  { id: 1, slug: "ciscenje", name_sr: "Čišćenje / smeće", icon: "🗑️", color: "#16a34a", sort_order: 1 },
  { id: 2, slug: "krecenje", name_sr: "Krečenje / fasade", icon: "🖌️", color: "#2563eb", sort_order: 2 },
  { id: 3, slug: "grafiti", name_sr: "Grafiti", icon: "🎨", color: "#9333ea", sort_order: 3 },
  { id: 4, slug: "mobilijar", name_sr: "Oštećen mobilijar (klupe, kante)", icon: "🪑", color: "#ea580c", sort_order: 4 },
  { id: 5, slug: "zelenilo", name_sr: "Zelene površine", icon: "🌳", color: "#65a30d", sort_order: 5 },
  { id: 6, slug: "ostalo", name_sr: "Ostalo", icon: "📍", color: "#64748b", sort_order: 6 },
];

const categoryId = new Map(DEMO_CATEGORIES.map((c) => [c.slug, c.id]));

export const DEMO_REPORTS: PublicReport[] = demoReports.map((r, i) => {
  const created = new Date(Date.now() - r.daysAgo * 86_400_000).toISOString();
  return {
    id: `demo-${i + 1}`,
    category_id: categoryId.get(r.category) ?? 6,
    description: r.description,
    status: r.status as ReportStatus,
    lat: r.lat,
    lng: r.lng,
    address: r.address,
    district: r.district,
    duplicate_of: null,
    upvotes_count: 0,
    created_at: created,
    updated_at: created,
  };
});
