import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ECOLE, ETABLISSEMENTS } from '../data/ecole';
import { BulletinCode, DECISIONS, maxMatiere, Matiere, PERIODES, toutesMatieres } from './modeles';
import { baremeMoyenne, cle, formatRang, nombre } from './calcul';
import { chargerBulletins, DonneesBulletin, LigneBulletin } from './donnees-bulletin';
import { NotesService } from './notes.service';

const DECISIONS_AR: Record<string, string> = {
  'Passe en classe supérieure': 'ينتقل إلى القسم الأعلى',
  'Redouble la classe': 'يعيد السنة',
  'Test de passage': 'امتحان الانتقال',
  'Cours de vacances': 'دروس العطلة',
  'Exclu(e)': 'مفصول(ة)',
};
const EXAMENS_AR = ['الإختبار الأول', 'الإختبار الثاني', 'الإختبار الثالث'];
const TERMS_EN = ['FIRST TERM EXAMINATION', 'SECOND TERM EXAMINATION', 'THIRD TERM EXAMINATION'];

/** Page d'impression des bulletins (A4), fidèle aux relevés papier de l'école. */
@Component({
  selector: 'app-impression',
  imports: [DatePipe, NgTemplateOutlet],
  template: `
    <div class="barre no-print">
      <span>{{ titre() }}</span>
      <button (click)="imprimer()" [disabled]="!donnees()">🖨 Imprimer / Enregistrer en PDF</button>
      <button class="sec" (click)="fermer()">Fermer</button>
    </div>
    @if (erreur()) { <p class="erreur no-print">{{ erreur() }}</p> }
    @if (!donnees() && !erreur()) { <p class="chargement no-print">Préparation des bulletins…</p> }

    @if (donnees(); as d) {
      @for (l of lignes(); track l.eleve.id) {

        <!-- ================= FRANÇAIS ================= -->
        @if (d.bulletin === 'fr') {
          <section class="page paysage">
            <div class="moitie">
              <p class="important-titre">TRÈS IMPORTANT</p>
              <p class="important">Le bulletin de notes dûment signé et le cahier de compositions doivent être retournés à l'école dans un délai de trois (03) jours.</p>
              <div class="cadre-double">
                <h3 class="titre-tableau">TABLEAU GÉNÉRAL</h3>
                <table class="t">
                  <tr><th>PÉRIODE</th><th>1<sup>er</sup> TRIMESTRE</th><th>2<sup>e</sup> TRIMESTRE</th><th>3<sup>e</sup> TRIMESTRE</th><th>ANNUEL</th></tr>
                  <tr><th>MOYENNE</th>
                    @for (r of l.periodes; track $index) { <td>{{ moy(r?.moyenne, d) }}</td> }
                    <td><b>{{ moy(l.annuel.moyenne, d) }}</b></td></tr>
                  <tr><th>RANG</th>
                    @for (r of l.periodes; track $index) { <td>{{ rang(r?.rang, r?.exAequo, d) }}</td> }
                    <td><b>{{ rang(l.annuel.rang, l.annuel.exAequo, d) }}</b></td></tr>
                  <tr class="haut"><th>DÉCISION DU CONSEIL</th>
                    @for (o of l.observations; track $index) { <td class="petit-texte">{{ o }}</td> }
                    <td class="petit-texte">{{ l.decision }}</td></tr>
                </table>
              </div>
              <div class="cadre-double decision">
                <table class="t">
                  <tr><th class="g" colspan="2">DÉCISION DU CONSEIL DES MAÎTRES</th><th class="dir">{{ direction }}</th></tr>
                  @for (dec of decisions; track dec; let first = $first) {
                    <tr><td class="g">{{ dec.toUpperCase() }}</td><td class="coche">{{ l.decision === dec ? '✔' : '' }}</td>
                      @if (first) { <td [attr.rowspan]="decisions.length" class="signature"></td> }</tr>
                  }
                </table>
              </div>
              <p class="merci">MERCI DE VOTRE CONFIANCE</p>
            </div>
            <div class="moitie">
              <ng-container *ngTemplateOutlet="entete" />
              <h2 class="ecole-titre">ÉCOLE FRANCO-ARABE</h2>
              <h1 class="ecole-nom">KEUR PAPA DJIBRIL KOR</h1>
              <p class="niveaux">PRÉSCOLAIRE – ÉLÉMENTAIRE</p>
              <p class="adresse">{{ adresse(d) }} · TÉL : {{ telephones }}</p>
              <img class="logo-couverture" src="logo.png" alt="">
              <div class="cartouche">RELEVÉ DE NOTES</div>
              <div class="identite">
                <p><b>Prénom et Nom :</b> {{ l.eleve.prenom }} {{ l.eleve.nom }}</p>
                <p><b>Né(e) le :</b> {{ l.eleve.date_naissance | date: 'dd/MM/yyyy' }} <b>à :</b> {{ l.eleve.lieu_naissance }}</p>
                <p><b>Classe :</b> {{ d.classe.nom }} <b>Tenue par :</b> {{ d.classe.maitre }}</p>
                <p><b>Matricule :</b> {{ l.eleve.matricule }} <b>TÉL :</b> {{ l.eleve.telephone }}</p>
              </div>
              <p class="annee">ANNÉE SCOLAIRE : {{ d.classe.annee }}</p>
            </div>
          </section>

          <section class="page paysage">
            @if (d.modele.evaluations.length === 1) {
              <!-- Modèle 1 : composition seule -->
              <table class="t notes">
                <tr><th>Domaines</th><th>MATIÈRES</th><th>MAX</th>
                  @for (p of periodes; track p) { <th>Composition<br>{{ p === 1 ? '1er' : p + 'e' }} trimestre</th><th class="obs">observations</th> }
                </tr>
                @for (dom of d.modele.domaines; track dom.nom; let di = $index) {
                  @for (mat of dom.matieres; track mat.code; let mi = $index) {
                    <tr>
                      @if (mi === 0) { <th class="dom" [attr.rowspan]="dom.matieres.length">{{ dom.nom }}</th> }
                      <td class="g">{{ mat.nom }}</td><td>{{ max(mat, d) }}</td>
                      @for (p of periodes; track p; let pi = $index) {
                        <td>{{ note(d, l, p, 'composition', mat) }}</td>
                        @if (di === 0 && mi === 0) { <td class="obs-cell" [attr.rowspan]="nbMatieres(d) + 3">{{ l.observations[pi] }}</td> }
                      }
                    </tr>
                  }
                }
                <tr><th></th><td class="g">Total</td><td>{{ totalMax(d) }}</td>
                  @for (r of l.periodes; track $index) { <td><b>{{ nombre(r?.total) }}</b></td> }</tr>
                <tr><th></th><td class="g">Moyenne</td><td>{{ baremeMoy(d) }}</td>
                  @for (r of l.periodes; track $index) { <td><b>{{ nombre(r?.moyenne) }}</b></td> }</tr>
                <tr><th></th><td class="g">Rang</td><td>{{ d.nbEleves }}</td>
                  @for (r of l.periodes; track $index) { <td><b>{{ rang(r?.rang, r?.exAequo, d) }}</b></td> }</tr>
                <tr class="sign"><td class="g" colspan="3">Le(a) Maître(sse)</td>@for (p of periodes; track p) { <td colspan="2"></td> }</tr>
                <tr class="sign"><td class="g" colspan="3">{{ direction }}</td>@for (p of periodes; track p) { <td colspan="2"></td> }</tr>
                <tr class="sign"><td class="g" colspan="3">Le Parent</td>@for (p of periodes; track p) { <td colspan="2"></td> }</tr>
              </table>
            } @else {
              <!-- Modèle 2 : contrôle + composition -->
              <table class="t notes">
                <tr><th>Domaine</th><th>MATIÈRES</th><th>MAX</th>
                  @for (p of periodes; track p) {
                    <th>{{ p === 1 ? '1er' : p + 'e' }}<br>contrôle</th><th>{{ p === 1 ? '1re' : p + 'e' }}<br>composition</th>
                  }
                  <th class="obs">observations</th><th class="obs">Visas du parent</th>
                </tr>
                @for (dom of d.modele.domaines; track dom.nom; let di = $index) {
                  @for (mat of dom.matieres; track mat.code; let mi = $index) {
                    <tr>
                      @if (mi === 0) { <th class="dom" [attr.rowspan]="dom.matieres.length">{{ dom.nom }}</th> }
                      <td class="g">{{ mat.nom }}</td><td>{{ max(mat, d) }}</td>
                      @for (p of periodes; track p) {
                        <td class="ctrl">{{ note(d, l, p, 'controle', mat) }}</td><td>{{ note(d, l, p, 'composition', mat) }}</td>
                      }
                      @if (di === 0 && mi === 0) {
                        <td class="obs-cell" [attr.rowspan]="nbMatieres(d) + 3">
                          @for (o of l.observations; track $index) {
                            @if (o) { <p class="obs-trim"><b>{{ $index === 0 ? '1er' : ($index + 1) + 'e' }} trim. :</b> {{ o }}</p> }
                          }
                        </td>
                        <td [attr.rowspan]="nbMatieres(d) + 3"></td>
                      }
                    </tr>
                  }
                }
                <tr><th></th><td class="g">Total</td><td>{{ totalMax(d) }}</td>
                  @for (p of periodes; track p; let pi = $index) {
                    <td class="ctrl">{{ nombre(l.periodesControle[pi]?.total) }}</td><td><b>{{ nombre(l.periodes[pi]?.total) }}</b></td>
                  }</tr>
                <tr><th></th><td class="g">Moyenne</td><td>{{ baremeMoy(d) }}</td>
                  @for (p of periodes; track p; let pi = $index) {
                    <td class="ctrl">{{ nombre(l.periodesControle[pi]?.moyenne) }}</td><td><b>{{ nombre(l.periodes[pi]?.moyenne) }}</b></td>
                  }</tr>
                <tr><th></th><td class="g">Rang</td><td>{{ d.nbEleves }}</td>
                  @for (p of periodes; track p; let pi = $index) {
                    <td class="ctrl">{{ rang(l.periodesControle[pi]?.rang, l.periodesControle[pi]?.exAequo, d) }}</td>
                    <td><b>{{ rang(l.periodes[pi]?.rang, l.periodes[pi]?.exAequo, d) }}</b></td>
                  }</tr>
                <tr class="sign"><td class="g" colspan="3">Le(a) Maître(sse)</td>@for (p of periodes; track p) { <td colspan="2"></td> }<td></td><td></td></tr>
                <tr class="sign"><td class="g" colspan="3">{{ direction.toUpperCase() }}</td>@for (p of periodes; track p) { <td colspan="2"></td> }<td></td><td></td></tr>
                <tr class="sign"><td class="g" colspan="3">Le Parent</td>@for (p of periodes; track p) { <td colspan="2"></td> }<td></td><td></td></tr>
              </table>
              <p class="annuel">
                <b>MOYENNE ANNUELLE : {{ nombre(l.annuel.moyenne) || '…………' }}/{{ baremeMoy(d) }} pts</b>
                <b>RANG : {{ l.annuel.rang ?? '…………' }}/{{ d.nbEleves }} élèves</b>
              </p>
            }
          </section>
        }

        <!-- ================= ARABE ================= -->
        @if (d.bulletin === 'ar') {
          <section class="page paysage">
            <div class="moitie" dir="rtl">
              <div class="cadre-double">
                <h3 class="titre-tableau ar">الجدول العام</h3>
                <table class="t ar">
                  <tr><th>الفترة</th>@for (x of examens; track x) { <th>{{ x }}</th> }<th>السنوي</th></tr>
                  <tr><th>المعدل</th>@for (r of l.periodes; track $index) { <td>{{ moy(r?.moyenne, d) }}</td> }<td><b>{{ moy(l.annuel.moyenne, d) }}</b></td></tr>
                  <tr><th>الترتيب</th>@for (r of l.periodes; track $index) { <td>{{ rang(r?.rang, r?.exAequo, d) }}</td> }<td><b>{{ rang(l.annuel.rang, l.annuel.exAequo, d) }}</b></td></tr>
                </table>
              </div>
              <div class="cadre-double decision">
                <table class="t ar">
                  <tr><th class="noir" colspan="2">تقرير مجلس الأساتذة</th></tr>
                  @for (dec of decisions; track dec) {
                    <tr><td class="g">{{ decisionAr(dec) }}</td><td class="coche">{{ l.decision === dec ? '✔' : '' }}</td></tr>
                  }
                </table>
              </div>
            </div>
            <div class="moitie">
              <ng-container *ngTemplateOutlet="entete" />
              <p class="ecole-ligne">ÉCOLE FRANCO-ARABE « KEUR PAPA DJIBRIL KOR »</p>
              <p class="tel">TÉL : {{ telephones }}</p>
              <h1 class="ecole-nom ar">كر بابا جبريل كور</h1>
              <p class="niveaux">PRÉSCOLAIRE – ÉLÉMENTAIRE</p>
              <p class="adresse">{{ adresse(d) }}</p>
              <img class="logo-couverture" src="logo.png" alt="">
              <div class="cartouche ar">كشف الدرجات الإختبارات</div>
              <div class="identite" dir="rtl">
                <p><b>الإسم و اللقب :</b> {{ l.eleve.prenom }} {{ l.eleve.nom }}</p>
                <p><b>الفصل :</b> {{ d.classe.nom }} &nbsp; <b>المعلم(ة) :</b> {{ d.classe.maitre }}</p>
              </div>
              <div class="identite"><p><b>Matricule :</b> {{ l.eleve.matricule }} <b>TÉL :</b> {{ l.eleve.telephone }}</p></div>
              <p class="annee">ANNÉE SCOLAIRE : {{ d.classe.annee }}</p>
            </div>
          </section>

          <section class="page paysage" dir="rtl">
            <table class="t notes ar">
              <tr>
                <th colspan="2" rowspan="2" class="mat-titre">المواد</th>
                @for (x of examens; track x) { <th colspan="2">{{ x }}</th> }
                <th rowspan="2" class="obs">الملاحظات</th><th rowspan="2" class="obs">توقيع الولي</th>
              </tr>
              <tr>@for (x of examens; track x) { <th class="sous">الدرجة</th><th class="sous">من</th> }</tr>
              @for (mat of matieres(d); track mat.code; let mi = $index) {
                <tr>
                  <td class="g nom-ar">{{ mat.nomAr }}</td><td class="fr" dir="ltr">{{ mat.nom }}</td>
                  @for (p of periodes; track p) { <td>{{ note(d, l, p, 'composition', mat) }}</td><td class="sur">{{ max(mat, d) }}</td> }
                  @if (mi % 4 === 0 && mi / 4 < 3) {
                    <td class="obs-cell" [attr.rowspan]="mi / 4 === 2 ? matieres(d).length - 8 + 3 : 4">
                      <b>{{ examens[mi / 4] }}</b><br>{{ l.observations[mi / 4] }}
                    </td>
                    <td [attr.rowspan]="mi / 4 === 2 ? matieres(d).length - 8 + 3 : 4"></td>
                  }
                </tr>
              }
              <tr><td class="g nom-ar">المجموع</td><td class="fr" dir="ltr">Total</td>
                @for (r of l.periodes; track $index) { <td><b>{{ nombre(r?.total) }}</b></td><td class="sur">{{ totalMax(d) }}</td> }</tr>
              <tr><td class="g nom-ar">المعدل</td><td class="fr" dir="ltr">Moyenne</td>
                @for (r of l.periodes; track $index) { <td><b>{{ nombre(r?.moyenne) }}</b></td><td class="sur">{{ baremeMoy(d) }}</td> }</tr>
              <tr><td class="g nom-ar">الترتيب</td><td class="fr" dir="ltr">Rang</td>
                @for (r of l.periodes; track $index) { <td><b>{{ r?.rang ?? '' }}</b></td><td class="sur">{{ d.nbEleves }}</td> }</tr>
              <tr class="sign"><td colspan="2" class="g nom-ar">توقيع المعلم(ة)</td>@for (x of examens; track x) { <td colspan="2"></td> }<td colspan="2"></td></tr>
              <tr class="sign"><td colspan="2" class="g nom-ar">توقيع المدير(ة)</td>@for (x of examens; track x) { <td colspan="2"></td> }<td colspan="2"></td></tr>
            </table>
          </section>
        }

        <!-- ================= ANGLAIS ================= -->
        @if (d.bulletin === 'en') {
          @let pi = periodeEn() - 1;
          @let r = l.periodes[pi];
          <section class="page portrait en">
            <img class="logo-en" src="logo.png" alt="">
            <p class="en-ligne"><b>IA</b>: PIKINE GUEDIAWAYE</p>
            <p class="en-ligne"><b>IEF</b>: THIAROYE</p>
            <p class="en-ligne grand"><b>PRIVATE SCHOOL</b>: <span>(FRANCO-ARAB) Ecole Keur Papa Djibril Kor</span></p>
            <div class="en-id">
              <p><b>First name:</b> {{ l.eleve.prenom }} &nbsp;&nbsp; <b>Lastname:</b> {{ l.eleve.nom }}</p>
              <p><b>Grade:</b> {{ d.classe.nom }}</p>
              <p><b>Academic year:</b> {{ d.classe.annee.replace('-', '/') }}</p>
            </div>
            <h2 class="en-titre">{{ termes[pi] }}</h2>
            <table class="t en-table">
              <tr><th>SUBJECTS</th><th>GRADES</th><th>OUT OF</th><th>COMMENTS</th></tr>
              @for (mat of matieres(d); track mat.code; let first = $first) {
                <tr><td>{{ mat.nom.toUpperCase() }}</td><td><b>{{ note(d, l, pi + 1, 'composition', mat) }}</b></td><td><b>{{ max(mat, d) }}</b></td>
                  @if (first) { <td class="obs-cell" [attr.rowspan]="matieres(d).length + 3">{{ l.observations[pi] }}</td> }</tr>
              }
              <tr><td><b>TOTAL GRADES</b></td><td><b>{{ nombre(r?.total) }}</b></td><td><b>{{ totalMax(d) }}</b></td></tr>
              <tr><td><b>AVERAGE</b></td><td><b>{{ nombre(r?.moyenne) }}</b></td><td><b>10</b></td></tr>
              <tr><td><b>RANK</b></td><td><b>{{ formatRang(r?.rang ?? null, r?.exAequo, 'en') }}</b></td><td><b>{{ d.nbEleves }}</b></td></tr>
            </table>
            <div class="en-signatures"><span>DIRECTRESS'S SIGNATURE</span><span>TEACHER'S SIGNATURE</span><span>PARENT'S SIGNATURE</span></div>
            <table class="t en-stats">
              <tr><th>HIGHEST AVERAGE</th><td>{{ nombre(d.stats[pi].plusForte) }}</td>
                <th>LOWEST AVERAGE</th><td>{{ nombre(d.stats[pi].plusFaible) }}</td>
                <th>CLASS AVERAGE</th><td>{{ nombre(d.stats[pi].moyenneClasse) }}</td></tr>
            </table>
          </section>
        }
      }
    }

    <ng-template #entete>
      <div class="entete-officiel">
        <div class="drapeau" aria-hidden="true"><span class="v"></span><span class="j">★</span><span class="r"></span></div>
        <div>
          <p class="rep">RÉPUBLIQUE DU SÉNÉGAL</p>
          <p class="devise">UN PEUPLE – UN BUT – UNE FOI</p>
          <p class="min">MINISTÈRE DE L'ÉDUCATION NATIONALE<br>IA DE PIKINE-GUÉDIAWAYE · IEF DE THIAROYE</p>
        </div>
        <img class="embleme" src="logo.png" alt="">
      </div>
    </ng-template>
  `,
  styleUrl: './impression.component.css',
})
export class ImpressionComponent implements OnInit {
  id = input.required<string>();
  bulletin = input<BulletinCode>('fr');
  eleve = input<string>();
  periode = input<string>();

