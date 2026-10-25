import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BulletinCode, LIBELLES_BULLETIN, maxMatiere, modelePour, ModeleReleve } from './modeles';
import { Classe, Eleve, NotesService } from './notes.service';

@Component({
  selector: 'app-classe-detail',
  imports: [FormsModule, RouterLink, DatePipe],
  template: `
    <div class="np-page">
      <a routerLink="/admin/classes" class="np-fil">‹ Classes</a>

      @if (classe(); as c) {
        <div class="np-titre">
          <div>
            <h1>{{ c.nom }}</h1>
            <p>{{ c.etablissement }} · {{ c.annee }}{{ c.maitre ? ' · ' + c.maitre : '' }}</p>
          </div>
          <div class="actions-titre">
            <div class="np-segment">
              <button [class.actif]="onglet() === 'eleves'" (click)="onglet.set('eleves')">Élèves · {{ eleves().length }}</button>
              <button [class.actif]="onglet() === 'max'" (click)="onglet.set('max')">Notes maximales</button>
            </div>
            <a class="np-btn vert" [routerLink]="['/admin/saisie', c.id]">Saisir les notes</a>
            <a class="np-btn or" [routerLink]="['/admin/bulletins', c.id]">Bulletins</a>
          </div>
        </div>

        @if (erreur()) { <p class="np-erreur">{{ erreur() }}</p> }

        @if (onglet() === 'eleves') {
          <!-- ===== Inscription d'un élève : formulaire horizontal ===== -->
          <form class="np-carte inscription" (ngSubmit)="enregistrerEleve()" #f="ngForm">
            <div class="inscription-tete">
              <h2>{{ form.id ? 'Modifier l’élève' : 'Inscrire un élève' }}</h2>
              <button type="button" class="lien" (click)="importOuvert.set(!importOuvert())">
                {{ importOuvert() ? 'Fermer' : 'Coller une liste d’élèves' }}
              </button>
            </div>
            <div class="ligne-champs">
              <label class="ch"><span>Prénom *</span><input name="prenom" [(ngModel)]="form.prenom" required placeholder="Awa"></label>
              <label class="ch"><span>Nom *</span><input name="nom" [(ngModel)]="form.nom" required placeholder="Diop"></label>
              <label class="ch"><span>Né(e) le</span><input name="dn" type="date" [(ngModel)]="form.date_naissance"></label>
              <label class="ch"><span>à</span><input name="ln" [(ngModel)]="form.lieu_naissance" placeholder="Pikine"></label>
              <label class="ch petit"><span>Matricule</span>
                <input name="mat" class="auto" [value]="form.id ? form.matricule : (prochain() || 'Automatique')" readonly
                  title="Le matricule est attribué automatiquement"></label>
              <label class="ch"><span>Téléphone parent</span><input name="tel" type="tel" [(ngModel)]="form.telephone" placeholder="77 000 00 00"></label>
              <div class="ch boutons">
                <button class="np-btn plein" [disabled]="f.invalid || envoi()">{{ form.id ? 'Enregistrer' : '+ Inscrire' }}</button>
                @if (form.id) { <button type="button" class="np-btn" (click)="reset()">Annuler</button> }
              </div>
            </div>
            @if (importOuvert()) {
              <div class="import">
                <p>Une ligne par élève : <strong>Prénom Nom</strong> (le dernier mot est le nom de famille). Copiez la liste depuis Word ou Excel.</p>
                <textarea rows="5" [(ngModel)]="listeImport" name="liste" placeholder="Awa Diop&#10;Mamadou Lamine Fall&#10;Fatou Ndiaye"></textarea>
                <button type="button" class="np-btn vert" (click)="importer()" [disabled]="!listeImport.trim()">Inscrire toute la liste</button>
              </div>
            }
          </form>

          <!-- ===== Liste des élèves ===== -->
          <div class="np-carte">
            @if (sansMatricule()) {
              <div class="alerte-mat">
                {{ sansMatricule() }} élève{{ sansMatricule() > 1 ? 's n’ont' : ' n’a' }} pas encore de matricule.
                <button class="np-btn" (click)="completer()" [disabled]="envoi()">Attribuer automatiquement</button>
              </div>
            }
            <div class="liste-tete">
              <input class="recherche" type="search" placeholder="Rechercher un élève…" [ngModel]="recherche()" (ngModelChange)="recherche.set($event)">
              <span class="liste-droite">
                <a class="np-btn" target="_blank" [href]="lienCodes()" title="Fiches à découper avec le matricule et le code de chaque élève">🖨 Codes parents</a>
                <span>{{ elevesFiltres().length }} élève{{ elevesFiltres().length > 1 ? 's' : '' }}</span>
              </span>
            </div>
            <div class="defile">
              <table class="np-table">
                <thead><tr><th>N°</th><th>Élève</th><th>Naissance</th><th>Matricule</th><th>Téléphone</th><th>Code parent</th><th></th></tr></thead>
                <tbody>
                  @for (e of elevesFiltres(); track e.id; let i = $index) {
                    <tr [class.edition]="form.id === e.id">
                      <td class="n">{{ i + 1 }}</td>
                      <td>
                        <div class="eleve">
                          <span class="avatar" [style.background]="couleur(e)">{{ initiales(e) }}</span>
                          <a [routerLink]="['/admin/eleve', c.id, e.id]"><strong>{{ e.prenom }} {{ e.nom }}</strong></a>
                        </div>
                      </td>
                      <td>{{ e.date_naissance | date: 'dd/MM/yyyy' }}<span class="np-sous">{{ e.lieu_naissance }}</span></td>
                      <td>{{ e.matricule || '—' }}</td>
                      <td>{{ e.telephone || '—' }}</td>
                      <td class="code-parent">
                        @if (e.code_parent) {
                          <code>{{ e.code_parent }}</code>
                          @if (e.telephone) { <a class="mini wa" target="_blank" [href]="lienCodeWhatsapp(e)" title="Envoyer l'accès au parent sur WhatsApp">Envoyer</a> }
                          <button class="mini" (click)="nouveauCode(e)" title="Créer un nouveau code (l'ancien ne marchera plus)">↻</button>
                        } @else { <span class="np-sous">—</span> }
                      </td>
                      <td class="droite">
                        <a class="mini" [routerLink]="['/admin/eleve', c.id, e.id]">Bulletin</a>
                        <a class="mini" [routerLink]="['/admin/paiements/eleve', e.id]">Paiements</a>
                        <button class="mini" (click)="modifierEleve(e)">Modifier</button>
                        <button class="mini danger" (click)="supprimerEleve(e)" aria-label="Supprimer">✕</button>
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="7" class="vide">{{ recherche() ? 'Aucun élève trouvé.' : 'Aucun élève inscrit. Utilisez le formulaire ci-dessus.' }}</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        @if (onglet() === 'max') {
          <p class="aide">Par défaut, chaque matière est notée sur {{ c.bareme }}. Changez ici la note maximale d'une matière.
            Les maximums de l'anglais sont fixés par le modèle (50, 30, 20, 10, 10).</p>
          <div class="grille-max">
            @for (b of bulletins(); track b) {
              <div class="np-carte">
                <div class="np-bandeau petit-bandeau"><h2>{{ libelles[b] }}</h2></div>
                <div class="corps-max">
                  @for (d of modele(b).domaines; track d.nom) {
                    <h3>{{ d.nom }}</h3>
                    @for (mat of d.matieres; track mat.code) {
                      <label class="ligne-max">
                        <span>{{ mat.nomAr ? mat.nomAr + ' · ' : '' }}{{ mat.nom }}</span>
                        <input type="number" min="1" max="100" [disabled]="!!mat.maxFixe"
                          [ngModel]="maxDe(b, mat)" (ngModelChange)="changerMax(b, mat.code, $event)">
                      </label>
                    }
                  }
                </div>
              </div>
            }
          </div>
          <div><button class="np-btn plein" (click)="enregistrerMax()" [disabled]="envoi()">Enregistrer les maximums</button>
            @if (maxOk()) { <span class="ok">Enregistré ✓</span> }</div>
        }
      }
    </div>
  `,
  styles: `
    .actions-titre { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .inscription { padding: 20px 24px; overflow: visible; }
    .inscription-tete { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
    .inscription-tete h2 { font-size: 1.05rem; margin: 0; }
    .lien { background: none; border: 0; font: inherit; font-size: .88rem; color: var(--vert); cursor: pointer; font-weight: 500; }
    /* Les champs sont alignés sur une seule ligne (ils passent à la ligne sur petit écran) */
    .ligne-champs { display: flex; gap: 12px; align-items: flex-end; flex-wrap: wrap; }
    .ch { display: flex; flex-direction: column; gap: 5px; flex: 1 1 140px; min-width: 120px; }
    .ch.petit { flex: 0 1 110px; }
    .ch span { font-size: .72rem; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: #6b7387; }
    .ch input { font: inherit; font-size: .92rem; padding: 10px 12px; border: 1px solid #d5dae3; border-radius: 10px; background: #fff; }
    .ch input:focus { outline: 2px solid var(--bleu-nuit); border-color: transparent; }
    .ch input.auto { background: #f3f5f8; color: var(--bleu-nuit); font-weight: 600; cursor: default; }
    .alerte-mat { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
      background: #fff8e6; color: #8a5a00; padding: 10px 18px; border-bottom: 1px solid #f3e2b8; font-size: .9rem; }
    .ch.boutons { flex: 0 0 auto; flex-direction: row; min-width: 0; }
    .ch.boutons .np-btn { padding: 11px 18px; }
    .import { margin-top: 16px; padding-top: 16px; border-top: 1px dashed #d5dae3; }
    .import p { margin: 0 0 8px; color: var(--texte-doux); font-size: .88rem; }
    .import textarea { width: 100%; font: inherit; padding: 10px 12px; border: 1px solid #d5dae3; border-radius: 10px; margin-bottom: 10px; }
    .liste-tete { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #e3e6ec; }
    .liste-tete span { color: var(--texte-doux); font-size: .88rem; }
    .liste-droite { display: flex; align-items: center; gap: 12px; }
    .code-parent { white-space: nowrap; }
    .code-parent code { font-family: ui-monospace, monospace; font-weight: 700; color: var(--bleu-nuit); background: #f1f3f6; padding: 3px 7px; border-radius: 6px; letter-spacing: .06em; }
    .wa { background: #e7f8ee !important; color: #128c4b !important; border-color: #bfe8cf !important; }
    .recherche { font: inherit; font-size: .9rem; padding: 9px 14px; border: 1px solid #d5dae3; border-radius: 10px; width: min(320px, 100%); }
    .defile { overflow-x: auto; }
    .n { color: var(--texte-doux); width: 48px; }
    .eleve { display: flex; align-items: center; gap: 12px; }
    .eleve a { color: var(--texte); text-decoration: none; }
    .eleve a:hover { color: var(--vert); }
    .avatar { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-size: .8rem; font-weight: 700; flex-shrink: 0; }
    tr.edition td { background: #fff8e6 !important; }
    .droite { text-align: right; white-space: nowrap; }
    .mini { font: inherit; font-size: .8rem; font-weight: 500; border: 1px solid #d5dae3; background: #fff; border-radius: 8px; padding: 5px 10px;
      cursor: pointer; margin-left: 4px; color: var(--bleu-nuit); text-decoration: none; }
    .danger { color: #a12a1f; border-color: #f0c8c3; }
    .vide { text-align: center; color: var(--texte-doux); padding: 32px !important; }
    .aide { color: var(--texte-doux); margin: 0; }
    .grille-max { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; align-items: start; }
    .petit-bandeau { padding: 14px 20px; }
    .corps-max { padding: 8px 20px 16px; }
    h3 { font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; color: var(--vert); margin: 14px 0 4px; }
    .ligne-max { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 4px 0; font-size: .9rem; }
    .ligne-max input { width: 72px; font: inherit; padding: 6px 8px; border: 1px solid #d5dae3; border-radius: 8px; text-align: center; }
    .ok { color: var(--vert); margin-left: 12px; font-weight: 600; }
  `,
})
export class ClasseDetailComponent implements OnInit {
  id = input.required<string>();
  private ns = inject(NotesService);
  libelles = LIBELLES_BULLETIN;
  classe = signal<Classe | null>(null);
  eleves = signal<Eleve[]>([]);
  recherche = signal('');
  onglet = signal<'eleves' | 'max'>('eleves');
  importOuvert = signal(false);
  erreur = signal('');
  envoi = signal(false);
  maxOk = signal(false);
  form!: Eleve;
  listeImport = '';
  private maximums: Record<string, number> = {};

