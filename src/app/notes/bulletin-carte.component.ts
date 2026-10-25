import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { libellePeriode, Matiere, maxMatiere } from './modeles';
import { appreciation, baremeMoyenne, cle, formatRang, nombre } from './calcul';
import { DonneesBulletin, LigneBulletin } from './donnees-bulletin';
import { ECOLE } from '../data/ecole';
import { texteAssiduite } from '../absences/regles';

/**
 * Carte « bulletin de notes » d'un élève (affichage à l'écran et impression).
 * Utilisée dans l'espace administrateur et dans l'espace parents.
 */
@Component({
  selector: 'app-bulletin-carte',
  imports: [DatePipe],
  template: `
    <div class="np-carte bulletin-imprimable">
      <div class="np-bandeau">
        <div class="ecole">
          <img src="logo-256.png" alt="" width="58" height="58">
          <div>
            <h2>École franco-arabe Keur Papa Djibril Kor</h2>
            <p>Année scolaire {{ d().classe.annee }} · {{ d().classe.etablissement }} · Tél. {{ ecole.telephones[0] }}</p>
          </div>
        </div>
        <span class="np-badge-contour">
          {{ titreReleve() }} — {{ onglet() === 'annee' ? 'Bilan annuel' : libellePeriode(d().bulletin, $any(onglet())) }}
        </span>
      </div>

      <div class="np-infos">
        <div><span class="np-libelle">Nom et prénom</span><span class="np-valeur">{{ ligne().eleve.prenom }} {{ ligne().eleve.nom }}</span></div>
        <div><span class="np-libelle">Matricule</span><span class="np-valeur">{{ ligne().eleve.matricule || '—' }}</span></div>
        <div><span class="np-libelle">Classe</span><span class="np-valeur">{{ d().classe.nom }}</span></div>
        <div><span class="np-libelle">Date de naissance</span>
          <span class="np-valeur">{{ (ligne().eleve.date_naissance | date: 'dd/MM/yyyy') || '—' }}</span></div>
      </div>

      @if (onglet() !== 'annee') {
        @let p = $any(onglet());
        @let r = ligne().periodes[p - 1];
        <div class="defile">
          <table class="np-table">
            <thead>
              <tr>
                <th>Domaine</th><th>Matière</th><th class="np-num">Max</th>
                @if (avecControle()) { <th class="np-num">Contrôle</th><th class="np-num">Composition</th> }
                @else { <th class="np-num">Note</th> }
                <th class="np-num">Sur {{ bareme() }}</th><th>Appréciation</th>
              </tr>
            </thead>
            <tbody>
              @for (dom of d().modele.domaines; track dom.nom) {
                @for (mat of dom.matieres; track mat.code; let mi = $index) {
                  @let v = note(ligne().eleve.id!, p, 'composition', mat);
                  @let a = appr(v, max(mat));
                  <tr [class.debut]="mi === 0">
                    <td class="dom">{{ mi === 0 ? dom.nom : '' }}</td>
                    <td>{{ mat.nom }}@if (mat.nomAr) { <span class="np-sous ar">{{ mat.nomAr }}</span> }</td>
                    <td class="np-num doux">{{ max(mat) }}</td>
                    @if (avecControle()) { <td class="np-num doux">{{ nombre(note(ligne().eleve.id!, p, 'controle', mat)) || '—' }}</td> }
                    <td class="np-num"><b>{{ nombre(v) || '—' }}</b></td>
                    <td class="np-num">
                      @if (v !== undefined) { <b [class]="'np-note-' + a?.niveau">{{ nombre(ramene(v, mat)) }}</b> } @else { <span class="doux">—</span> }
                    </td>
                    <td>@if (a) { <span [class]="'np-pill np-' + a.niveau">{{ a.texte }}</span> }</td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
        @if (ligne().assiduite; as assi) {
          <div class="assiduite"><span class="np-libelle">Assiduité du trimestre</span>{{ texteAssiduite(assi[p - 1]) }}</div>
        }
        @if (ligne().observations[p - 1]) {
          <div class="observation"><span class="np-libelle">Observation du maître</span>{{ ligne().observations[p - 1] }}</div>
        }
        <div class="np-resume">
          <div class="principal"><span class="np-libelle">Moyenne générale</span>
            <div class="np-grand">{{ nombre(r?.moyenne) || '—' }} <small>/ {{ bareme() }}</small></div></div>
          <div><span class="np-libelle">Total des points</span>
            <div class="moyen">{{ nombre(r?.total) || '—' }} <small>/ {{ r?.totalMax || '—' }}</small></div></div>
          <div><span class="np-libelle">Rang</span>
            <div class="moyen">{{ formatRang(r?.rang ?? null, r?.exAequo) || '—' }} <small>/ {{ d().nbEleves }}</small></div></div>
          <div><span class="np-libelle">Mention</span>
            <div class="pastille-bas">@if (appr(r?.moyenne); as a) { <span [class]="'np-pill np-' + a.niveau">{{ a.texte }}</span> } @else { — }</div></div>
          <div><span class="np-libelle">Classe</span>
            <div class="classe-stats">Moy. {{ nombre(d().stats[p - 1].moyenneClasse) || '—' }}
              <small>Max {{ nombre(d().stats[p - 1].plusForte) || '—' }} · Min {{ nombre(d().stats[p - 1].plusFaible) || '—' }}</small></div></div>
        </div>
      } @else {
        <table class="np-table">
          <thead><tr><th>Période</th><th class="np-num">Moyenne</th><th class="np-num">Rang</th><th>Mention</th><th>Observation</th></tr></thead>
          <tbody>
            @for (r of ligne().periodes; track $index) {
              <tr>
                <td><b>{{ libellePeriode(d().bulletin, $index + 1) }}</b></td>
                <td class="np-num"><b [class]="'np-note-' + appr(r?.moyenne)?.niveau">{{ nombre(r?.moyenne) || '—' }}</b></td>
                <td class="np-num">{{ formatRang(r?.rang ?? null, r?.exAequo) || '—' }}</td>
                <td>@if (appr(r?.moyenne); as a) { <span [class]="'np-pill np-' + a.niveau">{{ a.texte }}</span> }</td>
                <td class="obs">{{ ligne().observations[$index] }}</td>
              </tr>
            }
          </tbody>
        </table>
        @if (ligne().assiduite; as assi) {
          <div class="assiduite"><span class="np-libelle">Assiduité de l'année</span>{{ texteAssiduite(assi[3]) }}</div>
        }
        <div class="np-resume">
          <div class="principal"><span class="np-libelle">Moyenne annuelle</span>
            <div class="np-grand">{{ nombre(ligne().annuel.moyenne) || '—' }} <small>/ {{ bareme() }}</small></div></div>
          <div><span class="np-libelle">Rang annuel</span>
            <div class="moyen">{{ formatRang(ligne().annuel.rang, ligne().annuel.exAequo) || '—' }} <small>/ {{ d().nbEleves }}</small></div></div>
          <div><span class="np-libelle">Mention</span>
            <div class="pastille-bas">@if (appr(ligne().annuel.moyenne); as a) { <span [class]="'np-pill np-' + a.niveau">{{ a.texte }}</span> } @else { — }</div></div>
          <div><span class="np-libelle">Décision du conseil</span>
            <div class="pastille-bas">@if (ligne().decision) { <span class="np-pill" [class]="'np-pill ' + classeDecision(ligne().decision)">{{ ligne().decision }}</span> } @else { <span class="doux">À décider</span> }</div></div>
        </div>
      }
      <!-- Zones de signature -->
      <div class="signatures">
        <p class="fait-a">Fait à {{ ecole.ville }}, le {{ aujourdhui | date: 'd MMMM y' }}</p>
        <div class="cases">
          <div class="case"><span class="np-libelle">Le (la) maître(sse)</span><span class="nom-sign">{{ d().classe.maitre }}</span></div>
          <div class="case direction"><span class="np-libelle">{{ ecole.signatureDirection }}</span><span class="cachet">Cachet et signature</span></div>
          <div class="case"><span class="np-libelle">Le parent</span><span class="nom-sign">Vu et pris connaissance</span></div>
        </div>
      </div>
      <p class="np-note-bas">{{ regle() }}</p>
    </div>
  `,
  styles: `
    .ecole { display: flex; align-items: center; gap: 14px; }
    .ecole img { width: 58px; height: 58px; border-radius: 50%; background: #fff; padding: 2px; flex-shrink: 0; }
    .outils { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .droite { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
    .defile { overflow-x: auto; }
    .dom { color: var(--vert); font-weight: 600; font-size: .85rem; width: 200px; }
    tr.debut td { border-top: 1px solid #e3e6ec; }
    .doux { color: #9aa1b2; }
    .ar { font-family: 'Amiri', serif; font-size: .95rem; }
    .observation { display: flex; flex-direction: column; gap: 4px; padding: 14px 22px; border-top: 1px solid #eef0f4; font-style: italic; }
    .observation .np-libelle { font-style: normal; }
    .assiduite { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; padding: 10px 22px; border-top: 1px solid #eef0f4; font-size: .9rem; }
    .moyen { font-size: 1.4rem; font-weight: 700; color: var(--bleu-nuit); line-height: 1.3; }
    .moyen small, .classe-stats small { font-size: .85rem; color: var(--texte-doux); font-weight: 500; }
    .classe-stats { font-weight: 700; color: var(--bleu-nuit); display: flex; flex-direction: column; margin-top: 4px; }
    .pastille-bas { margin-top: 8px; }
    .obs { color: var(--texte-doux); font-size: .88rem; }
    .signatures { padding: 18px 22px 22px; border-top: 1px solid #e3e6ec; }
    .fait-a { margin: 0 0 12px; text-align: right; font-size: .88rem; color: var(--texte-doux); }
    .cases { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .case { border: 1px dashed #c9cfda; border-radius: 12px; min-height: 120px; padding: 12px 14px;
      display: flex; flex-direction: column; justify-content: space-between; }
    .case.direction { border: 1.5px solid var(--bleu-nuit); background: #fbfcfe; }
    .nom-sign { font-size: .85rem; color: var(--texte-doux); }
    .cachet { align-self: center; font-size: .75rem; color: #b0b6c3; border: 1px dashed #d5dae3; border-radius: 50%;
      width: 76px; height: 76px; display: grid; place-items: center; text-align: center; line-height: 1.2; }
    .bas { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: center; text-align: center; }
    .bas span { color: var(--texte-doux); font-size: .88rem; max-width: 520px; }
    .grand-btn { padding: 14px 28px; font-size: 1rem; }
    @media (max-width: 640px) { .cases { grid-template-columns: 1fr; } }
  `,
})
export class BulletinCarteComponent {
  d = input.required<DonneesBulletin>();
  ligne = input.required<LigneBulletin>();
  onglet = input<number | 'annee'>(1);
  /** Masque les zones de signature (ex. consultation par le parent). */
  sansSignatures = input(false);

