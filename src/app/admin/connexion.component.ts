import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-connexion',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="fond motif">
      <form class="carte boite" (ngSubmit)="connecter()" #f="ngForm">
        <div class="embleme">KPDK</div>
        <h1>Espace administrateur</h1>
        <p class="sous">École franco-arabe Keur Papa Djibril Kor</p>

        @if (!sb.actif) {
          <div class="alerte">La base de données n'est pas encore configurée (fichier <code>supabase.config.ts</code>).</div>
        } @else {
          <div class="champ"><label for="email">E-mail</label>
            <input id="email" name="email" type="email" autocomplete="username" [(ngModel)]="email" required></div>
          <div class="champ"><label for="mdp">Mot de passe</label>
            <input id="mdp" name="mdp" type="password" autocomplete="current-password" [(ngModel)]="motDePasse" required></div>
          @if (erreur()) { <div class="alerte">{{ erreur() }}</div> }
          <button class="btn btn-vert plein" [disabled]="f.invalid || envoi()">{{ envoi() ? 'Connexion…' : 'Se connecter' }}</button>
        }
        <a routerLink="/" class="retour">← Retour au site</a>
      </form>
    </div>
  `,
  styles: `
    .fond { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; background-color: var(--sable); }
    .boite { width: 100%; max-width: 400px; text-align: center; }
    .embleme { width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 16px; background: var(--bleu-nuit);
      color: var(--or); border: 2px solid var(--or); display: grid; place-items: center; font-weight: 700; }
    h1 { font-size: 1.5rem; margin-bottom: 4px; }
    .sous { color: var(--texte-doux); margin: 0 0 24px; font-size: .9rem; }
    .champ { text-align: left; }
    .plein { width: 100%; justify-content: center; }
    .alerte { background: #fdecea; color: #a12a1f; padding: 12px; border-radius: 10px; margin-bottom: 12px; font-size: .9rem; }
    .retour { display: inline-block; margin-top: 20px; font-size: .9rem; text-decoration: none; }
    button[disabled] { opacity: .5; }
  `,
})
export class ConnexionComponent {
  sb = inject(SupabaseService);
  private router = inject(Router);
  email = '';
  motDePasse = '';
  envoi = signal(false);
  erreur = signal('');

  async connecter() {
    this.envoi.set(true);
    this.erreur.set('');
    try {
      await this.sb.connexion(this.email.trim(), this.motDePasse);
      this.router.navigateByUrl('/admin');
    } catch (e) {
      this.erreur.set((e as Error).message);
    } finally {
      this.envoi.set(false);
    }
  }
}
