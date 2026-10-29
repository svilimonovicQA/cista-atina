import type { Category, PublicReport } from "./types";

// Prikazuje se samo dok Supabase nije podešen (.env.local), da bi mapa odmah radila.

export const DEMO_CATEGORIES: Category[] = [
  { id: 1, slug: "ciscenje", name_sr: "Čišćenje / smeće", icon: "🗑️", color: "#16a34a", sort_order: 1 },
  { id: 2, slug: "krecenje", name_sr: "Krečenje / fasade", icon: "🖌️", color: "#2563eb", sort_order: 2 },
  { id: 3, slug: "grafiti", name_sr: "Grafiti", icon: "🎨", color: "#9333ea", sort_order: 3 },
  { id: 4, slug: "mobilijar", name_sr: "Oštećen mobilijar (klupe, kante)", icon: "🪑", color: "#ea580c", sort_order: 4 },
  { id: 5, slug: "zelenilo", name_sr: "Zelene površine", icon: "🌳", color: "#65a30d", sort_order: 5 },
  { id: 6, slug: "ostalo", name_sr: "Ostalo", icon: "📍", color: "#64748b", sort_order: 6 },
];

function demo(
  n: number,
  category_id: number,
  lat: number,
  lng: number,
  description: string,
  address: string,
  status: PublicReport["status"] = "new",
): PublicReport {
  const created = new Date(Date.UTC(2026, 9, n)).toISOString();
  return {
    id: `demo-${n}`,
    category_id,
    description,
    status,
    lat,
    lng,
    address,
    district: null,
    duplicate_of: null,
    upvotes_count: 0,
    created_at: created,
    updated_at: created,
  };
}

export const DEMO_REPORTS: PublicReport[] = [
  demo(1, 1, 45.2489, 19.8564, "Smeće ostavljeno pored staze uz Dunav.", "Sunčani kej"),
  demo(2, 4, 45.2508, 19.8417, "Polomljena klupa kod igrališta.", "Dunavski park"),
  demo(3, 3, 45.2551, 19.8452, "Grafiti na zidu pasaža.", "Zmaj Jovina"),
  demo(4, 2, 45.2443, 19.8177, "Ispucala i išarana fasada trafostanice.", "Liman 3", "verified"),
  demo(5, 5, 45.2472, 19.8031, "Zapušten travnjak, korov do kolena.", "Limanski park", "planned"),
  demo(6, 1, 45.2873, 19.8203, "Divlja deponija iza garaža.", "Klisa"),
  demo(7, 4, 45.2526, 19.8628, "Oborena kanta za smeće.", "Petrovaradinska tvrđava, plato", "done"),
  demo(8, 1, 45.2385, 19.8378, "Plastika u šiblju na Štrandu.", "Štrand", "in_progress"),
];
