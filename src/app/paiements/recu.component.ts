import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ECOLE, ETABLISSEMENTS } from '../data/ecole';
import { Classe, Eleve, NotesService } from '../notes/notes.service';
import { PaiementsService } from './paiements.service';
import { anneeDuMois, enLettres, fcfa, LIBELLE_TYPE, MOIS_SCOLAIRES, nomMois, Paiement, situation, Situation, TYPES } from './regles';

/** Ordre d'affichage : type de frais, puis mois de l'année scolaire. */
const ordre = (p: Paiement) => TYPES.findIndex((t) => t.code === p.type) * 100 + (p.mois ? MOIS_SCOLAIRES.indexOf(p.mois) : 0);

/** Reçu de paiement imprimable : deux exemplaires sur une feuille A4 (école + parent). */
@Component({
  selector: 'app-recu',
  imports: [DatePipe],
  template: `
    <div class="barre no-print">
      <span>Reçu {{ numero() }}</span>
      <button (click)="imprimer()" [disabled]="!lignes().length">🖨 Imprimer / Enregistrer en PDF</button>
      <button class="sec" (click)="fermer()">Fermer</button>
    </div>
    @if (erreur()) { <p class="msg no-print">{{ erreur() }}</p> }

    @if (lignes().length && eleve() && classe()) {
      <section class="feuille">
        @for (ex of exemplaires; track ex) {
          <article class="recu">
            <header>
              <img src="logo.png" alt="" class="logo">
              <div class="ecole">
                <strong>ÉCOLE FRANCO-ARABE KEUR PAPA DJIBRIL KOR</strong>
                <span>{{ adresse() }}</span>
                <span>Tél. {{ telephones }}</span>
              </div>
              <div class="numero">
                <span class="type">{{ ex }}</span>
                <b>REÇU N° {{ numero() }}</b>
                <span>Le {{ lignes()[0].date_paiement | date: 'dd/MM/yyyy' }}</span>
              </div>
            </header>

            <div class="infos">
              <div><span>Élève</span><b>{{ eleve()!.prenom }} {{ eleve()!.nom }}</b></div>
              <div><span>Matricule</span><b>{{ eleve()!.matricule || '—' }}</b></div>
              <div><span>Classe</span><b>{{ classe()!.nom }}</b></div>
              <div><span>Année scolaire</span><b>{{ classe()!.annee }}</b></div>
            </div>

            <table>
              <thead><tr><th>Désignation</th><th class="num">Montant</th></tr></thead>
              <tbody>
                @for (l of lignes(); track l.id) {
                  <tr><td>{{ designation(l) }}</td><td class="num">{{ fcfa(l.montant) }}</td></tr>
                }
              </tbody>
              <tfoot><tr><td>TOTAL VERSÉ</td><td class="num">{{ fcfa(total()) }}</td></tr></tfoot>
            </table>

            <p class="lettres">Arrêté le présent reçu à la somme de : <b>{{ lettres() }} francs CFA</b>.</p>
            <p class="mode">Mode de paiement : <b>{{ lignes()[0].moyen }}</b>{{ lignes()[0].reference ? ' — Réf. ' + lignes()[0].reference : '' }}
              {{ lignes()[0].note ? ' · ' + lignes()[0].note : '' }}</p>

            @if (sit(); as s) {
              <div class="situation">
                <span>Après ce versement :</span>
                <span>payé depuis la rentrée <b>{{ fcfa(s.paye) }}</b></span>
                <span>reste à ce jour <b [class.rouge]="s.retard > 0">{{ s.retard ? fcfa(s.retard) : 'rien, à jour ✓' }}</b></span>
                <span>reste sur l'année <b>{{ fcfa(s.reste) }}</b></span>
              </div>
            }

            <footer>
              <div class="sign"><span>Le parent</span></div>
              <div class="sign cachet"><span>Le caissier · cachet de l'école</span></div>
            </footer>
            <p class="merci">Merci de votre confiance. Conservez ce reçu, il fait foi de paiement.</p>
          </article>
          @if (ex === exemplaires[0]) { <div class="decoupe"><span>✂ découper ici</span></div> }
        }
      </section>
    } @else if (!erreur()) {
      <p class="msg no-print">Chargement du reçu…</p>
    }
  `,
  styles: `
    :host { display: block; background: #e9ecf1; min-height: 100vh; padding: 72px 16px 32px; color: #111; font-family: 'Poppins', sans-serif; }
    .barre { position: fixed; top: 0; left: 0; right: 0; z-index: 10; display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      background: var(--bleu-nuit); color: #fff; font-size: .9rem; }
    .barre span { margin-right: auto; }
    .barre button { font: inherit; font-weight: 600; border: 0; border-radius: 999px; padding: 8px 18px; cursor: pointer; background: var(--or); color: var(--bleu-nuit); }
    .barre button.sec { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.5); }
    .msg { text-align: center; }
    .feuille { width: 210mm; height: 296mm; margin: 0 auto; background: #fff; padding: 8mm 10mm; box-sizing: border-box; overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,.12); display: flex; flex-direction: column; justify-content: space-around; }
    .recu { border: 1.5px solid var(--bleu-nuit); border-radius: 4mm; padding: 4mm 5mm; box-sizing: border-box;
      display: flex; flex-direction: column; gap: 2.2mm; font-size: 9pt; }
    header { display: flex; align-items: center; gap: 4mm; border-bottom: 1px solid #d5dae3; padding-bottom: 2mm; }
    .logo { width: 17mm; height: 17mm; }
    .ecole { display: flex; flex-direction: column; flex: 1; font-size: 8pt; color: #444; }
    .ecole strong { color: var(--bleu-nuit); font-size: 10.5pt; }
    .numero { display: flex; flex-direction: column; align-items: flex-end; gap: 1mm; font-size: 8.5pt; }
    .numero b { font-size: 11pt; color: var(--bleu-nuit); }
    .type { background: var(--bleu-nuit); color: #fff; border-radius: 99px; padding: .5mm 3mm; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .05em; }
    .infos { display: grid; grid-template-columns: 2fr 1.3fr 1fr 1.2fr; gap: 2mm; background: #f6f8fb; border-radius: 2mm; padding: 2mm 3mm; }
    .infos div { display: flex; flex-direction: column; }
    .infos span { font-size: 7pt; text-transform: uppercase; letter-spacing: .05em; color: #6b7387; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .05em; color: #6b7387; border-bottom: 1px solid #d5dae3; padding: 1.2mm 2mm; }
    td { padding: 1.2mm 2mm; border-bottom: 1px solid #eef0f4; }
    tfoot td { font-weight: 700; color: var(--bleu-nuit); border-top: 1.5px solid var(--bleu-nuit); border-bottom: 0; font-size: 10.5pt; }
    .num { text-align: right; white-space: nowrap; }
    .lettres, .mode { margin: 0; }
    
    .situation { display: flex; flex-wrap: wrap; gap: 1mm 5mm; background: #f6f8fb; border-radius: 2mm; padding: 2mm 3mm; font-size: 8.5pt; }
    .rouge { color: #a12a1f; }
    footer { display: flex; gap: 6mm; }
    .sign { flex: 1; border: 1px dashed #b0b6c3; border-radius: 2mm; height: 15mm; padding: 1.5mm 2.5mm; font-size: 7.5pt; color: #6b7387; }
    .merci { margin: 0; text-align: center; font-size: 7.5pt; color: #6b7387; }
    .decoupe { border-top: 1px dashed #9aa1b2; position: relative; margin: 3mm 0; }
    .decoupe span { position: absolute; left: 50%; top: -2.2mm; transform: translateX(-50%); background: #fff; padding: 0 2mm; font-size: 7pt; color: #9aa1b2; }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      :host { background: #fff; padding: 0; }
      .no-print { display: none !important; }
      .feuille { box-shadow: none; margin: 0; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `,
})
export class RecuComponent implements OnInit {
  numero = input.required<string>();
  private ps = inject(PaiementsService);
  private ns = inject(NotesService);
  fcfa = fcfa;
  exemplaires = ['Exemplaire parent', 'Exemplaire école'];
  telephones = ECOLE.telephones.join(' / ');

