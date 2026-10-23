import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin">
      <header>
        <div class="conteneur barre">
          <a routerLink="/admin" class="titre"><span class="embleme">KPDK</span> Administration</a>
          <div class="droite">
            <span class="email">{{ sb.session()?.user?.email }}</span>
            <a routerLink="/" class="lien">Voir le site</a>
            <button class="lien" (click)="deconnecter()">Déconnexion</button>
          </div>
        </div>
        <nav class="conteneur onglets">
          <a routerLink="/admin" routerLinkActive="actif" [routerLinkActiveOptions]="{ exact: true }">Tableau de bord</a>
          <a routerLink="/admin/actualites" routerLinkActive="actif">Actualités</a>
          <a routerLink="/admin/photos" routerLinkActive="actif">Photos</a>
          <a routerLink="/admin/inscriptions" routerLinkActive="actif">Pré-inscriptions</a>
          <a routerLink="/admin/messages" routerLinkActive="actif">Messages</a>
        </nav>
      </header>
      <main class="conteneur contenu"><router-outlet /></main>
    </div>
  `,
  styles: `
    .admin { min-height: 100vh; background: #f3f4f7; }
    header { background: var(--bleu-nuit); color: #fff; }
    .barre { display: flex; justify-content: space-between; align-items: center; height: 64px; gap: 12px; }
    .titre { color: #fff; text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 10px; }
    .embleme { width: 36px; height: 36px; border-radius: 9px; border: 2px solid var(--or); color: var(--or);
      display: grid; place-items: center; font-size: .65rem; font-weight: 700; }
    .droite { display: flex; align-items: center; gap: 16px; font-size: .88rem; }
    .email { color: #c9d1e3; }
    .lien { color: #fff; background: none; border: 0; font: inherit; cursor: pointer; text-decoration: none; }
    .lien:hover { color: var(--or); }
    .onglets { display: flex; gap: 4px; overflow-x: auto; }
    .onglets a { color: #c9d1e3; text-decoration: none; padding: 12px 16px; border-bottom: 3px solid transparent;
      white-space: nowrap; font-size: .92rem; }
    .onglets a.actif { color: #fff; border-color: var(--or); }
    .contenu { padding-top: 32px; padding-bottom: 48px; }
    @media (max-width: 640px) { .email { display: none; } }
  `,
})
export class AdminLayoutComponent {
  sb = inject(SupabaseService);
  private router = inject(Router);

  async deconnecter() {
    await this.sb.deconnexion();
    this.router.navigateByUrl('/admin/connexion');
  }
}
