import { Component } from '@angular/core';

// Pour ajouter une vraie photo : placer le fichier dans public/galerie/
// puis renseigner son nom dans le champ "image" (ex. image: 'galerie/rentree.jpg').
interface Photo { titre: string; categorie: string; image?: string; }

@Component({
  selector: 'app-galerie',
  template: `
    <section class="bandeau-page">
      <div class="conteneur">
        <span class="arabe">معرض الصور</span>
        <h1>Galerie</h1>
        <p>Les moments forts de l'année en images.</p>
      </div>
    </section>

    <section class="section">
      <div class="conteneur">
        <div class="filtres">
          @for (c of categories; track c) {
            <button [class.actif]="filtre === c" (click)="filtre = c">{{ c }}</button>
          }
        </div>
        <div class="grille grille-3">
          @for (p of photosFiltrees(); track p.titre) {
            <figure class="tuile">
              @if (p.image) {
                <img [src]="p.image" [alt]="p.titre" loading="lazy">
              } @else {
                <div class="vide motif"><span>Photo à venir</span></div>
              }
              <figcaption><strong>{{ p.titre }}</strong><span>{{ p.categorie }}</span></figcaption>
            </figure>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .filtres { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 32px; }
    .filtres button { font: inherit; border: 1px solid var(--bordure); background: #fff; padding: 8px 18px;
      border-radius: 999px; cursor: pointer; color: var(--texte); }
    .filtres button.actif { background: var(--bleu-nuit); color: #fff; border-color: var(--bleu-nuit); }
    .tuile { margin: 0; background: #fff; border-radius: var(--rayon); overflow: hidden; border: 1px solid var(--bordure); }
    .tuile img, .vide { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
    .vide { background-color: var(--sable); display: grid; place-items: center; color: var(--texte-doux); font-size: .9rem; }
    figcaption { padding: 14px 18px; display: flex; justify-content: space-between; gap: 8px; }
    figcaption span { color: var(--vert); font-size: .85rem; }
  `,
})
export class GalerieComponent {
  categories = ['Tout', 'Rentrée', 'Coran', 'Fêtes', 'Sorties'];
  filtre = 'Tout';
  photos: Photo[] = [
    { titre: 'Rentrée 2026-2027', categorie: 'Rentrée' },
    { titre: 'Concours de récitation', categorie: 'Coran' },
    { titre: 'Gamou de Tivaouane', categorie: 'Fêtes' },
    { titre: 'Kermesse de fin d’année', categorie: 'Fêtes' },
    { titre: 'Sortie pédagogique', categorie: 'Sorties' },
    { titre: 'Cours d’arabe', categorie: 'Coran' },
  ];
  photosFiltrees() {
    return this.filtre === 'Tout' ? this.photos : this.photos.filter((p) => p.categorie === this.filtre);
  }
}
