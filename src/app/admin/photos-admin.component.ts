import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Photo, SupabaseService } from '../services/supabase.service';

const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo

@Component({
  selector: 'app-photos-admin',
  imports: [FormsModule],
  template: `
    <h1>Photos de la galerie</h1>
    <form class="carte envoi" (ngSubmit)="envoyer()" #f="ngForm">
      <div class="champ fichier"><label for="fichier">Photo (JPG, PNG ou WEBP, 5 Mo max) *</label>
        <input id="fichier" type="file" accept="image/jpeg,image/png,image/webp" (change)="choisir($event)"></div>
      <div class="champ"><label for="titre">Titre *</label>
        <input id="titre" name="titre" [(ngModel)]="titre" required maxlength="150"></div>
      <div class="champ"><label for="categorie">Catégorie</label>
        <select id="categorie" name="categorie" [(ngModel)]="categorie">
          @for (c of categories; track c) { <option>{{ c }}</option> }
        </select></div>
      <button class="btn btn-vert" [disabled]="f.invalid || !fichier || envoi()">{{ envoi() ? 'Envoi…' : 'Ajouter la photo' }}</button>
      @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
    </form>

    <div class="grille grille-4">
      @for (p of photos(); track p.id) {
        <figure class="carte tuile">
          <img [src]="p.url" [alt]="p.titre" loading="lazy">
          <figcaption>
            <span><strong>{{ p.titre }}</strong><br><small>{{ p.categorie }}</small></span>
            <button class="petit danger" (click)="supprimer(p)">Supprimer</button>
          </figcaption>
        </figure>
      } @empty { <p class="vide">Aucune photo pour le moment.</p> }
    </div>
  `,
  styles: `
    h1 { font-size: 1.6rem; margin-bottom: 24px; }
    .envoi { display: grid; grid-template-columns: 1.4fr 1fr 1fr auto; gap: 16px; align-items: end; margin-bottom: 28px; }
    .envoi .champ { margin: 0; }
    .envoi .erreur { grid-column: 1 / -1; margin: 0; }
    .tuile { margin: 0; padding: 0; overflow: hidden; }
    .tuile img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
    figcaption { padding: 12px 14px; display: flex; justify-content: space-between; gap: 8px; align-items: center; }
    small { color: var(--vert); }
    .petit { font: inherit; font-size: .8rem; padding: 6px 10px; border-radius: 8px; border: 1px solid #f0c8c3;
      background: #fff; cursor: pointer; color: #a12a1f; flex-shrink: 0; }
    .erreur { color: #a12a1f; }
    .vide { color: var(--texte-doux); }
    button[disabled] { opacity: .5; }
    @media (max-width: 900px) { .envoi { grid-template-columns: 1fr; } }
  `,
})
export class PhotosAdminComponent implements OnInit {
  private sb = inject(SupabaseService);
  categories = ['Vie scolaire', 'Rentrée', 'Coran', 'Sorties', 'Sport', 'Établissements'];
  photos = signal<Photo[]>([]);
  fichier: File | null = null;
  titre = '';
  categorie = 'Vie scolaire';
  envoi = signal(false);
  erreur = signal('');

  ngOnInit() { this.charger(); }

  async charger() {
    this.photos.set(await this.sb.listerPhotos());
  }

  choisir(event: Event) {
    const f = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.erreur.set('');
    if (f && f.size > TAILLE_MAX) {
      this.erreur.set('Cette photo dépasse 5 Mo. Réduisez-la avant de l’envoyer.');
      this.fichier = null;
      return;
    }
    this.fichier = f;
    if (f && !this.titre) this.titre = f.name.replace(/\.[^.]+$/, '');
  }

  async envoyer() {
    if (!this.fichier) return;
    this.envoi.set(true);
    this.erreur.set('');
    try {
      await this.sb.ajouterPhoto(this.fichier, this.titre.trim(), this.categorie);
      this.fichier = null;
      this.titre = '';
      (document.getElementById('fichier') as HTMLInputElement).value = '';
      await this.charger();
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.envoi.set(false);
    }
  }

  async supprimer(p: Photo) {
    if (!confirm(`Supprimer la photo « ${p.titre} » ?`)) return;
    await this.sb.supprimerPhoto(p);
    await this.charger();
  }
}
