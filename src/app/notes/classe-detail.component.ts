import { Component, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BulletinCode, LIBELLES_BULLETIN, maxMatiere, modelePour, ModeleReleve } from './modeles';
import { Classe, Eleve, NotesService } from './notes.service';

@Component({
  selector: 'app-classe-detail',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <a routerLink="/admin/classes" class="retour">← Toutes les classes</a>
    @if (classe(); as c) {
      <div class="entete">
        <h1>{{ c.nom }} <small>· {{ c.annee }}</small></h1>
        <div class="boutons">
          <a class="btn btn-vert petit" [routerLink]="['/admin/saisie', c.id]">Saisir les notes</a>
          <a class="btn btn-or petit" [routerLink]="['/admin/bulletins', c.id]">Bulletins</a>
        </div>
      </div>

      <div class="onglets">
        <button [class.actif]="onglet() === 'eleves'" (click)="onglet.set('eleves')">Élèves ({{ eleves().length }})</button>
        <button [class.actif]="onglet() === 'max'" (click)="onglet.set('max')">Notes maximales</button>
      </div>

      @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }

      @if (onglet() === 'eleves') {
        <div class="grille deux">
          <div>
            <form class="carte" (ngSubmit)="enregistrerEleve()" #f="ngForm">
              <h2>{{ form.id ? 'Modifier l’élève' : 'Ajouter un élève' }}</h2>
              <div class="cote">
                <div class="champ"><label for="prenom">Prénom *</label><input id="prenom" name="prenom" [(ngModel)]="form.prenom" required></div>
                <div class="champ"><label for="nom">Nom *</label><input id="nom" name="nom" [(ngModel)]="form.nom" required></div>
              </div>
              <div class="cote">
                <div class="champ"><label for="dn">Né(e) le</label><input id="dn" name="dn" type="date" [(ngModel)]="form.date_naissance"></div>
                <div class="champ"><label for="ln">à</label><input id="ln" name="ln" [(ngModel)]="form.lieu_naissance"></div>
              </div>
              <div class="cote">
                <div class="champ"><label for="mat">Matricule</label><input id="mat" name="mat" [(ngModel)]="form.matricule"></div>
                <div class="champ"><label for="tel">Téléphone</label><input id="tel" name="tel" type="tel" [(ngModel)]="form.telephone"></div>
              </div>
              <div class="actions">
                <button class="btn btn-vert" [disabled]="f.invalid">{{ form.id ? 'Enregistrer' : 'Ajouter' }}</button>
                @if (form.id) { <button type="button" class="btn btn-contour-bleu" (click)="reset()">Annuler</button> }
              </div>
            </form>

            <details class="carte import">
              <summary>Ajouter plusieurs élèves d'un coup</summary>
              <p class="aide">Une ligne par élève : <strong>Prénom Nom</strong> (le dernier mot est pris comme nom de famille).
                Vous pouvez copier la liste depuis Word ou Excel.</p>
              <textarea rows="8" [(ngModel)]="listeImport" placeholder="Awa Diop&#10;Mamadou Lamine Fall&#10;Fatou Ndiaye"></textarea>
              <button class="btn btn-vert" (click)="importer()" [disabled]="!listeImport.trim()">Ajouter la liste</button>
            </details>
          </div>

          <div class="carte tableau">
            <table>
              <thead><tr><th>#</th><th>Prénom et nom</th><th>Né(e) le</th><th>Matricule</th><th></th></tr></thead>
              <tbody>
                @for (e of eleves(); track e.id; let i = $index) {
                  <tr>
                    <td>{{ i + 1 }}</td>
                    <td><strong>{{ e.prenom }} {{ e.nom }}</strong></td>
                    <td>{{ e.date_naissance | date: 'dd/MM/yyyy' }}{{ e.lieu_naissance ? ' à ' + e.lieu_naissance : '' }}</td>
                    <td>{{ e.matricule }}</td>
                    <td class="droite">
                      <button class="mini" (click)="modifierEleve(e)">Modifier</button>
                      <button class="mini danger" (click)="supprimerEleve(e)">✕</button>
                    </td>
                  </tr>
                } @empty { <tr><td colspan="5" class="vide">Aucun élève dans cette classe.</td></tr> }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (onglet() === 'max') {
        <p class="aide">Note maximale de chaque matière. Par défaut, chaque matière est notée sur {{ c.bareme }}.
          Les maximums du relevé d'anglais sont fixés par le modèle (50, 30, 20, 10, 10).</p>
        <div class="grille grille-3 haut">
          @for (b of bulletins(); track b) {
            <div class="carte">
              <h2>{{ libelles[b] }}</h2>
              @for (d of modele(b).domaines; track d.nom) {
                <h3>{{ d.nom }}</h3>
                @for (mat of d.matieres; track mat.code) {
                  <div class="ligne-max">
                    <label [for]="b + mat.code">{{ mat.nomAr ? mat.nomAr + ' · ' : '' }}{{ mat.nom }}</label>
                    <input [id]="b + mat.code" type="number" min="1" max="100" [disabled]="!!mat.maxFixe"
                      [ngModel]="maxDe(b, mat)" (ngModelChange)="changerMax(b, mat.code, $event)">
                  </div>
                }
              }
            </div>
          }
        </div>
        <button class="btn btn-vert" (click)="enregistrerMax()" [disabled]="envoi()">Enregistrer les maximums</button>
        @if (maxOk()) { <span class="ok">Enregistré ✓</span> }
      }
    }
  `,
  styles: `
    .retour { display: inline-block; margin-bottom: 12px; text-decoration: none; font-size: .9rem; }
    .entete { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    h1 { font-size: 1.6rem; margin: 0; }
    h1 small { color: var(--texte-doux); font-weight: 400; font-size: 1rem; }
    h2 { font-size: 1.1rem; }
    h3 { font-size: .9rem; color: var(--vert); margin: 14px 0 6px; }
    .boutons { display: flex; gap: 8px; }
    .petit { padding: 8px 16px; font-size: .88rem; }
    .onglets { display: flex; gap: 4px; border-bottom: 1px solid var(--bordure); margin-bottom: 20px; }
    .onglets button { font: inherit; background: none; border: 0; padding: 10px 16px; cursor: pointer; border-bottom: 3px solid transparent; color: var(--texte-doux); }
    .onglets button.actif { color: var(--bleu-nuit); border-color: var(--or); font-weight: 600; }
    .deux { grid-template-columns: minmax(280px, 380px) 1fr; align-items: start; }
    .cote { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
    .actions { display: flex; gap: 8px; }
    .import { margin-top: 16px; }
    .import summary { cursor: pointer; font-weight: 600; color: var(--bleu-nuit); }
    .import textarea { width: 100%; font: inherit; padding: 10px; border: 1px solid var(--bordure); border-radius: 10px; margin-bottom: 10px; }
    .aide { color: var(--texte-doux); font-size: .9rem; }
    .tableau { padding: 0; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; }
    th { text-align: left; background: var(--sable); color: var(--bleu-nuit); padding: 10px 12px; }
    td { padding: 10px 12px; border-top: 1px solid var(--bordure); }
    .droite { text-align: right; white-space: nowrap; }
    .mini { font: inherit; font-size: .8rem; border: 1px solid var(--bordure); background: #fff; border-radius: 8px; padding: 4px 10px; cursor: pointer; margin-left: 4px; }
    .danger { color: #a12a1f; border-color: #f0c8c3; }
    .vide { text-align: center; color: var(--texte-doux); padding: 24px; }
    .haut { align-items: start; margin-bottom: 20px; }
    .ligne-max { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 4px 0; font-size: .9rem; }
    .ligne-max input { width: 72px; font: inherit; padding: 6px 8px; border: 1px solid var(--bordure); border-radius: 8px; text-align: center; }
    .ok { color: var(--vert); margin-left: 12px; font-weight: 600; }
    .erreur { background: #fdecea; color: #a12a1f; padding: 12px; border-radius: 10px; }
    @media (max-width: 860px) { .deux { grid-template-columns: 1fr; } }
  `,
})
export class ClasseDetailComponent implements OnInit {
  /** Identifiant de la classe, lu dans l'adresse /admin/classes/:id */
  id = input.required<string>();
  private ns = inject(NotesService);
  libelles = LIBELLES_BULLETIN;
  classe = signal<Classe | null>(null);
  eleves = signal<Eleve[]>([]);
  onglet = signal<'eleves' | 'max'>('eleves');
  erreur = signal('');
  envoi = signal(false);
  maxOk = signal(false);
  form!: Eleve;
  listeImport = '';
  private maximums: Record<string, number> = {};

  async ngOnInit() {
    this.reset();
    try {
      const c = await this.ns.classe(Number(this.id()));
      this.classe.set(c);
      this.maximums = { ...(c.maximums ?? {}) };
      await this.chargerEleves();
    } catch (e) {
      this.erreur.set((e as Error).message);
    }
  }

  reset() {
    this.form = { classe_id: Number(this.id()), prenom: '', nom: '', date_naissance: null, lieu_naissance: '', matricule: '', telephone: '' };
  }

  async chargerEleves() { this.eleves.set(await this.ns.eleves(Number(this.id()))); }

  bulletins(): BulletinCode[] {
    const c = this.classe()!;
    return ['fr', ...(c.avec_arabe ? ['ar' as const] : []), ...(c.avec_anglais ? ['en' as const] : [])];
  }
  modele(b: BulletinCode): ModeleReleve { return modelePour(this.classe()!, b); }
  maxDe(b: BulletinCode, mat: ModeleReleve['domaines'][number]['matieres'][number]) {
    return maxMatiere({ ...this.classe()!, maximums: this.maximums }, b, mat);
  }
  changerMax(b: BulletinCode, code: string, v: number) {
    this.maxOk.set(false);
    if (v > 0) this.maximums[`${b}:${code}`] = Number(v); else delete this.maximums[`${b}:${code}`];
  }

  async enregistrerMax() {
    this.envoi.set(true);
    try {
      const c = await this.ns.enregistrerClasse({ ...this.classe()!, maximums: this.maximums });
      this.classe.set(c);
      this.maxOk.set(true);
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.envoi.set(false);
    }
  }

  modifierEleve(e: Eleve) { this.form = { ...e }; window.scrollTo({ top: 0, behavior: 'smooth' }); }

  async enregistrerEleve() {
    this.erreur.set('');
    try {
      await this.ns.enregistrerEleve({
        ...this.form, prenom: this.form.prenom.trim(), nom: this.form.nom.trim(),
        date_naissance: this.form.date_naissance || null,
      });
      this.reset();
      await this.chargerEleves();
    } catch (e) {
      this.erreur.set((e as Error).message);
    }
  }

  async importer() {
    const lignes = this.listeImport.split('\n').map((l) => l.replace(/\t/g, ' ').trim()).filter(Boolean);
    const liste = lignes.map((l) => {
      const mots = l.split(/\s+/);
      const nom = mots.length > 1 ? mots.pop()! : '';
      return { classe_id: Number(this.id()), prenom: mots.join(' ') || nom, nom: nom || mots.join(' '),
        date_naissance: null, lieu_naissance: '', matricule: '', telephone: '' };
    });
    this.erreur.set('');
    try {
      await this.ns.ajouterEleves(liste);
      this.listeImport = '';
      await this.chargerEleves();
    } catch (e) {
      this.erreur.set((e as Error).message);
    }
  }

  async supprimerEleve(e: Eleve) {
    if (!confirm(`Supprimer ${e.prenom} ${e.nom} et toutes ses notes ?`)) return;
    await this.ns.supprimerEleve(e.id!);
    await this.chargerEleves();
  }
}
