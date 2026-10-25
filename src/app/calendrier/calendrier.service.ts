import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';

export type TypeEvenement = 'rentree' | 'conge' | 'examen' | 'reunion' | 'fete' | 'autre';

export interface Evenement {
  id?: number;
  titre: string;
  date_debut: string;
  date_fin: string | null;
  type: TypeEvenement;
  etablissement: string;
  description: string;
  public: boolean;
}

export const TYPES_EVENEMENT: { code: TypeEvenement; libelle: string; icone: string; couleur: string }[] = [
  { code: 'rentree', libelle: 'Rentrée', icone: '🎒', couleur: '#1f7a4d' },
  { code: 'conge', libelle: 'Vacances / congé', icone: '🌴', couleur: '#c9973a' },
  { code: 'examen', libelle: 'Compositions / examens', icone: '📝', couleur: '#c0392b' },
  { code: 'reunion', libelle: 'Réunion des parents', icone: '👪', couleur: '#2c5aa0' },
  { code: 'fete', libelle: 'Fête / cérémonie', icone: '🎉', couleur: '#8e44ad' },
  { code: 'autre', libelle: 'Autre', icone: '📌', couleur: '#5b6478' },
];
export const typeEvenement = (c: TypeEvenement) => TYPES_EVENEMENT.find((t) => t.code === c) ?? TYPES_EVENEMENT[5];

/** Calendrier scolaire (table evenements). */
@Injectable({ providedIn: 'root' })
export class CalendrierService {
  private sb = inject(SupabaseService);

  private ok<T>(res: { data: T | null; error: { message: string } | null }): T {
    if (res.error) {
      if (res.error.message.includes('does not exist') || res.error.message.includes('schema cache')) {
        throw new Error('Le calendrier n’est pas encore installé : exécutez supabase/calendrier.sql dans Supabase.');
      }
      throw new Error(res.error.message);
    }
    return res.data as T;
  }

  async lister(): Promise<Evenement[]> {
    return this.ok(await this.sb.db.from('evenements').select('*').order('date_debut'));
  }
  /** Pour le site public : liste vide si le module n'est pas installé (ou pas de connexion). */
  async listerPublic(): Promise<Evenement[]> {
    try { return await this.lister(); } catch { return []; }
  }
  async enregistrer(e: Evenement) {
    const { id, ...v } = e;
    this.ok(id ? await this.sb.db.from('evenements').update(v).eq('id', id) : await this.sb.db.from('evenements').insert(v));
  }
  async supprimer(id: number) {
    this.ok(await this.sb.db.from('evenements').delete().eq('id', id));
  }
}

/** Regroupe les événements par mois (« 2026-10 » → liste), dans l'ordre. */
export function parMois(liste: Evenement[]): { mois: string; evenements: Evenement[] }[] {
  const m = new Map<string, Evenement[]>();
  for (const e of [...liste].sort((a, b) => a.date_debut.localeCompare(b.date_debut))) {
    const k = e.date_debut.slice(0, 7);
    m.set(k, [...(m.get(k) ?? []), e]);
  }
  return [...m.entries()].map(([mois, evenements]) => ({ mois, evenements }));
}

/** Date du jour AAAA-MM-JJ (heure locale). */
export function jourIso(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
