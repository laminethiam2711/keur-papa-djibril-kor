-- =====================================================================
--  MISE À JOUR — Absences, calendrier, passage de fin d'année,
--  comptes enseignants et espace parents.
--  À exécuter dans Supabase : SQL Editor → New query → coller TOUT → Run.
--  Prérequis : schema.sql, notes.sql et matricules.sql déjà exécutés.
--  On peut l'exécuter plusieurs fois sans problème.
-- =====================================================================


-- ##################### absences.sql #####################
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
drop policy if exists "admin gere absences" on public.absences;
create policy "admin gere absences" on public.absences
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Si les comptes enseignants sont installés : l'enseignant fait l'appel de ses classes
do $$ begin
  if to_regprocedure('public.est_enseignant(bigint)') is not null then
    execute 'drop policy if exists "enseignant fait l''appel" on public.absences';
    execute 'create policy "enseignant fait l''appel" on public.absences for all to authenticated
             using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id))';
  end if;
end $$;

-- ##################### calendrier.sql #####################
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

-- ##################### passage.sql #####################
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

-- ##################### enseignants.sql #####################
-- =====================================================================
--  Comptes enseignants — Keur Papa Djibril Kor
--  À exécuter UNE FOIS dans Supabase : SQL Editor → New query → coller → Run.
--  (À exécuter APRÈS notes.sql ; absences.sql est facultatif)
--
--  Un enseignant se connecte avec son e-mail et son mot de passe.
--  Il ne voit QUE ses classes : élèves, saisie des notes, appel, bulletins.
--  Il n'a accès ni aux paiements, ni aux messages, ni aux autres classes.
-- =====================================================================

create table if not exists public.enseignants (
  id bigint generated always as identity primary key,
  email text not null check (email = lower(trim(email)) and email like '%@%'),
  nom text not null default '',
  classe_id bigint not null references public.classes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (email, classe_id)
);
alter table public.enseignants enable row level security;

-- E-mail de la personne connectée
create or replace function public.email_connecte()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

-- Vrai si la personne connectée enseigne dans cette classe
create or replace function public.est_enseignant(p_classe bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from enseignants where email = email_connecte() and classe_id = p_classe and email_connecte() <> '')
$$;

drop policy if exists "admin gere enseignants" on public.enseignants;
create policy "admin gere enseignants" on public.enseignants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "enseignant voit ses classes" on public.enseignants;
create policy "enseignant voit ses classes" on public.enseignants
  for select to authenticated using (email = public.email_connecte());

-- Accès de l'enseignant à SES classes
drop policy if exists "enseignant lit sa classe" on public.classes;
create policy "enseignant lit sa classe" on public.classes
  for select to authenticated using (public.est_enseignant(id));

drop policy if exists "enseignant lit ses eleves" on public.eleves;
create policy "enseignant lit ses eleves" on public.eleves
  for select to authenticated using (public.est_enseignant(classe_id));

drop policy if exists "enseignant gere les notes" on public.notes;
create policy "enseignant gere les notes" on public.notes
  for all to authenticated using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));

drop policy if exists "enseignant gere les appreciations" on public.appreciations;
create policy "enseignant gere les appreciations" on public.appreciations
  for all to authenticated using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id));

do $$ begin
  if to_regclass('public.absences') is not null then
    execute 'drop policy if exists "enseignant fait l''appel" on public.absences';
    execute 'create policy "enseignant fait l''appel" on public.absences for all to authenticated
             using (public.est_enseignant(classe_id)) with check (public.est_enseignant(classe_id))';
  end if;
end $$;

-- ##################### parents.sql #####################
-- =====================================================================
--  Espace parents — Keur Papa Djibril Kor
--  À exécuter UNE FOIS dans Supabase : SQL Editor → New query → coller → Run.
--  (À exécuter APRÈS notes.sql ; paiements.sql est facultatif)
--
--  Principe : chaque élève a un code parent secret (8 caractères).
--  Le parent saisit le matricule + le code ; la base vérifie et renvoie
--  UNIQUEMENT les informations de son enfant. Aucun accès direct aux tables.
-- =====================================================================

-- ---------- Code parent de chaque élève ----------
alter table public.eleves add column if not exists code_parent text;
update public.eleves set code_parent = upper(substr(md5(gen_random_uuid()::text), 1, 8)) where code_parent is null or code_parent = '';
alter table public.eleves alter column code_parent set default upper(substr(md5(gen_random_uuid()::text), 1, 8));

