import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BulletinCode, LIBELLES_BULLETIN, libellePeriode, Matiere, maxMatiere, PERIODES } from './modeles';
import { appreciation, baremeMoyenne, cle, formatRang, nombre } from './calcul';
import { chargerBulletins, DonneesBulletin } from './donnees-bulletin';
import { Classe, NotesService } from './notes.service';

/** Bulletin d'un élève à l'écran (consultation). L'impression garde les modèles papier de l'école. */
@Component({
  selector: 'app-bulletin-eleve',
  imports: [RouterLink, DatePipe],
  template: `
    <div class="np-page">
      <a [routerLink]="['/admin/classes', classe()]" class="np-fil">‹ Élèves</a>

      <div class="np-titre">
        <h1>Bulletin de notes</h1>
        <div class="np-segment">
          @for (p of periodes; track p) {
            <button [class.actif]="onglet() === p" (click)="onglet.set(p)">{{ libellePeriode(bulletin(), p) }}</button>
          }
          @if (bulletin() !== 'en') {
            <button [class.actif]="onglet() === 'annee'" (click)="onglet.set('annee')">{{ bulletin() === 'ar' ? 'السنوي' : 'Année' }}</button>
          }
        </div>
      </div>

      @if (erreur()) { <p class="np-erreur">{{ erreur() }}</p> }

      @if (donnees(); as d) {
        @if (ligne(); as l) {
          <div class="outils">
            @if (relevesDispo(d.classe).length > 1) {
              <div class="np-segment">
                @for (b of relevesDispo(d.classe); track b) {
                  <button [class.actif]="bulletin() === b" (click)="changerReleve(b)">{{ libelles[b] }}</button>
                }
              </div>
            }
            <div class="droite">
              <button class="np-btn" (click)="voisin(-1)" [disabled]="position() <= 0">‹ Élève précédent</button>
              <button class="np-btn" (click)="voisin(1)" [disabled]="position() >= d.lignes.length - 1">Élève suivant ›</button>
              <a class="np-btn vert" [routerLink]="['/admin/saisie', classe()]">Saisir les notes</a>
              <a class="np-btn or" target="_blank" [href]="lienImpression()">🖨 Imprimer</a>
            </div>
          </div>

          <div class="np-carte">
            <div class="np-bandeau">
              <div>
                <h2>École franco-arabe Keur Papa Djibril Kor</h2>
                <p>Année scolaire {{ d.classe.annee }} · {{ d.classe.etablissement }}</p>
              </div>
              <span class="np-badge-contour">
                {{ titreReleve() }} — {{ onglet() === 'annee' ? 'Bilan annuel' : libellePeriode(bulletin(), $any(onglet())) }}
              </span>
            </div>

            <div class="np-infos">
              <div><span class="np-libelle">Nom et prénom</span><span class="np-valeur">{{ l.eleve.prenom }} {{ l.eleve.nom }}</span></div>
              <div><span class="np-libelle">Matricule</span><span class="np-valeur">{{ l.eleve.matricule || '—' }}</span></div>
              <div><span class="np-libelle">Classe</span><span class="np-valeur">{{ d.classe.nom }}</span></div>
              <div><span class="np-libelle">Date de naissance</span>
                <span class="np-valeur">{{ (l.eleve.date_naissance | date: 'dd/MM/yyyy') || '—' }}</span></div>
            </div>

            @if (onglet() !== 'annee') {
              @let p = $any(onglet());
              @let r = l.periodes[p - 1];
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
                    @for (dom of d.modele.domaines; track dom.nom) {
                      @for (mat of dom.matieres; track mat.code; let mi = $index) {
                        @let v = note(d, l.eleve.id!, p, 'composition', mat);
                        @let a = appr(v, max(d, mat));
                        <tr [class.debut]="mi === 0">
                          <td class="dom">{{ mi === 0 ? dom.nom : '' }}</td>
                          <td>{{ mat.nom }}@if (mat.nomAr) { <span class="np-sous ar">{{ mat.nomAr }}</span> }</td>
                          <td class="np-num doux">{{ max(d, mat) }}</td>
                          @if (avecControle()) { <td class="np-num doux">{{ nombre(note(d, l.eleve.id!, p, 'controle', mat)) || '—' }}</td> }
                          <td class="np-num"><b>{{ nombre(v) || '—' }}</b></td>
                          <td class="np-num">
                            @if (v !== undefined) { <b [class]="'np-note-' + a?.niveau">{{ nombre(ramene(v, d, mat)) }}</b> } @else { <span class="doux">—</span> }
                          </td>
                          <td>@if (a) { <span [class]="'np-pill np-' + a.niveau">{{ a.texte }}</span> }</td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
              @if (l.observations[p - 1]) {
                <div class="observation"><span class="np-libelle">Observation du maître</span>{{ l.observations[p - 1] }}</div>
              }
              <div class="np-resume">
                <div class="principal"><span class="np-libelle">Moyenne générale</span>
                  <div class="np-grand">{{ nombre(r?.moyenne) || '—' }} <small>/ {{ bareme() }}</small></div></div>
                <div><span class="np-libelle">Total des points</span>
                  <div class="moyen">{{ nombre(r?.total) || '—' }} <small>/ {{ r?.totalMax || '—' }}</small></div></div>
                <div><span class="np-libelle">Rang</span>
                  <div class="moyen">{{ formatRang(r?.rang ?? null, r?.exAequo) || '—' }} <small>/ {{ d.nbEleves }}</small></div></div>
                <div><span class="np-libelle">Mention</span>
                  <div class="pastille-bas">@if (appr(r?.moyenne); as a) { <span [class]="'np-pill np-' + a.niveau">{{ a.texte }}</span> } @else { — }</div></div>
                <div><span class="np-libelle">Classe</span>
                  <div class="classe-stats">Moy. {{ nombre(d.stats[p - 1].moyenneClasse) || '—' }}
                    <small>Max {{ nombre(d.stats[p - 1].plusForte) || '—' }} · Min {{ nombre(d.stats[p - 1].plusFaible) || '—' }}</small></div></div>
              </div>
            } @else {
              <table class="np-table">
                <thead><tr><th>Période</th><th class="np-num">Moyenne</th><th class="np-num">Rang</th><th>Mention</th><th>Observation</th></tr></thead>
                <tbody>
                  @for (r of l.periodes; track $index) {
                    <tr>
                      <td><b>{{ libellePeriode(bulletin(), $index + 1) }}</b></td>
                      <td class="np-num"><b [class]="'np-note-' + appr(r?.moyenne)?.niveau">{{ nombre(r?.moyenne) || '—' }}</b></td>
                      <td class="np-num">{{ formatRang(r?.rang ?? null, r?.exAequo) || '—' }}</td>
                      <td>@if (appr(r?.moyenne); as a) { <span [class]="'np-pill np-' + a.niveau">{{ a.texte }}</span> }</td>
                      <td class="obs">{{ l.observations[$index] }}</td>
                    </tr>
                  }
                </tbody>
              </table>
              <div class="np-resume">
                <div class="principal"><span class="np-libelle">Moyenne annuelle</span>
                  <div class="np-grand">{{ nombre(l.annuel.moyenne) || '—' }} <small>/ {{ bareme() }}</small></div></div>
                <div><span class="np-libelle">Rang annuel</span>
                  <div class="moyen">{{ formatRang(l.annuel.rang, l.annuel.exAequo) || '—' }} <small>/ {{ d.nbEleves }}</small></div></div>
                <div><span class="np-libelle">Mention</span>
                  <div class="pastille-bas">@if (appr(l.annuel.moyenne); as a) { <span [class]="'np-pill np-' + a.niveau">{{ a.texte }}</span> } @else { — }</div></div>
                <div><span class="np-libelle">Décision du conseil</span>
                  <div class="pastille-bas">@if (l.decision) { <span class="np-pill" [class]="'np-pill ' + classeDecision(l.decision)">{{ l.decision }}</span> } @else { <span class="doux">À décider</span> }</div></div>
              </div>
            }
            <p class="np-note-bas">{{ regle() }}</p>
          </div>
        } @else {
          <p class="np-erreur">Élève introuvable dans cette classe.</p>
        }
      } @else if (!erreur()) {
        <p class="doux">Chargement du bulletin…</p>
      }
    </div>
  `,
  styles: `
    .outils { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .droite { display: flex; gap: 8px; flex-wrap: wrap; margin-left: auto; }
    .defile { overflow-x: auto; }
    .dom { color: var(--vert); font-weight: 600; font-size: .85rem; width: 200px; }
    tr.debut td { border-top: 1px solid #e3e6ec; }
    .doux { color: #9aa1b2; }
    .ar { font-family: 'Amiri', serif; font-size: .95rem; }
    .observation { display: flex; flex-direction: column; gap: 4px; padding: 14px 22px; border-top: 1px solid #eef0f4; font-style: italic; }
    .observation .np-libelle { font-style: normal; }
    .moyen { font-size: 1.4rem; font-weight: 700; color: var(--bleu-nuit); line-height: 1.3; }
    .moyen small, .classe-stats small { font-size: .85rem; color: var(--texte-doux); font-weight: 500; }
    .classe-stats { font-weight: 700; color: var(--bleu-nuit); display: flex; flex-direction: column; margin-top: 4px; }
    .pastille-bas { margin-top: 8px; }
    .obs { color: var(--texte-doux); font-size: .88rem; }
  `,
})
export class BulletinEleveComponent implements OnInit {
  classe = input.required<string>();
  eleve = input.required<string>();
  private ns = inject(NotesService);
  private router = inject(Router);
  libelles = LIBELLES_BULLETIN;
  periodes = PERIODES;
  libellePeriode = libellePeriode;
  nombre = nombre;
  formatRang = formatRang;

