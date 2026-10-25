import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  BulletinCode, Evaluation, LIBELLES_BULLETIN, LIBELLES_EVALUATION, libellePeriode, Matiere,
  maxMatiere, modelePour, PERIODES, toutesMatieres,
} from './modeles';
import { appreciation, baremeMoyenne, cle, formatRang, indexer, nombre, resultatsPeriode } from './calcul';
import { Appreciation, Classe, Eleve, NotesService } from './notes.service';

type Etat = 'enregistrement' | 'ok' | 'erreur';

@Component({
  selector: 'app-saisie',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="np-page">
      <a routerLink="/admin/classes" class="np-fil">‹ Classes</a>
      @if (classe(); as c) {
        <div class="np-titre">
          <div>
            <h1>Saisie des notes</h1>
            <p>{{ c.nom }} · {{ c.annee }} · moyenne sur {{ baremeMoy() }}</p>
          </div>
          <div class="np-segment">
            <button [class.actif]="vue() === 'classe'" (click)="vue.set('classe')">Toute la classe</button>
            <button [class.actif]="vue() === 'eleve'" (click)="vue.set('eleve')">Un élève à la fois</button>
          </div>
        </div>

        <!-- Choix du relevé, de la période et de l'évaluation -->
        <div class="np-carte barre-choix">
          <div class="choix">
            <span class="np-libelle">Relevé</span>
            <div class="np-segment">
              @for (b of bulletins(); track b) {
                <button [class.actif]="bulletin() === b" (click)="changerBulletin(b)">{{ libelles[b] }}</button>
              }
            </div>
          </div>
          <div class="choix">
            <span class="np-libelle">Période</span>
            <div class="np-segment">
              @for (p of periodes; track p) {
                <button [class.actif]="periode() === p" (click)="periode.set(p)">{{ libellePeriode(bulletin(), p) }}</button>
              }
            </div>
          </div>
          @if (modele().evaluations.length > 1) {
            <div class="choix">
              <span class="np-libelle">Évaluation</span>
              <div class="np-segment">
                @for (ev of modele().evaluations; track ev) {
                  <button [class.actif]="evaluation() === ev" (click)="evaluation.set(ev)">{{ libEval[ev] }}</button>
                }
              </div>
            </div>
          }
        </div>

        @if (evaluation() !== modele().evaluationComptee) {
          <p class="info">Les notes de contrôle s'affichent sur le bulletin mais ne comptent pas dans la moyenne : seule la composition compte.</p>
        }
        @if (erreur()) { <p class="np-erreur">{{ erreur() }}</p> }

        <!-- ================= Vue : toute la classe ================= -->
        @if (vue() === 'classe') {
          <div class="np-carte">
            <div class="np-bandeau">
              <div>
                <h2>{{ libelles[bulletin()] }} — {{ libellePeriode(bulletin(), periode()) }}</h2>
                <p>Tapez la note puis <kbd>Entrée</kbd> : on passe à l'élève suivant. Chaque note est enregistrée automatiquement.</p>
              </div>
              <div class="progression" [title]="progression().faites + ' notes saisies sur ' + progression().total">
                <span>{{ progression().faites }} / {{ progression().total }} notes saisies</span>
                <div class="jauge"><div [style.width.%]="progression().pct"></div></div>
              </div>
            </div>
            <div class="defile">
              <table class="tableau-notes">
                <thead>
                  <tr class="domaines">
                    <th class="fixe"></th>
                    @for (d of modele().domaines; track d.nom) {
                      <th [attr.colspan]="d.matieres.length">{{ d.nom }}</th>
                    }
                    <th></th><th class="calc c-total"></th><th class="calc c-moy"></th><th class="calc c-rang"></th>
                  </tr>
                  <tr>
                    <th class="fixe g">Élève</th>
                    @for (mat of matieres(); track mat.code) {
                      <th class="note" [title]="mat.nom">
                        <span class="nom-mat">{{ bulletin() === 'ar' && mat.nomAr ? mat.nomAr : mat.nom }}</span>
                        <small>/{{ max(mat) }}</small>
                      </th>
                    }
                    <th class="g">Observation</th>
                    <th class="calc c-total">Total</th><th class="calc c-moy">Moyenne</th><th class="calc c-rang">Rang</th>
                  </tr>
                </thead>
                <tbody>
                  @for (e of eleves(); track e.id; let i = $index) {
                    @let r = resultats().get(e.id!);
                    <tr>
                      <td class="fixe g">
                        <span class="num">{{ i + 1 }}</span>
                        <button class="nom-eleve" (click)="ouvrirEleve(i)">{{ e.prenom }} {{ e.nom }}</button>
                      </td>
                      @for (mat of matieres(); track mat.code; let j = $index) {
                        <td class="note">
                          <input type="text" inputmode="decimal" [id]="'n-' + i + '-' + j" [class]="etatCase(e.id!, mat.code)"
                            [value]="valeur(e.id!, mat.code)" (change)="enregistrer(e.id!, mat, $any($event.target))"
                            (keydown.enter)="suivant(i, j, $event)" [attr.aria-label]="mat.nom + ' — ' + e.prenom + ' ' + e.nom">
                        </td>
                      }
                      <td><input class="obs" type="text" maxlength="300" placeholder="Observation…" [value]="observation(e.id!)"
                        (change)="enregistrerObservation(e.id!, $any($event.target).value)"></td>
                      <td class="calc c-total">{{ nombre(r?.total) }}</td>
                      <td class="calc c-moy">
                        @if (r?.moyenne !== null && r?.moyenne !== undefined) {
                          <span class="np-pill" [class]="'np-pill np-' + appr(r!.moyenne)?.niveau">{{ nombre(r!.moyenne) }}</span>
                        }
                      </td>
                      <td class="calc c-rang"><b>{{ formatRang(r?.rang ?? null, r?.exAequo) }}</b></td>
                    </tr>
                  } @empty {
                    <tr><td [attr.colspan]="matieres().length + 5" class="vide">
                      Aucun élève. <a [routerLink]="['/admin/classes', c.id]">Inscrivez des élèves dans la classe</a>.
                    </td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- ================= Vue : un élève à la fois ================= -->
        @if (vue() === 'eleve' && eleveCourant(); as e) {
          @let r = resultats().get(e.id!);
          <div class="np-carte">
            <div class="np-bandeau">
              <div>
                <h2>{{ e.prenom }} {{ e.nom }}</h2>
                <p>{{ libelles[bulletin()] }} — {{ libellePeriode(bulletin(), periode()) }}{{ evaluation() === 'controle' ? ' · contrôle' : '' }}</p>
              </div>
              <div class="nav-eleve">
                <button class="np-btn" (click)="ouvrirEleve(indexEleve() - 1)" [disabled]="indexEleve() === 0">‹ Précédent</button>
                <span>{{ indexEleve() + 1 }} / {{ eleves().length }}</span>
                <button class="np-btn" (click)="ouvrirEleve(indexEleve() + 1)" [disabled]="indexEleve() >= eleves().length - 1">Suivant ›</button>
              </div>
            </div>
            <table class="np-table">
              <thead><tr><th>Domaine</th><th>Matière</th><th class="np-num">Max</th><th class="np-num">Note</th><th>Appréciation</th></tr></thead>
              <tbody>
                @for (d of modele().domaines; track d.nom) {
                  @for (mat of d.matieres; track mat.code; let mi = $index) {
                    @let v = note(e.id!, mat.code);
                    <tr>
                      <td class="dom">{{ mi === 0 ? d.nom : '' }}</td>
                      <td>{{ mat.nom }}@if (mat.nomAr) { <span class="np-sous ar">{{ mat.nomAr }}</span> }</td>
                      <td class="np-num">{{ max(mat) }}</td>
                      <td class="np-num">
                        <input class="note-fiche" type="text" inputmode="decimal" [id]="'f-' + mat.code" [class]="'note-fiche ' + etatCase(e.id!, mat.code)"
                          [value]="valeur(e.id!, mat.code)" (change)="enregistrer(e.id!, mat, $any($event.target))"
                          (keydown.enter)="suivantFiche(mat.code, $event)">
                      </td>
                      <td>@if (appr(v, max(mat)); as a) { <span [class]="'np-pill np-' + a.niveau">{{ a.texte }}</span> }</td>
                    </tr>
                  }
                }
              </tbody>
            </table>
            <div class="obs-fiche">
              <label class="np-libelle" for="obs-fiche">Observation du maître</label>
              <input id="obs-fiche" type="text" maxlength="300" [value]="observation(e.id!)" placeholder="Ex. Bon travail, peut mieux faire en calcul."
                (change)="enregistrerObservation(e.id!, $any($event.target).value)">
            </div>
            <div class="np-resume">
              <div class="principal"><span class="np-libelle">Moyenne</span>
                <div class="np-grand">{{ nombre(r?.moyenne) || '—' }} <small>/ {{ baremeMoy() }}</small></div></div>
              <div><span class="np-libelle">Total</span><div class="np-valeur gros">{{ nombre(r?.total) || '—' }} <small>/ {{ r?.totalMax || totalMax() }}</small></div></div>
              <div><span class="np-libelle">Rang</span><div class="np-valeur gros">{{ formatRang(r?.rang ?? null, r?.exAequo) || '—' }} <small>/ {{ eleves().length }}</small></div></div>
              <div><span class="np-libelle">Mention</span>
                <div>@if (appr(r?.moyenne)?.texte; as t) { <span [class]="'np-pill np-' + appr(r?.moyenne)!.niveau">{{ t }}</span> } @else { — }</div></div>
              <div><span class="np-libelle">Notes saisies</span><div class="np-valeur gros">{{ r?.nbNotes ?? 0 }} <small>/ {{ matieres().length }}</small></div></div>
            </div>
          </div>
        }
        @if (vue() === 'eleve' && !eleves().length) {
          <p class="vide">Aucun élève. <a [routerLink]="['/admin/classes', c.id]">Inscrivez des élèves dans la classe</a>.</p>
        }
      }
    </div>
  `,
  styles: `
    .barre-choix { display: flex; flex-wrap: wrap; gap: 16px 20px; padding: 16px 22px; align-items: flex-end; }
    .choix { display: flex; flex-direction: column; gap: 6px; }
    .progression { display: flex; flex-direction: column; gap: 8px; min-width: 200px; font-size: .88rem; font-weight: 600; }
    .jauge { height: 8px; background: rgba(255,255,255,.15); border-radius: 99px; overflow: hidden; }
    .jauge div { height: 100%; background: var(--or); border-radius: 99px; transition: width .3s; }
    .info { background: #fff4e0; color: #8a5a00; padding: 10px 14px; border-radius: 10px; font-size: .9rem; margin: 0; }
    kbd { background: rgba(255,255,255,.15); border-radius: 4px; padding: 1px 6px; font-size: .8rem; }
    .defile { overflow-x: auto; }
    .tableau-notes { border-collapse: separate; border-spacing: 0; font-size: .88rem; min-width: 100%; }
    .tableau-notes th { background: #fbfcfd; color: #6b7387; font-weight: 600; padding: 10px 6px; border-bottom: 1px solid #e3e6ec; vertical-align: bottom; }
    .tableau-notes .domaines th { font-size: .68rem; letter-spacing: .06em; text-transform: uppercase; color: var(--vert); background: #f3f8f5;
      border-left: 1px solid #e3e6ec; padding: 8px 6px; text-align: center; }
    .tableau-notes td { padding: 6px; border-bottom: 1px solid #eef0f4; background: #fff; }
    .tableau-notes tbody tr:hover td { background: #fafbfd; }
    .g { text-align: left; }
    .fixe { position: sticky; left: 0; z-index: 2; min-width: 210px; padding-left: 18px !important; border-right: 1px solid #e3e6ec; }
    th.fixe { background: #fbfcfd !important; }
    .num { display: inline-block; width: 22px; color: #9aa1b2; font-size: .8rem; }
    .nom-eleve { font: inherit; font-weight: 600; color: var(--texte); background: none; border: 0; padding: 0; cursor: pointer; text-align: left; }
    .nom-eleve:hover { color: var(--vert); text-decoration: underline; }
    th.note { width: 72px; min-width: 72px; font-size: .74rem; text-align: center; color: var(--bleu-nuit); }
    .nom-mat { display: block; line-height: 1.2; overflow-wrap: anywhere; hyphens: auto; }
    th small { color: #9aa1b2; font-weight: 500; }
    td.note { text-align: center; }
    td.note input, .note-fiche {
      width: 60px; font: inherit; font-weight: 600; text-align: center; padding: 8px 4px; color: var(--bleu-nuit);
      border: 1px solid #d5dae3; border-radius: 8px; background: #fff; transition: background .2s;
    }
    td.note input:focus, .note-fiche:focus, .obs:focus { outline: 2px solid var(--bleu-nuit); border-color: transparent; }
    input.enregistrement { background: #fff8e6 !important; }
    input.ok { background: #e9f6ee !important; border-color: #b9dfc8 !important; }
    input.erreur { background: #fdecea !important; border-color: #e0a39c !important; }
    .obs { width: 220px; font: inherit; font-size: .85rem; padding: 8px 10px; border: 1px solid #d5dae3; border-radius: 8px; }
    /* Total, moyenne et rang restent visibles à droite pendant le défilement */
    .calc { position: sticky; z-index: 1; text-align: center; white-space: nowrap; width: 76px; min-width: 76px; max-width: 76px;
      background: #f6f8fb !important; font-variant-numeric: tabular-nums; }
    th.calc { color: var(--bleu-nuit) !important; }
    .c-rang { right: 0; }
    .c-moy { right: 76px; }
    .c-total { right: 152px; border-left: 1px solid #e3e6ec; box-shadow: -6px 0 8px -6px rgba(19,37,74,.18); }
    .vide { text-align: center; color: var(--texte-doux); padding: 32px !important; }
    .nav-eleve { display: flex; align-items: center; gap: 10px; color: #b9c3d8; font-size: .9rem; }
    .nav-eleve .np-btn { background: transparent; color: #fff; border-color: rgba(255,255,255,.35); }
    .nav-eleve .np-btn[disabled] { opacity: .35; }
    .dom { color: var(--vert); font-weight: 600; font-size: .85rem; width: 190px; }
    .ar { font-family: 'Amiri', serif; font-size: .95rem; }
    .note-fiche { width: 76px; }
    .obs-fiche { display: flex; flex-direction: column; gap: 6px; padding: 16px 22px; border-top: 1px solid #eef0f4; }
    .obs-fiche input { font: inherit; padding: 10px 12px; border: 1px solid #d5dae3; border-radius: 10px; }
    .gros { font-size: 1.35rem; }
    .gros small { font-size: .85rem; color: var(--texte-doux); font-weight: 500; }
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

  vue = signal<'classe' | 'eleve'>('classe');
  indexEleve = signal(0);
  eleveCourant = computed(() => this.eleves()[this.indexEleve()] ?? null);

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
  totalMax() { return this.matieres().reduce((t, m) => t + this.max(m), 0); }

  /** Appréciation d'une note (ou de la moyenne si aucun maximum n'est donné). */
  appr(v: number | null | undefined, max = this.baremeMoy()) { return appreciation(v, max); }
  note(eleveId: number, matiere: string) { return this.idx().get(cle(eleveId, this.periode(), this.evaluation(), matiere)); }

  /** Nombre de notes saisies pour la période et l'évaluation affichées. */
  progression = computed(() => {
    const total = this.eleves().length * this.matieres().length;
    let faites = 0;
    for (const e of this.eleves()) for (const m of this.matieres())
      if (this.idx().has(cle(e.id!, this.periode(), this.evaluation(), m.code))) faites++;
    return { faites, total, pct: total ? Math.round((faites / total) * 100) : 0 };
  });

  ouvrirEleve(i: number) {
    if (i < 0 || i >= this.eleves().length) return;
    this.indexEleve.set(i);
    this.vue.set('eleve');
    setTimeout(() => (document.querySelector('.note-fiche') as HTMLInputElement | null)?.focus());
  }

  /** Vue « un élève » : Entrée passe à la matière suivante, puis à l'élève suivant. */
  suivantFiche(code: string, ev: Event) {
    ev.preventDefault();
    const codes = this.matieres().map((m) => m.code);
    const i = codes.indexOf(code);
    if (i < codes.length - 1) {
      const champ = document.getElementById('f-' + codes[i + 1]) as HTMLInputElement | null;
      champ?.focus(); champ?.select();
    } else {
      (ev.target as HTMLInputElement).blur();
      this.ouvrirEleve(this.indexEleve() + 1);
    }
  }

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
