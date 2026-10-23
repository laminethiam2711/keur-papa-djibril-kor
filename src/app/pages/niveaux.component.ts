import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CYCLES } from '../data/ecole';

@Component({
  selector: 'app-niveaux',
  imports: [RouterLink],
  template: `
    <section class="bandeau-page">
      <div class="conteneur">
        <span class="arabe">المراحل الدراسية</span>
        <h1>Niveaux et cycles</h1>
        <p>De la crèche au CM2, un parcours continu en français et en arabe.</p>
      </div>
    </section>

    <section class="section">
      <div class="conteneur cycles">
        @for (c of cycles; track c.nom) {
          <article class="carte cycle">
            <header>
              <div>
                <h2>{{ c.nom }}</h2>
                <span class="pastille">{{ c.ages }}</span>
                <p class="classes">{{ c.classes }}</p>
              </div>
              <span class="arabe">{{ c.arabe }}</span>
            </header>
            <div class="grille grille-2">
              <div>
                <h3>En français</h3>
                <ul>@for (p of c.francais; track p) { <li>{{ p }}</li> }</ul>
              </div>
              <div>
                <h3>En arabe</h3>
                <ul>@for (p of c.arabeProgramme; track p) { <li>{{ p }}</li> }</ul>
              </div>
            </div>
          </article>
        }
        <p class="centre"><a routerLink="/inscriptions" class="btn btn-vert">Inscrire mon enfant</a></p>
      </div>
    </section>
  `,
  styles: `
    .cycles { display: flex; flex-direction: column; gap: 24px; }
    .cycle header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px;
      border-bottom: 1px solid var(--bordure); padding-bottom: 16px; }
    .cycle h2 { margin-bottom: 6px; }
    .cycle header .arabe { font-size: 2rem; }
    .classes { color: var(--texte-doux); margin: 8px 0 0; }
    h3 { font-size: 1rem; color: var(--vert); }
    ul { padding-left: 20px; margin: 0; }
    li { margin-bottom: 6px; }
    .centre { text-align: center; }
  `,
})
export class NiveauxComponent {
  cycles = CYCLES;
}
