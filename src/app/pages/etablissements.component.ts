import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ECOLE, ETABLISSEMENTS } from '../data/ecole';

@Component({
  selector: 'app-etablissements',
  template: `
    <section class="bandeau-page">
      <div class="conteneur">
        <span class="arabe">مدارسنا</span>
        <h1>Nos établissements</h1>
        <p>Deux écoles, le même projet éducatif.</p>
      </div>
    </section>

    <section class="section">
      <div class="conteneur grille grille-2">
        @for (e of etablissements; track e.nom; let i = $index) {
          <div class="carte etab">
            <span class="pastille">{{ e.quartier }}</span>
            <h2>{{ e.nom }}</h2>
            <p><strong>Adresse :</strong> {{ e.adresse }}</p>
            <p><strong>Niveaux :</strong> {{ e.niveaux }}</p>
            <p><strong>Téléphone :</strong> {{ ecole.telephones.join(' / ') }}</p>
            <iframe [src]="cartes[i]" loading="lazy" [title]="'Carte ' + e.nom" referrerpolicy="no-referrer-when-downgrade"></iframe>
          </div>
        }
      </div>
    </section>
  `,
  styles: `
    .etab h2 { font-size: 1.5rem; margin-top: 12px; }
    .etab p { margin: 6px 0; }
    iframe { width: 100%; height: 280px; border: 0; border-radius: 10px; margin-top: 16px; }
  `,
})
export class EtablissementsComponent {
  ecole = ECOLE;
  etablissements = ETABLISSEMENTS;
  private sanitizer = inject(DomSanitizer);
  cartes: SafeResourceUrl[] = ETABLISSEMENTS.map((e) =>
    this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://maps.google.com/maps?q=${encodeURIComponent(e.carte)}&z=15&output=embed`,
    ),
  );
}
