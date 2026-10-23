-- =====================================================================
--  Base de données de l'école Keur Papa Djibril Kor (Supabase / PostgreSQL)
--  À exécuter UNE FOIS dans Supabase : menu « SQL Editor » → New query →
--  coller tout ce fichier → Run.
-- =====================================================================

-- ---------- 1. Administrateurs ----------
-- Seuls les comptes listés ici peuvent gérer le site.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Renvoie vrai si l'utilisateur connecté est administrateur
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- 2. Tables ----------
create table if not exists public.actualites (
  id bigint generated always as identity primary key,
  titre text not null check (char_length(titre) between 1 and 150),
  resume text not null check (char_length(resume) between 1 and 2000),
  categorie text not null default 'Annonce',
  date_publication date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id bigint generated always as identity primary key,
  titre text not null check (char_length(titre) between 1 and 150),
  categorie text not null default 'Vie scolaire',
  chemin text not null,            -- chemin du fichier dans le stockage « galerie »
  created_at timestamptz not null default now()
);

create table if not exists public.inscriptions (
  id bigint generated always as identity primary key,
  enfant text not null check (char_length(enfant) between 2 and 120),
  date_naissance date not null,
  niveau text not null check (char_length(niveau) <= 40),
  etablissement text not null check (char_length(etablissement) <= 80),
  parent text not null check (char_length(parent) between 2 and 120),
  telephone text not null check (char_length(telephone) between 6 and 30),
  statut text not null default 'Nouvelle' check (statut in ('Nouvelle', 'Rappelée', 'Inscrite', 'Annulée')),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  nom text not null check (char_length(nom) between 2 and 120),
  telephone text check (telephone is null or char_length(telephone) <= 30),
  message text not null check (char_length(message) between 2 and 3000),
  lu boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- 3. Sécurité (Row Level Security) ----------
alter table public.admins       enable row level security;
alter table public.actualites   enable row level security;
alter table public.photos       enable row level security;
alter table public.inscriptions enable row level security;
alter table public.messages     enable row level security;

-- Admins : chacun peut seulement vérifier sa propre ligne
create policy "admin lit sa ligne" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- Actualités et photos : lecture publique, écriture réservée aux admins
create policy "lecture publique actualites" on public.actualites
  for select to anon, authenticated using (true);
create policy "admin gere actualites" on public.actualites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "lecture publique photos" on public.photos
  for select to anon, authenticated using (true);
create policy "admin gere photos" on public.photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Inscriptions et messages : tout le monde peut ENVOYER,
-- seuls les admins peuvent LIRE, modifier et supprimer
create policy "envoi public inscriptions" on public.inscriptions
  for insert to anon, authenticated with check (statut = 'Nouvelle');
create policy "admin gere inscriptions" on public.inscriptions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "envoi public messages" on public.messages
  for insert to anon, authenticated with check (lu = false);
create policy "admin gere messages" on public.messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- 4. Stockage des photos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('galerie', 'galerie', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "admin envoie photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'galerie' and public.is_admin());
create policy "admin supprime photos" on storage.objects
  for delete to authenticated using (bucket_id = 'galerie' and public.is_admin());

-- ---------- 5. Actualités de départ (facultatif) ----------
insert into public.actualites (titre, resume, categorie, date_publication) values
  ('Rentrée scolaire 2026-2027', 'Les cours ont repris dans nos deux établissements. Bienvenue aux nouveaux élèves et à leurs familles !', 'Rentrée', '2026-10-05'),
  ('Inscriptions ouvertes', 'Les inscriptions pour l''année 2026-2027 sont ouvertes du lundi au samedi. Pré-inscription possible en ligne.', 'Inscriptions', '2026-09-15');

-- =====================================================================
--  APRÈS avoir créé votre compte administrateur
--  (Authentication → Users → Add user), exécutez cette ligne
--  en remplaçant l'adresse e-mail :
--
--  insert into public.admins (user_id)
--  select id from auth.users where email = 'votre-email@exemple.com';
-- =====================================================================
