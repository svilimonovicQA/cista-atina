-- Čista Atina: početna šema
-- Pokrenuti u Supabase SQL editoru ili preko `supabase db push`.

create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- Tipovi
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('citizen', 'volunteer', 'coordinator', 'admin');

create type public.report_status as enum (
  'new',          -- Nova
  'verified',     -- Proverena
  'planned',      -- Planirana
  'in_progress',  -- U toku
  'done',         -- Završena
  'rejected',     -- Odbijena
  'duplicate'     -- Duplikat
);

create type public.photo_kind as enum ('before', 'after');

-- ---------------------------------------------------------------------------
-- Tabele
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  role        public.user_role not null default 'citizen',
  created_at  timestamptz not null default now()
);

create table public.categories (
  id          smallserial primary key,
  slug        text not null unique,
  name_sr     text not null,
  icon        text not null,
  color       text not null,
  sort_order  smallint not null default 0,
  active      boolean not null default true
);

create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  category_id     smallint not null references public.categories (id),
  description     text not null check (char_length(description) between 3 and 1000),
  status          public.report_status not null default 'new',
  location        geography(Point, 4326) not null,
  address         text,
  district        text,
  reporter_id     uuid references public.profiles (id) on delete set null,
  reporter_email  text,
  duplicate_of    uuid references public.reports (id) on delete set null,
  upvotes_count   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index reports_location_idx on public.reports using gist (location);
create index reports_status_idx on public.reports (status);

create table public.report_photos (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports (id) on delete cascade,
  path        text not null,  -- putanja u Storage bucketu "report-photos"
  kind        public.photo_kind not null default 'before',
  created_at  timestamptz not null default now()
);

create table public.report_status_history (
  id          bigserial primary key,
  report_id   uuid not null references public.reports (id) on delete cascade,
  old_status  public.report_status,
  new_status  public.report_status not null,
  changed_by  uuid references public.profiles (id) on delete set null,
  comment     text,
  created_at  timestamptz not null default now()
);