  /** Matricule que recevra le prochain élève inscrit (affiché dans le formulaire). */
  prochain = signal('');
  sansMatricule = computed(() => this.eleves().filter((e) => !e.matricule?.trim()).length);

  elevesFiltres = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    return q ? this.eleves().filter((e) => `${e.prenom} ${e.nom} ${e.matricule}`.toLowerCase().includes(q)) : this.eleves();
  });

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

  async chargerEleves() {
    this.eleves.set(await this.ns.eleves(Number(this.id())));
    const c = this.classe();
    if (c) this.prochain.set((await this.ns.matricules(c.annee, 1))[0]);
  }

  async completer() {
    this.envoi.set(true);
    try {
      await this.ns.completerMatricules(Number(this.id()), this.classe()!.annee);
      await this.chargerEleves();
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.envoi.set(false);
    }
  }

  initiales(e: Eleve) { return ((e.prenom[0] ?? '') + (e.nom[0] ?? '')).toUpperCase(); }
  couleur(e: Eleve) {
    const teintes = ['#13254a', '#1f7a4d', '#c9973a', '#2b4f9c', '#8a3b5c', '#3b6e8a'];
    return teintes[(e.id ?? 0) % teintes.length];
  }

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
      this.classe.set(await this.ns.enregistrerClasse({ ...this.classe()!, maximums: this.maximums }));
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
    this.envoi.set(true);
    try {
      await this.ns.enregistrerEleve({
        ...this.form, prenom: this.form.prenom.trim(), nom: this.form.nom.trim(),
        date_naissance: this.form.date_naissance || null,
      }, this.classe()!.annee);
      this.reset();
      await this.chargerEleves();
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.envoi.set(false);
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
      await this.ns.ajouterEleves(liste, this.classe()!.annee);
      this.listeImport = '';
      this.importOuvert.set(false);
      await this.chargerEleves();
    } catch (e) {
      this.erreur.set((e as Error).message);
    }
  }

  /** Lien vers les fiches « code parent » imprimables de la classe. */
  lienCodes() {
    const base = document.querySelector('base')?.getAttribute('href') ?? '/';
    return `${base}admin/codes-parents/${this.id()}`;
  }

  /** Message WhatsApp au parent avec le lien, le matricule et le code. */
  lienCodeWhatsapp(e: Eleve) {
    const tel = e.telephone.replace(/\D/g, '');
    const numero = tel.length === 9 ? '221' + tel : tel;
    const lien = location.origin + (document.querySelector('base')?.getAttribute('href') ?? '/') + 'parents';
    const texte = `Bonjour, voici l'accès à l'espace parents de l'École franco-arabe Keur Papa Djibril Kor pour ${e.prenom} ${e.nom} :\n` +
      `${lien}\nMatricule : ${e.matricule}\nCode parent : ${e.code_parent}\n` +
      `Vous y trouverez les notes, le bulletin et les paiements. Gardez ce code confidentiel.`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(texte)}`;
  }

  async nouveauCode(e: Eleve) {
    if (!confirm(`Créer un nouveau code parent pour ${e.prenom} ${e.nom} ? L'ancien code ne fonctionnera plus.`)) return;
    try {
      await this.ns.nouveauCodeParent(e.id!);
      await this.chargerEleves();
    } catch (err) {
      this.erreur.set((err as Error).message);
    }
  }

  async supprimerEleve(e: Eleve) {
    if (!confirm(`Supprimer ${e.prenom} ${e.nom} et toutes ses notes ?`)) return;
    await this.ns.supprimerEleve(e.id!);
    await this.chargerEleves();
  }
}
