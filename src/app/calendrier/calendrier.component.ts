import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ETABLISSEMENTS } from '../data/ecole';
import { CalendrierService, Evenement, jourIso, parMois, typeEvenement } from './calendrier.service';

/** Liste des événements à venir, regroupés par mois (utilisée sur la page publique et dans l'espace parents). */
@Component({
  selector: 'app-liste-evenements',
  imports: [DatePipe],
  template: `
    @for (m of mois(); track m.mois) {
      <h3 class="mois">{{ m.mois + '-01' | date: 'MMMM y' }}</h3>
      <div class="evts">
        @for (e of m.evenements; track e.id) {
          @let t = typeEvenement(e.type);
          <article class="evt" [style.--c]="t.couleur">
            <div class="date">
              <strong>{{ e.date_debut | date: 'd' }}</strong><span>{{ e.date_debut | date: 'MMM' }}</span>
            </div>
            <div class="txt">
              <span class="type">{{ t.icone }} {{ t.libelle }}@if (e.etablissement !== 'Tous') { · {{ e.etablissement }} }</span>
              <h4>{{ e.titre }}</h4>
              <span class="quand">{{ e.date_debut | date: 'EEEE d MMMM' }}@if (e.date_fin) { au {{ e.date_fin | date: 'EEEE d MMMM' }} }</span>
              @if (e.description) { <p>{{ e.description }}</p> }
            </div>
          </article>
        }
      </div>
    } @empty {
      <p class="vide">{{ vide() }}</p>
    }
  `,
  styles: `
    .mois { text-transform: capitalize; color: var(--vert); font-size: 1.15rem; margin: 26px 0 12px; }
    .mois:first-child { margin-top: 0; }
    .evts { display: flex; flex-direction: column; gap: 12px; }
    .evt { display: flex; gap: 16px; background: #fff; border-radius: 14px; padding: 14px 18px; border: 1px solid #e3e6ec;
      border-left: 5px solid var(--c); box-shadow: 0 4px 16px rgba(19,37,74,.05); }
    .date { min-width: 58px; text-align: center; background: var(--c); color: #fff; border-radius: 10px; padding: 8px 6px; align-self: flex-start; }
    .date strong { display: block; font-size: 1.5rem; line-height: 1; }
    .date span { font-size: .78rem; text-transform: uppercase; }
    .type { font-size: .78rem; font-weight: 600; color: var(--c); }
    h4 { margin: 2px 0; font-size: 1.08rem; color: var(--bleu-nuit); }
    .quand { font-size: .88rem; color: var(--texte-doux); }
    p { margin: 6px 0 0; font-size: .92rem; }
    .vide { color: var(--texte-doux); }
  `,
})
export class ListeEvenementsComponent {
  evenements = input.required<Evenement[]>();
  vide = input('Aucun événement à venir.');
  typeEvenement = typeEvenement;
  mois = computed(() => parMois(this.evenements()));
}

/** Page publique « Calendrier scolaire ». */
@Component({
  selector: 'app-calendrier',
  imports: [ListeEvenementsComponent],
  template: `
    <section class="bandeau-page">
      <div class="conteneur">
        <span class="arabe">التقويم المدرسي</span>
        <h1>Calendrier scolaire</h1>
        <p>Rentrée, vacances, compositions et réunions des parents.</p>
      </div>
    </section>
    <section class="section">
      <div class="conteneur cal">
        <div class="filtres">
          <button [class.actif]="etab() === 'Tous'" (click)="etab.set('Tous')">Tous les établissements</button>
          @for (e of etablissements; track e.nom) {
            <button [class.actif]="etab() === e.nom" (click)="etab.set(e.nom)">{{ e.nom }}</button>
          }
          <label><input type="checkbox" [checked]="passes()" (change)="passes.set(!passes())"> Afficher les événements passés</label>
        </div>
        <app-liste-evenements [evenements]="visibles()" [vide]="chargement() ? 'Chargement…' : 'Le calendrier sera publié prochainement.'" />
      </div>
    </section>
  `,
  styles: `
    .cal { max-width: 820px; }
    .filtres { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 24px; }
    .filtres button { font: inherit; font-size: .88rem; padding: 7px 14px; border-radius: 999px; border: 1px solid #d5dae3; background: #fff; cursor: pointer; }
    .filtres button.actif { background: var(--bleu-nuit); color: #fff; border-color: var(--bleu-nuit); }
    .filtres label { font-size: .88rem; color: var(--texte-doux); display: flex; gap: 6px; align-items: center; margin-left: auto; }
  `,
})
export class CalendrierComponent implements OnInit {
  private cs = inject(CalendrierService);
  etablissements = ETABLISSEMENTS;
  tous = signal<Evenement[]>([]);
  chargement = signal(true);
  etab = signal('Tous');
  passes = signal(false);
  visibles = computed(() => {
    const auj = jourIso();
    return this.tous().filter((e) => (this.passes() || (e.date_fin ?? e.date_debut) >= auj)
      && (this.etab() === 'Tous' || e.etablissement === 'Tous' || e.etablissement === this.etab()));
  });

  async ngOnInit() {
    this.tous.set((await this.cs.listerPublic()).filter((e) => e.public));
    this.chargement.set(false);
  }
}
