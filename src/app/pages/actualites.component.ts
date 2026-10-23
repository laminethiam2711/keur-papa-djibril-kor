import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Actualite, SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-actualites',
  imports: [DatePipe],
  template: `
    <section class="bandeau-page">
      <div class="conteneur">
        <span class="arabe">الأخبار</span>
        <h1>Actualités</h1>
        <p>Annonces, événements et informations pour les parents.</p>
      </div>
    </section>

    <section class="section">
      <div class="conteneur liste">
        @for (a of actualites(); track a.titre) {
          <article class="carte actu">
            <div class="date">
              <strong>{{ a.date_publication | date: 'd' }}</strong>
              <span>{{ a.date_publication | date: 'MMM y' }}</span>
            </div>
            <div>
              <span class="pastille">{{ a.categorie }}</span>
              <h2>{{ a.titre }}</h2>
              <p>{{ a.resume }}</p>
            </div>
          </article>
        } @empty {
          <p class="vide">{{ chargement() ? 'Chargement…' : 'Aucune actualité pour le moment.' }}</p>
        }
      </div>
    </section>
  `,
  styles: `
    .liste { display: flex; flex-direction: column; gap: 20px; max-width: 820px; }
    .actu { display: flex; gap: 24px; align-items: flex-start; }
    .date { background: var(--bleu-nuit); color: #fff; border-radius: 12px; padding: 12px; min-width: 84px; text-align: center; }
    .date strong { display: block; font-size: 1.8rem; line-height: 1; color: var(--or); }
    .date span { font-size: .8rem; }
    h2 { font-size: 1.3rem; margin: 10px 0 6px; }
    p { margin: 0; color: var(--texte-doux); white-space: pre-line; }
    .vide { text-align: center; color: var(--texte-doux); }
    @media (max-width: 520px) { .actu { flex-direction: column; } }
  `,
})
export class ActualitesComponent implements OnInit {
  private sb = inject(SupabaseService);
  actualites = signal<Actualite[]>([]);
  chargement = signal(true);

  async ngOnInit() {
    try {
      this.actualites.set(await this.sb.listerActualites());
    } finally {
      this.chargement.set(false);
    }
  }
}
