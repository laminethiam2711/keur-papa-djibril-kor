import { Component, inject, OnInit, signal } from '@angular/core';
import { ExportService } from '../notes/export.service';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-tableau-de-bord',
  imports: [RouterLink],
  template: `
    <h1>Tableau de bord</h1>
    <div class="grille grille-4">
      <a routerLink="/admin/inscriptions" class="carte stat">
        <strong>{{ stats().nouvelles }}</strong><span>nouvelles pré-inscriptions</span>
        <small>{{ stats().inscriptions }} au total</small>
      </a>
      <a routerLink="/admin/messages" class="carte stat">
        <strong>{{ stats().nonLus }}</strong><span>messages non lus</span>
        <small>{{ stats().messages }} au total</small>
      </a>
      <a routerLink="/admin/actualites" class="carte stat">
        <strong>{{ stats().actualites }}</strong><span>actualités publiées</span>
      </a>
      <a routerLink="/admin/photos" class="carte stat">
        <strong>{{ stats().photos }}</strong><span>photos dans la galerie</span>
      </a>
    </div>
    <div class="carte sauvegarde" [class.urgent]="joursDepuis() === null || joursDepuis()! >= 7">
      <div>
        <strong>💾 Sauvegarde des données</strong>
        <p>{{ joursDepuis() === null ? 'Aucune sauvegarde faite depuis cet ordinateur.'
          : joursDepuis() === 0 ? 'Dernière sauvegarde : aujourd’hui.'
          : 'Dernière sauvegarde : il y a ' + joursDepuis() + ' jour' + (joursDepuis()! > 1 ? 's' : '') + '.' }}
          Pensez à télécharger une sauvegarde Excel chaque semaine (élèves, notes, moyennes, inscriptions, messages).</p>
      </div>
      <button class="btn btn-vert" (click)="sauvegarder()" [disabled]="exportEnCours()">{{ exportEnCours() ? 'Préparation…' : 'Télécharger la sauvegarde' }}</button>
    </div>
    @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
  `,
  styles: `
    h1 { font-size: 1.6rem; margin-bottom: 24px; }
    .stat { text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 4px; padding: 22px; }
    .stat strong { font-size: 2.2rem; color: var(--bleu-nuit); line-height: 1; }
    .stat span { font-weight: 500; }
    .stat small { color: var(--texte-doux); }
    .stat:hover { border-color: var(--vert); }
    .erreur { color: #a12a1f; }
    .sauvegarde { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 20px; padding: 20px 24px; }
    .sauvegarde p { margin: 4px 0 0; color: var(--texte-doux); font-size: .9rem; max-width: 640px; }
    .sauvegarde.urgent { border-left: 5px solid var(--or); }
  `,
})
export class TableauDeBordComponent implements OnInit {
  private sb = inject(SupabaseService);
  private ex = inject(ExportService);
  exportEnCours = signal(false);
  joursDepuis = signal<number | null>(this.calculerJours());

  private calculerJours(): number | null {
    const d = this.ex.derniereSauvegarde();
    return d ? Math.floor((Date.now() - d.getTime()) / 86400000) : null;
  }

  async sauvegarder() {
    this.exportEnCours.set(true);
    try {
      await this.ex.sauvegardeComplete();
      this.joursDepuis.set(0);
    } catch (e) {
      this.erreur.set('Sauvegarde impossible : ' + (e as Error).message);
    } finally {
      this.exportEnCours.set(false);
    }
  }
  stats = signal({ nouvelles: 0, inscriptions: 0, nonLus: 0, messages: 0, actualites: 0, photos: 0 });
  erreur = signal('');

  async ngOnInit() {
    try {
      const [nouvelles, inscriptions, nonLus, messages, actualites, photos] = await Promise.all([
        this.sb.compter('inscriptions', ['statut', 'Nouvelle']),
        this.sb.compter('inscriptions'),
        this.sb.compter('messages', ['lu', false]),
        this.sb.compter('messages'),
        this.sb.compter('actualites'),
        this.sb.compter('photos'),
      ]);
      this.stats.set({ nouvelles, inscriptions, nonLus, messages, actualites, photos });
    } catch (e) {
      this.erreur.set((e as Error).message);
    }
  }
}
