import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NIVEAUX } from '../notes/modeles';
import { NotesService } from '../notes/notes.service';
import { PaiementsService } from './paiements.service';
import { fcfa, MOIS_SCOLAIRES, Tarif, TYPES, TypeFrais } from './regles';

@Component({
  selector: 'app-tarifs',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="np-page">
      <a routerLink="/admin/paiements" class="np-fil">‹ Paiements</a>
      <div class="np-titre">
        <div>
          <h1>Tarifs de la scolarité</h1>
          <p>Montants en F CFA. Les mensualités, la cantine et le transport sont payés d'octobre à juin ({{ nbMois }} mois).</p>
        </div>
        <label class="annee">Année scolaire
          <select [ngModel]="annee()" (ngModelChange)="changerAnnee($event)">
            @for (a of annees(); track a) { <option [value]="a">{{ a }}</option> }
          </select>
        </label>
      </div>

      @if (erreur()) { <p class="np-erreur">{{ erreur() }}</p> }

      <div class="np-carte">
        <div class="defile">
          <table class="np-table">
            <thead>
              <tr>
                <th>Niveau</th>
                @for (t of types; track t.code) { <th class="np-num">{{ t.libelle }}{{ t.mensuel ? ' / mois' : '' }}</th> }
                <th class="np-num">Total de l'année*</th>
              </tr>
            </thead>
            <tbody>
              @for (n of niveaux; track n) {
                <tr>
                  <td><b>{{ n }}</b></td>
                  @for (t of types; track t.code) {
                    <td class="np-num">
                      <input type="number" min="0" step="500" [ngModel]="montant(n, t.code)" (ngModelChange)="changer(n, t.code, $event)">
                    </td>
                  }
                  <td class="np-num total">{{ fcfa(totalAnnee(n)) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="np-note-bas">* Total pour un élève sans cantine ni transport : inscription + tenue + {{ nbMois }} mensualités.</p>
      </div>

      <div class="actions">
        <button class="np-btn plein" (click)="enregistrer()" [disabled]="envoi()">{{ envoi() ? 'Enregistrement…' : 'Enregistrer les tarifs' }}</button>
        @if (ok()) { <span class="ok">Tarifs enregistrés ✓</span> }
      </div>
    </div>
  `,
  styles: `
    .annee { display: flex; flex-direction: column; gap: 4px; font-size: .75rem; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: #6b7387; }
    .annee select { font: inherit; font-size: .95rem; text-transform: none; letter-spacing: 0; color: var(--texte); padding: 8px 12px; border: 1px solid #d5dae3; border-radius: 10px; }
    .defile { overflow-x: auto; }
    input { width: 110px; font: inherit; text-align: right; padding: 8px 10px; border: 1px solid #d5dae3; border-radius: 8px; }
    input:focus { outline: 2px solid var(--bleu-nuit); border-color: transparent; }
    .total { font-weight: 700; color: var(--bleu-nuit); white-space: nowrap; }
    .actions { display: flex; align-items: center; gap: 12px; }
    .ok { color: var(--vert); font-weight: 600; }
  `,
})
export class TarifsComponent implements OnInit {
  private ps = inject(PaiementsService);
  private ns = inject(NotesService);
  types = TYPES;
  niveaux = NIVEAUX;
  nbMois = MOIS_SCOLAIRES.length;
  fcfa = fcfa;

  annees = signal<string[]>([]);
  annee = signal('');
  erreur = signal('');
  envoi = signal(false);
  ok = signal(false);
  private grille = new Map<string, number>();

  async ngOnInit() {
    try {
      const classes = await this.ns.classes();
      const liste = [...new Set(classes.map((c) => c.annee))];
      if (!liste.length) liste.push('2026-2027');
      this.annees.set(liste);
      await this.changerAnnee(liste[0]);
    } catch (e) {
      this.erreur.set((e as Error).message);
    }
  }

  async changerAnnee(a: string) {
    this.annee.set(a);
    this.ok.set(false);
    try {
      const t = await this.ps.tarifs(a);
      this.grille = new Map(t.map((x) => [`${x.niveau}|${x.type}`, x.montant]));
      this.erreur.set('');
    } catch (e) {
      this.erreur.set((e as Error).message);
    }
  }

  montant(niveau: string, type: TypeFrais) { return this.grille.get(`${niveau}|${type}`) ?? null; }
  changer(niveau: string, type: TypeFrais, v: number | null) {
    this.ok.set(false);
    this.grille.set(`${niveau}|${type}`, Math.max(0, Math.round(Number(v) || 0)));
  }
  totalAnnee(niveau: string) {
    return (this.montant(niveau, 'inscription') ?? 0) + (this.montant(niveau, 'tenue') ?? 0) + (this.montant(niveau, 'mensualite') ?? 0) * this.nbMois;
  }

  async enregistrer() {
    this.envoi.set(true);
    this.erreur.set('');
    try {
      const lignes: Tarif[] = [...this.grille.entries()].map(([k, montant]) => {
        const [niveau, type] = k.split('|');
        return { annee: this.annee(), niveau, type: type as TypeFrais, montant };
      });
      await this.ps.enregistrerTarifs(lignes);
      this.ok.set(true);
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.envoi.set(false);
    }
  }
}
