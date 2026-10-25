import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Classe, Eleve, NotesService } from '../notes/notes.service';
import { AbsencesService } from './absences.service';
import { Absence, aujourdhui, libelleMoment, Moment, MOMENTS, resumeParTrimestre, ResumeAssiduite } from './regles';

type Statut = 'present' | 'absence' | 'retard';

/** Appel en classe : présents, absents, retards — enregistrés à chaque clic. */
@Component({
  selector: 'app-appel',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="np-page">
      <a routerLink="/admin/classes" class="np-fil">‹ Classes</a>
      @if (classe(); as c) {
        <div class="np-titre">
          <div>
            <h1>Absences et retards</h1>
            <p>{{ c.nom }} · {{ c.annee }} · {{ eleves().length }} élèves</p>
          </div>
          <div class="np-segment">
            <button [class.actif]="vue() === 'appel'" (click)="vue.set('appel')">Faire l'appel</button>
            <button [class.actif]="vue() === 'bilan'" (click)="vue.set('bilan')">Bilan par élève</button>
          </div>
        </div>
      }
      @if (erreur()) { <p class="np-erreur">{{ erreur() }}</p> }

      @if (vue() === 'appel') {
        <div class="np-carte barre-jour">
          <button class="np-btn" (click)="decaler(-1)" aria-label="Jour précédent">‹</button>
          <label class="jour">
            <span class="np-libelle">Date de l'appel</span>
            <input type="date" [ngModel]="date()" (ngModelChange)="changerDate($event)" [max]="aujourdhui">
          </label>
          <button class="np-btn" (click)="decaler(1)" [disabled]="date() >= aujourdhui" aria-label="Jour suivant">›</button>
          <span class="jour-long">{{ date() | date: 'EEEE d MMMM y' }}</span>
          <div class="compteurs">
            <span class="np-pill np-tb">Présents : {{ compte().present }}</span>
            <span class="np-pill np-i">Absents : {{ compte().absence }}</span>
            <span class="np-pill np-p">Retards : {{ compte().retard }}</span>
          </div>
          <button class="np-btn vert" (click)="tousPresents()" [disabled]="!compte().absence && !compte().retard">Tout le monde présent</button>
        </div>

        <div class="np-carte">
          <div class="defile">
            <table class="np-table appel">
              <thead><tr><th>Élève</th><th>Statut</th><th>Moment</th><th>Justifié</th><th>Motif</th><th></th></tr></thead>
              <tbody>
                @for (e of eleves(); track e.id) {
                  @let a = duJour().get(e.id!);
                  <tr [class.absent]="a?.type === 'absence'" [class.retard]="a?.type === 'retard'">
                    <td><strong>{{ e.prenom }} {{ e.nom }}</strong><span class="mat">{{ e.matricule }}</span></td>
                    <td>
                      <div class="np-segment statut">
                        <button [class.actif]="!a" (click)="choisir(e, 'present')">Présent</button>
                        <button [class.actif]="a?.type === 'absence'" class="abs" (click)="choisir(e, 'absence')">Absent</button>
                        <button [class.actif]="a?.type === 'retard'" class="ret" (click)="choisir(e, 'retard')">Retard</button>
                      </div>
                    </td>
                    <td>
                      @if (a) {
                        <select [ngModel]="a.moment" (ngModelChange)="modifier(a, { moment: $event })">
                          @for (m of moments; track m.code) {
                            @if (a.type === 'absence' || m.code !== 'journee') { <option [value]="m.code">{{ m.libelle }}</option> }
                          }
                        </select>
                      }
                    </td>
                    <td>@if (a) { <input type="checkbox" [ngModel]="a.justifie" (ngModelChange)="modifier(a, { justifie: $event })"> }</td>
                    <td>@if (a) { <input class="motif" maxlength="200" placeholder="Maladie, voyage…" [ngModel]="a.motif" (change)="modifier(a, { motif: $any($event.target).value })"> }</td>
                    <td class="etat">{{ etats()[e.id!] === 'enregistrement' ? '…' : etats()[e.id!] === 'ok' ? '✓' : etats()[e.id!] === 'erreur' ? '⚠' : '' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="6" class="vide">Aucun élève dans cette classe.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
        <p class="np-note-bas">Chaque clic est enregistré tout de suite. Une absence d'une journée compte pour 2 demi-journées.</p>
      } @else {
        <div class="np-carte">
          <div class="defile">
            <table class="np-table">
              <thead><tr><th>Élève</th>
                <th class="np-num">1er trim.</th><th class="np-num">2e trim.</th><th class="np-num">3e trim.</th><th class="np-num">Année</th>
                <th>Dernières absences</th></tr></thead>
              <tbody>
                @for (e of eleves(); track e.id) {
                  @let r = bilan().get(e.id!);
                  <tr>
                    <td><strong>{{ e.prenom }} {{ e.nom }}</strong></td>
                    @for (t of [0, 1, 2, 3]; track t) {
                      <td class="np-num"><span [class.fort]="t === 3">{{ cellule(r?.[t]) }}</span></td>
                    }
                    <td class="dernieres">
                      @for (a of historique().get(e.id!)?.slice(0, 4) ?? []; track a.id) {
                        <span class="np-pill" [class.np-i]="a.type === 'absence' && !a.justifie" [class.np-ab]="a.type === 'absence' && a.justifie" [class.np-p]="a.type === 'retard'"
                          [title]="a.motif">{{ a.date | date: 'dd/MM' }} {{ a.type === 'retard' ? 'retard' : libelleMoment(a.moment).toLowerCase() }}{{ a.justifie ? ' ✓' : '' }}</span>
                      } @empty { <span class="doux">—</span> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
        <p class="np-note-bas">Absences en demi-journées (justifiées entre parenthèses) / nombre de retards. Ces totaux s'affichent aussi sur les bulletins et dans l'espace parents.</p>
      }
    </div>
  `,
  styles: `
    .barre-jour { display: flex; align-items: center; gap: 12px; padding: 14px 18px; flex-wrap: wrap; overflow: visible; }
    .jour { display: flex; flex-direction: column; gap: 2px; }
    .jour input { font: inherit; padding: 7px 10px; border: 1px solid #d5dae3; border-radius: 10px; }
    .jour-long { font-weight: 600; color: var(--bleu-nuit); text-transform: capitalize; }
    .compteurs { display: flex; gap: 6px; flex-wrap: wrap; margin-left: auto; }
    .defile { overflow-x: auto; }
    .appel td { vertical-align: middle; padding: 10px 14px; }
    .mat { display: block; font-size: .75rem; color: #9aa1b2; }
    .statut button { padding: 6px 12px; font-size: .85rem; }
    .statut button.abs.actif { background: #c0392b; color: #fff; }
    .statut button.ret.actif { background: #e08e0b; color: #fff; }
    tr.absent td { background: #fdf3f2; }
    tr.retard td { background: #fdf8ee; }
    select, .motif { font: inherit; font-size: .88rem; padding: 6px 8px; border: 1px solid #d5dae3; border-radius: 8px; background: #fff; }
    .motif { width: 180px; }
    input[type=checkbox] { width: 18px; height: 18px; accent-color: var(--vert); }
    .etat { width: 24px; color: var(--vert); font-weight: 700; }
    .vide, .doux { color: #9aa1b2; }
    .dernieres { display: flex; gap: 4px; flex-wrap: wrap; }
    .fort { font-weight: 700; color: var(--bleu-nuit); }
  `,
})
export class AppelComponent implements OnInit {
  id = input.required<string>();
  private ns = inject(NotesService);
  private as = inject(AbsencesService);

  aujourdhui = aujourdhui();
  moments = MOMENTS;
  libelleMoment = libelleMoment;

  vue = signal<'appel' | 'bilan'>('appel');
  classe = signal<Classe | null>(null);
  eleves = signal<Eleve[]>([]);
  date = signal(aujourdhui());
  toutes = signal<Absence[]>([]);
  etats = signal<Record<number, 'enregistrement' | 'ok' | 'erreur'>>({});
  erreur = signal('');

  duJour = computed(() => new Map(this.toutes().filter((a) => a.date === this.date()).map((a) => [a.eleve_id, a])));
  compte = computed(() => {
    const j = [...this.duJour().values()];
    const absence = j.filter((a) => a.type === 'absence').length;
    const retard = j.filter((a) => a.type === 'retard').length;
    return { absence, retard, present: this.eleves().length - absence - retard };
  });
  historique = computed(() => {
    const m = new Map<number, Absence[]>();
    for (const a of this.toutes()) m.set(a.eleve_id, [...(m.get(a.eleve_id) ?? []), a]);
    return m;
  });
  bilan = computed(() => new Map<number, ResumeAssiduite[]>(this.eleves().map((e) => [e.id!, resumeParTrimestre(this.historique().get(e.id!) ?? [])])));

  async ngOnInit() {
    try {
      const id = Number(this.id());
      const [c, e] = await Promise.all([this.ns.classe(id), this.ns.eleves(id)]);
      this.classe.set(c);
      this.eleves.set(e);
      this.toutes.set(await this.as.classe(id));
    } catch (err) {
      this.erreur.set((err as Error).message);
    }
  }

  changerDate(d: string) { if (d) this.date.set(d > this.aujourdhui ? this.aujourdhui : d); }
  decaler(n: number) {
    const d = new Date(this.date() + 'T12:00:00');
    d.setDate(d.getDate() + n);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.changerDate(iso);
  }

  cellule(r: ResumeAssiduite | undefined) {
    if (!r || (!r.absences && !r.retards)) return '—';
    return `${r.absences}${r.absencesJustifiees ? ` (${r.absencesJustifiees})` : ''} / ${r.retards}`;
  }

  private etat(id: number, e: 'enregistrement' | 'ok' | 'erreur') { this.etats.update((s) => ({ ...s, [id]: e })); }

  async choisir(e: Eleve, statut: Statut) {
    const actuel = this.duJour().get(e.id!);
    if ((actuel?.type ?? 'present') === statut) return;
    this.etat(e.id!, 'enregistrement');
    try {
      if (actuel?.id) {
        await this.as.supprimer(actuel.id);
        this.toutes.update((l) => l.filter((a) => a.id !== actuel.id));
      }
      if (statut !== 'present') {
        const moment: Moment = statut === 'retard' ? 'matin' : 'journee';
        const nouv = await this.as.enregistrer({
          eleve_id: e.id!, classe_id: e.classe_id, date: this.date(), type: statut, moment,
          justifie: actuel?.justifie ?? false, motif: actuel?.motif ?? '',
        });
        this.toutes.update((l) => [nouv, ...l]);
      }
      this.etat(e.id!, 'ok');
    } catch (err) {
      this.etat(e.id!, 'erreur');
      this.erreur.set((err as Error).message);
    }
  }

  async modifier(a: Absence, champs: Partial<Absence>) {
    this.etat(a.eleve_id, 'enregistrement');
    try {
      const maj = await this.as.enregistrer({ ...a, ...champs });
      this.toutes.update((l) => l.map((x) => (x.id === a.id ? maj : x)));
      this.etat(a.eleve_id, 'ok');
    } catch (err) {
      this.etat(a.eleve_id, 'erreur');
      this.erreur.set((err as Error).message);
    }
  }

  async tousPresents() {
    for (const e of this.eleves()) await this.choisir(e, 'present');
  }
}
