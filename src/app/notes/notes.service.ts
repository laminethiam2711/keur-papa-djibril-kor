import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { BulletinCode, ClasseConfig, Evaluation, ModeleFr } from './modeles';
import { NoteLigne } from './calcul';

export interface Classe extends ClasseConfig {
  id?: number;
  nom: string;
  niveau: string;
  etablissement: string;
  maitre: string;
  annee: string;
  bareme: number;
  modele_fr: ModeleFr;
  avec_arabe: boolean;
  avec_anglais: boolean;
  maximums: Record<string, number>;
}

export interface Eleve {
  id?: number;
  classe_id: number;
  prenom: string;
  nom: string;
  date_naissance: string | null;
  lieu_naissance: string;
  matricule: string;
  telephone: string;
}

export interface Appreciation {
  eleve_id: number;
  classe_id: number;
  bulletin: BulletinCode;
  periode: number;
  observation: string;
  decision: string;
}

/** Accès aux données de la plateforme de notes (classes, élèves, notes, appréciations). */
@Injectable({ providedIn: 'root' })
export class NotesService {
  private sb = inject(SupabaseService);
  private get db() { return this.sb.db; }

  private ok<T>(res: { data: T | null; error: { message: string } | null }): T {
    if (res.error) {
      if (res.error.message.includes('does not exist') || res.error.message.includes('schema cache')) {
        throw new Error('Les tables des notes n’existent pas encore : exécutez supabase/notes.sql dans Supabase.');
      }
      throw new Error(res.error.message);
    }
    return res.data as T;
  }

  /** Supabase renvoie au plus 1000 lignes par requête : on lit page par page. */
  private async toutLire<T>(requete: (de: number, a: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
    const page = 1000;
    const tout: T[] = [];
    for (let de = 0; ; de += page) {
      const lot = this.ok(await requete(de, de + page - 1));
      tout.push(...lot);
      if (lot.length < page) return tout;
    }
  }

  // ---------- Classes ----------
  async classes(): Promise<Classe[]> {
    return this.ok(await this.db.from('classes').select('*').order('annee', { ascending: false }).order('nom'));
  }
  async classe(id: number): Promise<Classe> {
    return this.ok(await this.db.from('classes').select('*').eq('id', id).single());
  }
  async enregistrerClasse(c: Classe): Promise<Classe> {
    const { id, ...v } = c;
    return this.ok(id
      ? await this.db.from('classes').update(v).eq('id', id).select().single()
      : await this.db.from('classes').insert(v).select().single());
  }
  async supprimerClasse(id: number) {
    this.ok(await this.db.from('classes').delete().eq('id', id));
  }

  // ---------- Élèves ----------
  async eleves(classeId: number): Promise<Eleve[]> {
    return this.ok(await this.db.from('eleves').select('*').eq('classe_id', classeId).order('nom').order('prenom'));
  }
  async compterEleves(): Promise<Record<number, number>> {
    const lignes = await this.toutLire<{ classe_id: number }>((de, a) => this.db.from('eleves').select('classe_id').range(de, a));
    return lignes.reduce((acc, l) => ({ ...acc, [l.classe_id]: (acc[l.classe_id] ?? 0) + 1 }), {} as Record<number, number>);
  }
  async enregistrerEleve(e: Eleve, annee: string) {
    const { id, ...v } = e;
    if (id) {
      this.ok(await this.db.from('eleves').update(v).eq('id', id));
      return;
    }
    // Nouvel élève : matricule attribué automatiquement.
    // Si supabase/matricules.sql est installé, la base remplace ce numéro par le sien (sans risque de doublon).
    const [matricule] = await this.matricules(annee, 1);
    this.ok(await this.db.from('eleves').insert({ ...v, matricule }));
  }
  async ajouterEleves(liste: Omit<Eleve, 'id'>[], annee: string) {
    const numeros = await this.matricules(annee, liste.length);
    this.ok(await this.db.from('eleves').insert(liste.map((e, i) => ({ ...e, matricule: numeros[i] }))));
  }
  /** Donne un matricule aux élèves de la classe qui n'en ont pas encore. */
  async completerMatricules(classeId: number, annee: string): Promise<number> {
    // Avec la protection de la base (supabase/matricules.sql), c'est la base qui numérote
    const rpc = await this.db.rpc('completer_matricules', { p_classe: classeId });
    if (!rpc.error) return rpc.data as number;
    const sans = (await this.eleves(classeId)).filter((e) => !e.matricule?.trim());
    if (!sans.length) return 0;
    const numeros = await this.matricules(annee, sans.length);
    for (const [i, e] of sans.entries()) this.ok(await this.db.from('eleves').update({ matricule: numeros[i] }).eq('id', e.id!));
    return sans.length;
  }

  // ---------- Matricules automatiques : KPDK-2026-0001, KPDK-2026-0002… ----------
  /** Préfixe selon l'année de rentrée de la classe (« 2026-2027 » → KPDK-2026-). */
  prefixeMatricule(annee: string) {
    const an = annee.match(/\d{4}/)?.[0] ?? String(new Date().getFullYear());
    return `KPDK-${an}-`;
  }
  /** Les `n` prochains matricules libres (toutes classes confondues pour cette année). */
  async matricules(annee: string, n: number): Promise<string[]> {
    const prefixe = this.prefixeMatricule(annee);
    const existants = await this.toutLire<{ matricule: string }>((de, a) =>
      this.db.from('eleves').select('matricule').like('matricule', `${prefixe}%`).range(de, a));
    const max = existants.reduce((m, e) => Math.max(m, Number(e.matricule.slice(prefixe.length)) || 0), 0);
    return Array.from({ length: n }, (_, i) => prefixe + String(max + 1 + i).padStart(4, '0'));
  }
  async supprimerEleve(id: number) {
    this.ok(await this.db.from('eleves').delete().eq('id', id));
  }

  // ---------- Notes ----------
  async notes(classeId: number, bulletin: BulletinCode): Promise<NoteLigne[]> {
    return this.toutLire<NoteLigne>((de, a) =>
      this.db.from('notes').select('eleve_id, periode, evaluation, matiere, valeur')
        .eq('classe_id', classeId).eq('bulletin', bulletin).order('id').range(de, a));
  }
  async enregistrerNote(n: { eleve_id: number; classe_id: number; bulletin: BulletinCode; periode: number; evaluation: Evaluation; matiere: string; valeur: number | null }) {
    const { valeur, ...cle } = n;
    if (valeur === null) {
      this.ok(await this.db.from('notes').delete()
        .eq('eleve_id', cle.eleve_id).eq('bulletin', cle.bulletin).eq('periode', cle.periode)
        .eq('evaluation', cle.evaluation).eq('matiere', cle.matiere));
      return;
    }
    this.ok(await this.db.from('notes').upsert(
      { ...cle, valeur, updated_at: new Date().toISOString() },
      { onConflict: 'eleve_id,bulletin,periode,evaluation,matiere' },
    ));
  }

  // ---------- Observations et décisions ----------
  async appreciations(classeId: number, bulletin: BulletinCode): Promise<Appreciation[]> {
    return this.toutLire<Appreciation>((de, a) =>
      this.db.from('appreciations').select('eleve_id, classe_id, bulletin, periode, observation, decision')
        .eq('classe_id', classeId).eq('bulletin', bulletin).order('id').range(de, a));
  }
  async enregistrerAppreciation(a: Appreciation) {
    this.ok(await this.db.from('appreciations').upsert(
      { ...a, updated_at: new Date().toISOString() },
      { onConflict: 'eleve_id,bulletin,periode' },
    ));
  }
}
