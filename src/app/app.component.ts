import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EnteteComponent } from './layout/entete.component';
import { PiedComponent } from './layout/pied.component';
import { WhatsappComponent } from './layout/whatsapp.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, EnteteComponent, PiedComponent, WhatsappComponent],
  template: `
    <app-entete />
    <main><router-outlet /></main>
    <app-pied />
    <app-whatsapp />
  `,
})
export class AppComponent {}
