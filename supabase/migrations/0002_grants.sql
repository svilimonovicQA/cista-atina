-- Eksplicitna prava pristupa za Data API uloge.
-- Novi Supabase projekti ne dodeljuju automatski prava na nove tabele, pa ih
-- ovde navodimo. RLS pravila iz 0001 i dalje određuju KOJE redove ko vidi;
-- ovi GRANT-ovi samo dozvoljavaju da uloga uopšte pristupi tabeli.

grant usage on schema public to anon, authenticated, service_role;

-- service_role (server akcije) zaobilazi RLS i treba mu pun pristup.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Javno čitanje (redove i dalje filtrira RLS).
grant select on
  public.categories,
  public.reports_public,
  public.report_photos,
  public.report_status_history,
  public.actions,
  public.action_reports,
  public.upvotes
to anon, authenticated;

-- Prijavljeni korisnici.
grant select on public.profiles to authenticated;
grant select, update, delete on public.reports to authenticated;
grant insert, update, delete on
  public.categories,
  public.report_photos,
  public.actions,
  public.action_reports
to authenticated;
grant select, insert, delete on public.action_participants to authenticated;
grant insert, delete on public.upvotes to authenticated;
grant usage on all sequences in schema public to authenticated;

grant execute on function public.nearby_reports(double precision, double precision, smallint, integer)
  to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
