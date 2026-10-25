import { Component, inject, input, OnInit, signal } from '@angular/core';
import { ECOLE } from '../data/ecole';
import { Classe, Eleve, NotesService } from '../notes/notes.service';

/** Fiches à découper : une par élève, avec le matricule et le code parent (10 par page A4). */
@Component({
  selector: 'app-codes-parents',
  template: `
    <div class="barre no-print">
      <span>Codes parents · {{ classe()?.nom }} · {{ eleves().length }} élèves</span>
      <button (click)="imprimer()" [disabled]="!eleves().length">🖨 Imprimer</button>
      <button class="sec" (click)="fermer()">Fermer</button>
    </div>
    @if (erreur()) { <p class="msg no-print">{{ erreur() }}</p> }
    <section class="feuille">
      @for (e of eleves(); track e.id) {
        <article class="fiche">
          <img src="logo-256.png" alt="">
          <div class="txt">
            <strong>Espace parents — Keur Papa Djibril Kor</strong>
            <span class="eleve">{{ e.prenom }} {{ e.nom }} · {{ classe()?.nom }}</span>
            <span>Site : <b>{{ lien }}</b></span>
            <div class="codes">
              <span>Matricule <b>{{ e.matricule || '—' }}</b></span>
              <span>Code <b class="code">{{ e.code_parent || '—' }}</b></span>
            </div>
            <small>Code confidentiel : ne le partagez pas.</small>
          </div>
        </article>
      }
    </section>
  `,
  styles: `
    :host { display: block; background: #e9ecf1; min-height: 100vh; padding: 72px 16px 32px; font-family: 'Poppins', sans-serif; color: #111; }
    .barre { position: fixed; top: 0; left: 0; right: 0; z-index: 10; display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      background: var(--bleu-nuit); color: #fff; font-size: .9rem; }
    .barre span { margin-right: auto; }
    .barre button { font: inherit; font-weight: 600; border: 0; border-radius: 999px; padding: 8px 18px; cursor: pointer; background: var(--or); color: var(--bleu-nuit); }
    .barre button.sec { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.5); }
    .msg { text-align: center; }
    .feuille { width: 210mm; margin: 0 auto; background: #fff; padding: 8mm; box-sizing: border-box; box-shadow: 0 4px 20px rgba(0,0,0,.12);
      display: grid; grid-template-columns: 1fr 1fr; gap: 0; }
    .fiche { border: 1px dashed #9aa1b2; height: 55mm; box-sizing: border-box; padding: 4mm; display: flex; gap: 3mm; align-items: center; break-inside: avoid; }
    .fiche img { width: 16mm; height: 16mm; flex-shrink: 0; }
    .txt { display: flex; flex-direction: column; gap: 1.2mm; font-size: 8pt; min-width: 0; }
    .txt strong { color: var(--bleu-nuit); font-size: 8.5pt; }
    .eleve { font-weight: 700; font-size: 10pt; }
    .txt b { word-break: break-all; }
    .codes { display: flex; flex-direction: column; gap: 1mm; background: #f6f8fb; border-radius: 2mm; padding: 1.5mm 2.5mm; margin-top: 1mm; }
    .code { font-size: 13pt; letter-spacing: .12em; color: var(--bleu-nuit); }
    small { color: #6b7387; font-size: 7pt; }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      :host { background: #fff; padding: 0; }
      .no-print { display: none !important; }
      .feuille { box-shadow: none; margin: 0; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  `,
})
export class CodesParentsComponent implements OnInit {
  id = input.required<string>();
  private ns = inject(NotesService);
  classe = signal<Classe | null>(null);
  eleves = signal<Eleve[]>([]);
  erreur = signal('');
  lien = location.origin + (document.querySelector('base')?.getAttribute('href') ?? '/') + 'parents';

  async ngOnInit() {
    try {
      const [c, e] = await Promise.all([this.ns.classe(Number(this.id())), this.ns.eleves(Number(this.id()))]);
      this.classe.set(c);
      this.eleves.set(e);
      if (e.length && !e.some((x) => x.code_parent)) this.erreur.set("Les codes n'existent pas encore : exécutez supabase/parents.sql dans Supabase.");
    } catch (err) {
      this.erreur.set((err as Error).message);
    }
  }

  imprimer() { window.print(); }
  fermer() { window.close(); }
}
