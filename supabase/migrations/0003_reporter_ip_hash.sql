-- Ograničenje broja anonimnih prijava (rate limit).
-- Čuvamo samo heš IP adrese (ne samu adresu), i to samo u tabeli `reports`,
-- koju javnost ne čita (pogled `reports_public` ovu kolonu ne sadrži).

alter table public.reports add column reporter_ip_hash text;

create index reports_ip_hash_idx on public.reports (reporter_ip_hash, created_at);

-- Da Data API (PostgREST) odmah vidi novu kolonu.
notify pgrst, 'reload schema';
