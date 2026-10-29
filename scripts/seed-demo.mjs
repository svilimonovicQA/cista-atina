// Upisuje (ili briše) demo prijave iz supabase/demo-reports.json u Supabase bazu.
//
//   npm run seed:demo            → dodaje demo prijave koje još ne postoje
//   npm run seed:demo -- --remove → briše demo prijave (npr. pre puštanja u rad)
//
// Prijave se prepoznaju po opisu, pa je skriptu bezbedno pokrenuti više puta.

import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Nedostaju NEXT_PUBLIC_SUPABASE_URL i/ili SUPABASE_SERVICE_ROLE_KEY u .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const demo = JSON.parse(readFileSync(new URL("../supabase/demo-reports.json", import.meta.url), "utf8"));
const descriptions = demo.map((r) => r.description);

if (process.argv.includes("--remove")) {
  const { data, error } = await supabase.from("reports").delete().in("description", descriptions).select("id");
  if (error) fail(error);
  console.log(`Obrisano demo prijava: ${data.length}`);
  process.exit(0);
}

const { data: categories, error: categoriesError } = await supabase.from("categories").select("id, slug");
if (categoriesError) fail(categoriesError);
const categoryId = new Map(categories.map((c) => [c.slug, c.id]));

const { data: existing, error: existingError } = await supabase
  .from("reports")
  .select("description")
  .in("description", descriptions);
if (existingError) fail(existingError);
const already = new Set(existing.map((r) => r.description));

const rows = demo
  .filter((r) => !already.has(r.description))
  .map((r) => {
    const createdAt = new Date(Date.now() - r.daysAgo * 86_400_000 - Math.random() * 36_000_000).toISOString();
    return {
      category_id: categoryId.get(r.category),
      description: r.description,
      status: r.status,
      location: `SRID=4326;POINT(${r.lng} ${r.lat})`,
      address: r.address,
      district: r.district,
      created_at: createdAt,
    };
  });

if (rows.some((r) => !r.category_id)) {
  console.error("Neka kategorija iz demo-reports.json ne postoji u bazi. Da li je pokrenuta migracija 0001?");
  process.exit(1);
}

if (rows.length === 0) {
  console.log("Sve demo prijave već postoje, nema šta da se doda.");
  process.exit(0);
}

const { error } = await supabase.from("reports").insert(rows);
if (error) fail(error);
console.log(`Dodato demo prijava: ${rows.length} (preskočeno postojećih: ${already.size})`);

function fail(error) {
  console.error("Greška:", error.message ?? error);
  process.exit(1);
}
