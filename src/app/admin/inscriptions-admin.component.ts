import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Inscription, SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-inscriptions-admin',
  imports: [DatePipe],
  template: `
    <div class="entete">
      <h1>Pré-inscriptions</h1>
      <div class="filtres">
        @for (s of filtresStatuts; track s) {
          <button [class.actif]="filtre() === s" (click)="filtre.set(s)">{{ s }}</button>
        }
      </div>
    </div>

    <div class="carte tableau">
      <table>
        <thead>
          <tr><th>Reçue le</th><th>Enfant</th><th>Niveau</th><th>Établissement</th><th>Parent</th><th>Téléphone</th><th>Statut</th><th></th></tr>
        </thead>
        <tbody>
          @for (i of filtrees(); track i.id) {
            <tr>
              <td>{{ i.created_at | date: 'dd/MM/yy HH:mm' }}</td>
              <td><strong>{{ i.enfant }}</strong><br><small>né(e) le {{ i.date_naissance | date: 'dd/MM/yyyy' }}</small></td>
              <td>{{ i.niveau }}</td>
              <td>{{ i.etablissement }}</td>
              <td>{{ i.parent }}</td>
              <td><a [href]="'tel:' + i.telephone">{{ i.telephone }}</a></td>
              <td>
                <select [value]="i.statut" (change)="changer(i, $any($event.target).value)" [class]="'statut s-' + i.statut">
                  @for (s of statuts; track s) { <option [value]="s">{{ s }}</option> }
                </select>
              </td>
              <td><button class="petit" (click)="supprimer(i)" aria-label="Supprimer">✕</button></td>
            </tr>
          } @empty {
            <tr><td colspan="8" class="vide">Aucune pré-inscription.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .entete { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    h1 { font-size: 1.6rem; margin: 0; }
    .filtres { display: flex; gap: 6px; flex-wrap: wrap; }
    .filtres button { font: inherit; font-size: .85rem; border: 1px solid var(--bordure); background: #fff; padding: 6px 14px;
      border-radius: 999px; cursor: pointer; }
    .filtres button.actif { background: var(--bleu-nuit); color: #fff; border-color: var(--bleu-nuit); }
    .tableau { padding: 0; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; min-width: 860px; }
    th { text-align: left; background: var(--sable); color: var(--bleu-nuit); padding: 12px 14px; font-weight: 600; }
    td { padding: 12px 14px; border-top: 1px solid var(--bordure); vertical-align: top; }
    small { color: var(--texte-doux); }
    .statut { font: inherit; font-size: .85rem; padding: 4px 8px; border-radius: 8px; border: 1px solid var(--bordure); }
    .s-Nouvelle { background: #fff4e0; }
    .s-Rappelée { background: #e8effc; }
    .s-Inscrite { background: var(--vert-clair); }
    .s-Annulée { background: #f1f1f1; }
    .petit { border: 1px solid #f0c8c3; background: #fff; color: #a12a1f; border-radius: 8px; cursor: pointer; padding: 4px 9px; }
    .vide { text-align: center; color: var(--texte-doux); padding: 32px; }
  `,
})
export class InscriptionsAdminComponent implements OnInit {
  private sb = inject(SupabaseService);
  statuts = ['Nouvelle', 'Rappelée', 'Inscrite', 'Annulée'];
  filtresStatuts = ['Toutes', ...this.statuts];
  inscriptions = signal<Inscription[]>([]);
  filtre = signal('Toutes');
  filtrees = computed(() =>
    this.filtre() === 'Toutes' ? this.inscriptions() : this.inscriptions().filter((i) => i.statut === this.filtre()),
  );

  ngOnInit() { this.charger(); }

  async charger() {
    this.inscriptions.set(await this.sb.listerInscriptions());
  }

  async changer(i: Inscription, statut: string) {
    await this.sb.changerStatut(i.id!, statut);
    await this.charger();
  }

  async supprimer(i: Inscription) {
    if (!confirm(`Supprimer la pré-inscription de ${i.enfant} ?`)) return;
    await this.sb.supprimerInscription(i.id!);
    await this.charger();
  }
}
