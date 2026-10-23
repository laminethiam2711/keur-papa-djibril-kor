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
├── data/ecole.ts         → contenu de l'école
├── layout/               → en-tête, pied de page, bouton WhatsApp
└── pages/                → les 9 pages du site
```

## Prochaine étape
API **Laravel** (espace admin pour les actualités, la galerie et les inscriptions).
