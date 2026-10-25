import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  BulletinCode, Evaluation, LIBELLES_BULLETIN, LIBELLES_EVALUATION, libellePeriode, Matiere,
  maxMatiere, modelePour, PERIODES, toutesMatieres,
} from './modeles';
import { baremeMoyenne, cle, formatRang, indexer, nombre, resultatsPeriode } from './calcul';
import { Appreciation, Classe, Eleve, NotesService } from './notes.service';

type Etat = 'enregistrement' | 'ok' | 'erreur';

@Component({
  selector: 'app-saisie',
  imports: [FormsModule, RouterLink],
  template: `
    <a routerLink="/admin/classes" class="retour">← Toutes les classes</a>
    @if (classe(); as c) {
      <div class="entete">
        <h1>Saisie des notes · {{ c.nom }}</h1>
        <a class="btn btn-or petit" [routerLink]="['/admin/bulletins', c.id]">Voir les bulletins</a>
      </div>

      <div class="carte choix">
        <div class="groupe">
          <span>Relevé</span>
          @for (b of bulletins(); track b) {
            <button [class.actif]="bulletin() === b" (click)="changerBulletin(b)">{{ libelles[b] }}</button>
          }
        </div>
        <div class="groupe">
          <span>Période</span>
          @for (p of periodes; track p) {
            <button [class.actif]="periode() === p" (click)="periode.set(p)">{{ libellePeriode(bulletin(), p) }}</button>
          }
        </div>
        @if (modele().evaluations.length > 1) {
          <div class="groupe">
            <span>Évaluation</span>
            @for (ev of modele().evaluations; track ev) {
              <button [class.actif]="evaluation() === ev" (click)="evaluation.set(ev)">{{ libEval[ev] }}</button>
            }
          </div>
        }
      </div>

      @if (evaluation() !== modele().evaluationComptee) {
        <p class="info">Les notes de contrôle s'affichent sur le bulletin mais ne comptent pas dans la moyenne : seule la composition compte.</p>
      }
      @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
      <p class="aide">Tapez la note puis <kbd>Entrée</kbd> pour passer à l'élève suivant. Chaque note est enregistrée automatiquement.
        Moyenne sur {{ baremeMoy() }}.</p>

      <div class="carte tableau">
        <table>
          <thead>
            <tr>
              <th class="fixe">Élève</th>
              @for (mat of matieres(); track mat.code) {
                <th class="note" [title]="mat.nom">
                  <span class="nom-mat">{{ bulletin() === 'ar' && mat.nomAr ? mat.nomAr : mat.nom }}</span>
                  <small>/{{ max(mat) }}</small>
                </th>
              }
              <th>Observation</th>
              <th class="calc c-total">Total</th><th class="calc c-moy">Moy.</th><th class="calc c-rang">Rang</th>
            </tr>
          </thead>
          <tbody>
            @for (e of eleves(); track e.id; let i = $index) {
              <tr>
                <td class="fixe"><strong>{{ e.prenom }} {{ e.nom }}</strong></td>
                @for (mat of matieres(); track mat.code; let j = $index) {
                  <td class="note">
                    <input type="text" inputmode="decimal" [id]="'n-' + i + '-' + j"
                      [class]="etatCase(e.id!, mat.code)"
                      [value]="valeur(e.id!, mat.code)"
                      (change)="enregistrer(e.id!, mat, $any($event.target))"
                      (keydown.enter)="suivant(i, j, $event)">
                  </td>
                }
                @let r = resultats().get(e.id!);
                <td><input class="obs" type="text" maxlength="300" [value]="observation(e.id!)"
                  (change)="enregistrerObservation(e.id!, $any($event.target).value)"></td>
                <td class="calc c-total">{{ nombre(r?.total) }}</td>
                <td class="calc c-moy moy">{{ nombre(r?.moyenne) }}</td>
                <td class="calc c-rang">{{ formatRang(r?.rang ?? null, r?.exAequo) }}</td>
              </tr>
            } @empty {
              <tr><td [attr.colspan]="matieres().length + 5" class="vide">
                Aucun élève. <a [routerLink]="['/admin/classes', c.id]">Ajoutez des élèves à la classe</a>.
              </td></tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .retour { display: inline-block; margin-bottom: 12px; text-decoration: none; font-size: .9rem; }
    .entete { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    h1 { font-size: 1.5rem; margin: 0; }
    .petit { padding: 8px 16px; font-size: .88rem; }
    .choix { display: flex; flex-wrap: wrap; gap: 16px 32px; padding: 16px 20px; margin-bottom: 12px; }
    .groupe { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .groupe span { font-weight: 600; color: var(--bleu-nuit); margin-right: 4px; font-size: .9rem; }
    .groupe button { font: inherit; font-size: .88rem; border: 1px solid var(--bordure); background: #fff; padding: 6px 14px; border-radius: 999px; cursor: pointer; }
    .groupe button.actif { background: var(--bleu-nuit); color: #fff; border-color: var(--bleu-nuit); }
    .aide { color: var(--texte-doux); font-size: .88rem; }
    .info { background: #fff4e0; color: #8a5a00; padding: 10px 14px; border-radius: 10px; font-size: .9rem; }
    kbd { background: #eef0f4; border-radius: 4px; padding: 1px 6px; font-size: .8rem; }
    .tableau { padding: 0; overflow-x: auto; }
    table { border-collapse: collapse; font-size: .88rem; min-width: 100%; }
    th { background: var(--sable); color: var(--bleu-nuit); padding: 8px; vertical-align: bottom; font-weight: 600; }
    td { padding: 4px 6px; border-top: 1px solid var(--bordure); }
    .fixe { position: sticky; left: 0; background: #fff; z-index: 1; text-align: left; white-space: nowrap; padding-left: 12px; min-width: 170px; }
    th.fixe { background: var(--sable); }
    th.note { width: 74px; min-width: 74px; font-size: .74rem; text-align: center; }
    .nom-mat { display: block; line-height: 1.2; overflow-wrap: anywhere; hyphens: auto; }
    th small { color: var(--texte-doux); font-weight: 400; }
    td.note input { width: 58px; font: inherit; text-align: center; padding: 6px 4px; border: 1px solid var(--bordure); border-radius: 6px; }
    td.note input:focus { outline: 2px solid var(--vert); border-color: transparent; }
    input.enregistrement { background: #fff8e6; }
    input.ok { background: var(--vert-clair); }
    input.erreur { background: #fdecea; border-color: #e0a39c; }
    /* Total, moyenne et rang restent visibles à droite même quand on fait défiler */
    .calc { text-align: center; white-space: nowrap; background: #f3f5f8; width: 64px; min-width: 64px; max-width: 64px;
      position: sticky; z-index: 1; }
    th.calc { background: #efe6d3; }
    .c-rang { right: 0; }
    .c-moy { right: 64px; }
    .c-total { right: 128px; box-shadow: -4px 0 6px -4px rgba(0,0,0,.15); }
    .moy { font-weight: 700; color: var(--bleu-nuit); }
    .obs { width: 220px; font: inherit; font-size: .85rem; padding: 6px 8px; border: 1px solid var(--bordure); border-radius: 6px; }
    .vide { text-align: center; color: var(--texte-doux); padding: 24px; }
    .erreur { background: #fdecea; color: #a12a1f; padding: 12px; border-radius: 10px; }
  `,
})
export class SaisieComponent implements OnInit {
  id = input.required<string>();
  private ns = inject(NotesService);
  libelles = LIBELLES_BULLETIN;
  libEval = LIBELLES_EVALUATION;
  periodes = PERIODES;
  libellePeriode = libellePeriode;
  nombre = nombre;
  formatRang = formatRang;

