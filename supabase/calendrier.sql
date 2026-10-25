-- =====================================================================
--  Calendrier scolaire — Keur Papa Djibril Kor
--  À exécuter UNE FOIS dans Supabase : SQL Editor → New query → coller → Run.
--  (À exécuter APRÈS schema.sql)
-- =====================================================================

create table if not exists public.evenements (
  id bigint generated always as identity primary key,
  titre text not null check (char_length(titre) between 2 and 150),
  date_debut date not null,
  date_fin date,                                   -- vide = un seul jour
  type text not null default 'autre'
    check (type in ('rentree', 'conge', 'examen', 'reunion', 'fete', 'autre')),
  etablissement text not null default 'Tous',      -- « Tous » ou le nom de l'établissement
  description text not null default '' check (char_length(description) <= 1000),
  public boolean not null default true,            -- visible sur le site
  created_at timestamptz not null default now(),
  check (date_fin is null or date_fin >= date_debut)
);
create index if not exists evenements_date_idx on public.evenements (date_debut);

alter table public.evenements enable row level security;
drop policy if exists "tout le monde lit le calendrier public" on public.evenements;
drop policy if exists "admin gere le calendrier" on public.evenements;
create policy "tout le monde lit le calendrier public" on public.evenements
  for select using (public or public.is_admin());
create policy "admin gere le calendrier" on public.evenements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
