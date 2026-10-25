-- =====================================================================
--  Paiements de la scolarité — Keur Papa Djibril Kor
--  À exécuter UNE FOIS dans Supabase : SQL Editor → New query → coller → Run.
--  (À exécuter APRÈS notes.sql)
-- =====================================================================

-- ---------- Options de l'élève (cantine, transport) ----------
alter table public.eleves add column if not exists cantine boolean not null default false;
alter table public.eleves add column if not exists transport boolean not null default false;

-- ---------- Tarifs (en FCFA), par année scolaire et par niveau ----------
-- type : inscription, tenue, mensualite, cantine, transport
create table if not exists public.tarifs (
  id bigint generated always as identity primary key,
  annee text not null,
  niveau text not null,
  type text not null check (type in ('inscription', 'tenue', 'mensualite', 'cantine', 'transport')),
  montant integer not null default 0 check (montant >= 0),
  unique (annee, niveau, type)
);

-- ---------- Paiements ----------
-- mois : 10, 11, 12, 1 … 6 pour les frais mensuels ; vide pour inscription et tenue
create table if not exists public.paiements (
  id bigint generated always as identity primary key,
  eleve_id bigint not null references public.eleves (id) on delete cascade,
  classe_id bigint not null references public.classes (id) on delete cascade,
  annee text not null,
  type text not null check (type in ('inscription', 'tenue', 'mensualite', 'cantine', 'transport')),
  mois smallint check (mois between 1 and 12),
  montant integer not null check (montant > 0),
  moyen text not null default 'Espèces' check (moyen in ('Espèces', 'Wave', 'Orange Money')),
  reference text not null default '',          -- n° de transaction Wave / Orange Money
  date_paiement date not null default current_date,
  numero_recu text not null default '',
  note text not null default '',
  encaisse_par text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists paiements_classe_idx on public.paiements (classe_id, annee);
create index if not exists paiements_eleve_idx on public.paiements (eleve_id);

-- ---------- Numéro de reçu automatique : R2026-00001, R2026-00002… ----------
create table if not exists public.recu_compteurs (
  annee int primary key,
  dernier int not null default 0
);
alter table public.recu_compteurs enable row level security;

create or replace function public.paiements_numero_recu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_an int := coalesce(substring(new.annee from '\d{4}')::int, extract(year from now())::int);
  v_num int;
begin
  -- Plusieurs lignes payées ensemble (ex. 3 mois) partagent le même reçu :
  -- seule la première reçoit un nouveau numéro, les suivantes reprennent le sien.
  if coalesce(new.numero_recu, '') = '' then
    insert into recu_compteurs (annee, dernier) values (v_an, 0) on conflict (annee) do nothing;
    update recu_compteurs set dernier = dernier + 1 where annee = v_an returning dernier into v_num;
    new.numero_recu := 'R' || v_an || '-' || lpad(v_num::text, 5, '0');
  end if;
  new.encaisse_par := coalesce((select email from auth.users where id = auth.uid()), '');
  return new;
end;
$$;

drop trigger if exists paiements_numero_recu on public.paiements;
create trigger paiements_numero_recu
  before insert on public.paiements
  for each row execute function public.paiements_numero_recu();

-- ---------- Sécurité : réservé aux administrateurs ----------
alter table public.tarifs    enable row level security;
alter table public.paiements enable row level security;

create policy "admin gere tarifs" on public.tarifs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin gere paiements" on public.paiements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
