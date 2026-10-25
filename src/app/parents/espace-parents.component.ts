import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ECOLE } from '../data/ecole';
import { BulletinCarteComponent } from '../notes/bulletin-carte.component';
import { construireBulletins } from '../notes/donnees-bulletin';
import { BulletinCode, LIBELLES_BULLETIN, libellePeriode, PERIODES } from '../notes/modeles';
import { Eleve } from '../notes/notes.service';
import {
  fcfa, LIBELLE_TYPE, MOIS_SCOLAIRES, Paiement, moisEchus, nomMois, nomMoisCourt, situation, tarif, TypeFrais, typesDeLEleve, verse,
} from '../paiements/regles';
import { ParentsService } from './parents.service';

@Component({
  selector: 'app-espace-parents',
  imports: [FormsModule, DatePipe, BulletinCarteComponent],
  template: `
    @if (!ps.donnees()) {
      <section class="bandeau-page no-print">
        <div class="conteneur">
          <span class="arabe">فضاء أولياء الأمور</span>
          <h1>Espace parents</h1>
          <p>Suivez les notes, le bulletin et les paiements de votre enfant.</p>
        </div>
      </section>
      <section class="section">
        <div class="conteneur">
          <form class="carte connexion" (ngSubmit)="connecter()" #f="ngForm">
            <img src="logo-256.png" alt="" width="84" height="84">
            <h2>Connexion</h2>
            <p class="aide">Saisissez le <b>matricule</b> de votre enfant et le <b>code parent</b> remis par l'école.</p>
            <div class="champ"><label for="mat">Matricule de l'élève</label>
              <input id="mat" name="mat" [(ngModel)]="matricule" required placeholder="KPDK-2026-0001" autocomplete="username" autocapitalize="characters"></div>
            <div class="champ"><label for="code">Code parent</label>
              <input id="code" name="code" [(ngModel)]="code" required placeholder="8 caractères" autocomplete="current-password" autocapitalize="characters"></div>
            <label class="souvenir"><input type="checkbox" name="souvenir" [(ngModel)]="souvenir"> Rester connecté sur ce téléphone</label>
            @if (erreur()) { <p class="np-erreur">{{ erreur() }}</p> }
            <button class="btn btn-vert plein" [disabled]="f.invalid || envoi()">{{ envoi() ? 'Vérification…' : 'Voir le suivi de mon enfant' }}</button>
            <p class="perdu">Code perdu ? <a [href]="lienAide" target="_blank" rel="noopener">Demandez-le à l'école sur WhatsApp</a>.</p>
          </form>
        </div>
      </section>
    } @else {
      @let d = ps.donnees()!;
      <section class="section">
        <div class="conteneur np-page">
          <div class="np-carte enfant no-print">
            <div class="np-bandeau">
              <div class="qui">
                <span class="avatar">{{ d.eleve.prenom.charAt(0) + d.eleve.nom.charAt(0) }}</span>
                <div>
                  <h2>{{ d.eleve.prenom }} {{ d.eleve.nom }}</h2>
                  <p>{{ d.classe.nom }} · {{ d.classe.etablissement }} · {{ d.classe.annee }} · {{ d.eleve.matricule }}</p>
                </div>
              </div>
              <button class="np-btn sortir" (click)="ps.deconnexion()">Se déconnecter</button>
            </div>
          </div>

          <div class="np-segment no-print">
            <button [class.actif]="vue() === 'notes'" (click)="vue.set('notes')">📘 Notes et bulletin</button>
            @if (avecPaiements()) { <button [class.actif]="vue() === 'paiements'" (click)="vue.set('paiements')">💳 Paiements</button> }
          </div>

          @if (vue() === 'notes') {
            <div class="choix no-print">
              @if (releves().length > 1) {
                <div class="np-segment">
                  @for (b of releves(); track b) { <button [class.actif]="bulletin() === b" (click)="changerReleve(b)">{{ libelles[b] }}</button> }
                </div>
              }
              <div class="np-segment">
                @for (p of periodes; track p) { <button [class.actif]="onglet() === p" (click)="onglet.set(p)">{{ libellePeriode(bulletin(), p) }}</button> }
                @if (bulletin() !== 'en') { <button [class.actif]="onglet() === 'annee'" (click)="onglet.set('annee')">Année</button> }
              </div>
            </div>
            @if (bulletinCalcule(); as b) {
              @if (b.ligne) {
                <app-bulletin-carte [d]="b.d" [ligne]="b.ligne" [onglet]="onglet()" />
                <div class="bas no-print">
                  <button class="np-btn plein" (click)="imprimer()">🖨 Imprimer / enregistrer en PDF</button>
                </div>
              }
            }
          }

          @if (vue() === 'paiements') {
            @let s = sit();
            <div class="np-carte">
              <div class="np-resume sans-bord">
                <div class="principal"><span class="np-libelle">Reste à payer à ce jour</span>
                  <div class="np-grand reste" [class.rouge]="s.retard > 0">{{ s.retard ? fcfa(s.retard) : 'À jour ✓' }}</div></div>
                <div><span class="np-libelle">Déjà payé</span><div class="moyen">{{ fcfa(s.paye) }}</div></div>
                <div><span class="np-libelle">Total de l'année</span><div class="moyen">{{ fcfa(s.duAnnee) }}</div></div>
                <div><span class="np-libelle">Reste sur l'année</span><div class="moyen">{{ fcfa(s.reste) }}</div></div>
              </div>
              <div class="defile">
                <table class="np-table">
                  <thead><tr><th>Frais</th>@for (m of mois; track m) { <th class="centre">{{ nomMoisCourt(m) }}</th> }</tr></thead>
                  <tbody>
                    @for (t of typesMensuels(); track t.code) {
                      <tr>
                        <td><b>{{ t.libelle }}</b><span class="np-sous">{{ fcfa(prix(t.code)) }} / mois</span></td>
                        @for (m of mois; track m; let i = $index) {
                          @let e = etatMois(t.code, m, i);
                          <td class="centre"><span [class]="'case ' + e">{{ e === 'paye' ? '✓' : e === 'partiel' ? '½' : e === 'du' ? '!' : '' }}</span></td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="uniques">
                @for (t of typesUniques(); track t.code) {
                  @let v = verse(d.paiements, t.code);
                  <div class="unique"><span>{{ t.libelle }}</span>
                    @if (prix(t.code) && v >= prix(t.code)) { <span class="np-pill np-tb">Payé</span> }
                    @else { <span class="np-pill np-i">Reste {{ fcfa(prix(t.code) - v) }}</span> }</div>
                }
              </div>
            </div>

            <div class="np-carte">
              <div class="np-bandeau"><h2>Reçus de paiement</h2></div>
              <table class="np-table">
                <thead><tr><th>Date</th><th>Reçu</th><th>Détail</th><th>Moyen</th><th class="np-num">Montant</th></tr></thead>
                <tbody>
                  @for (r of recus(); track r.numero) {
                    <tr><td>{{ r.date | date: 'dd/MM/yyyy' }}</td><td><b>{{ r.numero }}</b></td><td class="detail">{{ r.detail }}</td>
                      <td>{{ r.moyen }}</td><td class="np-num"><b>{{ fcfa(r.total) }}</b></td></tr>
                  } @empty { <tr><td colspan="5" class="vide">Aucun paiement enregistré pour cette année.</td></tr> }
                </tbody>
              </table>
              <p class="np-note-bas">Pour payer : à l'école (espèces) ou par Wave / Orange Money au {{ ecole.telephones[0] }}. Une question ?
                <a [href]="lienAide" target="_blank" rel="noopener">Écrivez-nous sur WhatsApp</a>.</p>
            </div>
          }
        </div>
      </section>
    }
  `,
  styles: `
    .connexion { max-width: 440px; margin: 0 auto; text-align: center; }
    .connexion img { display: block; margin: 0 auto 8px; }
    .connexion .champ { text-align: left; }
    .connexion input { text-transform: uppercase; letter-spacing: .04em; }
    .aide { color: var(--texte-doux); font-size: .92rem; }
    .souvenir { display: flex; align-items: center; gap: 8px; justify-content: center; margin-bottom: 14px; font-size: .9rem; }
    .plein { width: 100%; justify-content: center; }
    .perdu { font-size: .85rem; color: var(--texte-doux); margin: 14px 0 0; }
    .np-erreur { margin-bottom: 12px; text-align: left; }
    .qui { display: flex; align-items: center; gap: 14px; }
    .avatar { width: 52px; height: 52px; border-radius: 50%; background: var(--or); color: var(--bleu-nuit); display: grid; place-items: center; font-weight: 700; flex-shrink: 0; }
    .sortir { background: transparent; color: #fff; border-color: rgba(255,255,255,.35); }
    .choix { display: flex; gap: 12px; flex-wrap: wrap; justify-content: space-between; }
    .bas { display: flex; justify-content: center; }
    .sans-bord { border-top: 0; border-bottom: 1px solid #e3e6ec; }
    .moyen { font-size: 1.3rem; font-weight: 700; color: var(--bleu-nuit); margin-top: 2px; white-space: nowrap; }
    .reste { font-size: 1.6rem; white-space: nowrap; }
    .rouge { color: #a12a1f !important; }
    .defile { overflow-x: auto; }
    .centre { text-align: center !important; }
    .case { display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; font-weight: 700; font-size: .85rem; }
    .case.paye { background: #dff3e7; color: #17663e; }
    .case.partiel { background: #fff3dc; color: #8a5a00; }
    .case.du { background: #fde7e5; color: #a12a1f; }
    .case.avenir { background: #f1f3f6; }
    .uniques { display: flex; gap: 18px; flex-wrap: wrap; padding: 14px 18px; border-top: 1px solid #eef0f4; }
    .unique { display: flex; gap: 8px; align-items: center; font-weight: 600; }
    .detail { color: var(--texte-doux); font-size: .88rem; }
    .vide { text-align: center; color: var(--texte-doux); padding: 24px !important; }
  `,
})
export class EspaceParentsComponent implements OnInit {
  ps = inject(ParentsService);
  ecole = ECOLE;
  libelles = LIBELLES_BULLETIN;
  periodes = PERIODES;
  libellePeriode = libellePeriode;
  mois = MOIS_SCOLAIRES;
  fcfa = fcfa; nomMois = nomMois; nomMoisCourt = nomMoisCourt; verse = verse;
  lienAide = `https://wa.me/${ECOLE.whatsapp}?text=${encodeURIComponent("Bonjour, je souhaite recevoir le code de l'espace parents pour mon enfant :")}`;

