import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ECOLE, ETABLISSEMENTS } from '../data/ecole';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-contact',
  imports: [FormsModule],
  template: `
    <section class="bandeau-page">
      <div class="conteneur">
        <span class="arabe">اتصل بنا</span>
        <h1>Contact</h1>
        <p>Une question ? Appelez-nous, écrivez-nous sur WhatsApp ou passez nous voir.</p>
      </div>
    </section>

    <section class="section">
      <div class="conteneur grille grille-2 haut">
        <div class="infos">
          <div class="carte">
            <h3>Téléphone</h3>
            @for (t of ecole.telephones; track t) {
              <p><a [href]="'tel:' + t.replaceAll(' ', '')">{{ t }}</a></p>
            }
            <a class="btn btn-vert" [href]="'https://wa.me/' + ecole.whatsapp" target="_blank" rel="noopener">Écrire sur WhatsApp</a>
          </div>
          @for (e of etablissements; track e.nom) {
            <div class="carte">
              <h3>{{ e.nom }}</h3>
              <p>{{ e.adresse }}</p>
            </div>
          }
          <div class="carte">
            <h3>Horaires</h3>
            <p>{{ ecole.horaires }}</p>
          </div>
        </div>

        <form class="carte" (ngSubmit)="envoyer()" #f="ngForm">
          <h2>Envoyer un message</h2>
          <div class="champ"><label for="nom">Votre nom *</label>
            <input id="nom" name="nom" [(ngModel)]="form.nom" required></div>
          <div class="champ"><label for="tel">Téléphone</label>
            <input id="tel" name="tel" type="tel" [(ngModel)]="form.tel"></div>
          <div class="champ"><label for="message">Message *</label>
            <textarea id="message" name="message" rows="6" [(ngModel)]="form.message" required></textarea></div>
          @if (envoye()) {
            <div class="succes">Merci, votre message a bien été envoyé à l'école.</div>
          } @else {
            @if (erreur()) { <div class="erreur">{{ erreur() }}</div> }
            <button class="btn btn-vert plein" [disabled]="f.invalid || envoi()">
              {{ envoi() ? 'Envoi…' : (sb.actif ? 'Envoyer le message' : 'Envoyer via WhatsApp') }}
            </button>
          }
        </form>
      </div>
    </section>
  `,
  styles: `
    .haut { align-items: start; }
    .infos { display: flex; flex-direction: column; gap: 16px; }
    .infos .carte { padding: 22px; }
    .infos p { margin: 4px 0; }
    .infos .btn { margin-top: 10px; }
    .plein { width: 100%; justify-content: center; }
    button[disabled] { opacity: .5; cursor: not-allowed; transform: none; }
    .succes { background: var(--vert-clair); color: var(--vert); padding: 16px; border-radius: 10px; font-weight: 600; }
    .erreur { background: #fdecea; color: #a12a1f; padding: 12px; border-radius: 10px; margin-bottom: 12px; }
  `,
})
export class ContactComponent {
  ecole = ECOLE;
  etablissements = ETABLISSEMENTS;
  form = { nom: '', tel: '', message: '' };

  sb = inject(SupabaseService);
  envoi = signal(false);
  envoye = signal(false);
  erreur = signal('');

  async envoyer() {
    if (!this.sb.actif) {
      const texte = `Message de ${this.form.nom}${this.form.tel ? ' (' + this.form.tel + ')' : ''} :\n${this.form.message}`;
      window.open(`https://wa.me/${ECOLE.whatsapp}?text=${encodeURIComponent(texte)}`, '_blank');
      return;
    }
    this.envoi.set(true);
    this.erreur.set('');
    try {
      await this.sb.envoyerMessage({ nom: this.form.nom.trim(), telephone: this.form.tel.trim() || null, message: this.form.message.trim() });
      this.envoye.set(true);
    } catch {
      this.erreur.set('L’envoi a échoué. Vérifiez votre connexion ou écrivez-nous sur WhatsApp.');
    } finally {
      this.envoi.set(false);
    }
  }
}