  libellePeriode = libellePeriode;
  nombre = nombre;
  formatRang = formatRang;
  texteAssiduite = texteAssiduite;
  ecole = ECOLE;
  aujourdhui = new Date();

  bareme = computed(() => baremeMoyenne(this.d().classe, this.d().bulletin));
  avecControle = computed(() => this.d().modele.evaluations.includes('controle'));
  titreReleve = computed(() => ({ fr: 'Relevé de notes', ar: 'كشف الدرجات', en: 'Report card' })[this.d().bulletin]);
  regle = computed(() =>
    `Moyenne = total des notes ÷ total des maximums × ${this.bareme()}` +
    (this.avecControle() ? ' · seule la composition compte, le contrôle est indiqué pour information' : '') +
    ' · Moyenne annuelle = moyenne des trimestres.');

  max(mat: Matiere) { return maxMatiere(this.d().classe, this.d().bulletin, mat); }
  note(eleveId: number, p: number, ev: string, mat: Matiere) { return this.d().idx.get(cle(eleveId, p, ev, mat.code)); }
  /** Note ramenée sur le barème de la classe (ex. 15/20 → 7,5/10). */
  ramene(v: number, mat: Matiere) { return Math.round((v / this.max(mat)) * this.bareme() * 100) / 100; }
  appr(v: number | null | undefined, max = this.bareme()) { return appreciation(v, max); }
  classeDecision(dec: string) {
    if (dec.startsWith('Passe')) return 'np-tb';
    if (dec.startsWith('Exclu') || dec.startsWith('Redouble')) return 'np-i';
    return 'np-p';
  }
}