  matricule = '';
  code = '';
  souvenir = true;
  envoi = signal(false);
  erreur = signal('');
  vue = signal<'notes' | 'paiements'>('notes');
  bulletin = signal<BulletinCode>('fr');
  onglet = signal<number | 'annee'>(1);

  releves = computed<BulletinCode[]>(() => {
    const c = this.ps.donnees()?.classe;
    return c ? ['fr', ...(c.avec_arabe ? ['ar' as const] : []), ...(c.avec_anglais ? ['en' as const] : [])] : ['fr'];
  });

  /** Bulletin calculé à partir des notes de la classe (les camarades restent anonymes). */
  bulletinCalcule = computed(() => {
    const d = this.ps.donnees();
    if (!d) return null;
    const b = this.bulletin();
    const eleves: Eleve[] = d.camarades.map((id) => id === d.eleve.id ? d.eleve
      : { id, classe_id: d.classe.id!, prenom: '', nom: '', date_naissance: null, lieu_naissance: '', matricule: '', telephone: '' });
    const donnees = construireBulletins(d.classe, eleves, d.notes.filter((n) => n.bulletin === b),
      d.appreciations.filter((a) => a.bulletin === b), b);
    return { d: donnees, ligne: donnees.lignes.find((l) => l.eleve.id === d.eleve.id) ?? null };
  });

