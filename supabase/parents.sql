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
  update eleves set code_parent = v_code where id = p_eleve;
  return v_code;
end;
$$;
revoke execute on function public.nouveau_code_parent(bigint) from public, anon;
grant execute on function public.nouveau_code_parent(bigint) to authenticated;