  donnees = signal<DonneesBulletin | null>(null);
  bulletin = signal<BulletinCode>('fr');
  onglet = signal<number | 'annee'>(1);
  erreur = signal('');

  ligne = computed(() => this.donnees()?.lignes.find((l) => String(l.eleve.id) === this.eleve()) ?? null);
  position = computed(() => this.donnees()?.lignes.findIndex((l) => String(l.eleve.id) === this.eleve()) ?? -1);
  bareme = computed(() => (this.donnees() ? baremeMoyenne(this.donnees()!.classe, this.bulletin()) : 10));
  avecControle = computed(() => !!this.donnees()?.modele.evaluations.includes('controle'));
  titreReleve = computed(() => ({ fr: 'Relevé de notes', ar: 'كشف الدرجات', en: 'Report card' })[this.bulletin()]);
  regle = computed(() =>
    `Moyenne = total des notes ÷ total des maximums × ${this.bareme()}` +
    (this.avecControle() ? ' · seule la composition compte, le contrôle est indiqué pour information' : '') +
    ' · Moyenne annuelle = moyenne des trimestres.');

  async ngOnInit() { await this.charger(); }

  async charger() {
    try {
      this.donnees.set(await chargerBulletins(this.ns, Number(this.classe()), this.bulletin()));
    } catch (e) {
      this.erreur.set((e as Error).message);
    }
  }

