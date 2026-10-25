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
