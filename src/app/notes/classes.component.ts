import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ETABLISSEMENTS } from '../data/ecole';
import { NIVEAUX } from './modeles';
import { Classe, NotesService } from './notes.service';
import { ExportService } from './export.service';

const VIDE = (): Classe => ({
  nom: '', niveau: 'CI', etablissement: ETABLISSEMENTS[0].nom, maitre: '', annee: '2026-2027',
  bareme: 10, modele_fr: 'composition', avec_arabe: true, avec_anglais: false, maximums: {},
});

@Component({
  selector: 'app-classes',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="entete">
      <h1>Classes et notes</h1>
      <div class="boutons-tete">
        <button class="np-btn" (click)="sauvegarder()" [disabled]="exportEnCours()">
          {{ exportEnCours() ? 'Préparation…' : '💾 Sauvegarde Excel' }}</button>
        <button class="btn btn-vert" (click)="nouvelle()">+ Nouvelle classe</button>
      </div>
    </div>

    @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }

    @if (form) {
      <form class="carte formulaire" (ngSubmit)="enregistrer()" #f="ngForm">
        <h2>{{ form.id ? 'Modifier la classe' : 'Nouvelle classe' }}</h2>
        <div class="grille-form">
          <div class="champ"><label for="nom">Nom de la classe *</label>
            <input id="nom" name="nom" [(ngModel)]="form.nom" required placeholder="ex. CE1 A"></div>
          <div class="champ"><label for="niveau">Niveau</label>
            <select id="niveau" name="niveau" [(ngModel)]="form.niveau">
              @for (n of niveaux; track n) { <option>{{ n }}</option> }
            </select></div>
          <div class="champ"><label for="annee">Année scolaire</label>
            <input id="annee" name="annee" [(ngModel)]="form.annee" required placeholder="2026-2027"></div>
          <div class="champ"><label for="etab">Établissement</label>
            <select id="etab" name="etab" [(ngModel)]="form.etablissement">
              @for (e of etablissements; track e.nom) { <option>{{ e.nom }}</option> }
            </select></div>
          <div class="champ"><label for="maitre">Maître(sse) — « Tenue par »</label>
            <input id="maitre" name="maitre" [(ngModel)]="form.maitre"></div>
          <div class="champ"><label for="bareme">Moyenne sur</label>
            <select id="bareme" name="bareme" [(ngModel)]="form.bareme">
              <option [ngValue]="10">10</option><option [ngValue]="20">20</option>
            </select></div>
          <div class="champ large"><label for="modele">Relevé de français</label>
            <select id="modele" name="modele" [(ngModel)]="form.modele_fr">
              <option value="composition">Modèle 1 — Composition seule (Lecture, Écriture, Copie…)</option>
              <option value="controle">Modèle 2 — Contrôle + Composition (Ressources / Compétence)</option>
            </select></div>
          <label class="case"><input type="checkbox" name="ar" [(ngModel)]="form.avec_arabe"> Relevé d'arabe</label>
          <label class="case"><input type="checkbox" name="en" [(ngModel)]="form.avec_anglais"> Relevé d'anglais</label>
        </div>
        <div class="actions">
          <button class="btn btn-vert" [disabled]="f.invalid || envoi()">Enregistrer</button>
          <button type="button" class="btn btn-contour-bleu" (click)="form = null">Annuler</button>
          @if (form.id) { <button type="button" class="lien-danger" (click)="supprimer(form)">Supprimer la classe</button> }
        </div>
      </form>
    }

    <div class="liste">
      @for (c of classes(); track c.id) {
        <article class="carte classe">
          <div class="infos">
            <h3>{{ c.nom }} <small>· {{ c.annee }}</small></h3>
            <p>{{ c.etablissement }}{{ c.maitre ? ' · ' + c.maitre : '' }}</p>
            <p class="badges">
              <span class="pastille">{{ nbEleves()[c.id!] || 0 }} élèves</span>
              <span class="pastille gris">sur {{ c.bareme }}</span>
              <span class="pastille gris">FR modèle {{ c.modele_fr === 'controle' ? 2 : 1 }}</span>
              @if (c.avec_arabe) { <span class="pastille gris">Arabe</span> }
              @if (c.avec_anglais) { <span class="pastille gris">Anglais</span> }
            </p>
          </div>
          <div class="boutons">
            <a class="btn btn-contour-bleu petit" [routerLink]="['/admin/classes', c.id]">Élèves</a>
            <a class="btn btn-vert petit" [routerLink]="['/admin/saisie', c.id]">Saisir les notes</a>
            <a class="btn btn-or petit" [routerLink]="['/admin/bulletins', c.id]">Bulletins</a>
            <a class="btn btn-contour-bleu petit" [routerLink]="['/admin/appel', c.id]">Appel</a>
            <button class="lien" (click)="modifier(c)">Modifier</button>
          </div>
        </article>
      } @empty {
        @if (!chargement()) { <p class="vide">Aucune classe. Commencez par « Nouvelle classe ».</p> }
      }
    </div>
  `,
  styles: `
    .boutons-tete { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .entete { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    h1 { font-size: 1.6rem; margin: 0; }
    h2 { font-size: 1.15rem; }
    .formulaire { margin-bottom: 24px; }
    .grille-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0 16px; }
    .large { grid-column: span 2; }
    .case { display: flex; align-items: center; gap: 8px; font-weight: 500; margin-bottom: 16px; }
    .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .liste { display: flex; flex-direction: column; gap: 12px; }
    .classe { display: flex; justify-content: space-between; gap: 16px; padding: 20px; align-items: center; flex-wrap: wrap; }
    .classe h3 { margin: 0; }
    .classe h3 small { color: var(--texte-doux); font-weight: 400; font-size: .9rem; }
    .classe p { margin: 4px 0 0; color: var(--texte-doux); font-size: .9rem; }
    .badges { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px !important; }
    .gris { background: #eef0f4; color: var(--texte-doux); }
    .boutons { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .petit { padding: 8px 16px; font-size: .88rem; }
    .lien { background: none; border: 0; font: inherit; color: var(--vert); cursor: pointer; text-decoration: underline; }
    .lien-danger { background: none; border: 0; font: inherit; color: #a12a1f; cursor: pointer; margin-left: auto; }
    .erreur { background: #fdecea; color: #a12a1f; padding: 12px; border-radius: 10px; }
    .vide { color: var(--texte-doux); }
    @media (max-width: 640px) { .large { grid-column: auto; } }
  `,
})
export class ClassesComponent implements OnInit {
  private ns = inject(NotesService);
  private ex = inject(ExportService);
  exportEnCours = signal(false);

  async sauvegarder() {
    this.exportEnCours.set(true);
    this.erreur.set('');
    try {
      await this.ex.sauvegardeComplete();
    } catch (e) {
      this.erreur.set('Sauvegarde impossible : ' + (e as Error).message);
    } finally {
      this.exportEnCours.set(false);
    }
  }
  niveaux = NIVEAUX;
  etablissements = ETABLISSEMENTS;
  classes = signal<Classe[]>([]);
  nbEleves = signal<Record<number, number>>({});
  chargement = signal(true);
  erreur = signal('');
  envoi = signal(false);
  form: Classe | null = null;

  ngOnInit() { this.charger(); }

  async charger() {
    try {
      const [classes, nb] = await Promise.all([this.ns.classes(), this.ns.compterEleves()]);
      this.classes.set(classes);
      this.nbEleves.set(nb);
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.chargement.set(false);
    }
  }

  nouvelle() { this.form = VIDE(); }
  modifier(c: Classe) { this.form = { ...c }; window.scrollTo({ top: 0, behavior: 'smooth' }); }

  async enregistrer() {
    if (!this.form) return;
    this.envoi.set(true);
    this.erreur.set('');
    try {
      await this.ns.enregistrerClasse({ ...this.form, nom: this.form.nom.trim() });
      this.form = null;
      await this.charger();
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.envoi.set(false);
    }
  }

  async supprimer(c: Classe) {
    if (!confirm(`Supprimer la classe « ${c.nom} » avec tous ses élèves et toutes ses notes ? Cette action est définitive.`)) return;
    await this.ns.supprimerClasse(c.id!);
    this.form = null;
    await this.charger();
  }
}
