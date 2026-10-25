import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BulletinCode, LIBELLES_BULLETIN, libellePeriode, PERIODES } from './modeles';
import { chargerBulletins, DonneesBulletin } from './donnees-bulletin';
import { Classe, NotesService } from './notes.service';
import { BulletinCarteComponent } from './bulletin-carte.component';

/** Bulletin d'un élève à l'écran (consultation). L'impression garde les modèles papier de l'école. */
@Component({
  selector: 'app-bulletin-eleve',
  imports: [RouterLink, BulletinCarteComponent],
  template: `
    <div class="np-page">
      <a [routerLink]="['/admin/classes', classe()]" class="np-fil no-print">‹ Élèves</a>

      <div class="np-titre no-print">
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
          <div class="outils no-print">
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
              <a class="np-btn or" target="_blank" [href]="lienImpression()" title="Format des relevés papier de l'école">🖨 Modèle papier</a>
            </div>
          </div>

          <app-bulletin-carte [d]="d" [ligne]="l" [onglet]="onglet()" />
          <div class="bas no-print">
            <button class="np-btn plein grand-btn" (click)="imprimer()">🖨 Imprimer ce bulletin</button>
            <span>Imprime uniquement le bulletin de {{ l.eleve.prenom }} {{ l.eleve.nom }}, tel qu'affiché. Choisissez « Enregistrer en PDF » pour obtenir un fichier.</span>
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
    .doux { color: #9aa1b2; }
    .bas { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: center; text-align: center; }
    .bas span { color: var(--texte-doux); font-size: .88rem; max-width: 520px; }
    .grand-btn { padding: 14px 28px; font-size: 1rem; }
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

  donnees = signal<DonneesBulletin | null>(null);
  bulletin = signal<BulletinCode>('fr');
  onglet = signal<number | 'annee'>(1);
  erreur = signal('');

  ligne = computed(() => this.donnees()?.lignes.find((l) => String(l.eleve.id) === this.eleve()) ?? null);
  position = computed(() => this.donnees()?.lignes.findIndex((l) => String(l.eleve.id) === this.eleve()) ?? -1);

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



  /** Imprime seulement ce bulletin (le menu et les boutons sont masqués à l'impression). */
  imprimer() {
    const ancien = document.title;
    const l = this.ligne();
    if (l) document.title = `Bulletin ${l.eleve.prenom} ${l.eleve.nom}`;
    window.print();
    document.title = ancien;
  }

  lienImpression() {
    const base = document.querySelector('base')?.getAttribute('href') ?? '/';
    const q = new URLSearchParams({ bulletin: this.bulletin(), eleve: this.eleve() });
    if (this.bulletin() === 'en') q.set('periode', String(this.onglet() === 'annee' ? 1 : this.onglet()));
    return `${base}admin/impression/${this.classe()}?${q}`;
  }
}
