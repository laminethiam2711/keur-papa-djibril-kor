import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import QRCode from 'qrcode';
import { ECOLE } from '../data/ecole';
import { Classe, Eleve, NotesService } from './notes.service';

/** Lieu affiché en bas du badge, selon l'établissement de la classe. */
function lieu(etablissement: string): string {
  return /2\s*$/.test(etablissement.trim()) ? 'TIVAOUANE PEUL - 1er ARRÊT SOCABEG' : 'SICAP MBAO - TALLY MAME DIARRA';
}

interface Badge { eleve: Eleve; qr: string }

/**
 * Badges élèves au format porte-badge B3 (95 × 124 mm, vertical) : 4 par page A4.
 * QR code = matricule de l'élève.
 */
@Component({
  selector: 'app-badges',
  template: `
    <div class="barre no-print">
      <span>Badges · {{ classe()?.nom }} · {{ badges().length }} élèves · format 95 × 124 mm (4 par page A4)</span>
      <button (click)="imprimer()" [disabled]="!badges().length">🖨 Imprimer</button>
      <button class="sec" (click)="fermer()">Fermer</button>
    </div>
    @if (erreur()) { <p class="msg no-print">{{ erreur() }}</p> }
    @if (classe(); as c) {
      @for (page of pages(); track $index) {
        <section class="feuille">
          @for (b of page; track b.eleve.id) {
            <article class="badge">
              <header>
                <img src="logo-256.png" alt="">
                <div>
                  <small>École privée franco-arabe</small>
                  <strong>KEUR PAPA DJIBRIL KOR</strong>
                  <span class="ar">{{ ecole.nomArabe }}</span>
                </div>
              </header>
              <div class="titre">CARTE D'ÉLÈVE · {{ c.annee }}</div>
              <div class="corps">
                <div class="photo">PHOTO</div>
                <dl>
                  <dt>Nom</dt><dd class="nom">{{ b.eleve.nom.toUpperCase() }}</dd>
                  <dt>Prénom</dt><dd>{{ b.eleve.prenom }}</dd>
                  <dt>Section</dt><dd>{{ section() }}</dd>
                </dl>
              </div>
              <div class="bas-corps">
                <div class="mat"><span>Matricule</span><b>{{ b.eleve.matricule || '—' }}</b></div>
                @if (b.qr) { <img class="qr" [src]="b.qr" alt="QR code"> }
              </div>
              <footer>
                <div><b>LIEU :</b> {{ lieuBadge() }}</div>
                <div><b>TÉL :</b> {{ ecole.telephones.join(' / ') }}</div>
              </footer>
            </article>
          }
        </section>
      }
    }
  `,
  styles: `
    :host { display: block; background: #e9ecf1; min-height: 100vh; padding: 72px 16px 32px; font-family: 'Poppins', sans-serif; color: #111; }
    .barre { position: fixed; top: 0; left: 0; right: 0; z-index: 10; display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      background: var(--bleu-nuit); color: #fff; font-size: .9rem; }
    .barre span { margin-right: auto; }
    .barre button { font: inherit; font-weight: 600; border: 0; border-radius: 999px; padding: 8px 18px; cursor: pointer; background: var(--or); color: var(--bleu-nuit); }
    .barre button.sec { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.5); }
    .msg { text-align: center; }
    .feuille { width: 210mm; height: 296mm; margin: 0 auto 16px; background: #fff; box-sizing: border-box; padding: 20mm 10mm;
      box-shadow: 0 4px 20px rgba(0,0,0,.12); display: grid; grid-template-columns: 95mm 95mm; grid-template-rows: 124mm 124mm;
      gap: 9mm 0; justify-content: space-between; align-content: start; break-after: page; }
    .feuille:last-of-type { break-after: auto; }
    .badge { width: 95mm; height: 124mm; box-sizing: border-box; border: .3mm dashed #b7bdc9; display: flex; flex-direction: column; overflow: hidden; }
    header { background: #13254a; color: #fff; display: flex; align-items: center; gap: 3mm; padding: 4mm 4mm 3.5mm; border-bottom: 1.2mm solid #c9973a; }
    header img { width: 17mm; height: 17mm; border-radius: 50%; background: #fff; padding: .6mm; flex-shrink: 0; }
    header div { display: flex; flex-direction: column; line-height: 1.15; min-width: 0; }
    header small { font-size: 7pt; letter-spacing: .04em; opacity: .9; }
    header strong { font-size: 11.5pt; letter-spacing: .02em; white-space: nowrap; }
    header .ar { font-family: 'Amiri', serif; font-size: 10pt; color: #e9c77f; }
    .titre { text-align: center; font-weight: 700; font-size: 8.5pt; letter-spacing: .12em; color: #1f7a4d; padding: 2.5mm 0 1.5mm; }
    .corps { display: flex; gap: 4mm; padding: 1mm 5mm 0; align-items: flex-start; }
    .photo { width: 26mm; height: 32mm; flex-shrink: 0; border: .4mm solid #13254a; border-radius: 2mm; display: grid; place-items: center;
      font-size: 7pt; color: #9aa1b2; letter-spacing: .1em; background: #f6f8fb; }
    dl { margin: 0; display: grid; gap: .6mm; min-width: 0; }
    dt { font-size: 6.5pt; text-transform: uppercase; letter-spacing: .08em; color: #6b7387; margin-top: 1mm; }
    dd { margin: 0; font-size: 10.5pt; font-weight: 600; color: #13254a; word-break: break-word; line-height: 1.15; }
    dd.nom { font-size: 12pt; font-weight: 700; }
    .bas-corps { display: flex; align-items: center; justify-content: space-between; padding: 2mm 5mm; margin-top: auto; }
    .mat { display: flex; flex-direction: column; }
    .mat span { font-size: 6.5pt; text-transform: uppercase; letter-spacing: .08em; color: #6b7387; }
    .mat b { font-size: 10pt; color: #13254a; letter-spacing: .03em; }
    .qr { width: 24mm; height: 24mm; }
    footer { background: #13254a; color: #fff; font-size: 6.6pt; padding: 2.2mm 4mm; line-height: 1.5; border-top: 1.2mm solid #c9973a; }
    footer b { color: #e9c77f; }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      :host { background: #fff; padding: 0; }
      .no-print { display: none !important; }
      .feuille { box-shadow: none; margin: 0; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `,
})
export class BadgesComponent implements OnInit {
  id = input.required<string>();
  /** Facultatif : un seul élève (?eleve=12). */
  eleve = input<string>();
  private ns = inject(NotesService);
  ecole = ECOLE;
  classe = signal<Classe | null>(null);
  badges = signal<Badge[]>([]);
  erreur = signal('');

  section = computed(() => {
    const c = this.classe();
    return !c ? '' : c.niveau === 'Crèche' ? 'Crèche' : c.nom;
  });
  lieuBadge = computed(() => lieu(this.classe()?.etablissement ?? ''));
  pages = computed(() => {
    const b = this.badges();
    return Array.from({ length: Math.ceil(b.length / 4) }, (_, i) => b.slice(i * 4, i * 4 + 4));
  });

  async ngOnInit() {
    try {
      const [c, liste] = await Promise.all([this.ns.classe(Number(this.id())), this.ns.eleves(Number(this.id()))]);
      this.classe.set(c);
      const choisis = this.eleve() ? liste.filter((e) => String(e.id) === this.eleve()) : liste;
      this.badges.set(await Promise.all(choisis.map(async (e) => ({
        eleve: e,
        qr: e.matricule ? await QRCode.toDataURL(e.matricule, { margin: 0, width: 240, color: { dark: '#13254a' } }) : '',
      }))));
    } catch (err) {
      this.erreur.set((err as Error).message);
    }
  }

  imprimer() { window.print(); }
  fermer() { window.close(); }
}
