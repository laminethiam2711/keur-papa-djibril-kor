-- =====================================================================
--  Matricules automatiques protégés par la base de données
--  Format : KPDK-2026-0001, KPDK-2026-0002…
--  À exécuter UNE FOIS dans Supabase : SQL Editor → New query → coller → Run.
--  (À exécuter APRÈS notes.sql)
--
--  Ce que ça garantit :
--   - le numéro est attribué par la base, dans l'ordre, même si deux
--     personnes inscrivent un élève au même moment ;
--   - deux élèves ne peuvent jamais avoir le même matricule.
-- =====================================================================

-- Dernier numéro attribué, par année de rentrée
create table if not exists public.matricule_compteurs (
  annee int primary key,
  dernier int not null default 0
);
alter table public.matricule_compteurs enable row level security;
-- (aucune règle d'accès : seule la fonction ci-dessous peut y toucher)

-- Donne le prochain matricule pour une année scolaire (« 2026-2027 » → KPDK-2026-xxxx)
create or replace function public.prochain_matricule(p_annee text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_an int := coalesce(substring(p_annee from '\d{4}')::int, extract(year from now())::int);
  v_prefixe text := 'KPDK-' || v_an || '-';
  v_num int;
begin
  -- Première fois pour cette année : on part du plus grand numéro déjà utilisé
  insert into matricule_compteurs (annee, dernier)
  select v_an, coalesce(max(nullif(regexp_replace(substring(matricule from length(v_prefixe) + 1), '\D', '', 'g'), '')::int), 0)
  from eleves where matricule like v_prefixe || '%'
  on conflict (annee) do nothing;

  -- Incrément atomique : la ligne est verrouillée, deux inscriptions ne peuvent pas avoir le même numéro
  update matricule_compteurs set dernier = dernier + 1 where annee = v_an returning dernier into v_num;
  return v_prefixe || lpad(v_num::text, 4, '0');
end;
$$;

-- À chaque inscription, la base attribue elle-même le matricule
create or replace function public.eleves_matricule_auto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.matricule := prochain_matricule((select annee from classes where id = new.classe_id));
  return new;
end;
$$;

drop trigger if exists eleves_matricule_auto on public.eleves;
create trigger eleves_matricule_auto
  before insert on public.eleves
  for each row execute function public.eleves_matricule_auto();

-- Attribue un matricule aux élèves d'une classe qui n'en ont pas (réservé aux administrateurs)
create or replace function public.completer_matricules(p_classe bigint)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_annee text;
  v_eleve record;
  v_n int := 0;
begin
  if not is_admin() then raise exception 'Réservé aux administrateurs'; end if;
  select annee into v_annee from classes where id = p_classe;
  for v_eleve in select id from eleves where classe_id = p_classe and coalesce(trim(matricule), '') = '' order by nom, prenom loop
    update eleves set matricule = prochain_matricule(v_annee) where id = v_eleve.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke execute on function public.completer_matricules(bigint) from public, anon;
grant execute on function public.completer_matricules(bigint) to authenticated;
revoke execute on function public.prochain_matricule(text) from public, anon, authenticated;

-- Interdit les doublons (les élèves sans matricule ne sont pas concernés)
create unique index if not exists eleves_matricule_unique
  on public.eleves (matricule) where matricule <> '';
