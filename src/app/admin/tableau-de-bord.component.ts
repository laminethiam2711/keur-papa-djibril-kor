import { Component, inject, OnInit, signal } from '@angular/core';
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
  `,
})
export class TableauDeBordComponent implements OnInit {
  private sb = inject(SupabaseService);
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
