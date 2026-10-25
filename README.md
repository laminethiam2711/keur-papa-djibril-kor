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

## Application Android (APK)
Le même code est emballé en application Android avec **Capacitor** (`capacitor.config.ts`, dossier `android/`).
À chaque modification du site, GitHub fabrique un nouvel APK (`.github/workflows/android.yml`).

Lien de téléchargement (toujours la dernière version) :
https://github.com/laminethiam2711/keur-papa-djibril-kor/releases/latest/download/keur-papa-djibril-kor.apk

Fabriquer l'APK soi-même (Android Studio installé) :
```bash
npx ng build --configuration production --base-href /
npx cap sync android
npx cap open android
```

## Plateforme de notes et bulletins
Dans l'espace admin, onglet **Notes et bulletins** :
1. **Classes** : nom, niveau, maître, année, moyenne sur 10 ou 20, modèle du relevé de français, relevés arabe / anglais.
2. **Élèves** : ajout un par un ou collage d'une liste ; notes maximales par matière.
3. **Saisie des notes** : grille par classe, relevé, trimestre (et contrôle / composition) ; total, moyenne et rang calculés en direct.
4. **Bulletins** : moyennes, rangs, statistiques de la classe, décision du conseil, impression A4 (ou PDF) par élève ou pour toute la classe.

Règles de calcul (`src/app/notes/calcul.ts`) :
- moyenne = total des notes ÷ total des maximums × barème (10 ou 20 ; l'anglais toujours sur 10) ;
- seule la **composition** compte (le contrôle est affiché pour information) ;
- les matières non notées ne sont pas comptées ;
- rang : les ex aequo ont le même rang ; moyenne annuelle = moyenne des trimestres.

Les matières de chaque relevé sont dans `src/app/notes/modeles.ts`.
Mise en place : exécuter `supabase/notes.sql` puis `supabase/matricules.sql` dans le SQL Editor de Supabase (une seule fois).

Matricules : attribués automatiquement par la base (`KPDK-2026-0001`…), compteur par année, doublons interdits.

## Paiements de la scolarité
Onglet **Paiements** de l'espace admin (installer d'abord `supabase/paiements.sql`) :
- **Tarifs** par niveau et par année : inscription, tenue/fournitures, mensualité, cantine, transport (F CFA) ;
- mensualités d'**octobre à juin** (9 mois) ; cantine et transport seulement pour les élèves inscrits à l'option ;
- **encaissement** (espèces, Wave, Orange Money) avec **reçu numéroté automatiquement** par la base (`R2026-00001`…),
  imprimé en deux exemplaires (parent / école) ;
- **suivi** : encaissé du jour / du mois / de l'année, retards à ce jour, relance du parent par WhatsApp.

Règles dans `src/app/paiements/regles.ts`.

## Espace parents
Page publique `/parents` (installer d'abord `supabase/parents.sql`) :
- chaque élève reçoit un **code parent** secret de 8 caractères (visible par l'admin dans la liste des élèves) ;
- le parent se connecte avec **matricule + code** : la fonction `espace_parent` de la base vérifie et renvoie
  seulement les données de son enfant (notes, observations, décision, paiements) ; les camarades restent anonymes ;
- 8 essais ratés en 15 minutes bloquent le matricule pendant 15 minutes ;
- l'admin peut envoyer l'accès par WhatsApp, imprimer les fiches « code parent » d'une classe, ou créer un nouveau code.

## Structure
```
src/app/
├── data/ecole.ts         → contenu fixe de l'école
├── supabase.config.ts    → connexion à la base de données
├── services/             → accès à la base (SupabaseService)
├── layout/               → en-tête, pied de page, bouton WhatsApp
├── pages/                → les 9 pages du site
├── admin/                → espace administrateur (connexion, tableau de bord, gestion)
└── notes/                → plateforme de notes : modèles, calculs, saisie, bulletins
supabase/schema.sql       → tables, sécurité et stockage
supabase/notes.sql        → tables de la plateforme de notes
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

## Absences et retards

- Exécuter `supabase/absences.sql` une fois, puis ré-exécuter `supabase/parents.sql`.
- Administration → Notes et bulletins → bouton **Appel** de la classe : Présent / Absent / Retard, moment, justifié, motif (enregistré à chaque clic).
- Les totaux par trimestre (en demi-journées) apparaissent sur les bulletins (écran et papier), dans l'espace parents et dans la sauvegarde Excel (feuille « Absences »).
