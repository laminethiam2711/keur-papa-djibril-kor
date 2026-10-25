import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ECOLE, ETABLISSEMENTS } from '../data/ecole';

@Component({
  selector: 'app-pied',
  imports: [RouterLink],
  template: `
    <footer>
      <div class="conteneur grille-pied">
        <div>
          <img class="logo-pied" src="logo-256.png" alt="Logo de l’école Keur Papa Djibril Kor" width="88" height="88">
          <h3>Keur Papa Djibril Kor</h3>
          <p class="arabe">{{ ecole.nomArabe }}</p>
          <p>École privée franco-arabe. {{ ecole.slogan }}.</p>
        </div>
        <div>
          <h4>Nos établissements</h4>
          @for (e of etablissements; track e.nom) {
            <p><strong>{{ e.nom }}</strong><br>{{ e.adresse }}</p>
          }
        </div>
        <div>
          <h4>Contact</h4>
          @for (t of ecole.telephones; track t) {
            <p><a [href]="'tel:' + t.replaceAll(' ', '')">{{ t }}</a></p>
          }
          <p><a [href]="'https://wa.me/' + ecole.whatsapp" target="_blank" rel="noopener">WhatsApp</a></p>
        </div>
        <div>
          <h4>Liens rapides</h4>
          <p><a routerLink="/parents">Espace parents</a></p>
          <p><a routerLink="/calendrier">Calendrier scolaire</a></p>
          <p><a routerLink="/inscriptions">Inscriptions</a></p>
          <p><a routerLink="/niveaux">Niveaux et cycles</a></p>
          <p><a routerLink="/actualites">Actualités</a></p>
          <p><a routerLink="/contact">Nous écrire</a></p>
        </div>
      </div>
      <div class="bas">
        © {{ annee }} École privée franco-arabe Keur Papa Djibril Kor · Dakar, Sénégal
      </div>
    </footer>
  `,
  styles: `
    footer { background: var(--bleu-nuit); color: #c9d1e3; padding-top: 56px; margin-top: 0; }
    .grille-pied { display: grid; gap: 32px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
    h3 { color: #fff; margin-bottom: 4px; }
    .logo-pied { width: 88px; height: 88px; border-radius: 50%; background: #fff; margin-bottom: 12px; }
    h4 { color: var(--or); margin: 0 0 12px; font-size: 1rem; }
    p { margin: 0 0 10px; font-size: .92rem; }
    .arabe { font-size: 1.3rem; text-align: left; }
    a { color: #fff; text-decoration: none; }
    a:hover { color: var(--or); }
    .bas { border-top: 1px solid rgba(255,255,255,.12); margin-top: 40px; padding: 18px 16px; text-align: center; font-size: .82rem; }
  `,
})
export class PiedComponent {
  ecole = ECOLE;
  etablissements = ETABLISSEMENTS;
  annee = new Date().getFullYear();
}