  classe = signal<Classe | null>(null);
  eleves = signal<Eleve[]>([]);
  bulletin = signal<BulletinCode>('fr');
  periode = signal(1);
  evaluation = signal<Evaluation>('composition');
  erreur = signal('');
  private idx = signal(new Map<string, number>());
  private obs = signal(new Map<string, string>());
  private etats = signal(new Map<string, Etat>());

  modele = computed(() => modelePour(this.classe() ?? { modele_fr: 'composition' }, this.bulletin()));
  matieres = computed(() => toutesMatieres(this.modele()));
  baremeMoy = computed(() => baremeMoyenne(this.classe()!, this.bulletin()));
  resultats = computed(() =>
    resultatsPeriode(this.eleves() as { id: number }[], this.idx(), this.periode(), this.modele(), this.classe()!, this.evaluation()));

  async ngOnInit() {
    try {
      const id = Number(this.id());
      const [c, eleves] = await Promise.all([this.ns.classe(id), this.ns.eleves(id)]);
      this.classe.set(c);
      this.eleves.set(eleves);
      await this.chargerNotes();
    } catch (e) {
      this.erreur.set((e as Error).message);
    }
  }

  bulletins(): BulletinCode[] {
    const c = this.classe()!;
    return ['fr', ...(c.avec_arabe ? ['ar' as const] : []), ...(c.avec_anglais ? ['en' as const] : [])];
  }