  lignes = signal<Paiement[]>([]);
  eleve = signal<Eleve | null>(null);
  classe = signal<Classe | null>(null);
  sit = signal<Situation | null>(null);
  erreur = signal('');

  total = computed(() => this.lignes().reduce((s, l) => s + l.montant, 0));
  lettres = computed(() => { const t = enLettres(this.total()); return t.charAt(0).toUpperCase() + t.slice(1); });
  adresse = computed(() => ETABLISSEMENTS.find((e) => e.nom === this.classe()?.etablissement)?.adresse ?? ETABLISSEMENTS[0].adresse);

  async ngOnInit() {
    try {
      const lignes = await this.ps.recu(this.numero());
      if (!lignes.length) { this.erreur.set('Reçu introuvable (il a peut-être été annulé).'); return; }
      const e = await this.ps.eleve(lignes[0].eleve_id);
      const c = await this.ns.classe(e.classe_id);
      const [tarifs, tous] = await Promise.all([this.ps.tarifs(c.annee), this.ps.paiementsEleve(e.id!, c.annee)]);
      this.lignes.set([...lignes].sort((a, b) => ordre(a) - ordre(b))); this.eleve.set(e); this.classe.set(c);
      this.sit.set(situation({ id: e.id!, cantine: e.cantine, transport: e.transport }, c.niveau, c.annee, tarifs, tous));
    } catch (err) {
      this.erreur.set((err as Error).message);
    }
  }

  designation(l: Paiement) {
    return LIBELLE_TYPE[l.type] + (l.mois ? ` — ${nomMois(l.mois)} ${anneeDuMois(l.annee, l.mois)}` : '');
  }

  imprimer() {
    const ancien = document.title;
    document.title = `Reçu ${this.numero()}`;
    window.print();
    document.title = ancien;
  }
  fermer() { window.close(); }
}
