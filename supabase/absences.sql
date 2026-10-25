-- =====================================================================
--  Absences et retards — Keur Papa Djibril Kor
--  À exécuter UNE FOIS dans Supabase : SQL Editor → New query → coller → Run.
--  (À exécuter APRÈS notes.sql. Ensuite, ré-exécuter parents.sql pour que
--   les parents voient aussi les absences.)
-- =====================================================================

-- type : absence ou retard
-- moment : journee, matin, apres-midi
create table if not exists public.absences (
  id bigint generated always as identity primary key,
  eleve_id bigint not null references public.eleves (id) on delete cascade,
  classe_id bigint not null references public.classes (id) on delete cascade,
  date date not null default current_date,
  type text not null default 'absence' check (type in ('absence', 'retard')),
  moment text not null default 'journee' check (moment in ('journee', 'matin', 'apres-midi')),
  justifie boolean not null default false,
  motif text not null default '' check (char_length(motif) <= 200),
  created_at timestamptz not null default now(),
  unique (eleve_id, date, type, moment)
);
create index if not exists absences_classe_idx on public.absences (classe_id, date);

alter table public.absences enable row level security;
create policy "admin gere absences" on public.absences
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
