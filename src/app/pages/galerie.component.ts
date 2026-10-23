import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Photo, SupabaseService } from '../services/supabase.service';

// Les photos sont ajoutées par l'administrateur (espace admin → Photos).
// Tant qu'il n'y en a aucune, des emplacements « Photo à venir » sont affichés.
const EXEMPLES: Photo[] = [
  { titre: 'Rentrée 2026-2027', categorie: 'Rentrée', chemin: '' },
  { titre: 'Concours de récitation', categorie: 'Coran', chemin: '' },
  { titre: 'Sortie pédagogique', categorie: 'Sorties', chemin: '' },
  { titre: 'Cours d’arabe', categorie: 'Coran', chemin: '' },
  { titre: 'Activités en classe', categorie: 'Vie scolaire', chemin: '' },
  { titre: 'Sport et jeux', categorie: 'Vie scolaire', chemin: '' },
];

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
          @for (c of categories(); track c) {
            <button [class.actif]="filtre() === c" (click)="filtre.set(c)">{{ c }}</button>
          }
        </div>
        <div class="grille grille-3">
          @for (p of photosFiltrees(); track p.titre + p.chemin) {
            <figure class="tuile">
              @if (p.url) {
                <button class="ouvrir" (click)="agrandie.set(p)" [attr.aria-label]="'Agrandir ' + p.titre">
                  <img [src]="p.url" [alt]="p.titre" loading="lazy">
                </button>
              } @else {
                <div class="vide motif"><span>Photo à venir</span></div>
              }
              <figcaption><strong>{{ p.titre }}</strong><span>{{ p.categorie }}</span></figcaption>
            </figure>
          }
        </div>
      </div>
    </section>

    @if (agrandie(); as p) {
      <div class="visionneuse" (click)="agrandie.set(null)" role="dialog" aria-modal="true">
        <img [src]="p.url" [alt]="p.titre">
        <p>{{ p.titre }}</p>
      </div>
    }
  `,
  styles: `
    .filtres { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 32px; }
    .filtres button { font: inherit; border: 1px solid var(--bordure); background: #fff; padding: 8px 18px;
      border-radius: 999px; cursor: pointer; color: var(--texte); }
    .filtres button.actif { background: var(--bleu-nuit); color: #fff; border-color: var(--bleu-nuit); }
    .tuile { margin: 0; background: #fff; border-radius: var(--rayon); overflow: hidden; border: 1px solid var(--bordure); }
    .ouvrir { padding: 0; border: 0; background: none; cursor: zoom-in; display: block; width: 100%; }
    .tuile img, .vide { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
    .vide { background-color: var(--sable); display: grid; place-items: center; color: var(--texte-doux); font-size: .9rem; }
    figcaption { padding: 14px 18px; display: flex; justify-content: space-between; gap: 8px; }
    figcaption span { color: var(--vert); font-size: .85rem; }
    .visionneuse { position: fixed; inset: 0; background: rgba(10, 18, 36, .92); z-index: 100; display: flex;
      flex-direction: column; align-items: center; justify-content: center; padding: 16px; cursor: zoom-out; }
    .visionneuse img { max-width: 100%; max-height: 82vh; border-radius: 10px; }
    .visionneuse p { color: #fff; margin-top: 12px; }
  `,
})
export class GalerieComponent implements OnInit {
  private sb = inject(SupabaseService);
  photos = signal<Photo[]>(EXEMPLES);
  filtre = signal('Tout');
  agrandie = signal<Photo | null>(null);

  categories = computed(() => ['Tout', ...new Set(this.photos().map((p) => p.categorie))]);
  photosFiltrees = computed(() =>
    this.filtre() === 'Tout' ? this.photos() : this.photos().filter((p) => p.categorie === this.filtre()),
  );

  async ngOnInit() {
    const enLigne = await this.sb.listerPhotos();
    if (enLigne.length) this.photos.set(enLigne);
  }
}
