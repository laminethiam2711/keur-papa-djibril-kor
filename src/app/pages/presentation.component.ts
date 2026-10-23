import { Component } from '@angular/core';

@Component({
  selector: 'app-presentation',
  template: `
    <section class="bandeau-page">
      <div class="conteneur">
        <span class="arabe">من نحن</span>
        <h1>Présentation de l'école</h1>
        <p>Une école qui forme des enfants instruits, pieux et bien éduqués.</p>
      </div>
    </section>

    <section class="section">
      <div class="conteneur grille grille-2 aligne">
        <div>
          <h2>Notre histoire</h2>
          <p>L'École privée franco-arabe Keur Papa Djibril Kor est née de la volonté d'offrir aux familles de la banlieue de Dakar
            une éducation complète : la réussite scolaire selon le programme officiel, et une solide formation religieuse
            et morale.</p>
          <p>Aujourd'hui, l'école accueille les enfants dans deux établissements, à Sicap Mbao et à Tivaouane Peul.</p>
        </div>
        <blockquote class="carte mot">
          <h3>Mot de la direction</h3>
          <p>« Chers parents, nous vous accueillons dans une école où chaque enfant est connu, accompagné et encouragé.
            Notre ambition est simple : former des élèves qui excellent à l'école et dans la vie. »</p>
          <footer>— La Direction</footer>
        </blockquote>
      </div>
    </section>

    <section class="section sable">
      <div class="conteneur">
        <div class="titre-section">
          <span class="arabe">قيمنا</span>
          <h2>Nos valeurs</h2>
        </div>
        <div class="grille grille-4">
          @for (v of valeurs; track v.titre) {
            <div class="carte valeur">
              <span class="arabe">{{ v.arabe }}</span>
              <h3>{{ v.titre }}</h3>
              <p>{{ v.texte }}</p>
            </div>
          }
        </div>
      </div>
    </section>

    <section class="section">
      <div class="conteneur">
        <div class="titre-section">
          <h2>Le double programme</h2>
          <p>Une journée équilibrée entre les deux enseignements, assurés par des enseignants qualifiés dans chaque langue.</p>
        </div>
        <div class="grille grille-2">
          <div class="carte">
            <h3>Programme français</h3>
            <ul>
              <li>Programme officiel du ministère de l'Éducation nationale</li>
              <li>Français, mathématiques, sciences, histoire-géographie</li>
              <li>Préparation au CFEE et à l'entrée en 6e</li>
            </ul>
          </div>
          <div class="carte">
            <h3>Programme arabe et islamique</h3>
            <ul>
              <li>Langue arabe : lecture, écriture, grammaire</li>
              <li>Mémorisation du Coran et tajwid</li>
              <li>Éducation islamique, adab et valeurs</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .aligne { align-items: center; }
    .mot { margin: 0; border-left: 5px solid var(--or); }
    .mot p { font-style: italic; color: var(--texte-doux); }
    .mot footer { font-weight: 600; color: var(--bleu-nuit); }
    .valeur .arabe { font-size: 1.6rem; display: block; text-align: left; }
    .valeur p { color: var(--texte-doux); margin: 0; }
    ul { padding-left: 20px; margin: 0; }
    li { margin-bottom: 8px; }
  `,
})
export class PresentationComponent {
  valeurs = [
    { titre: 'Savoir', arabe: 'العلم', texte: 'Des apprentissages solides en français et en arabe.' },
    { titre: 'Foi', arabe: 'الإيمان', texte: 'Le Coran et les valeurs de l’islam au cœur de la journée.' },
    { titre: 'Discipline', arabe: 'الأدب', texte: 'Le respect des maîtres, des parents et des camarades.' },
    { titre: 'Excellence', arabe: 'الإتقان', texte: 'Encourager chaque élève à donner le meilleur de lui-même.' },
  ];
}
