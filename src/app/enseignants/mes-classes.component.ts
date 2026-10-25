import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Classe, NotesService } from '../notes/notes.service';
import { SupabaseService } from '../services/supabase.service';

/** Accueil de l'enseignant : ses classes et les raccourcis (notes, appel, bulletins). */
@Component({
  selector: 'app-mes-classes',
  imports: [RouterLink],
  template: `
    <div class="np-page">
      <div class="np-titre">
        <div>
          <h1>Mes classes</h1>
          <p>Bonjour{{ nom() ? ' ' + nom() : '' }} ! Saisissez les notes, faites l'appel et consultez les bulletins.</p>
        </div>
      </div>
      @if (erreur()) { <p class="np-erreur">{{ erreur() }}</p> }
      <div class="grille-classes">
        @for (c of classes(); track c.id) {
          <article class="np-carte classe">
            <div class="haut">
              <h2>{{ c.nom }}</h2>
              <p>{{ c.etablissement }} · {{ c.annee }} · {{ nb()[c.id!] || 0 }} élèves</p>
            </div>
            <div class="actions">
              <a class="np-btn vert" [routerLink]="['/admin/saisie', c.id]">✏️ Saisir les notes</a>
              <a class="np-btn" [routerLink]="['/admin/appel', c.id]">📋 Faire l'appel</a>
              <a class="np-btn or" [routerLink]="['/admin/bulletins', c.id]">📘 Bulletins</a>
            </div>
          </article>
        } @empty {
          <p class="vide">{{ chargement() ? 'Chargement…' : 'Aucune classe ne vous est attribuée pour le moment.' }}</p>
        }
      </div>
    </div>
  `,
  styles: `
    .grille-classes { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .classe { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .haut h2 { margin: 0; font-size: 1.3rem; color: var(--bleu-nuit); }
    .haut p { margin: 4px 0 0; color: var(--texte-doux); font-size: .9rem; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .actions a { text-decoration: none; }
    .vide { color: var(--texte-doux); }
  `,
})
export class MesClassesComponent implements OnInit {
  private ns = inject(NotesService);
  private sb = inject(SupabaseService);
  classes = signal<Classe[]>([]);
  nb = signal<Record<number, number>>({});
  chargement = signal(true);
  erreur = signal('');
  nom = signal('');

  async ngOnInit() {
    try {
      const role = await this.sb.role();
      const ids = this.sb.classesEnseignant();
      const toutes = await this.ns.classes();
      this.classes.set(role === 'enseignant' ? toutes.filter((c) => ids.includes(c.id!)) : toutes);
      this.nb.set(await this.ns.compterEleves());
      const meta = this.sb.session()?.user?.user_metadata as { nom?: string } | undefined;
      this.nom.set(meta?.nom ?? '');
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.chargement.set(false);
    }
  }
}