-- ---------- Journal des connexions (protection contre les essais au hasard) ----------
create table if not exists public.parent_tentatives (
  id bigint generated always as identity primary key,
  matricule text not null,
  reussi boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists parent_tentatives_idx on public.parent_tentatives (matricule, created_at);
alter table public.parent_tentatives enable row level security;
-- (aucune règle : personne ne lit ce journal depuis le site)

-- ---------- Connexion du parent : renvoie les données de SON enfant ----------
create or replace function public.espace_parent(p_matricule text, p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mat text := upper(trim(coalesce(p_matricule, '')));
  v_code text := upper(trim(coalesce(p_code, '')));
  v_eleve eleves%rowtype;
  v_classe classes%rowtype;
  v_echecs int;
  v_tarifs json := '[]'::json;
  v_paiements json := '[]'::json;
  v_absences json := '[]'::json;
begin
  if v_mat = '' or v_code = '' then
    raise exception 'Saisissez le matricule et le code.';
  end if;

  -- Après 8 essais ratés en 15 minutes, le matricule est bloqué 15 minutes
  select count(*) into v_echecs from parent_tentatives
    where matricule = v_mat and not reussi and created_at > now() - interval '15 minutes';
  if v_echecs >= 8 then
    raise exception 'Trop d''essais. Réessayez dans 15 minutes ou contactez l''école.';
  end if;

  select * into v_eleve from eleves where upper(matricule) = v_mat and code_parent = v_code order by id desc limit 1;
  if not found then
    insert into parent_tentatives (matricule, reussi) values (v_mat, false);
    raise exception 'Matricule ou code incorrect.';
  end if;
  insert into parent_tentatives (matricule, reussi) values (v_mat, true);

  select * into v_classe from classes where id = v_eleve.classe_id;

  -- Paiements (si le module est installé)
  if to_regclass('public.paiements') is not null then
    select coalesce(json_agg(t), '[]'::json) into v_tarifs
      from (select annee, niveau, type, montant from tarifs where annee = v_classe.annee and niveau = v_classe.niveau) t;
    select coalesce(json_agg(p order by p.date_paiement desc), '[]'::json) into v_paiements
      from (select eleve_id, classe_id, annee, type, mois, montant, moyen, reference, date_paiement, numero_recu
            from paiements where eleve_id = v_eleve.id and annee = v_classe.annee) p;
  end if;

  -- Absences et retards (si le module est installé)
  if to_regclass('public.absences') is not null then
    select coalesce(json_agg(a order by a.date desc), '[]'::json) into v_absences
      from (select date, type, moment, justifie, motif from absences where eleve_id = v_eleve.id) a;
  end if;

  return json_build_object(
    'eleve', json_build_object('id', v_eleve.id, 'classe_id', v_eleve.classe_id, 'prenom', v_eleve.prenom, 'nom', v_eleve.nom,
      'matricule', v_eleve.matricule, 'date_naissance', v_eleve.date_naissance, 'lieu_naissance', v_eleve.lieu_naissance,
      'telephone', '', 'cantine', coalesce(to_jsonb(v_eleve) ->> 'cantine', 'false')::boolean,
      'transport', coalesce(to_jsonb(v_eleve) ->> 'transport', 'false')::boolean),
    'classe', json_build_object('id', v_classe.id, 'nom', v_classe.nom, 'niveau', v_classe.niveau, 'etablissement', v_classe.etablissement,
      'maitre', v_classe.maitre, 'annee', v_classe.annee, 'bareme', v_classe.bareme, 'modele_fr', v_classe.modele_fr,
      'avec_arabe', v_classe.avec_arabe, 'avec_anglais', v_classe.avec_anglais, 'maximums', v_classe.maximums),
    -- Camarades : seulement des numéros (pour calculer le rang), sans nom
    'camarades', (select coalesce(json_agg(id), '[]'::json) from eleves where classe_id = v_classe.id),
    'notes', (select coalesce(json_agg(json_build_object('eleve_id', eleve_id, 'bulletin', bulletin, 'periode', periode,
                'evaluation', evaluation, 'matiere', matiere, 'valeur', valeur)), '[]'::json)
              from notes where classe_id = v_classe.id),
    'appreciations', (select coalesce(json_agg(json_build_object('eleve_id', eleve_id, 'classe_id', classe_id, 'bulletin', bulletin,
                'periode', periode, 'observation', observation, 'decision', decision)), '[]'::json)
              from appreciations where eleve_id = v_eleve.id),
    'tarifs', v_tarifs,
    'paiements', v_paiements,
    'absences', v_absences
  );
end;
$$;
revoke execute on function public.espace_parent(text, text) from public;
grant execute on function public.espace_parent(text, text) to anon, authenticated;

-- ---------- Nouveau code (si un code a été perdu ou divulgué) — réservé aux administrateurs ----------
create or replace function public.nouveau_code_parent(p_eleve bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_code text := upper(substr(md5(gen_random_uuid()::text), 1, 8));
begin
  if not is_admin() then raise exception 'Réservé aux administrateurs'; end if;
  -- Même code pour toutes les années de l'élève (même matricule)
  update eleves set code_parent = v_code
    where id = p_eleve
       or (matricule <> '' and matricule = (select matricule from eleves where id = p_eleve));
  return v_code;
end;
$$;
revoke execute on function public.nouveau_code_parent(bigint) from public, anon;
grant execute on function public.nouveau_code_parent(bigint) to authenticated;
