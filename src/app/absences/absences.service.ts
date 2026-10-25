import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { Absence } from './regles';

/** Accès à la table des absences et retards. */
@Injectable({ providedIn: 'root' })
export class AbsencesService {
  private sb = inject(SupabaseService);
  private get db() { return this.sb.db; }

  private ok<T>(res: { data: T | null; error: { message: string } | null }): T {
    if (res.error) {
      if (res.error.message.includes('does not exist') || res.error.message.includes('schema cache')) {
        throw new Error('La table des absences n’existe pas encore : exécutez supabase/absences.sql dans Supabase.');
      }
      throw new Error(res.error.message);
    }
    return res.data as T;
  }

  /** Toutes les absences et retards d'une classe (pour l'historique et les bulletins). */
  async classe(classeId: number): Promise<Absence[]> {
    return this.ok(await this.db.from('absences').select('*').eq('classe_id', classeId).order('date', { ascending: false }));
  }
  /** Comme classe(), mais renvoie une liste vide si le module n'est pas installé. */
  async classeSiDisponible(classeId: number): Promise<Absence[]> {
    try { return await this.classe(classeId); } catch { return []; }
  }
  async duJour(classeId: number, date: string): Promise<Absence[]> {
    return this.ok(await this.db.from('absences').select('*').eq('classe_id', classeId).eq('date', date));
  }
  async enregistrer(a: Absence): Promise<Absence> {
    const { id, ...v } = a;
    return this.ok(id
      ? await this.db.from('absences').update(v).eq('id', id).select().single()
      : await this.db.from('absences').insert(v).select().single());
  }
  async supprimer(id: number) {
    this.ok(await this.db.from('absences').delete().eq('id', id));
  }
}
