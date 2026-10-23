import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ECOLE } from '../data/ecole';

@Component({
  selector: 'app-entete',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="barre-info">
      <div class="conteneur barre-info-int">
        <span>Année scolaire {{ ecole.anneeScolaire }} · Inscriptions ouvertes</span>
        <a [href]="'tel:' + ecole.telephones[0].replaceAll(' ', '')">{{ ecole.telephones[0] }}</a>
      </div>
    </div>
    <header>
      <div class="conteneur entete">
        <a routerLink="/" class="logo" (click)="fermer()">
          <span class="embleme" aria-hidden="true">KPDK</span>
          <span class="logo-texte">
            <strong>Keur Papa Djibril Kor</strong>
            <small>École privée franco-arabe</small>
          </span>
        </a>

        <button class="burger" (click)="ouvert.set(!ouvert())" [attr.aria-expanded]="ouvert()" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>

        <nav [class.ouvert]="ouvert()">
          @for (lien of liens; track lien.url) {
            <a [routerLink]="lien.url" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: lien.url === '/' }" (click)="fermer()">{{ lien.texte }}</a>
          }
          <a routerLink="/inscriptions" class="btn btn-or petit" (click)="fermer()">Inscrire mon enfant</a>
        </nav>
      </div>
    </header>
  `,
  styles: `
    .barre-info { background: var(--bleu-nuit); color: #d6dcea; font-size: .82rem; }
    .barre-info-int { display: flex; justify-content: space-between; padding: 6px 16px; gap: 12px; }
    .barre-info a { color: var(--or); text-decoration: none; font-weight: 600; }
    header { background: #fff; border-bottom: 1px solid var(--bordure); position: sticky; top: 0; z-index: 50; }
    .entete { display: flex; align-items: center; justify-content: space-between; height: 76px; }
    .logo { display: flex; align-items: center; gap: 12px; text-decoration: none; }
    .embleme {
      width: 48px; height: 48px; border-radius: 12px; background: var(--bleu-nuit); color: var(--or);
      display: grid; place-items: center; font-weight: 700; font-size: .8rem; letter-spacing: .5px;
      border: 2px solid var(--or);
    }
    .logo-texte { display: flex; flex-direction: column; line-height: 1.2; }
    .logo-texte strong { color: var(--bleu-nuit); font-size: 1.05rem; }
    .logo-texte small { color: var(--vert); font-weight: 500; }
    nav { display: flex; align-items: center; gap: 4px; }
    nav a:not(.btn) {
      color: var(--texte); text-decoration: none; padding: 8px 10px; border-radius: 8px; font-size: .92rem; font-weight: 500;
    }
    nav a:not(.btn):hover, nav a.actif { color: var(--vert); background: var(--vert-clair); }
    .petit { padding: 9px 18px; font-size: .9rem; margin-left: 8px; }
    .burger { display: none; background: none; border: 0; cursor: pointer; padding: 8px; }
    .burger span { display: block; width: 24px; height: 2px; background: var(--bleu-nuit); margin: 5px 0; }

    @media (max-width: 1080px) {
      .burger { display: block; }
      nav {
        display: none; position: absolute; top: 76px; left: 0; right: 0; background: #fff;
        flex-direction: column; align-items: stretch; padding: 12px 16px 20px; border-bottom: 1px solid var(--bordure);
        box-shadow: var(--ombre);
      }
      nav.ouvert { display: flex; }
      nav a:not(.btn) { padding: 12px; }
      .petit { margin: 8px 0 0; justify-content: center; }
    }
    @media (max-width: 480px) {
      .barre-info-int span { display: none; }
      .barre-info-int { justify-content: center; }
    }
  `,
})
export class EnteteComponent {
  ecole = ECOLE;
  ouvert = signal(false);
  liens = [
    { url: '/', texte: 'Accueil' },
    { url: '/presentation', texte: 'Présentation' },
    { url: '/etablissements', texte: 'Établissements' },
    { url: '/niveaux', texte: 'Niveaux' },
    { url: '/vie-scolaire', texte: 'Vie scolaire' },
    { url: '/galerie', texte: 'Galerie' },
    { url: '/actualites', texte: 'Actualités' },
    { url: '/contact', texte: 'Contact' },
  ];
  fermer() { this.ouvert.set(false); }
}
