import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Classe, Eleve, NotesService } from '../notes/notes.service';
import { PaiementsService } from './paiements.service';
import {
  fcfa, LIBELLE_TYPE, MOIS_SCOLAIRES, moisEchus, Moyen, MOYENS, nomMois, nomMoisCourt, Paiement, situation, tarif, Tarif,
  TypeFrais, typesDeLEleve, verse,
} from './regles';

@Component({
  selector: 'app-paiement-eleve',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="np-page">
      <a routerLink="/admin/paiements" class="np-fil">‹ Paiements</a>
      @if (erreur()) { <p class="np-erreur">{{ erreur() }}</p> }

      @if (eleve(); as e) {
        @if (classe(); as c) {
          <div class="np-titre">
            <div>
              <h1>{{ e.prenom }} {{ e.nom }}</h1>
              <p>{{ e.matricule }} · {{ c.nom }} ({{ c.niveau }}) · {{ c.annee }}{{ e.telephone ? ' · Tél. parent ' + e.telephone : '' }}</p>
            </div>
            <div class="options">
              <label><input type="checkbox" [ngModel]="!!e.cantine" (ngModelChange)="changerOption('cantine', $event)"> Cantine</label>
              <label><input type="checkbox" [ngModel]="!!e.transport" (ngModelChange)="changerOption('transport', $event)"> Transport</label>
            </div>
          </div>

          <!-- Situation -->
          @let s = sit();
          <div class="np-carte">
            <div class="np-resume sans-bord">
              <div class="principal"><span class="np-libelle">Reste à payer à ce jour</span>
                <div class="np-grand reste" [class.rouge]="s.retard > 0">{{ fcfa(s.retard) }}</div></div>
              <div><span class="np-libelle">Déjà payé</span><div class="moyen">{{ fcfa(s.paye) }}</div></div>
              <div><span class="np-libelle">Total de l'année</span><div class="moyen">{{ fcfa(s.duAnnee) }}</div></div>
              <div><span class="np-libelle">Reste sur l'année</span><div class="moyen">{{ fcfa(s.reste) }}</div></div>
              <div><span class="np-libelle">Situation</span>
                <div class="pastille-bas">@if (s.retard > 0) { <span class="np-pill np-i">{{ s.moisEnRetard ? s.moisEnRetard + ' mois de retard' : 'En retard' }}</span> }
                  @else { <span class="np-pill np-tb">À jour</span> }</div></div>
            </div>

            <!-- Grille des mois -->
            <div class="defile">
              <table class="np-table grille-mois">
                <thead>
                  <tr><th>Frais</th>
                    @for (m of mois; track m; let i = $index) { <th class="centre" [class.courant]="i === echus() - 1">{{ nomMoisCourt(m) }}</th> }
                  </tr>
                </thead>
                <tbody>
                  @for (t of typesMensuels(); track t.code) {
                    <tr>
                      <td><b>{{ t.libelle }}</b><span class="np-sous">{{ fcfa(prix(t.code)) }} / mois</span></td>
                      @for (m of mois; track m; let i = $index) {
                        @let etat = etatMois(t.code, m, i);
                        <td class="centre"><span [class]="'case ' + etat" [title]="titreCase(t.code, m, etat)">
                          {{ etat === 'paye' ? '✓' : etat === 'partiel' ? '½' : etat === 'du' ? '!' : '' }}</span></td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="uniques">
              @for (t of typesUniques(); track t.code) {
                @let v = verse(paiements(), t.code);
                <div class="unique">
                  <span>{{ t.libelle }}</span>
                  @if (prix(t.code) && v >= prix(t.code)) { <span class="np-pill np-tb">Payé · {{ fcfa(v) }}</span> }
                  @else if (v > 0) { <span class="np-pill np-p">{{ fcfa(v) }} sur {{ fcfa(prix(t.code)) }}</span> }
                  @else { <span class="np-pill np-i">À payer · {{ fcfa(prix(t.code)) }}</span> }
                </div>
              }
              <div class="legende"><span class="case paye">✓</span> payé <span class="case partiel">½</span> en partie
                <span class="case du">!</span> en retard <span class="case avenir"></span> à venir</div>
            </div>
          </div>

          <!-- Encaisser -->
          <form class="np-carte encaisser" (ngSubmit)="encaisser()" #f="ngForm">
            <div class="np-bandeau"><h2>Encaisser un paiement</h2>
              @if (dernierRecu()) { <a class="np-btn or" target="_blank" [href]="lienRecu(dernierRecu()!)">🖨 Imprimer le reçu {{ dernierRecu() }}</a> }
            </div>
            <div class="corps">
              <div class="np-segment">
                @for (t of typesEleve(); track t.code) {
                  <button type="button" [class.actif]="type() === t.code" (click)="choisirType(t.code)">{{ t.libelle }}</button>
                }
              </div>

              @if (estMensuel()) {
                <div>
                  <span class="np-libelle">Mois payés</span>
                  <div class="mois-choix">
                    @for (m of mois; track m) {
                      @let solde = prix(type()) > 0 && verse(paiements(), type(), m) >= prix(type());
                      <label [class.coche]="moisChoisis().includes(m)" [class.solde]="solde">
                        <input type="checkbox" [disabled]="solde" [checked]="moisChoisis().includes(m)" (change)="basculerMois(m)">
                        {{ nomMois(m) }}{{ solde ? ' ✓' : '' }}
                      </label>
                    }
                  </div>
                </div>
              }

              <div class="ligne">
                <label class="ch"><span>Montant (F CFA)</span>
                  <input type="number" name="montant" min="1" step="500" [(ngModel)]="montant" required></label>
                <label class="ch"><span>Date</span><input type="date" name="date" [(ngModel)]="date" required></label>
                <div class="ch"><span>Moyen de paiement</span>
                  <div class="np-segment">
                    @for (mo of moyens; track mo) { <button type="button" [class.actif]="moyen() === mo" (click)="moyen.set(mo)">{{ mo }}</button> }
                  </div>
                </div>
                @if (moyen() !== 'Espèces') {
                  <label class="ch"><span>N° de transaction</span><input name="ref" [(ngModel)]="reference" placeholder="Ex. 7XK2…"></label>
                }
              </div>
              <label class="ch"><span>Note (facultatif)</span><input name="note" [(ngModel)]="note" placeholder="Ex. payé par l'oncle"></label>
              @if (attendu() && montant !== attendu()) {
                <p class="aide">Montant attendu : {{ fcfa(attendu()) }}. Vous pouvez enregistrer un montant différent (avance ou paiement partiel).</p>
              }
              <div><button class="np-btn vert gros" [disabled]="f.invalid || envoi() || !montant || (estMensuel() && !moisChoisis().length)">
                {{ envoi() ? 'Enregistrement…' : 'Encaisser ' + fcfa(montant || 0) }}</button></div>
            </div>
          </form>

          <!-- Historique -->
          <div class="np-carte">
            <div class="np-bandeau"><h2>Historique des versements</h2></div>
            <table class="np-table">
              <thead><tr><th>Date</th><th>Reçu</th><th>Détail</th><th>Moyen</th><th class="np-num">Montant</th><th></th></tr></thead>
              <tbody>
                @for (r of recus(); track r.numero) {
                  <tr>
                    <td>{{ r.date | date: 'dd/MM/yyyy' }}</td>
                    <td><b>{{ r.numero }}</b></td>
                    <td class="detail">{{ r.detail }}</td>
                    <td>{{ r.moyen }}{{ r.reference ? ' · ' + r.reference : '' }}</td>
                    <td class="np-num"><b>{{ fcfa(r.total) }}</b></td>
                    <td class="droite">
                      <a class="mini" target="_blank" [href]="lienRecu(r.numero)">Reçu</a>
                      <button class="mini danger" (click)="annuler(r.numero)">Annuler</button>
                    </td>
                  </tr>
                } @empty { <tr><td colspan="6" class="vide">Aucun versement pour l'instant.</td></tr> }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
  styles: `
    .options { display: flex; gap: 16px; }
    .options label { display: flex; align-items: center; gap: 6px; font-weight: 500; background: #fff; border: 1px solid #d5dae3; padding: 8px 14px; border-radius: 10px; cursor: pointer; }
    .sans-bord { border-top: 0; border-bottom: 1px solid #e3e6ec; }
    .moyen { font-size: 1.3rem; font-weight: 700; color: var(--bleu-nuit); margin-top: 2px; white-space: nowrap; }
    .rouge { color: #a12a1f !important; }
    .reste { font-size: 1.6rem; white-space: nowrap; }
    .pastille-bas { margin-top: 8px; }
    .defile { overflow-x: auto; }
    .centre { text-align: center !important; }
    th.courant { color: var(--bleu-nuit) !important; background: #fff4e0 !important; }
    .case { display: inline-grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; font-weight: 700; font-size: .9rem; }
    .case.paye { background: #dff3e7; color: #17663e; }
    .case.partiel { background: #fff3dc; color: #8a5a00; }
    .case.du { background: #fde7e5; color: #a12a1f; }
    .case.avenir { background: #f1f3f6; }
    .uniques { display: flex; gap: 18px; flex-wrap: wrap; align-items: center; padding: 14px 18px; border-top: 1px solid #eef0f4; }
    .unique { display: flex; gap: 8px; align-items: center; font-weight: 600; }
    .legende { margin-left: auto; display: flex; gap: 8px; align-items: center; font-size: .82rem; color: var(--texte-doux); }
    .legende .case { width: 22px; height: 22px; font-size: .75rem; }
    .encaisser .corps { padding: 20px 22px; display: flex; flex-direction: column; gap: 16px; }
    .mois-choix { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
    .mois-choix label { border: 1px solid #d5dae3; border-radius: 10px; padding: 8px 12px; cursor: pointer; display: flex; gap: 6px; align-items: center; font-size: .9rem; }
    .mois-choix label.coche { border-color: var(--vert); background: #e9f6ee; font-weight: 600; }
    .mois-choix label.solde { opacity: .55; cursor: default; }
    .ligne { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-end; }
    .ch { display: flex; flex-direction: column; gap: 5px; }
    .ch > span { font-size: .72rem; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: #6b7387; }
    .ch input { font: inherit; padding: 10px 12px; border: 1px solid #d5dae3; border-radius: 10px; min-width: 160px; }
    .aide { margin: 0; color: #8a5a00; font-size: .88rem; }
    .gros { padding: 13px 26px; font-size: 1rem; }
    .detail { color: var(--texte-doux); font-size: .88rem; }
    .droite { text-align: right; white-space: nowrap; }
    .mini { font: inherit; font-size: .8rem; font-weight: 500; border: 1px solid #d5dae3; background: #fff; border-radius: 8px; padding: 5px 10px;
      cursor: pointer; margin-left: 4px; color: var(--bleu-nuit); text-decoration: none; }
    .danger { color: #a12a1f; border-color: #f0c8c3; }
    .vide { text-align: center; color: var(--texte-doux); padding: 24px !important; }
  `,
})
export class PaiementEleveComponent implements OnInit {
  id = input.required<string>();
  private ps = inject(PaiementsService);
  private ns = inject(NotesService);
  fcfa = fcfa; nomMois = nomMois; nomMoisCourt = nomMoisCourt; verse = verse;
  mois = MOIS_SCOLAIRES;
  moyens = MOYENS;

  eleve = signal<Eleve | null>(null);
  classe = signal<Classe | null>(null);
  tarifs = signal<Tarif[]>([]);
  paiements = signal<Paiement[]>([]);
  erreur = signal('');
  envoi = signal(false);
  dernierRecu = signal<string | null>(null);

  type = signal<TypeFrais>('mensualite');
  moisChoisis = signal<number[]>([]);
  moyen = signal<Moyen>('Espèces');
  montant = 0;
  date = new Date().toISOString().slice(0, 10);
  reference = '';
  note = '';

  echus = computed(() => (this.classe() ? moisEchus(this.classe()!.annee) : 0));
  typesEleve = computed(() => (this.eleve() ? typesDeLEleve({ id: 0, cantine: this.eleve()!.cantine, transport: this.eleve()!.transport }) : []));
  typesMensuels = computed(() => this.typesEleve().filter((t) => t.mensuel));
  typesUniques = computed(() => this.typesEleve().filter((t) => !t.mensuel));
  estMensuel = computed(() => !!this.typesEleve().find((t) => t.code === this.type())?.mensuel);
  sit = computed(() => {
    const e = this.eleve(), c = this.classe();
    return situation({ id: e?.id ?? 0, cantine: e?.cantine, transport: e?.transport }, c?.niveau ?? '', c?.annee ?? '', this.tarifs(), this.paiements());
  });
  attendu = computed(() => {
    const p = this.prix(this.type());
    if (!this.estMensuel()) return Math.max(0, p - verse(this.paiements(), this.type()));
    return this.moisChoisis().reduce((s, m) => s + Math.max(0, p - verse(this.paiements(), this.type(), m)), 0);
  });

  /** Versements regroupés par reçu. */
  recus = computed(() => {
    const parRecu = new Map<string, Paiement[]>();
    for (const p of this.paiements()) parRecu.set(p.numero_recu!, [...(parRecu.get(p.numero_recu!) ?? []), p]);
    return [...parRecu.entries()].map(([numero, ps]) => ({
      numero, date: ps[0].date_paiement, moyen: ps[0].moyen, reference: ps[0].reference,
      total: ps.reduce((s, p) => s + p.montant, 0),
      detail: [...ps].sort((a, b) => (a.mois ? MOIS_SCOLAIRES.indexOf(a.mois) : -1) - (b.mois ? MOIS_SCOLAIRES.indexOf(b.mois) : -1))
        .map((p) => LIBELLE_TYPE[p.type] + (p.mois ? ' ' + nomMois(p.mois) : '')).join(', '),
    }));
  });

  async ngOnInit() { await this.charger(); }

  async charger() {
    try {
      const e = await this.ps.eleve(Number(this.id()));
      const c = await this.ns.classe(e.classe_id);
      const [tarifs, paiements] = await Promise.all([this.ps.tarifs(c.annee), this.ps.paiementsEleve(e.id!, c.annee)]);
      this.eleve.set(e); this.classe.set(c); this.tarifs.set(tarifs); this.paiements.set(paiements);
      this.choisirType(this.type());
    } catch (err) {
      this.erreur.set((err as Error).message);
    }
  }

  prix(type: TypeFrais) { return this.classe() ? tarif(this.tarifs(), this.classe()!.niveau, type) : 0; }

  etatMois(type: TypeFrais, m: number, i: number): 'paye' | 'partiel' | 'du' | 'avenir' {
    const p = this.prix(type), v = verse(this.paiements(), type, m);
    if (p > 0 && v >= p) return 'paye';
    if (v > 0) return 'partiel';
    return i < this.echus() ? 'du' : 'avenir';
  }
  titreCase(type: TypeFrais, m: number, etat: string) {
    const v = verse(this.paiements(), type, m);
    return `${LIBELLE_TYPE[type]} ${nomMois(m)} : ${etat === 'paye' ? 'payé' : etat === 'partiel' ? fcfa(v) + ' versés' : etat === 'du' ? 'en retard' : 'à venir'}`;
  }

  choisirType(t: TypeFrais) {
    this.type.set(t);
    // Présélectionne le premier mois non soldé
    if (this.estMensuel()) {
      const premier = this.mois.find((m) => !(this.prix(t) > 0 && verse(this.paiements(), t, m) >= this.prix(t)));
      this.moisChoisis.set(premier ? [premier] : []);
    } else {
      this.moisChoisis.set([]);
    }
    this.montant = this.attendu();
  }

  basculerMois(m: number) {
    const l = this.moisChoisis();
    this.moisChoisis.set(l.includes(m) ? l.filter((x) => x !== m) : [...l, m].sort((a, b) => this.mois.indexOf(a) - this.mois.indexOf(b)));
    this.montant = this.attendu();
  }

  async changerOption(option: 'cantine' | 'transport', valeur: boolean) {
    const e = this.eleve()!;
    try {
      await this.ps.optionsEleve(e.id!, { cantine: option === 'cantine' ? valeur : !!e.cantine, transport: option === 'transport' ? valeur : !!e.transport });
      this.eleve.set({ ...e, [option]: valeur });
    } catch (err) {
      this.erreur.set((err as Error).message);
    }
  }

  /** Répartit le montant sur les mois choisis (le dernier mois reçoit le reste). */
  private lignes(): Paiement[] {
    const e = this.eleve()!, c = this.classe()!;
    const base = { eleve_id: e.id!, classe_id: c.id!, annee: c.annee, type: this.type(), moyen: this.moyen(),
      reference: this.moyen() === 'Espèces' ? '' : this.reference.trim(), date_paiement: this.date, note: this.note.trim() };
    if (!this.estMensuel()) return [{ ...base, mois: null, montant: Math.round(this.montant) }];
    let restant = Math.round(this.montant);
    const prix = this.prix(this.type());
    return this.moisChoisis().map((m, i, tous) => {
      const du = Math.max(0, prix - verse(this.paiements(), this.type(), m));
      const part = i === tous.length - 1 ? restant : Math.min(restant, du || Math.round(this.montant / tous.length));
      restant -= part;
      return { ...base, mois: m, montant: part };
    }).filter((l) => l.montant > 0);
  }

  async encaisser() {
    const lignes = this.lignes();
    if (!lignes.length) return;
    this.envoi.set(true);
    this.erreur.set('');
    try {
      const numero = await this.ps.encaisser(lignes);
      this.dernierRecu.set(numero);
      this.reference = ''; this.note = '';
      await this.charger();
      window.open(this.lienRecu(numero), '_blank');
    } catch (err) {
      this.erreur.set('Encaissement impossible : ' + (err as Error).message);
    } finally {
      this.envoi.set(false);
    }
  }

  async annuler(numero: string) {
    if (!confirm(`Annuler le reçu ${numero} ? Les montants seront retirés de la situation de l'élève.`)) return;
    try {
      await this.ps.annulerRecu(numero);
      await this.charger();
    } catch (err) {
      this.erreur.set((err as Error).message);
    }
  }

  lienRecu(numero: string) {
    const base = document.querySelector('base')?.getAttribute('href') ?? '/';
    return `${base}admin/recu/${numero}`;
  }
}
