import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-vie-scolaire',
  imports: [RouterLink],
  template: `
    <section class="bandeau-page">
      <div class="conteneur">
        <span class="arabe">الحياة المدرسية</span>
        <h1>Vie scolaire</h1>
        <p>Apprendre, grandir et célébrer ensemble.</p>
      </div>
    </section>

    <section class="section">
      <div class="conteneur">
        <a class="lien-cal" routerLink="/calendrier">📅 <span><b>Calendrier scolaire</b><small>Rentrée, vacances, compositions et réunions des parents</small></span> <i>›</i></a>
        <div class="titre-section"><h2>Nos activités</h2></div>
        <div class="grille grille-3">
          @for (a of activites; track a.titre) {
            <div class="carte">
              <span class="pastille">{{ a.type }}</span>
              <h3 class="titre">{{ a.titre }}</h3>
              <p>{{ a.texte }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <section class="section sable">
      <div class="conteneur">
        <div class="titre-section">
          <h2>Une journée type</h2>
          <p>Exemple d'organisation à l'élémentaire (les horaires précis sont communiqués à l'inscription).</p>
        </div>
        <ol class="journee">
          @for (m of journee; track m.heure) {
            <li><span class="heure">{{ m.heure }}</span><span>{{ m.activite }}</span></li>
          }
        </ol>
      </div>
    </section>
  `,
  styles: `
    .lien-cal { display: flex; align-items: center; gap: 14px; background: var(--bleu-nuit); color: #fff; text-decoration: none; border-radius: 16px; padding: 16px 22px; margin-bottom: 36px; font-size: 1.6rem; }
    .lien-cal span { display: flex; flex-direction: column; font-size: 1rem; }
    .lien-cal small { color: #c9d1e3; font-size: .88rem; }
    .lien-cal i { margin-left: auto; font-style: normal; color: var(--or); }
    .titre { margin-top: 12px; }
    .journee { list-style: none; padding: 0; margin: 0 auto; max-width: 640px; }
    .journee li { display: flex; gap: 20px; background: #fff; border: 1px solid var(--bordure); border-radius: 12px;
      padding: 14px 20px; margin-bottom: 10px; align-items: center; }
    .heure { font-weight: 700; color: var(--vert); min-width: 110px; }
  `,
})
export class VieScolaireComponent {
  activites = [
    { type: 'Coran', titre: 'Récitation et concours', texte: 'Séances de récitation, mémorisation et concours de lecture coranique entre classes.' },
    { type: 'Sorties', titre: 'Sorties pédagogiques', texte: 'Visites éducatives pour découvrir Dakar, son patrimoine et la nature.' },
    { type: 'Parents', titre: 'Réunions de parents', texte: 'Des rencontres régulières pour suivre ensemble les progrès de chaque enfant.' },
    { type: 'Sport', titre: 'Sport et jeux', texte: 'Activités physiques et jeux collectifs pour l’équilibre et l’esprit d’équipe.' },
  ];
  journee = [
    { heure: '8h00', activite: 'Accueil, rassemblement et invocations' },
    { heure: '8h15 – 12h00', activite: 'Cours en français' },
    { heure: '12h00 – 14h00', activite: 'Pause déjeuner et prière' },
    { heure: '14h00 – 16h30', activite: 'Cours d’arabe, Coran et éducation islamique' },
    { heure: '16h30', activite: 'Sortie des élèves' },
  ];
}
