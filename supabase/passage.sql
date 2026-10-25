-- =====================================================================
--  Passage de fin d'année — Keur Papa Djibril Kor
--  À exécuter UNE FOIS dans Supabase : SQL Editor → New query → coller → Run.
--  (À exécuter APRÈS notes.sql et matricules.sql)
--
--  Principe : chaque année scolaire, l'élève a une ligne dans sa nouvelle
--  classe. Il GARDE son matricule et son code parent ; ses notes, absences
--  et paiements des années précédentes restent dans l'historique.
-- =====================================================================

-- (colonnes utilisées par les autres modules, au cas où ils ne sont pas encore installés)
alter table public.eleves add column if not exists cantine boolean not null default false;
alter table public.eleves add column if not exists transport boolean not null default false;
alter table public.eleves add column if not exists code_parent text;

-- 1) Un même matricule peut exister dans plusieurs classes (une par année)
drop index if exists public.eleves_matricule_unique;
create unique index if not exists eleves_matricule_classe_unique
  on public.eleves (matricule, classe_id) where matricule <> '';

-- 2) La numérotation automatique laisse le matricule lors d'une réinscription
create or replace function public.eleves_matricule_auto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('kpdk.reinscription', true), '') = 'on' and coalesce(new.matricule, '') <> '' then
    return new;
  end if;
  new.matricule := prochain_matricule((select annee from classes where id = new.classe_id));
  return new;
end;
$$;

-- Protection : un nouveau matricule ne doit jamais reprendre celui d'un autre élève
create or replace function public.eleves_matricule_controle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.matricule, '') <> '' and exists (
       select 1 from eleves e
       where e.matricule = new.matricule and e.id <> new.id
         and (upper(e.nom) <> upper(new.nom) or upper(e.prenom) <> upper(new.prenom))) then
    raise exception 'Le matricule % appartient déjà à un autre élève.', new.matricule;
  end if;
  return new;
end;
$$;
drop trigger if exists eleves_matricule_controle on public.eleves;
create trigger eleves_matricule_controle
  before insert or update of matricule, nom, prenom on public.eleves
  for each row execute function public.eleves_matricule_controle();

-- 3) Réinscrire des élèves dans une classe de l'année suivante (réservé aux administrateurs)
--    Renvoie le nombre d'élèves réinscrits (ceux déjà inscrits cette année-là sont ignorés).
create or replace function public.reinscrire(p_eleves bigint[], p_classe bigint)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_annee text;
  v_e eleves%rowtype;
  v_n int := 0;
begin
  if not is_admin() then raise exception 'Réservé aux administrateurs'; end if;
  select annee into v_annee from classes where id = p_classe;
  if v_annee is null then raise exception 'Classe introuvable'; end if;
  perform set_config('kpdk.reinscription', 'on', true);

  for v_e in select * from eleves where id = any(p_eleves) loop
    -- déjà inscrit dans une classe de cette année ?
    if exists (select 1 from eleves e join classes c on c.id = e.classe_id
               where c.annee = v_annee and e.matricule = v_e.matricule and v_e.matricule <> '') then
      continue;
    end if;
    insert into eleves (classe_id, prenom, nom, date_naissance, lieu_naissance, matricule, telephone, code_parent, cantine, transport)
    values (p_classe, v_e.prenom, v_e.nom, v_e.date_naissance, v_e.lieu_naissance, v_e.matricule, v_e.telephone,
            v_e.code_parent, coalesce(v_e.cantine, false), coalesce(v_e.transport, false));
    v_n := v_n + 1;
  end loop;

  perform set_config('kpdk.reinscription', 'off', true);
  return v_n;
end;
$$;
revoke execute on function public.reinscrire(bigint[], bigint) from public, anon;
grant execute on function public.reinscrire(bigint[], bigint) to authenticated;
