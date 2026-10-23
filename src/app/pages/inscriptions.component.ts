import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ECOLE, ETABLISSEMENTS } from '../data/ecole';

// Version 1 : la pré-inscription est envoyée sur le WhatsApp de l'école.
// Version 2 (avec l'API Laravel) : elle sera enregistrée en base et visible dans l'espace admin.
@Component({
  selector: 'app-inscriptions',
  imports: [FormsModule],
  template: `
    <section class="bandeau-page">
      <div class="conteneur">
        <span class="arabe">التسجيل</span>
        <h1>Inscriptions {{ ecole.anneeScolaire }}</h1>
        <p>Les inscriptions sont ouvertes dans nos deux établissements.</p>
      </div>
    </section>

    <section class="section">
      <div class="conteneur grille grille-2 haut">
        <div>
          <h2>Pièces à fournir</h2>
          <ul class="liste">
            <li>Extrait de naissance de l'enfant</li>
            <li>2 photos d'identité récentes</li>
            <li>Carnet de vaccination (crèche et préscolaire)</li>
            <li>Bulletin ou certificat de scolarité de l'année précédente (élémentaire)</li>
            <li>Photocopie de la pièce d'identité d'un parent</li>
          </ul>
          <h2 class="espace">Comment ça marche ?</h2>
          <ol class="etapes">
            <li>Remplissez la pré-inscription en ligne.</li>
            <li>L'école vous rappelle pour confirmer la place.</li>
            <li>Vous déposez le dossier complet à l'établissement choisi.</li>
          </ol>
          <p class="note">Pour connaître les frais de scolarité, appelez le {{ ecole.telephones.join(' ou le ') }}.</p>
        </div>

        <form class="carte" (ngSubmit)="envoyer()" #f="ngForm">
          <h2>Pré-inscription en ligne</h2>
          <div class="champ"><label for="enfant">Prénom et nom de l'enfant *</label>
            <input id="enfant" name="enfant" [(ngModel)]="form.enfant" required></div>
          <div class="champ"><label for="naissance">Date de naissance *</label>
            <input id="naissance" name="naissance" type="date" [(ngModel)]="form.naissance" required></div>
          <div class="champ"><label for="niveau">Niveau demandé *</label>
            <select id="niveau" name="niveau" [(ngModel)]="form.niveau" required>
              <option value="" disabled>Choisir…</option>
              @for (n of niveaux; track n) { <option>{{ n }}</option> }
            </select></div>
          <div class="champ"><label for="etab">Établissement *</label>
            <select id="etab" name="etab" [(ngModel)]="form.etab" required>
              <option value="" disabled>Choisir…</option>
              @for (e of etablissements; track e.nom) { <option>{{ e.nom }} ({{ e.quartier }})</option> }
            </select></div>
          <div class="champ"><label for="parent">Nom du parent *</label>
            <input id="parent" name="parent" [(ngModel)]="form.parent" required></div>
          <div class="champ"><label for="tel">Téléphone du parent *</label>
            <input id="tel" name="tel" type="tel" [(ngModel)]="form.tel" required placeholder="77 000 00 00"></div>
          <button class="btn btn-vert plein" [disabled]="f.invalid">Envoyer via WhatsApp</button>
          <p class="note">Le message s'ouvre dans WhatsApp, il vous suffit d'appuyer sur « Envoyer ».</p>
        </form>
      </div>
    </section>
  `,
  styles: `
    .haut { align-items: start; }
    .liste, .etapes { padding-left: 20px; }
    .liste li, .etapes li { margin-bottom: 8px; }
    .espace { margin-top: 32px; }
    .note { color: var(--texte-doux); font-size: .88rem; }
    .plein { width: 100%; justify-content: center; }
    button[disabled] { opacity: .5; cursor: not-allowed; transform: none; }
  `,
})
export class InscriptionsComponent {
  ecole = ECOLE;
  etablissements = ETABLISSEMENTS;
  niveaux = ['Crèche', 'Petite section', 'Moyenne section', 'Grande section', 'CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'];
  form = { enfant: '', naissance: '', niveau: '', etab: '', parent: '', tel: '' };

  envoyer() {
    const f = this.form;
    const message =
      `Pré-inscription ${ECOLE.anneeScolaire}\n` +
      `Enfant : ${f.enfant}\nNé(e) le : ${f.naissance}\nNiveau : ${f.niveau}\n` +
      `Établissement : ${f.etab}\nParent : ${f.parent}\nTéléphone : ${f.tel}`;
    window.open(`https://wa.me/${ECOLE.whatsapp}?text=${encodeURIComponent(message)}`, '_blank');
  }
}
