import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Paiement, Tarif } from './regles';

/** Accès aux tarifs et aux paiements. */
@Injectable({ providedIn: 'root' })
export class PaiementsService {
  private sb = inject(SupabaseService);
  private get db() { return this.sb.db; }

  private ok<T>(res: { data: T | null; error: { message: string } | null }): T {
    if (res.error) {
      if (res.error.message.includes('does not exist') || res.error.message.includes('schema cache')) {
        throw new Error('Le module des paiements n’est pas encore installé : exécutez supabase/paiements.sql dans Supabase.');
      }
      throw new Error(res.error.message);
    }
    return res.data as T;
  }

  private async toutLire<T>(requete: (de: number, a: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
    const tout: T[] = [];
    for (let de = 0; ; de += 1000) {
      const lot = this.ok(await requete(de, de + 999));
      tout.push(...lot);
      if (lot.length < 1000) return tout;
    }
  }

  // ---------- Tarifs ----------
  async tarifs(annee: string): Promise<Tarif[]> {
    return this.ok(await this.db.from('tarifs').select('annee, niveau, type, montant').eq('annee', annee));
  }
  async enregistrerTarifs(tarifs: Tarif[]) {
    this.ok(await this.db.from('tarifs').upsert(tarifs, { onConflict: 'annee,niveau,type' }));
  }

  // ---------- Paiements ----------
  async paiementsAnnee(annee: string): Promise<Paiement[]> {
    return this.toutLire<Paiement>((de, a) =>
      this.db.from('paiements').select('*').eq('annee', annee).order('created_at', { ascending: false }).range(de, a));
  }
  async paiementsEleve(eleveId: number, annee: string): Promise<Paiement[]> {
    return this.ok(await this.db.from('paiements').select('*').eq('eleve_id', eleveId).eq('annee', annee).order('created_at', { ascending: false }));
  }
  async recu(numero: string): Promise<Paiement[]> {
    return this.ok(await this.db.from('paiements').select('*').eq('numero_recu', numero).order('id'));
  }

  /**
   * Enregistre un versement (une ou plusieurs lignes, ex. 3 mois) sous un seul reçu.
   * La base attribue le numéro de reçu à la première ligne ; les suivantes le reprennent.
   */
  async encaisser(lignes: Paiement[]): Promise<string> {
    const [premiere, ...autres] = lignes.map(({ id, numero_recu, encaisse_par, created_at, ...v }) => v);
    const cree = this.ok(await this.db.from('paiements').insert({ ...premiere, numero_recu: '' }).select('numero_recu').single()) as { numero_recu: string };
    if (autres.length) this.ok(await this.db.from('paiements').insert(autres.map((l) => ({ ...l, numero_recu: cree.numero_recu }))));
    return cree.numero_recu;
  }

  /** Annule un reçu (supprime toutes ses lignes). */
  async annulerRecu(numero: string) {
    this.ok(await this.db.from('paiements').delete().eq('numero_recu', numero));
  }

  async eleve(id: number): Promise<import('../notes/notes.service').Eleve> {
    return this.ok(await this.db.from('eleves').select('*').eq('id', id).single());
  }

  async optionsEleve(eleveId: number, options: { cantine: boolean; transport: boolean }) {
    this.ok(await this.db.from('eleves').update(options).eq('id', eleveId));
  }
}