  relevesDispo(c: Classe): BulletinCode[] {
    return ['fr', ...(c.avec_arabe ? ['ar' as const] : []), ...(c.avec_anglais ? ['en' as const] : [])];
  }

  async changerReleve(b: BulletinCode) {
    this.bulletin.set(b);
    if (b === 'en' && this.onglet() === 'annee') this.onglet.set(1);
    await this.charger();
  }

  voisin(sens: number) {
    const d = this.donnees();
    const cible = d?.lignes[this.position() + sens];
    if (cible) this.router.navigate(['/admin/eleve', this.classe(), cible.eleve.id]);
  }

  max(d: DonneesBulletin, mat: Matiere) { return maxMatiere(d.classe, d.bulletin, mat); }
  note(d: DonneesBulletin, eleveId: number, p: number, ev: string, mat: Matiere) { return d.idx.get(cle(eleveId, p, ev, mat.code)); }
  /** Note ramenée sur le barème de la classe (ex. 15/20 → 7,5/10). */
  ramene(v: number, d: DonneesBulletin, mat: Matiere) { return Math.round((v / this.max(d, mat)) * this.bareme() * 100) / 100; }
  appr(v: number | null | undefined, max = this.bareme()) { return appreciation(v, max); }
  classeDecision(dec: string) {
    if (dec.startsWith('Passe')) return 'np-tb';
    if (dec.startsWith('Exclu') || dec.startsWith('Redouble')) return 'np-i';
    return 'np-p';
  }

  lienImpression() {
    const base = document.querySelector('base')?.getAttribute('href') ?? '/';
    const q = new URLSearchParams({ bulletin: this.bulletin(), eleve: this.eleve() });
    if (this.bulletin() === 'en') q.set('periode', String(this.onglet() === 'annee' ? 1 : this.onglet()));
    return `${base}admin/impression/${this.classe()}?${q}`;
  }
}