  avecPaiements = computed(() => !!this.ps.donnees()?.tarifs?.length);
  typesMensuels = computed(() => this.typesEleve().filter((t) => t.mensuel));
  typesUniques = computed(() => this.typesEleve().filter((t) => !t.mensuel));
  private typesEleve = computed(() => {
    const e = this.ps.donnees()?.eleve;
    return e ? typesDeLEleve({ id: e.id!, cantine: e.cantine, transport: e.transport }) : [];
  });
  sit = computed(() => {
    const d = this.ps.donnees()!;
    return situation({ id: d.eleve.id!, cantine: d.eleve.cantine, transport: d.eleve.transport }, d.classe.niveau, d.classe.annee, d.tarifs, d.paiements);
  });
  recus = computed(() => {
    const par = new Map<string, Paiement[]>();
    for (const p of this.ps.donnees()?.paiements ?? []) par.set(p.numero_recu!, [...(par.get(p.numero_recu!) ?? []), p]);
    return [...par.entries()].map(([numero, ps]) => ({
      numero, date: ps[0].date_paiement, moyen: ps[0].moyen, total: ps.reduce((s, p) => s + p.montant, 0),
      detail: ps.map((p) => LIBELLE_TYPE[p.type] + (p.mois ? ' ' + nomMois(p.mois) : '')).join(', '),
    }));
  });

  async ngOnInit() {
    if (!this.ps.donnees()) await this.ps.reprendre();
  }

  async connecter() {
    this.envoi.set(true);
    this.erreur.set('');
    try {
      await this.ps.connexion(this.matricule.trim(), this.code.trim(), this.souvenir);
      this.code = '';
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.envoi.set(false);
    }
  }

  changerReleve(b: BulletinCode) {
    this.bulletin.set(b);
    if (b === 'en' && this.onglet() === 'annee') this.onglet.set(1);
  }

  prix(t: TypeFrais) { const d = this.ps.donnees()!; return tarif(d.tarifs, d.classe.niveau, t); }
  etatMois(t: TypeFrais, m: number, i: number) {
    const d = this.ps.donnees()!, p = this.prix(t), v = verse(d.paiements, t, m);
    if (p > 0 && v >= p) return 'paye';
    if (v > 0) return 'partiel';
    return i < moisEchus(d.classe.annee) ? 'du' : 'avenir';
  }

  imprimer() {
    const d = this.ps.donnees()!;
    const ancien = document.title;
    document.title = `Bulletin ${d.eleve.prenom} ${d.eleve.nom}`;
    window.print();
    document.title = ancien;
  }
}
