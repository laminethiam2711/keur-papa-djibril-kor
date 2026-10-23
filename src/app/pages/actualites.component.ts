import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ACTUALITES } from '../data/ecole';

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
        @for (a of actualites; track a.titre) {
          <article class="carte actu">
            <div class="date">
              <strong>{{ a.date | date: 'd' }}</strong>
              <span>{{ a.date | date: 'MMM y' : '' : 'fr' }}</span>
            </div>
            <div>
              <span class="pastille">{{ a.categorie }}</span>
              <h2>{{ a.titre }}</h2>
              <p>{{ a.resume }}</p>
            </div>
          </article>
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
    p { margin: 0; color: var(--texte-doux); }
    @media (max-width: 520px) { .actu { flex-direction: column; } }
  `,
})
export class ActualitesComponent {
  actualites = ACTUALITES;
}
