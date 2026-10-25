import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { baremeMoyenne, nombre } from './calcul';
import { chargerBulletins, LigneBulletin } from './donnees-bulletin';
import { NIVEAUX } from './modeles';
import { Classe, Eleve, NotesService } from './notes.service';

type Action = 'sup' | 'red' | 'non';

/** « 2026-2027 » → « 2027-2028 » */
export function anneeSuivante(annee: string): string {
  const an = Number(annee.match(/\d{4}/)?.[0] ?? new Date().getFullYear());
  return `${an + 1}-${an + 2}`;
}

/** Ce que propose la décision du conseil. */
export function actionProposee(decision: string, niveau: string): Action {
  if (decision.startsWith('Exclu')) return 'non';
  if (decision.startsWith('Redouble')) return 'red';
  if (niveau === 'CM2') return 'non'; // fin du cycle élémentaire
  return 'sup';
}

interface LignePassage { ligne: LigneBulletin; action: Action; deja: boolean }

/** Passage de fin d'année : réinscrit les élèves dans les classes de l'année suivante. */
@Component({
  selector: 'app-passage',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="np-page">
      <a routerLink="/admin/classes" class="np-fil">‹ Classes</a>
      <div class="np-titre">
        <div>
          <h1>Passage de fin d'année</h1>
          <p>Les élèves gardent leur matricule et leur code parent. Les notes, absences et paiements de l'année restent dans l'historique.</p>
        </div>
      </div>
      @if (erreur()) { <p class="np-erreur">{{ erreur() }}</p> }
      @if (message()) { <p class="np-carte succes">{{ message() }}</p> }

      <div class="np-carte etape">
        <span class="num">1</span>
        <div class="corps">
          <h2>Année qui se termine</h2>
          <div class="np-segment">
            @for (a of annees(); track a) {
              <button [class.actif]="annee() === a" (click)="choisirAnnee(a)">{{ a }}</button>
            }
          </div>
          <p class="doux">Nouvelle année : <b>{{ cible() }}</b> · {{ classesCible().length }} classe(s) déjà créée(s).</p>
          @if (classesManquantes().length) {
            <button class="np-btn plein" (click)="preparerClasses()" [disabled]="occupe()">
              + Créer les {{ classesManquantes().length }} classes de {{ cible() }} (mêmes noms et réglages, sans maître)</button>
          }
        </div>
      </div>

      <div class="np-carte etape">
        <span class="num">2</span>
        <div class="corps">
          <h2>Classe à faire passer</h2>
          <div class="chips">
            @for (c of classesSource(); track c.id) {
              <button [class.actif]="source()?.id === c.id" (click)="choisirSource(c)">{{ c.nom }} <small>{{ c.etablissement.replace('Keur Papa Djibril ', '') }}</small></button>
            } @empty { <span class="doux">Aucune classe pour {{ annee() }}.</span> }
          </div>
        </div>
      </div>

      @if (source(); as s) {
        <div class="np-carte etape">
          <span class="num">3</span>
          <div class="corps">
            <h2>Classes d'arrivée</h2>
            @if (!classesCible().length) {
              <p class="np-erreur">Créez d'abord les classes de {{ cible() }} (étape 1).</p>
            } @else {
              <div class="cibles">
                <label><span class="np-libelle">Admis en classe supérieure →</span>
                  <select [(ngModel)]="cibleSup">
                    <option [ngValue]="null">— choisir —</option>
                    @for (c of classesCible(); track c.id) { <option [ngValue]="c.id">{{ c.nom }} · {{ c.etablissement }}</option> }
                  </select></label>
                <label><span class="np-libelle">Redoublants →</span>
                  <select [(ngModel)]="cibleRed">
                    <option [ngValue]="null">— choisir —</option>
                    @for (c of classesCible(); track c.id) { <option [ngValue]="c.id">{{ c.nom }} · {{ c.etablissement }}</option> }
                  </select></label>
              </div>
            }
          </div>
        </div>

        <div class="np-carte">
          <div class="defile">
            <table class="np-table">
              <thead><tr><th>Élève</th><th class="np-num">Moy. annuelle</th><th>Décision du conseil</th><th>Passage</th></tr></thead>
              <tbody>
                @for (l of lignes(); track l.ligne.eleve.id) {
                  <tr [class.deja]="l.deja">
                    <td><strong>{{ l.ligne.eleve.prenom }} {{ l.ligne.eleve.nom }}</strong><span class="mat">{{ l.ligne.eleve.matricule }}</span></td>
                    <td class="np-num">{{ nombre(l.ligne.annuel.moyenne) || '—' }} <small class="doux">/ {{ bareme() }}</small></td>
                    <td>{{ l.ligne.decision || '—' }}@if (!l.ligne.decision) { <small class="verif"> à vérifier</small> }</td>
                    <td>
                      @if (l.deja) { <span class="np-pill np-tb">Déjà inscrit(e) en {{ cible() }}</span> }
                      @else {
                        <div class="np-segment petit">
                          <button [class.actif]="l.action === 'sup'" (click)="l.action = 'sup'; maj()">Classe sup.</button>
                          <button [class.actif]="l.action === 'red'" (click)="l.action = 'red'; maj()">Redouble</button>
                          <button [class.actif]="l.action === 'non'" (click)="l.action = 'non'; maj()">Ne revient pas</button>
                        </div>
                      }
                    </td>
                  </tr>
                } @empty { <tr><td colspan="4" class="doux">{{ occupe() ? 'Chargement…' : 'Aucun élève.' }}</td></tr> }
              </tbody>
            </table>
          </div>
          <div class="valider">
            <span>{{ compte().sup }} en classe supérieure · {{ compte().red }} redoublant(s) · {{ compte().non }} ne revien(nen)t pas</span>
            <button class="np-btn vert" (click)="valider()" [disabled]="occupe() || !peutValider()">✔ Valider le passage</button>
          </div>
        </div>
        <p class="np-note-bas">Vous pouvez valider plusieurs fois : un élève déjà inscrit en {{ cible() }} n'est jamais ajouté deux fois.</p>
      }
    </div>
  `,
  styles: `
    .succes { padding: 14px 18px; background: #e8f5ee; color: #1f7a4d; font-weight: 600; }
    .etape { display: flex; gap: 16px; padding: 18px 20px; overflow: visible; }
    .num { width: 32px; height: 32px; border-radius: 50%; background: var(--bleu-nuit); color: #fff; display: grid; place-items: center; font-weight: 700; flex-shrink: 0; }
    .corps { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; min-width: 0; flex: 1; }
    h2 { margin: 4px 0 0; font-size: 1.1rem; }
    .doux { color: #8a92a6; margin: 0; }
    .chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .chips button { font: inherit; font-size: .9rem; padding: 8px 14px; border-radius: 10px; border: 1px solid #d5dae3; background: #fff; cursor: pointer; }
    .chips button small { color: #8a92a6; margin-left: 4px; }
    .chips button.actif { background: var(--bleu-nuit); color: #fff; border-color: var(--bleu-nuit); }
    .chips button.actif small { color: #c9d1e3; }
    .cibles { display: flex; gap: 20px; flex-wrap: wrap; }
    .cibles label { display: flex; flex-direction: column; gap: 4px; }
    select { font: inherit; padding: 8px 10px; border: 1px solid #d5dae3; border-radius: 10px; background: #fff; min-width: 260px; }
    .defile { overflow-x: auto; }
    .mat { display: block; font-size: .75rem; color: #9aa1b2; }
    .np-segment.petit button { padding: 5px 10px; font-size: .82rem; }
    tr.deja td { opacity: .6; }
    .verif { color: #c0392b; }
    .valider { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 14px 18px; border-top: 1px solid #eef0f4; background: #fafbfd; }
  `,
})
export class PassageComponent implements OnInit {
  private ns = inject(NotesService);
  private sb = inject(SupabaseService);
  nombre = nombre;

  classes = signal<Classe[]>([]);
  annee = signal('');
  source = signal<Classe | null>(null);
  lignes = signal<LignePassage[]>([]);
  cibleSup: number | null = null;
  cibleRed: number | null = null;
  occupe = signal(false);
  erreur = signal('');
  message = signal('');

  annees = computed(() => [...new Set(this.classes().map((c) => c.annee))].sort().reverse());
  cible = computed(() => anneeSuivante(this.annee()));
  classesSource = computed(() => this.classes().filter((c) => c.annee === this.annee()));
  classesCible = computed(() => this.classes().filter((c) => c.annee === this.cible()));
  classesManquantes = computed(() => this.classesSource().filter((s) =>
    !this.classesCible().some((c) => c.nom === s.nom && c.etablissement === s.etablissement)));
  bareme = computed(() => (this.source() ? baremeMoyenne(this.source()!, 'fr') : 10));
  compte = signal({ sup: 0, red: 0, non: 0 });

  async ngOnInit() {
    await this.chargerClasses();
    // Par défaut : l'année la plus récente qui a déjà une année suivante, sinon la plus récente
    const a = this.annees();
    this.annee.set(a.find((x) => a.includes(anneeSuivante(x))) ?? a[0] ?? '');
  }

  private async chargerClasses() {
    try { this.classes.set(await this.ns.classes()); } catch (e) { this.erreur.set((e as Error).message); }
  }

  choisirAnnee(a: string) {
    this.annee.set(a);
    this.source.set(null);
    this.lignes.set([]);
    this.message.set('');
  }

  async preparerClasses() {
    this.occupe.set(true);
    this.erreur.set('');
    try {
      for (const s of this.classesManquantes()) {
        const { id: _id, ...reglages } = s;
        await this.ns.enregistrerClasse({ ...reglages, annee: this.cible(), maitre: '' });
      }
      await this.chargerClasses();
      this.message.set(`Classes de ${this.cible()} créées. Vous pouvez renommer une classe ou changer son maître dans « Notes et bulletins ».`);
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.occupe.set(false);
    }
  }

  /** Devine la classe d'arrivée : niveau suivant (ou même niveau pour les redoublants), même établissement. */
  private deviner(s: Classe, decalage: number): number | null {
    const i = NIVEAUX.indexOf(s.niveau);
    const niveau = i >= 0 ? NIVEAUX[Math.min(i + decalage, NIVEAUX.length - 1)] : s.niveau;
    const memesNiveau = this.classesCible().filter((c) => c.niveau === niveau);
    const memeEtab = memesNiveau.filter((c) => c.etablissement === s.etablissement);
    const meme = (decalage === 0 ? memeEtab.find((c) => c.nom === s.nom) : undefined) ?? memeEtab[0] ?? memesNiveau[0];
    return meme?.id ?? null;
  }

  async choisirSource(c: Classe) {
    this.source.set(c);
    this.message.set('');
    this.erreur.set('');
    this.lignes.set([]);
    this.cibleSup = c.niveau === 'CM2' ? null : this.deviner(c, 1);
    this.cibleRed = this.deviner(c, 0);
    this.occupe.set(true);
    try {
      const [d, deja] = await Promise.all([chargerBulletins(this.ns, c.id!, 'fr'), this.matriculesCible()]);
      this.lignes.set(d.lignes.map((l) => ({
        ligne: l, deja: !!l.eleve.matricule && deja.has(l.eleve.matricule),
        action: actionProposee(l.decision, c.niveau),
      })));
      this.maj();
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.occupe.set(false);
    }
  }

  /** Matricules déjà inscrits dans une classe de l'année suivante. */
  private async matriculesCible(): Promise<Set<string>> {
    const ids = this.classesCible().map((c) => c.id!);
    if (!ids.length) return new Set();
    const listes: Eleve[][] = await Promise.all(ids.map((id) => this.ns.eleves(id)));
    return new Set(listes.flat().map((e) => e.matricule).filter(Boolean));
  }

  maj() {
    this.lignes.set([...this.lignes()]);
    const l = this.lignes().filter((x) => !x.deja);
    this.compte.set({ sup: l.filter((x) => x.action === 'sup').length, red: l.filter((x) => x.action === 'red').length,
      non: l.filter((x) => x.action === 'non').length });
  }

  peutValider() {
    const c = this.compte();
    return (c.sup > 0 || c.red > 0) && (!c.sup || this.cibleSup) && (!c.red || this.cibleRed);
  }

  async valider() {
    const groupes: [Action, number | null][] = [['sup', this.cibleSup], ['red', this.cibleRed]];
    this.occupe.set(true);
    this.erreur.set('');
    let total = 0;
    try {
      for (const [action, classe] of groupes) {
        const ids = this.lignes().filter((l) => !l.deja && l.action === action).map((l) => l.ligne.eleve.id!);
        if (!ids.length || !classe) continue;
        const res = await this.sb.db.rpc('reinscrire', { p_eleves: ids, p_classe: classe });
        if (res.error) {
          if (res.error.message.includes('reinscrire') || res.error.message.includes('schema cache')) {
            throw new Error('Le passage n’est pas encore installé : exécutez supabase/passage.sql dans Supabase.');
          }
          throw new Error(res.error.message);
        }
        total += res.data as number;
      }
      this.message.set(`✔ ${total} élève(s) réinscrit(s) en ${this.cible()}.`);
      await this.choisirSource(this.source()!);
      this.message.set(`✔ ${total} élève(s) réinscrit(s) en ${this.cible()}.`);
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.occupe.set(false);
    }
  }
}
