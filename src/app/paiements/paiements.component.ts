import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Classe, Eleve, NotesService } from '../notes/notes.service';
import { PaiementsService } from './paiements.service';
import { fcfa, LIBELLE_TYPE, MOIS_SCOLAIRES, moisEchus, nomMois, Paiement, situation, Situation, Tarif } from './regles';

interface Ligne { eleve: Eleve; classe: Classe; s: Situation; }

@Component({
  selector: 'app-paiements',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="np-page">
      <div class="np-titre">
        <div>
          <h1>Paiements</h1>
          <p>Scolarité {{ annee() }} · {{ moisCourant() }}</p>
        </div>
        <div class="tete-actions">
          <select class="choix" [ngModel]="annee()" (ngModelChange)="changerAnnee($event)" aria-label="Année scolaire">
            @for (a of annees(); track a) { <option [value]="a">{{ a }}</option> }
          </select>
          <a class="np-btn" routerLink="/admin/tarifs">⚙ Tarifs</a>
        </div>
      </div>

      @if (erreur()) { <p class="np-erreur">{{ erreur() }}</p> }
      @if (sansTarif()) {
        <p class="info">Aucun tarif n'est encore saisi pour {{ annee() }}. <a routerLink="/admin/tarifs">Renseignez les tarifs</a> pour calculer ce que chaque élève doit.</p>
      }

      <!-- Chiffres clés -->
      <div class="chiffres">
        <div class="np-carte chiffre principal">
          <span class="np-libelle">Encaissé aujourd'hui</span>
          <span class="valeur">{{ fcfa(totaux().jour) }}</span>
        </div>
        <div class="np-carte chiffre">
          <span class="np-libelle">Encaissé ce mois</span>
          <span class="valeur">{{ fcfa(totaux().mois) }}</span>
        </div>
        <div class="np-carte chiffre">
          <span class="np-libelle">Depuis la rentrée</span>
          <span class="valeur">{{ fcfa(totaux().annee) }}</span>
          <small>sur {{ fcfa(totaux().duAnnee) }} attendus dans l'année</small>
        </div>
        <div class="np-carte chiffre alerte">
          <span class="np-libelle">Retards à ce jour</span>
          <span class="valeur rouge">{{ fcfa(totaux().retard) }}</span>
          <small>{{ totaux().enRetard }} élève{{ totaux().enRetard > 1 ? 's' : '' }} en retard</small>
        </div>
      </div>

      <!-- Liste des élèves -->
      <div class="np-carte">
        <div class="filtres">
          <div class="np-segment">
            <button [class.actif]="filtre() === 'tous'" (click)="filtre.set('tous')">Tous · {{ lignes().length }}</button>
            <button [class.actif]="filtre() === 'retard'" (click)="filtre.set('retard')">En retard · {{ totaux().enRetard }}</button>
            <button [class.actif]="filtre() === 'jour'" (click)="filtre.set('jour')">À jour</button>
          </div>
          <select class="choix" [ngModel]="classeFiltre()" (ngModelChange)="classeFiltre.set($event)" aria-label="Classe">
            <option value="">Toutes les classes</option>
            @for (c of classes(); track c.id) { <option [value]="c.id">{{ c.nom }}</option> }
          </select>
          <input class="recherche" type="search" placeholder="Rechercher un élève ou un matricule…" [ngModel]="recherche()" (ngModelChange)="recherche.set($event)">
        </div>
        <div class="defile">
          <table class="np-table">
            <thead>
              <tr><th>Élève</th><th>Classe</th><th class="np-num">Dû à ce jour</th><th class="np-num">Payé</th>
                <th class="np-num">Retard</th><th>Situation</th><th></th></tr>
            </thead>
            <tbody>
              @for (l of lignesFiltrees(); track l.eleve.id) {
                <tr>
                  <td><a class="nom" [routerLink]="['/admin/paiements/eleve', l.eleve.id]"><b>{{ l.eleve.prenom }} {{ l.eleve.nom }}</b></a>
                    <span class="np-sous">{{ l.eleve.matricule }}</span></td>
                  <td>{{ l.classe.nom }}</td>
                  <td class="np-num">{{ fcfa(l.s.duADate) }}</td>
                  <td class="np-num">{{ fcfa(l.s.paye) }}</td>
                  <td class="np-num" [class.rouge]="l.s.retard > 0"><b>{{ l.s.retard ? fcfa(l.s.retard) : '—' }}</b></td>
                  <td>
                    @if (l.s.retard > 0) {
                      <span class="np-pill np-i">{{ l.s.moisEnRetard ? l.s.moisEnRetard + ' mois de retard' : 'En retard' }}</span>
                    } @else {
                      <span class="np-pill np-tb">À jour</span>
                    }
                  </td>
                  <td class="droite">
                    @if (l.s.retard > 0 && l.eleve.telephone) {
                      <a class="mini wa" target="_blank" [href]="lienRelance(l)" title="Relancer le parent sur WhatsApp">WhatsApp</a>
                    }
                    <a class="np-btn vert petit" [routerLink]="['/admin/paiements/eleve', l.eleve.id]">Encaisser</a>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="vide">{{ chargement() ? 'Chargement…' : 'Aucun élève.' }}</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Derniers versements -->
      <div class="np-carte">
        <div class="np-bandeau"><h2>Derniers versements</h2></div>
        <table class="np-table">
          <thead><tr><th>Date</th><th>Reçu</th><th>Élève</th><th>Détail</th><th>Moyen</th><th class="np-num">Montant</th></tr></thead>
          <tbody>
            @for (r of derniersRecus(); track r.numero) {
              <tr>
                <td>{{ r.date | date: 'dd/MM/yyyy' }}</td>
                <td><a target="_blank" [href]="lienRecu(r.numero)">{{ r.numero }}</a></td>
                <td>{{ r.eleve }}</td>
                <td class="detail">{{ r.detail }}</td>
                <td>{{ r.moyen }}</td>
                <td class="np-num"><b>{{ fcfa(r.total) }}</b></td>
              </tr>
            } @empty { <tr><td colspan="6" class="vide">Aucun versement pour cette année.</td></tr> }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: `
    .tete-actions { display: flex; gap: 10px; align-items: center; }
    .choix { font: inherit; font-size: .9rem; padding: 9px 12px; border: 1px solid #d5dae3; border-radius: 10px; background: #fff; }
    .info { background: #fff4e0; color: #8a5a00; padding: 12px 16px; border-radius: 10px; margin: 0; }
    .chiffres { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 16px; }
    .chiffre { padding: 18px 20px; display: flex; flex-direction: column; gap: 6px; }
    .chiffre.principal { background: var(--bleu-nuit); border-color: var(--bleu-nuit); }
    .chiffre.principal .np-libelle { color: #b9c3d8; }
    .chiffre.principal .valeur { color: #fff; }
    .chiffre.alerte { border-left: 4px solid #d9534f; }
    .valeur { font-size: 1.5rem; font-weight: 700; color: var(--bleu-nuit); white-space: nowrap; }
    .chiffre small { color: var(--texte-doux); font-size: .82rem; }
    .rouge { color: #a12a1f !important; }
    .filtres { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; padding: 14px 18px; border-bottom: 1px solid #e3e6ec; }
    .recherche { font: inherit; font-size: .9rem; padding: 9px 14px; border: 1px solid #d5dae3; border-radius: 10px; flex: 1; min-width: 200px; }
    .defile { overflow-x: auto; }
    .nom { color: var(--texte); text-decoration: none; }
    .nom:hover { color: var(--vert); }
    .droite { text-align: right; white-space: nowrap; }
    .petit { padding: 7px 14px; font-size: .85rem; }
    .mini { font-size: .8rem; font-weight: 600; border-radius: 8px; padding: 6px 10px; text-decoration: none; margin-right: 6px; }
    .wa { background: #e7f8ee; color: #128c4b; }
    .detail { color: var(--texte-doux); font-size: .88rem; }
    .vide { text-align: center; color: var(--texte-doux); padding: 28px !important; }
  `,
})
export class PaiementsComponent implements OnInit {
  private ps = inject(PaiementsService);
  private ns = inject(NotesService);
  fcfa = fcfa;

  annees = signal<string[]>([]);
  annee = signal('');
  classes = signal<Classe[]>([]);
  lignes = signal<Ligne[]>([]);
  paiements = signal<Paiement[]>([]);
  tarifs = signal<Tarif[]>([]);
  filtre = signal<'tous' | 'retard' | 'jour'>('tous');
  classeFiltre = signal('');
  recherche = signal('');
  erreur = signal('');
  chargement = signal(true);

  moisCourant = computed(() => {
    const n = moisEchus(this.annee());
    return n === 0 ? 'avant la rentrée' : `${n} mois échu${n > 1 ? 's' : ''} sur 9 (jusqu'à ${nomMois(new Date().getMonth() + 1)})`;
  });
  sansTarif = computed(() => !this.chargement() && !this.tarifs().some((t) => t.montant > 0));

  lignesFiltrees = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    return this.lignes().filter((l) =>
      (!this.classeFiltre() || String(l.classe.id) === this.classeFiltre()) &&
      (this.filtre() === 'tous' || (this.filtre() === 'retard' ? l.s.retard > 0 : l.s.retard === 0)) &&
      (!q || `${l.eleve.prenom} ${l.eleve.nom} ${l.eleve.matricule}`.toLowerCase().includes(q)));
  });

  totaux = computed(() => {
    const auj = new Date().toISOString().slice(0, 10);
    const mois = auj.slice(0, 7);
    const ps = this.paiements();
    const ls = this.lignesFiltreesParClasse();
    return {
      jour: ps.filter((p) => p.date_paiement === auj).reduce((s, p) => s + p.montant, 0),
      mois: ps.filter((p) => p.date_paiement.startsWith(mois)).reduce((s, p) => s + p.montant, 0),
      annee: ps.reduce((s, p) => s + p.montant, 0),
      duAnnee: ls.reduce((s, l) => s + l.s.duAnnee, 0),
      retard: ls.reduce((s, l) => s + l.s.retard, 0),
      enRetard: ls.filter((l) => l.s.retard > 0).length,
    };
  });
  private lignesFiltreesParClasse = computed(() =>
    this.lignes().filter((l) => !this.classeFiltre() || String(l.classe.id) === this.classeFiltre()));

  /** Versements regroupés par reçu (les 15 plus récents). */
  derniersRecus = computed(() => {
    const parRecu = new Map<string, Paiement[]>();
    for (const p of this.paiements()) parRecu.set(p.numero_recu!, [...(parRecu.get(p.numero_recu!) ?? []), p]);
    const noms = new Map(this.lignes().map((l) => [l.eleve.id, `${l.eleve.prenom} ${l.eleve.nom}`]));
    return [...parRecu.entries()].slice(0, 15).map(([numero, ps]) => ({
      numero, date: ps[0].date_paiement, moyen: ps[0].moyen, eleve: noms.get(ps[0].eleve_id) ?? '',
      total: ps.reduce((s, p) => s + p.montant, 0),
      detail: [...ps].sort((a, b) => (a.mois ? MOIS_SCOLAIRES.indexOf(a.mois) : -1) - (b.mois ? MOIS_SCOLAIRES.indexOf(b.mois) : -1))
        .map((p) => LIBELLE_TYPE[p.type] + (p.mois ? ' ' + nomMois(p.mois) : '')).join(', '),
    }));
  });

  async ngOnInit() {
    try {
      const classes = await this.ns.classes();
      const annees = [...new Set(classes.map((c) => c.annee))];
      this.annees.set(annees.length ? annees : ['2026-2027']);
      await this.changerAnnee(this.annees()[0]);
    } catch (e) {
      this.erreur.set((e as Error).message);
      this.chargement.set(false);
    }
  }

  async changerAnnee(a: string) {
    this.annee.set(a);
    this.chargement.set(true);
    try {
      const classes = (await this.ns.classes()).filter((c) => c.annee === a);
      const [tarifs, paiements, eleves] = await Promise.all([
        this.ps.tarifs(a), this.ps.paiementsAnnee(a), Promise.all(classes.map((c) => this.ns.eleves(c.id!))),
      ]);
      this.classes.set(classes);
      this.tarifs.set(tarifs);
      this.paiements.set(paiements);
      const parEleve = new Map<number, Paiement[]>();
      for (const p of paiements) parEleve.set(p.eleve_id, [...(parEleve.get(p.eleve_id) ?? []), p]);
      this.lignes.set(classes.flatMap((c, i) => eleves[i].map((e) => ({
        eleve: e, classe: c, s: situation({ id: e.id!, cantine: e.cantine, transport: e.transport }, c.niveau, a, tarifs, parEleve.get(e.id!) ?? []),
      }))).sort((x, y) => y.s.retard - x.s.retard || x.eleve.nom.localeCompare(y.eleve.nom)));
      this.erreur.set('');
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.chargement.set(false);
    }
  }

  lienRecu(numero: string) {
    const base = document.querySelector('base')?.getAttribute('href') ?? '/';
    return `${base}admin/recu/${numero}`;
  }

  /** Message WhatsApp de relance, poli, avec le montant et les mois concernés. */
  lienRelance(l: Ligne) {
    const tel = l.eleve.telephone.replace(/\D/g, '');
    const numero = tel.length === 9 ? '221' + tel : tel;
    const mois = l.s.moisImpayes.map(nomMois).join(', ');
    const texte = `Bonjour, l'École franco-arabe Keur Papa Djibril Kor vous informe qu'il reste ${fcfa(l.s.retard)} à régler pour ` +
      `${l.eleve.prenom} ${l.eleve.nom} (${l.classe.nom})${mois ? ` — mensualité(s) : ${mois}` : ''}. ` +
      `Merci de passer à l'école ou de payer par Wave / Orange Money. Merci de votre confiance.`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(texte)}`;
  }
}
