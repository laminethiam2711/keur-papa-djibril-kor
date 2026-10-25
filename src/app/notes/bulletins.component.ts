import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BulletinCode, DECISIONS, LIBELLES_BULLETIN, libellePeriode, PERIODES } from './modeles';
import { formatRang, nombre } from './calcul';
import { chargerBulletins, DonneesBulletin } from './donnees-bulletin';
import { Classe, NotesService } from './notes.service';

@Component({
  selector: 'app-bulletins',
  imports: [FormsModule, RouterLink],
  template: `
    <a routerLink="/admin/classes" class="retour">← Toutes les classes</a>
    @if (classe(); as c) {
      <div class="entete">
        <h1>Bulletins · {{ c.nom }}</h1>
        <a class="btn btn-vert petit" [routerLink]="['/admin/saisie', c.id]">Saisir les notes</a>
      </div>

      <div class="carte choix">
        <div class="groupe">
          <span>Relevé</span>
          @for (b of bulletins(); track b) {
            <button [class.actif]="bulletin() === b" (click)="changer(b)">{{ libelles[b] }}</button>
          }
        </div>
        @if (bulletin() === 'en') {
          <div class="groupe">
            <span>Term</span>
            @for (p of periodes; track p) {
              <button [class.actif]="periodeEn() === p" (click)="periodeEn.set(p)">{{ libellePeriode('en', p) }}</button>
            }
          </div>
        }
        <a class="btn btn-or" target="_blank" [href]="lienImpression()">🖨 Imprimer toute la classe</a>
      </div>

      @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }

      @if (donnees(); as d) {
        <div class="stats">
          @for (p of periodes; track p; let i = $index) {
            <div class="carte stat">
              <strong>{{ libellePeriode(bulletin(), p) }}</strong>
              <span>Moyenne de la classe : <b>{{ nombre(d.stats[i].moyenneClasse) || '—' }}</b></span>
              <span>Plus forte : {{ nombre(d.stats[i].plusForte) || '—' }} · Plus faible : {{ nombre(d.stats[i].plusFaible) || '—' }}</span>
            </div>
          }
        </div>

        <div class="carte tableau">
          <table>
            <thead>
              <tr>
                <th class="g">Élève</th>
                @for (p of periodes; track p) { <th>{{ libellePeriode(bulletin(), p) }}</th> }
                @if (bulletin() !== 'en') { <th>Annuel</th><th>Décision du conseil</th> }
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (l of d.lignes; track l.eleve.id) {
                <tr>
                  <td class="g"><a class="nom" [routerLink]="['/admin/eleve', id(), l.eleve.id]"><strong>{{ l.eleve.prenom }} {{ l.eleve.nom }}</strong></a></td>
                  @for (r of l.periodes; track $index) {
                    <td>{{ nombre(r?.moyenne) || '—' }} <small>{{ formatRang(r?.rang ?? null, r?.exAequo) }}</small></td>
                  }
                  @if (bulletin() !== 'en') {
                    <td><b>{{ nombre(l.annuel.moyenne) || "—" }}</b>&nbsp;<small>{{ formatRang(l.annuel.rang, l.annuel.exAequo) }}</small></td>
                    <td>
                      <select [ngModel]="l.decision" (ngModelChange)="decider(l.eleve.id!, $event)">
                        <option value="">—</option>
                        @for (dec of decisions; track dec) { <option [value]="dec">{{ dec }}</option> }
                      </select>
                    </td>
                  }
                  <td><a class="mini" target="_blank" [href]="lienImpression(l.eleve.id)">Imprimer</a></td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="vide">Aucun élève dans cette classe.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  `,
  styles: `
    .retour { display: inline-block; margin-bottom: 12px; text-decoration: none; font-size: .9rem; }
    .entete { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    h1 { font-size: 1.5rem; margin: 0; }
    .petit { padding: 8px 16px; font-size: .88rem; }
    .choix { display: flex; flex-wrap: wrap; gap: 16px 32px; padding: 16px 20px; margin-bottom: 16px; align-items: center; }
    .choix .btn { margin-left: auto; }
    .groupe { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .groupe span { font-weight: 600; color: var(--bleu-nuit); margin-right: 4px; font-size: .9rem; }
    .groupe button { font: inherit; font-size: .88rem; border: 1px solid var(--bordure); background: #fff; padding: 6px 14px; border-radius: 999px; cursor: pointer; }
    .groupe button.actif { background: var(--bleu-nuit); color: #fff; border-color: var(--bleu-nuit); }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .stat { padding: 16px; display: flex; flex-direction: column; gap: 4px; font-size: .88rem; }
    .stat strong { color: var(--bleu-nuit); }
    .tableau { padding: 0; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; min-width: 720px; }
    th { background: var(--sable); color: var(--bleu-nuit); padding: 10px; text-align: center; }
    td { padding: 8px 10px; border-top: 1px solid var(--bordure); text-align: center; }
    .g { text-align: left; }
    .nom { color: var(--texte); text-decoration: none; }
    .nom:hover { color: var(--vert); text-decoration: underline; }
    small { color: var(--texte-doux); }
    select { font: inherit; font-size: .85rem; padding: 4px 6px; border: 1px solid var(--bordure); border-radius: 8px; }
    .mini { font-size: .85rem; border: 1px solid var(--bordure); border-radius: 8px; padding: 4px 10px; text-decoration: none; white-space: nowrap; }
    .vide { color: var(--texte-doux); padding: 24px; }
    .erreur { background: #fdecea; color: #a12a1f; padding: 12px; border-radius: 10px; }
  `,
})
export class BulletinsComponent implements OnInit {
  id = input.required<string>();
  private ns = inject(NotesService);
  libelles = LIBELLES_BULLETIN;
  periodes = PERIODES;
  decisions = DECISIONS;
  libellePeriode = libellePeriode;
  nombre = nombre;
  formatRang = formatRang;

  classe = signal<Classe | null>(null);
  donnees = signal<DonneesBulletin | null>(null);
  bulletin = signal<BulletinCode>('fr');
  periodeEn = signal(1);
  erreur = signal('');

  async ngOnInit() {
    try {
      this.classe.set(await this.ns.classe(Number(this.id())));
      await this.charger();
    } catch (e) {
      this.erreur.set((e as Error).message);
    }
  }

  bulletins(): BulletinCode[] {
    const c = this.classe()!;
    return ['fr', ...(c.avec_arabe ? ['ar' as const] : []), ...(c.avec_anglais ? ['en' as const] : [])];
  }

  async changer(b: BulletinCode) {
    this.bulletin.set(b);
    await this.charger();
  }

  async charger() {
    this.donnees.set(await chargerBulletins(this.ns, Number(this.id()), this.bulletin()));
  }

  lienImpression(eleveId?: number): string {
    const base = document.querySelector('base')?.getAttribute('href') ?? '/';
    const q = new URLSearchParams({ bulletin: this.bulletin() });
    if (eleveId) q.set('eleve', String(eleveId));
    if (this.bulletin() === 'en') q.set('periode', String(this.periodeEn()));
    return `${base}admin/impression/${this.id()}?${q}`;
  }

  async decider(eleveId: number, decision: string) {
    try {
      await this.ns.enregistrerAppreciation({
        eleve_id: eleveId, classe_id: Number(this.id()), bulletin: this.bulletin(), periode: 0, observation: '', decision,
      });
      await this.charger();
    } catch (e) {
      this.erreur.set((e as Error).message);
    }
  }
}
