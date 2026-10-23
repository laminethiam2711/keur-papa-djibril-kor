import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Actualite, SupabaseService } from '../services/supabase.service';

const VIDE = (): Actualite => ({
  titre: '', resume: '', categorie: 'Annonce', date_publication: new Date().toISOString().slice(0, 10),
});

@Component({
  selector: 'app-actualites-admin',
  imports: [FormsModule, DatePipe],
  template: `
    <h1>Actualités</h1>
    <div class="grille deux">
      <form class="carte" (ngSubmit)="enregistrer()" #f="ngForm">
        <h2>{{ form.id ? 'Modifier l’actualité' : 'Nouvelle actualité' }}</h2>
        <div class="champ"><label for="titre">Titre *</label>
          <input id="titre" name="titre" [(ngModel)]="form.titre" required maxlength="150"></div>
        <div class="champ"><label for="categorie">Catégorie</label>
          <select id="categorie" name="categorie" [(ngModel)]="form.categorie">
            @for (c of categories; track c) { <option>{{ c }}</option> }
          </select></div>
        <div class="champ"><label for="date">Date</label>
          <input id="date" name="date" type="date" [(ngModel)]="form.date_publication" required></div>
        <div class="champ"><label for="resume">Texte *</label>
          <textarea id="resume" name="resume" rows="6" [(ngModel)]="form.resume" required maxlength="2000"></textarea></div>
        @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
        <div class="actions">
          <button class="btn btn-vert" [disabled]="f.invalid || envoi()">{{ form.id ? 'Enregistrer' : 'Publier' }}</button>
          @if (form.id) { <button type="button" class="btn btn-contour-bleu" (click)="form = vide()">Annuler</button> }
        </div>
      </form>

      <div class="liste">
        @for (a of actualites(); track a.id) {
          <article class="carte ligne">
            <div>
              <span class="pastille">{{ a.categorie }}</span>
              <h3>{{ a.titre }}</h3>
              <small>{{ a.date_publication | date: 'd MMMM y' }}</small>
            </div>
            <div class="boutons">
              <button class="petit" (click)="modifier(a)">Modifier</button>
              <button class="petit danger" (click)="supprimer(a)">Supprimer</button>
            </div>
          </article>
        } @empty { <p class="vide">Aucune actualité.</p> }
      </div>
    </div>
  `,
  styles: `
    h1 { font-size: 1.6rem; margin-bottom: 24px; }
    h2 { font-size: 1.15rem; }
    .deux { grid-template-columns: minmax(280px, 400px) 1fr; align-items: start; }
    .liste { display: flex; flex-direction: column; gap: 12px; }
    .ligne { display: flex; justify-content: space-between; gap: 12px; padding: 18px; align-items: center; }
    .ligne h3 { margin: 8px 0 2px; font-size: 1.05rem; }
    .ligne small { color: var(--texte-doux); }
    .boutons { display: flex; gap: 8px; flex-shrink: 0; }
    .actions { display: flex; gap: 8px; }
    .petit { font: inherit; font-size: .85rem; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--bordure);
      background: #fff; cursor: pointer; }
    .danger { color: #a12a1f; border-color: #f0c8c3; }
    .erreur { color: #a12a1f; }
    .vide { color: var(--texte-doux); }
    button[disabled] { opacity: .5; }
    @media (max-width: 820px) { .deux { grid-template-columns: 1fr; } .ligne { flex-direction: column; align-items: flex-start; } }
  `,
})
export class ActualitesAdminComponent implements OnInit {
  private sb = inject(SupabaseService);
  categories = ['Annonce', 'Rentrée', 'Inscriptions', 'Réunion', 'Examens', 'Vie scolaire', 'Résultats'];
  actualites = signal<Actualite[]>([]);
  form: Actualite = VIDE();
  vide = VIDE;
  envoi = signal(false);
  erreur = signal('');

  ngOnInit() { this.charger(); }

  async charger() {
    this.actualites.set(await this.sb.listerActualites());
  }

  modifier(a: Actualite) {
    this.form = { ...a };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async enregistrer() {
    this.envoi.set(true);
    this.erreur.set('');
    try {
      await this.sb.enregistrerActualite({
        id: this.form.id, titre: this.form.titre.trim(), resume: this.form.resume.trim(),
        categorie: this.form.categorie, date_publication: this.form.date_publication,
      });
      this.form = VIDE();
      await this.charger();
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.envoi.set(false);
    }
  }

  async supprimer(a: Actualite) {
    if (!confirm(`Supprimer « ${a.titre} » ?`)) return;
    await this.sb.supprimerActualite(a.id!);
    await this.charger();
  }
}