  private ns = inject(NotesService);
  periodes = PERIODES;
  decisions = DECISIONS;
  examens = EXAMENS_AR;
  termes = TERMS_EN;
  direction = 'La Directrice';
  telephones = ECOLE.telephones.map((t) => t.replace('+221 ', '')).join(' / ');
  nombre = nombre;
  formatRang = formatRang;

  donnees = signal<DonneesBulletin | null>(null);
  erreur = signal('');
  periodeEn = computed(() => Math.min(3, Math.max(1, Number(this.periode() ?? 1))));
  lignes = computed(() => {
    const d = this.donnees();
    if (!d) return [];
    const e = this.eleve();
    return e ? d.lignes.filter((l) => String(l.eleve.id) === e) : d.lignes;
  });
  titre = computed(() => {
    const d = this.donnees();
    if (!d) return 'Bulletins';
    const n = this.lignes().length;
    return `${d.classe.nom} · ${n} bulletin${n > 1 ? 's' : ''}`;
  });

  async ngOnInit() {
    try {
      this.donnees.set(await chargerBulletins(this.ns, Number(this.id()), this.bulletin()));
    } catch (e) {
      this.erreur.set((e as Error).message);
    }
  }

  matieres(d: DonneesBulletin): Matiere[] { return toutesMatieres(d.modele); }
  nbMatieres(d: DonneesBulletin) { return this.matieres(d).length; }
  max(mat: Matiere, d: DonneesBulletin) { return maxMatiere(d.classe, d.bulletin, mat); }
  totalMax(d: DonneesBulletin) { return this.matieres(d).reduce((s, m) => s + this.max(m, d), 0); }
  baremeMoy(d: DonneesBulletin) { return baremeMoyenne(d.classe, d.bulletin); }

  note(d: DonneesBulletin, l: LigneBulletin, p: number, ev: string, mat: Matiere): string {
    return nombre(d.idx.get(cle(l.eleve.id!, p, ev, mat.code)));
  }
  moy(x: number | null | undefined, d: DonneesBulletin) {
    return x === null || x === undefined ? '' : `${nombre(x)}/${this.baremeMoy(d)}`;
  }
  rang(r: number | null | undefined, ex: boolean | undefined, d: DonneesBulletin) {
    return r ? `${formatRang(r, ex, d.bulletin === 'ar' ? 'ar' : 'fr')}/${d.nbEleves}` : '';
  }
  decisionAr(dec: string) { return DECISIONS_AR[dec] ?? dec; }
  adresse(d: DonneesBulletin) {
    return (ETABLISSEMENTS.find((e) => e.nom === d.classe.etablissement)?.adresse ?? '').toUpperCase();
  }

  imprimer() { window.print(); }
  fermer() { window.close(); }
}
