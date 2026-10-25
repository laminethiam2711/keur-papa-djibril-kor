import { inject, Injectable, signal } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Appreciation, Classe, Eleve } from '../notes/notes.service';
import { NoteLigne } from '../notes/calcul';
import { BulletinCode } from '../notes/modeles';
import { Paiement, Tarif } from '../paiements/regles';
import { Absence } from '../absences/regles';

export interface DonneesParent {
  eleve: Eleve;
  classe: Classe;
  camarades: number[];
  notes: (NoteLigne & { bulletin: BulletinCode })[];
  appreciations: Appreciation[];
  tarifs: Tarif[];
  paiements: Paiement[];
  absences?: Omit<Absence, 'eleve_id' | 'classe_id'>[]; // si le module Absences est installé
}

const CLE = 'kpdk-parent';

/** Connexion des parents : matricule + code secret, vérifiés par la base (fonction espace_parent). */
@Injectable({ providedIn: 'root' })
export class ParentsService {
  private sb = inject(SupabaseService);
  donnees = signal<DonneesParent | null>(null);

  async connexion(matricule: string, code: string, seSouvenir: boolean) {
    const { data, error } = await this.sb.db.rpc('espace_parent', { p_matricule: matricule, p_code: code });
    if (error) {
      if (error.message.includes('Could not find') || error.message.includes('does not exist')) {
        throw new Error("L'espace parents n'est pas encore ouvert. Contactez l'école.");
      }
      throw new Error(error.message);
    }
    this.donnees.set(data as DonneesParent);
    try {
      const v = JSON.stringify({ matricule, code });
      (seSouvenir ? localStorage : sessionStorage).setItem(CLE, v);
    } catch { /* navigateur privé */ }
  }

  /** Reconnexion automatique si le parent l'a demandé. */
  async reprendre(): Promise<boolean> {
    try {
      const v = localStorage.getItem(CLE) ?? sessionStorage.getItem(CLE);
      if (!v) return false;
      const { matricule, code } = JSON.parse(v);
      await this.connexion(matricule, code, !!localStorage.getItem(CLE));
      return true;
    } catch {
      this.deconnexion();
      return false;
    }
  }

  deconnexion() {
    this.donnees.set(null);
    try { localStorage.removeItem(CLE); sessionStorage.removeItem(CLE); } catch { /* rien */ }
  }
}
