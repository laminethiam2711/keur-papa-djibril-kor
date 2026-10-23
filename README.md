# École privée franco-arabe Keur Papa Djibril Kor

Site officiel de l'école (web, mobile et ordinateur) — application **Angular** installable (**PWA**).

Site en ligne : https://laminethiam2711.github.io/keur-papa-djibril-kor/

## Pages
Accueil · Présentation · Établissements · Niveaux · Vie scolaire · Galerie · Inscriptions · Actualités · Contact

## Modifier le contenu
Toutes les informations (téléphones, adresses, cycles, actualités) sont dans un seul fichier :
`src/app/data/ecole.ts`

Pour ajouter des photos à la galerie : les placer dans `public/galerie/` et renseigner le champ `image`
dans `src/app/pages/galerie.component.ts`.

## Lancer en local
```bash
npm install
npx ng serve
```
Puis ouvrir http://localhost:4200

## Mise en ligne
Chaque `push` sur la branche `main` déclenche le déploiement automatique sur GitHub Pages
(`.github/workflows/deploy.yml`).

## Structure
```
src/app/
├── data/ecole.ts         → contenu fixe de l'école
├── supabase.config.ts    → connexion à la base de données
├── services/             → accès à la base (SupabaseService)
├── layout/               → en-tête, pied de page, bouton WhatsApp
├── pages/                → les 9 pages du site
└── admin/                → espace administrateur (connexion, tableau de bord, gestion)
supabase/schema.sql       → tables, sécurité et stockage
```

## Espace administrateur (Supabase)
Adresse : `/admin` (ex. https://laminethiam2711.github.io/keur-papa-djibril-kor/admin)

L'administrateur gère : actualités, photos de la galerie, pré-inscriptions, messages de contact.
Les données sont stockées dans **Supabase** (base PostgreSQL + connexion + stockage des photos, offre gratuite).

### Mise en place (une seule fois)
1. Créer un compte sur https://supabase.com puis un nouveau projet (région : Europe).
2. **SQL Editor** → New query → coller le contenu de `supabase/schema.sql` → **Run**.
3. **Authentication → Users → Add user** : créer le compte de l'administrateur (e-mail + mot de passe).
4. Toujours dans le SQL Editor, exécuter (avec le bon e-mail) :
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'votre-email@exemple.com';
   ```
5. **Authentication → Sign In / Providers** : désactiver « Allow new users to sign up »
   (personne ne pourra se créer un compte lui-même).
6. **Project Settings → API** : copier la *Project URL* et la clé *anon / publishable*
   dans `src/app/supabase.config.ts`, puis pousser sur GitHub.

### Sécurité
- Les règles RLS (`schema.sql`) empêchent toute lecture des inscriptions et messages par le public.
- Le public peut seulement *envoyer* une inscription ou un message.
- Seuls les comptes présents dans la table `admins` peuvent modifier le contenu.
- Tant que `supabase.config.ts` est vide, le site fonctionne en mode simple (contenu fixe + WhatsApp).