  async changerBulletin(b: BulletinCode) {
    this.bulletin.set(b);
    this.evaluation.set(this.modele().evaluationComptee);
    await this.chargerNotes();
  }

  async chargerNotes() {
    const id = Number(this.id());
    const [notes, apps] = await Promise.all([this.ns.notes(id, this.bulletin()), this.ns.appreciations(id, this.bulletin())]);
    this.idx.set(indexer(notes));
    this.obs.set(new Map(apps.map((a) => [`${a.eleve_id}|${a.periode}`, a.observation])));
    this.etats.set(new Map());
  }

  max(mat: Matiere) { return maxMatiere(this.classe()!, this.bulletin(), mat); }

  valeur(eleveId: number, matiere: string): string {
    const v = this.idx().get(cle(eleveId, this.periode(), this.evaluation(), matiere));
    return v === undefined ? '' : String(v).replace('.', ',');
  }

  etatCase(eleveId: number, matiere: string): string {
    return this.etats().get(cle(eleveId, this.periode(), this.evaluation(), matiere)) ?? '';
  }

  observation(eleveId: number) { return this.obs().get(`${eleveId}|${this.periode()}`) ?? ''; }

  private poserEtat(k: string, e: Etat) {
    const m = new Map(this.etats()); m.set(k, e); this.etats.set(m);
  }

  async enregistrer(eleveId: number, mat: Matiere, champ: HTMLInputElement) {
    const k = cle(eleveId, this.periode(), this.evaluation(), mat.code);
    const texte = champ.value.trim().replace(',', '.');
    const valeur = texte === '' ? null : Number(texte);
    const max = this.max(mat);
    if (valeur !== null && (isNaN(valeur) || valeur < 0 || valeur > max)) {
      this.poserEtat(k, 'erreur');
      this.erreur.set(`Note invalide pour ${mat.nom} : elle doit être entre 0 et ${max}.`);
      return;
    }
    this.erreur.set('');
    this.poserEtat(k, 'enregistrement');
    try {
      await this.ns.enregistrerNote({
        eleve_id: eleveId, classe_id: Number(this.id()), bulletin: this.bulletin(), periode: this.periode(),
        evaluation: this.evaluation(), matiere: mat.code, valeur,
      });
      const m = new Map(this.idx());
      if (valeur === null) m.delete(k); else m.set(k, valeur);
      this.idx.set(m);
      this.poserEtat(k, 'ok');
    } catch (e) {
      this.poserEtat(k, 'erreur');
      this.erreur.set('Enregistrement impossible : ' + (e as Error).message);
    }
  }

  async enregistrerObservation(eleveId: number, texte: string) {
    const a: Appreciation = {
      eleve_id: eleveId, classe_id: Number(this.id()), bulletin: this.bulletin(), periode: this.periode(),
      observation: texte.trim(), decision: '',
    };
    try {
      await this.ns.enregistrerAppreciation(a);
      const m = new Map(this.obs()); m.set(`${eleveId}|${this.periode()}`, a.observation); this.obs.set(m);
    } catch (e) {
      this.erreur.set('Enregistrement impossible : ' + (e as Error).message);
    }
  }

  /** Entrée : enregistre puis passe à la même matière de l'élève suivant. */
  suivant(i: number, j: number, ev: Event) {
    ev.preventDefault();
    // Quitter la case déclenche l'enregistrement (événement « change »)
    const prochain = document.getElementById(`n-${i + 1}-${j}`) ?? document.getElementById(`n-0-${j + 1}`);
    (prochain as HTMLInputElement | null)?.focus();
    (prochain as HTMLInputElement | null)?.select();
  }
}
