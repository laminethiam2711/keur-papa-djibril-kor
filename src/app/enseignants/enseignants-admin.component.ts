import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../supabase.config';
import { Classe, NotesService } from '../notes/notes.service';
import { SupabaseService } from '../services/supabase.service';

interface LigneEns { id?: number; email: string; nom: string; classe_id: number }
interface Enseignant { email: string; nom: string; classes: number[] }

/** Gestion des comptes enseignants (réservé à l'administrateur). */
@Component({
  selector: 'app-enseignants-admin',
  imports: [FormsModule],
  template: `
    <h1>Comptes enseignants</h1>
    <p class="intro">Chaque enseignant se connecte sur <b>{{ lienConnexion }}</b> avec son e-mail et son mot de passe.
      Il ne voit que ses classes : saisie des notes, appel et bulletins. Il n'a pas accès aux paiements, messages ni aux autres classes.</p>
    @if (erreur()) { <p class="erreur">{{ erreur() }}</p> }
    @if (message()) { <p class="succes">{{ message() }}</p> }

    <div class="deux">
      <form class="carte" (ngSubmit)="enregistrer()" #f="ngForm">
        <h2>{{ edition() ? 'Modifier les classes' : 'Nouvel enseignant' }}</h2>
        <div class="champ"><label for="nom">Nom *</label>
          <input id="nom" name="nom" [(ngModel)]="form.nom" required maxlength="80" placeholder="Ex. Mme Sarr"></div>
        <div class="champ"><label for="email">E-mail *</label>
          <input id="email" name="email" type="email" [(ngModel)]="form.email" required [readonly]="edition()" placeholder="prenom.nom@gmail.com"></div>
        @if (!edition()) {
          <div class="champ"><label for="mdp">Mot de passe (6 caractères minimum)</label>
            <input id="mdp" name="mdp" type="text" [(ngModel)]="form.motDePasse" minlength="6" autocomplete="new-password">
            <small>Laissez vide si cet enseignant a déjà un compte.</small></div>
        }
        <div class="champ">
          <label>Classes *</label>
          @for (a of annees(); track a) {
            <div class="annee">{{ a }}</div>
            <div class="cases">
              @for (c of classesDe(a); track c.id) {
                <label class="case"><input type="checkbox" [checked]="form.classes.includes(c.id!)" (change)="basculer(c.id!)"> {{ c.nom }}
                  <small>{{ c.etablissement.replace('Keur Papa Djibril ', '') }}</small></label>
              }
            </div>
          } @empty { <p class="doux">Créez d'abord les classes dans « Notes et bulletins ».</p> }
        </div>
        <div class="actions">
          <button class="btn btn-vert" [disabled]="f.invalid || !form.classes.length || envoi()">{{ envoi() ? 'Enregistrement…' : edition() ? 'Enregistrer' : 'Créer le compte' }}</button>
          @if (edition()) { <button type="button" class="btn btn-contour-bleu" (click)="annuler()">Annuler</button> }
        </div>
      </form>

      <div class="liste">
        @for (e of enseignants(); track e.email) {
          <article class="carte ligne">
            <div>
              <h3>{{ e.nom || e.email }}</h3>
              <small>{{ e.email }}</small>
              <div class="pills">
                @for (id of e.classes; track id) { <span class="pastille">{{ nomClasse(id) }}</span> }
              </div>
            </div>
            <div class="boutons">
              <button class="petit" (click)="modifier(e)">Modifier</button>
              <button class="petit danger" (click)="retirer(e)">Retirer l'accès</button>
            </div>
          </article>
        } @empty { <p class="doux">Aucun enseignant pour le moment.</p> }
        <div class="aide carte">
          <b>Bon à savoir</b>
          <ul>
            <li>Si la création de compte est bloquée : créez-le dans Supabase → Authentication → Users → Add user (cochez « Auto Confirm User »), puis attribuez ses classes ici avec le mot de passe vide.</li>
            <li>Mot de passe oublié : Supabase → Authentication → Users → l'enseignant → « Send password recovery ».</li>
            <li>« Retirer l'accès » enlève ses classes : il ne voit plus rien, même s'il se connecte.</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: `
    h1 { font-size: 1.6rem; margin-bottom: 6px; }
    .intro { color: var(--texte-doux); margin: 0 0 20px; max-width: 900px; }
    h2 { font-size: 1.15rem; }
    .deux { display: grid; gap: 24px; grid-template-columns: minmax(300px, 420px) 1fr; align-items: start; }
    .champ small { color: var(--texte-doux); font-size: .8rem; }
    .annee { font-size: .8rem; font-weight: 600; color: var(--vert); margin: 8px 0 4px; }
    .cases { display: flex; flex-wrap: wrap; gap: 6px; }
    .case { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #d5dae3; border-radius: 10px; padding: 6px 10px; font-weight: 500; cursor: pointer; }
    .case small { color: #8a92a6; }
    .liste { display: flex; flex-direction: column; gap: 12px; }
    .ligne { display: flex; justify-content: space-between; gap: 12px; padding: 16px 18px; align-items: center; }
    .ligne h3 { margin: 0; font-size: 1.05rem; }
    .ligne small { color: var(--texte-doux); }
    .pills { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
    .boutons { display: flex; gap: 8px; flex-shrink: 0; }
    .actions { display: flex; gap: 8px; }
    .petit { font: inherit; font-size: .85rem; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--bordure); background: #fff; cursor: pointer; }
    .danger { color: #a12a1f; border-color: #f0c8c3; }
    .erreur { color: #a12a1f; }
    .succes { color: #1f7a4d; font-weight: 600; }
    .doux { color: var(--texte-doux); }
    .aide { padding: 16px 18px; font-size: .9rem; }
    .aide ul { margin: 8px 0 0; padding-left: 18px; color: var(--texte-doux); }
    @media (max-width: 860px) { .deux { grid-template-columns: 1fr; } .ligne { flex-direction: column; align-items: flex-start; } }
  `,
})
export class EnseignantsAdminComponent implements OnInit {
  private sb = inject(SupabaseService);
  private ns = inject(NotesService);
  lienConnexion = location.origin + (document.querySelector('base')?.getAttribute('href') ?? '/') + 'admin/connexion';

  classes = signal<Classe[]>([]);
  lignes = signal<LigneEns[]>([]);
  edition = signal(false);
  envoi = signal(false);
  erreur = signal('');
  message = signal('');
  form = { nom: '', email: '', motDePasse: '', classes: [] as number[] };

  annees = computed(() => [...new Set(this.classes().map((c) => c.annee))].sort().reverse());
  enseignants = computed<Enseignant[]>(() => {
    const m = new Map<string, Enseignant>();
    for (const l of this.lignes()) {
      const e = m.get(l.email) ?? { email: l.email, nom: l.nom, classes: [] };
      e.classes.push(l.classe_id);
      if (l.nom) e.nom = l.nom;
      m.set(l.email, e);
    }
    return [...m.values()].sort((a, b) => (a.nom || a.email).localeCompare(b.nom || b.email));
  });

  classesDe(a: string) { return this.classes().filter((c) => c.annee === a); }
  nomClasse(id: number) {
    const c = this.classes().find((x) => x.id === id);
    return c ? `${c.nom} · ${c.annee}` : `classe ${id}`;
  }

  async ngOnInit() {
    try {
      this.classes.set(await this.ns.classes());
      await this.charger();
    } catch (e) {
      this.erreur.set((e as Error).message);
    }
  }

  private async charger() {
    const res = await this.sb.db.from('enseignants').select('*').order('email');
    if (res.error) {
      throw new Error(res.error.message.includes('enseignants')
        ? 'Les comptes enseignants ne sont pas encore installés : exécutez supabase/enseignants.sql dans Supabase.' : res.error.message);
    }
    this.lignes.set(res.data as LigneEns[]);
  }

  basculer(id: number) {
    this.form.classes = this.form.classes.includes(id) ? this.form.classes.filter((x) => x !== id) : [...this.form.classes, id];
  }

  modifier(e: Enseignant) {
    this.form = { nom: e.nom, email: e.email, motDePasse: '', classes: [...e.classes] };
    this.edition.set(true);
    this.message.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  annuler() {
    this.form = { nom: '', email: '', motDePasse: '', classes: [] };
    this.edition.set(false);
  }

  async enregistrer() {
    this.envoi.set(true);
    this.erreur.set('');
    this.message.set('');
    const email = this.form.email.trim().toLowerCase();
    const nom = this.form.nom.trim();
    try {
      // 1) Création du compte de connexion (client séparé : l'administrateur reste connecté)
      let compte = '';
      if (!this.edition() && this.form.motDePasse) {
        const temp = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.cleAnon,
          { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'kpdk-creation-compte' } });
        const { data, error } = await temp.auth.signUp({ email, password: this.form.motDePasse, options: { data: { nom } } });
        if (error && /signups? not allowed|disabled/i.test(error.message)) {
          throw new Error('Supabase n’autorise pas la création de comptes depuis le site (c’est plus sûr). Créez le compte dans Supabase : '
            + 'Authentication → Users → Add user → Create new user (e-mail + mot de passe, cochez « Auto Confirm User »). '
            + 'Revenez ici, laissez le mot de passe VIDE et cliquez sur « Créer le compte » pour lui attribuer ses classes.');
        }
        if (error && !/already|registered|exists/i.test(error.message)) throw new Error('Création du compte impossible : ' + error.message);
        compte = error ? ' (le compte existait déjà)' : data.session ? '' : ' — un e-mail de confirmation lui a été envoyé';
      }
      // 2) Classes attribuées
      const avant = this.lignes().filter((l) => l.email === email);
      const aRetirer = avant.filter((l) => !this.form.classes.includes(l.classe_id)).map((l) => l.id!);
      if (aRetirer.length) {
        const r = await this.sb.db.from('enseignants').delete().in('id', aRetirer);
        if (r.error) throw new Error(r.error.message);
      }
      const r = await this.sb.db.from('enseignants').upsert(
        this.form.classes.map((classe_id) => ({ email, nom, classe_id })), { onConflict: 'email,classe_id' });
      if (r.error) throw new Error(r.error.message);
      this.message.set(`✔ ${nom} : ${this.form.classes.length} classe(s) attribuée(s)${compte}.`);
      this.annuler();
      await this.charger();
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.envoi.set(false);
    }
  }

  async retirer(e: Enseignant) {
    if (!confirm(`Retirer l'accès de ${e.nom || e.email} à toutes ses classes ?`)) return;
    const r = await this.sb.db.from('enseignants').delete().eq('email', e.email);
    if (r.error) { this.erreur.set(r.error.message); return; }
    await this.charger();
  }
}
