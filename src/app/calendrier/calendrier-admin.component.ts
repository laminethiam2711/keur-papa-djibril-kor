import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ETABLISSEMENTS } from '../data/ecole';
import { CalendrierService, Evenement, jourIso, parMois, TYPES_EVENEMENT, typeEvenement } from './calendrier.service';

const VIDE = (): Evenement => ({ titre: '', date_debut: jourIso(), date_fin: null, type: 'autre', etablissement: 'Tous', description: '', public: true });

/** Gestion du calendrier scolaire (administration). */
@Component({
  selector: 'app-calendrier-admin',
  imports: [FormsModule, DatePipe],
  template: `
    <h1>Calendrier scolaire</h1>
    <p class="intro">Rentrée, vacances, compositions, réunions… Les événements « visibles » apparaissent sur la page
      <a href="calendrier" target="_blank">Calendrier</a> du site et dans l'espace parents.</p>
    <div class="deux">
      <form class="carte" (ngSubmit)="enregistrer()" #f="ngForm">
        <h2>{{ form.id ? 'Modifier l’événement' : 'Nouvel événement' }}</h2>
        <div class="champ"><label for="titre">Titre *</label>
          <input id="titre" name="titre" [(ngModel)]="form.titre" required minlength="2" maxlength="150" placeholder="Ex. Vacances de Noël"></div>
        <div class="champ"><label for="type">Type</label>
          <select id="type" name="type" [(ngModel)]="form.type">
            @for (t of types; track t.code) { <option [value]="t.code">{{ t.icone }} {{ t.libelle }}</option> }
          </select></div>
        <div class="dates">
          <div class="champ"><label for="debut">Du *</label>
            <input id="debut" name="debut" type="date" [(ngModel)]="form.date_debut" required></div>
          <div class="champ"><label for="fin">Au (facultatif)</label>
            <input id="fin" name="fin" type="date" [(ngModel)]="form.date_fin" [min]="form.date_debut"></div>
        </div>
        <div class="champ"><label for="etab">Établissement</label>
          <select id="etab" name="etab" [(ngModel)]="form.etablissement">
            <option>Tous</option>
            @for (e of etablissements; track e.nom) { <option>{{ e.nom }}</option> }
          </select></div>
        <div class="champ"><label for="desc">Détails</label>
          <textarea id="desc" name="desc" rows="3" [(ngModel)]="form.description" maxlength="1000"></textarea></div>
        <label class="case"><input type="checkbox" name="public" [(ngModel)]="form.public"> Visible sur le site</label>
        @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
        <div class="actions">
          <button class="btn btn-vert" [disabled]="f.invalid || envoi()">{{ form.id ? 'Enregistrer' : 'Ajouter' }}</button>
          @if (form.id) { <button type="button" class="btn btn-contour-bleu" (click)="form = vide()">Annuler</button> }
        </div>
      </form>

      <div class="liste">
        @for (m of mois(); track m.mois) {
          <h3 class="mois">{{ m.mois + '-01' | date: 'MMMM y' }}</h3>
          @for (e of m.evenements; track e.id) {
            @let t = typeEvenement(e.type);
            <article class="carte ligne" [style.border-left-color]="t.couleur" [class.passe]="(e.date_fin || e.date_debut) < aujourdhui">
              <div>
                <span class="quand">{{ e.date_debut | date: 'EEE d MMM' }}@if (e.date_fin && e.date_fin !== e.date_debut) { → {{ e.date_fin | date: 'EEE d MMM' }} }</span>
                <h4>{{ t.icone }} {{ e.titre }}</h4>
                <small>{{ t.libelle }} · {{ e.etablissement }}{{ e.public ? '' : ' · masqué du site' }}</small>
              </div>
              <div class="boutons">
                <button class="petit" (click)="modifier(e)">Modifier</button>
                <button class="petit danger" (click)="supprimer(e)">Supprimer</button>
              </div>
            </article>
          }
        } @empty { <p class="vide">Aucun événement pour le moment.</p> }
      </div>
    </div>
  `,
  styles: `
    h1 { font-size: 1.6rem; margin-bottom: 6px; }
    .intro { color: var(--texte-doux); margin: 0 0 24px; }
    h2 { font-size: 1.15rem; }
    .deux { display: grid; gap: 24px; grid-template-columns: minmax(280px, 400px) 1fr; align-items: start; }
    .dates { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .dates input { width: 100%; min-width: 0; box-sizing: border-box; }
    .case { display: flex; gap: 8px; align-items: center; margin: 4px 0 14px; }
    .liste { display: flex; flex-direction: column; gap: 10px; }
    .mois { text-transform: capitalize; font-size: 1rem; color: var(--vert); margin: 12px 0 0; }
    .ligne { display: flex; justify-content: space-between; gap: 12px; padding: 14px 18px; align-items: center; border-left: 5px solid; }
    .ligne.passe { opacity: .55; }
    .ligne h4 { margin: 4px 0 2px; font-size: 1.02rem; }
    .quand { font-weight: 600; font-size: .85rem; color: var(--bleu-nuit); display: inline-block; }
    .quand::first-letter { text-transform: uppercase; }
    .ligne small { color: var(--texte-doux); }
    .boutons { display: flex; gap: 8px; flex-shrink: 0; }
    .actions { display: flex; gap: 8px; }
    .petit { font: inherit; font-size: .85rem; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--bordure); background: #fff; cursor: pointer; }
    .danger { color: #a12a1f; border-color: #f0c8c3; }
    .erreur { color: #a12a1f; }
    .vide { color: var(--texte-doux); }
    @media (max-width: 820px) { .deux { grid-template-columns: 1fr; } .ligne { flex-direction: column; align-items: flex-start; } }
  `,
})
export class CalendrierAdminComponent implements OnInit {
  private cs = inject(CalendrierService);
  types = TYPES_EVENEMENT;
  typeEvenement = typeEvenement;
  etablissements = ETABLISSEMENTS;
  aujourdhui = jourIso();
  vide = VIDE;
  form: Evenement = VIDE();
  evenements = signal<Evenement[]>([]);
  mois = computed(() => parMois(this.evenements()));
  envoi = signal(false);
  erreur = signal('');

  ngOnInit() { this.charger(); }

  async charger() {
    try { this.evenements.set(await this.cs.lister()); } catch (e) { this.erreur.set((e as Error).message); }
  }
  modifier(e: Evenement) {
    this.form = { ...e };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async enregistrer() {
    this.envoi.set(true);
    this.erreur.set('');
    try {
      await this.cs.enregistrer({ ...this.form, titre: this.form.titre.trim(), description: this.form.description.trim(),
        date_fin: this.form.date_fin && this.form.date_fin > this.form.date_debut ? this.form.date_fin : null });
      this.form = VIDE();
      await this.charger();
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.envoi.set(false);
    }
  }
  async supprimer(e: Evenement) {
    if (!confirm(`Supprimer « ${e.titre} » ?`)) return;
    try { await this.cs.supprimer(e.id!); await this.charger(); } catch (err) { this.erreur.set((err as Error).message); }
  }
}
