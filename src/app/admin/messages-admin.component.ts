import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Message, SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-messages-admin',
  imports: [DatePipe],
  template: `
    <h1>Messages de contact</h1>
    <div class="liste">
      @for (m of messages(); track m.id) {
        <article class="carte message" [class.non-lu]="!m.lu">
          <header>
            <div>
              <strong>{{ m.nom }}</strong>
              @if (m.telephone) { · <a [href]="'tel:' + m.telephone">{{ m.telephone }}</a> }
              @if (!m.lu) { <span class="pastille">Nouveau</span> }
            </div>
            <small>{{ m.created_at | date: 'dd/MM/yyyy à HH:mm' }}</small>
          </header>
          <p>{{ m.message }}</p>
          <div class="boutons">
            <button class="petit" (click)="basculer(m)">{{ m.lu ? 'Marquer non lu' : 'Marquer comme lu' }}</button>
            <button class="petit danger" (click)="supprimer(m)">Supprimer</button>
          </div>
        </article>
      } @empty { <p class="vide">Aucun message.</p> }
    </div>
  `,
  styles: `
    h1 { font-size: 1.6rem; margin-bottom: 24px; }
    .liste { display: flex; flex-direction: column; gap: 14px; max-width: 860px; }
    .message { padding: 20px; }
    .non-lu { border-left: 4px solid var(--or); }
    header { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; }
    header .pastille { margin-left: 8px; background: #fff4e0; color: #8a5a00; }
    small { color: var(--texte-doux); }
    p { white-space: pre-line; margin: 12px 0; }
    .boutons { display: flex; gap: 8px; }
    .petit { font: inherit; font-size: .85rem; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--bordure);
      background: #fff; cursor: pointer; }
    .danger { color: #a12a1f; border-color: #f0c8c3; }
    .vide { color: var(--texte-doux); }
  `,
})
export class MessagesAdminComponent implements OnInit {
  private sb = inject(SupabaseService);
  messages = signal<Message[]>([]);

  ngOnInit() { this.charger(); }

  async charger() {
    this.messages.set(await this.sb.listerMessages());
  }

  async basculer(m: Message) {
    await this.sb.marquerLu(m.id!, !m.lu);
    await this.charger();
  }

  async supprimer(m: Message) {
    if (!confirm(`Supprimer le message de ${m.nom} ?`)) return;
    await this.sb.supprimerMessage(m.id!);
    await this.charger();
  }
}
