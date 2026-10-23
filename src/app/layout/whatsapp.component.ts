import { Component } from '@angular/core';
import { ECOLE } from '../data/ecole';

// Bouton WhatsApp flottant, visible sur toutes les pages
@Component({
  selector: 'app-whatsapp',
  template: `
    <a class="wa" [href]="lien" target="_blank" rel="noopener" aria-label="Écrire à l'école sur WhatsApp">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <path fill="#fff" d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-2c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.9-1.7l-.4-.3-3.8 1.2 1.2-3.7-.3-.4c-1.2-1.8-1.9-3.8-1.9-6 0-5.9 4.9-10.6 11-10.6s11 4.8 11 10.6-4.9 10.9-10.9 10.9zm6-7.9c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.8.2-.2.3-.9 1.1-1.1 1.3-.2.2-.4.3-.7.1-.3-.2-1.4-.5-2.7-1.7-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.5c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.8 5 2.9 1.1 3.4.9 4.1.8.6-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.2-.3-.3-.6-.4z"/>
      </svg>
    </a>
  `,
  styles: `
    .wa {
      position: fixed; right: 18px; bottom: 18px; z-index: 60;
      width: 58px; height: 58px; border-radius: 50%; background: #25d366;
      display: grid; place-items: center; box-shadow: 0 8px 24px rgba(0,0,0,.2);
      transition: transform .15s;
    }
    .wa:hover { transform: scale(1.08); }
  `,
})
export class WhatsappComponent {
  lien = `https://wa.me/${ECOLE.whatsapp}?text=${encodeURIComponent("Bonjour, je souhaite avoir des informations sur l'école Keur Papa Djibril Kor.")}`;
}
