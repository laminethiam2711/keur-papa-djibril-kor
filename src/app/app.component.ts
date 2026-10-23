import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { EnteteComponent } from './layout/entete.component';
import { PiedComponent } from './layout/pied.component';
import { WhatsappComponent } from './layout/whatsapp.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, EnteteComponent, PiedComponent, WhatsappComponent],
  template: `
    @if (estAdmin()) {
      <router-outlet />
    } @else {
      <app-entete />
      <main><router-outlet /></main>
      <app-pied />
      <app-whatsapp />
    }
  `,
})
export class AppComponent {
  private router = inject(Router);
  // L'espace admin a sa propre mise en page (sans l'en-tête du site)
  estAdmin = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects.startsWith('/admin')),
    ),
    { initialValue: false },
  );
}
