-- =====================================================================
--  Plateforme de notes et bulletins — Keur Papa Djibril Kor
--  À exécuter UNE FOIS dans Supabase : SQL Editor → New query →
--  coller tout ce fichier → Run.
--  (À exécuter APRÈS schema.sql : il utilise la fonction is_admin())
-- =====================================================================

-- ---------- Classes ----------
create table if not exists public.classes (
  id bigint generated always as identity primary key,
  nom text not null check (char_length(nom) between 1 and 60),          -- ex. « CE1 A »
  niveau text not null default 'CI',                                      -- CI, CP, CE1, CE2, CM1, CM2, Préscolaire…
  etablissement text not null default '',
  maitre text not null default '',                                        -- « Tenue par »
  annee text not null default '2026-2027',
  bareme smallint not null default 10 check (bareme in (10, 20)),         -- moyenne sur 10 ou sur 20
  modele_fr text not null default 'composition' check (modele_fr in ('composition', 'controle')),
  avec_arabe boolean not null default true,
  avec_anglais boolean not null default false,
  maximums jsonb not null default '{}'::jsonb,                            -- note maximale par matière
  created_at timestamptz not null default now()
);

-- ---------- Élèves ----------
create table if not exists public.eleves (
  id bigint generated always as identity primary key,
  classe_id bigint not null references public.classes (id) on delete cascade,
  prenom text not null check (char_length(prenom) between 1 and 80),
  nom text not null check (char_length(nom) between 1 and 80),
  date_naissance date,
  lieu_naissance text not null default '',
  matricule text not null default '',
  telephone text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists eleves_classe_idx on public.eleves (classe_id);

-- ---------- Notes ----------
-- bulletin : fr (français), ar (arabe), en (anglais)
-- periode  : 1, 2 ou 3 (trimestre / الإختبار)
-- evaluation : composition ou controle
create table if not exists public.notes (
  id bigint generated always as identity primary key,
  eleve_id bigint not null references public.eleves (id) on delete cascade,
  classe_id bigint not null references public.classes (id) on delete cascade,
  bulletin text not null check (bulletin in ('fr', 'ar', 'en')),
  periode smallint not null check (periode between 1 and 3),
  evaluation text not null default 'composition' check (evaluation in ('composition', 'controle')),
  matiere text not null,
  valeur numeric(5, 2) not null check (valeur >= 0 and valeur <= 100),
  updated_at timestamptz not null default now(),
  unique (eleve_id, bulletin, periode, evaluation, matiere)
);
create index if not exists notes_classe_idx on public.notes (classe_id, bulletin);

-- ---------- Observations et décisions ----------
-- periode 1 à 3 : observation du trimestre ; periode 0 : décision de fin d'année
create table if not exists public.appreciations (
  id bigint generated always as identity primary key,
  eleve_id bigint not null references public.eleves (id) on delete cascade,
  classe_id bigint not null references public.classes (id) on delete cascade,
  bulletin text not null check (bulletin in ('fr', 'ar', 'en')),
  periode smallint not null check (periode between 0 and 3),
  observation text not null default '' check (char_length(observation) <= 300),
  decision text not null default '',
  updated_at timestamptz not null default now(),
  unique (eleve_id, bulletin, periode)
);

-- ---------- Sécurité : réservé aux administrateurs ----------
alter table public.classes       enable row level security;
alter table public.eleves        enable row level security;
alter table public.notes         enable row level security;
alter table public.appreciations enable row level security;

create policy "admin gere classes" on public.classes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin gere eleves" on public.eleves
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin gere notes" on public.notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin gere appreciations" on public.appreciations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
