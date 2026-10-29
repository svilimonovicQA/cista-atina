# Čista Atina

Platforma na kojoj građani Novog Sada prijavljuju mesta kojima treba čišćenje, krečenje, popravka mobilijara i slično. Volonteri ta mesta zatim sređuju.

**Stack:** Next.js 15 (App Router) + TypeScript, Tailwind CSS, Leaflet + OpenStreetMap, Supabase (PostgreSQL + PostGIS, Auth, Storage).

## Pokretanje (oko 10 minuta)

```bash
npm install
npm run dev
```

Otvori http://localhost:3000. Bez podešavanja se mapa prikazuje sa **demo podacima**.

### Povezivanje sa bazom
1. Napravi besplatan projekat na [supabase.com](https://supabase.com).
2. U **SQL Editor** nalepi i pokreni [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. Kopiraj `.env.example` u `.env.local` i popuni vrednosti iz *Project Settings → API*.
4. Restartuj `npm run dev`.

Da bi neko postao koordinator, posle prve prijave na sistem pokreni u SQL editoru:
```sql
update profiles set role = 'coordinator' where id = (select id from auth.users where email = 'ime@primer.rs');
```

## Struktura

| Putanja | Šta je |
|---|---|
| `src/app/` | Stranice (rute) |
| `src/components/map/` | Mapa: `MapView` (Leaflet), `ReportsExplorer` (filteri) |
| `src/lib/supabase/` | Supabase klijenti za server i browser |
| `src/lib/` | Tipovi, konstante (granice grada, statusi), demo podaci |
| `supabase/migrations/` | SQL šema, RLS pravila, početne kategorije |

## Model podataka (ukratko)
- `reports`: prijava sa lokacijom (`geography(Point)`), kategorijom i statusom
- `reports_public`: javni pogled bez emaila prijavioca, čita ga mapa
- Statusi: `new → verified → planned → in_progress → done`, plus `rejected` i `duplicate`
- Svaka promena statusa se automatski upisuje u `report_status_history`

## Plan razvoja
- [x] Postavka projekta, šema baze, mapa sa filterima
- [ ] Forma za prijavu (GPS/pin, fotografija, Turnstile zaštita)
- [ ] Stranica detalja prijave
- [ ] Login i koordinatorski panel
- [ ] PWA i deploy na Vercel
- [ ] Faza 2: volonterske akcije, pre/posle galerija, obaveštenja, glasanje
- [ ] Faza 3: statistika po mesnim zajednicama, višejezičnost (sr/ћир/hu/en)

## Doprinos
Uzmi issue sa labelom `good first issue`, napravi granu i otvori PR. Pre slanja pokreni `npm run lint` i `npm run build`.