create table public.actions (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  starts_at     timestamptz not null,
  meeting_point geography(Point, 4326),
  meeting_note  text,
  tools_needed  text,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create table public.action_reports (
  action_id  uuid not null references public.actions (id) on delete cascade,
  report_id  uuid not null references public.reports (id) on delete cascade,
  primary key (action_id, report_id)
);

create table public.action_participants (
  action_id  uuid not null references public.actions (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (action_id, user_id)
);

create table public.upvotes (
  report_id  uuid not null references public.reports (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Pomoćne funkcije i trigeri
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('coordinator', 'admin')
  );
$$;

-- Novi korisnik u auth.users dobija profil.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Svaka promena statusa se upisuje u istoriju.
create or replace function public.log_report_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.report_status_history (report_id, old_status, new_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.report_status_history (report_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- AFTER za INSERT (red mora postojati zbog FK), BEFORE za UPDATE (zbog updated_at).
create trigger reports_status_insert
  after insert on public.reports
  for each row execute function public.log_report_status();

create trigger reports_status_update
  before update on public.reports
  for each row execute function public.log_report_status();

create or replace function public.sync_upvotes_count()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.reports
  set upvotes_count = (select count(*) from public.upvotes where report_id = coalesce(new.report_id, old.report_id))
  where id = coalesce(new.report_id, old.report_id);
  return null;
end;
$$;

create trigger upvotes_sync
  after insert or delete on public.upvotes
  for each row execute function public.sync_upvotes_count();

-- ---------------------------------------------------------------------------
-- Javni pogled: bez emaila prijavioca, sa lat/lng umesto geography tipa
-- ---------------------------------------------------------------------------
create view public.reports_public
with (security_invoker = false)
as
select
  r.id,
  r.category_id,
  r.description,
  r.status,
  st_y(r.location::geometry) as lat,
  st_x(r.location::geometry) as lng,
  r.address,
  r.district,
  r.duplicate_of,
  r.upvotes_count,
  r.created_at,
  r.updated_at
from public.reports r;

grant select on public.reports_public to anon, authenticated;

-- Prijave iste kategorije u krugu od `radius_m` metara (za upozorenje o duplikatu).
create or replace function public.nearby_reports(
  lat double precision,
  lng double precision,
  cat smallint,
  radius_m integer default 30
)
returns setof public.reports_public
language sql stable
as $$
  select * from public.reports_public r
  where r.category_id = cat
    and r.status not in ('done', 'rejected', 'duplicate')
    and st_dwithin(
      st_setsrid(st_makepoint(r.lng, r.lat), 4326)::geography,
      st_setsrid(st_makepoint(lng, lat), 4326)::geography,
      radius_m
    );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.categories            enable row level security;
alter table public.reports               enable row level security;
alter table public.report_photos         enable row level security;
alter table public.report_status_history enable row level security;
alter table public.actions               enable row level security;
alter table public.action_reports        enable row level security;
alter table public.action_participants   enable row level security;
alter table public.upvotes               enable row level security;

-- profiles
create policy "profil: vlasnik ili staff čita" on public.profiles
  for select using (id = auth.uid() or public.is_staff());
create policy "profil: vlasnik menja ime" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- Korisnik sme da menja samo ime. Uloge dodeljuje admin (SQL editor / service role).
revoke update on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;

-- categories
create policy "kategorije: svi čitaju" on public.categories
  for select using (true);
create policy "kategorije: staff upravlja" on public.categories
  for all using (public.is_staff()) with check (public.is_staff());

-- reports: javnost čita preko pogleda reports_public; direktno čitaju staff i prijavilac.
-- Anonimni INSERT ide preko server akcije sa service-role ključem (posle Turnstile provere).
create policy "prijave: staff i prijavilac čitaju" on public.reports
  for select using (public.is_staff() or reporter_id = auth.uid());
create policy "prijave: staff menja" on public.reports
  for update using (public.is_staff()) with check (public.is_staff());
create policy "prijave: staff briše" on public.reports
  for delete using (public.is_staff());

-- report_photos
create policy "slike: svi čitaju" on public.report_photos
  for select using (true);
create policy "slike: staff upravlja" on public.report_photos
  for all using (public.is_staff()) with check (public.is_staff());

-- report_status_history
create policy "istorija: svi čitaju" on public.report_status_history
  for select using (true);

-- actions
create policy "akcije: svi čitaju" on public.actions
  for select using (true);
create policy "akcije: staff upravlja" on public.actions
  for all using (public.is_staff()) with check (public.is_staff());

create policy "akcije-prijave: svi čitaju" on public.action_reports
  for select using (true);
create policy "akcije-prijave: staff upravlja" on public.action_reports
  for all using (public.is_staff()) with check (public.is_staff());

create policy "učesnici: prijavljeni čitaju" on public.action_participants
  for select using (auth.uid() is not null);
create policy "učesnici: sam se prijavljuje" on public.action_participants
  for insert with check (user_id = auth.uid());
create policy "učesnici: sam se odjavljuje" on public.action_participants
  for delete using (user_id = auth.uid());

-- upvotes
create policy "glasovi: svi čitaju" on public.upvotes
  for select using (true);
create policy "glasovi: sam glasa" on public.upvotes
  for insert with check (user_id = auth.uid());
create policy "glasovi: sam povlači" on public.upvotes
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage bucket za fotografije
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Početne kategorije
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name_sr, icon, color, sort_order) values
  ('ciscenje',   'Čišćenje / smeće',           '🗑️', '#16a34a', 1),
  ('krecenje',   'Krečenje / fasade',          '🖌️', '#2563eb', 2),
  ('grafiti',    'Grafiti',                    '🎨', '#9333ea', 3),
  ('mobilijar',  'Oštećen mobilijar (klupe, kante)', '🪑', '#ea580c', 4),
  ('zelenilo',   'Zelene površine',            '🌳', '#65a30d', 5),
  ('ostalo',     'Ostalo',                     '📍', '#64748b', 6);
