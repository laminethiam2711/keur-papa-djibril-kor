import { Injectable, signal } from '@angular/core';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../supabase.config';
import { ACTUALITES } from '../data/ecole';

export interface Actualite {
  id?: number;
  titre: string;
  resume: string;
  categorie: string;
  date_publication: string;
}

export interface Photo {
  id?: number;
  titre: string;
  categorie: string;
  chemin: string;
  url?: string;
}

export interface Inscription {
  id?: number;
  enfant: string;
  date_naissance: string;
  niveau: string;
  etablissement: string;
  parent: string;
  telephone: string;
  statut?: string;
  created_at?: string;
}

export interface Message {
  id?: number;
  nom: string;
  telephone: string | null;
  message: string;
  lu?: boolean;
  created_at?: string;
}

/** Point d'accès unique à la base de données Supabase. */
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  /** Vrai quand l'URL et la clé sont renseignées dans supabase.config.ts */
  readonly actif = !!(SUPABASE_CONFIG.url && SUPABASE_CONFIG.cleAnon);
  private client: SupabaseClient | null = this.actif
    ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.cleAnon)
    : null;

  /** Session de l'administrateur connecté (null si déconnecté) */
  session = signal<Session | null>(null);

  constructor() {
    if (!this.client) return;
    this.client.auth.getSession().then(({ data }) => this.session.set(data.session));
    this.client.auth.onAuthStateChange((_e, s) => this.session.set(s));
  }

  private get db(): SupabaseClient {
    if (!this.client) throw new Error('Supabase n’est pas encore configuré (voir supabase.config.ts).');
    return this.client;
  }

  private verifier<T>(res: { data: T | null; error: { message: string } | null }): T {
    if (res.error) throw new Error(res.error.message);
    return res.data as T;
  }

  // ---------- Authentification ----------
  async connexion(email: string, motDePasse: string) {
    const { error } = await this.db.auth.signInWithPassword({ email, password: motDePasse });
    if (error) throw new Error('E-mail ou mot de passe incorrect.');
    if (!(await this.estAdmin())) {
      await this.deconnexion();
      throw new Error('Ce compte n’est pas administrateur.');
    }
  }

  async deconnexion() {
    await this.db.auth.signOut();
  }

  async estAdmin(): Promise<boolean> {
    if (!this.client) return false;
    const { data } = await this.client.auth.getSession();
    if (!data.session) return false;
    const { data: ligne } = await this.client.from('admins').select('user_id').eq('user_id', data.session.user.id).maybeSingle();
    return !!ligne;
  }

  // ---------- Actualités ----------
  async listerActualites(): Promise<Actualite[]> {
    if (!this.actif) {
      return ACTUALITES.map((a) => ({ titre: a.titre, resume: a.resume, categorie: a.categorie, date_publication: a.date }));
    }
    return this.verifier(await this.db.from('actualites').select('*').order('date_publication', { ascending: false }));
  }
  async enregistrerActualite(a: Actualite) {
    const { id, ...valeurs } = a;
    this.verifier(id
      ? await this.db.from('actualites').update(valeurs).eq('id', id)
      : await this.db.from('actualites').insert(valeurs));
  }
  async supprimerActualite(id: number) {
    this.verifier(await this.db.from('actualites').delete().eq('id', id));
  }

  // ---------- Photos ----------
  urlPhoto(chemin: string): string {
    return this.db.storage.from('galerie').getPublicUrl(chemin).data.publicUrl;
  }
  async listerPhotos(): Promise<Photo[]> {
    if (!this.actif) return [];
    const photos: Photo[] = this.verifier(await this.db.from('photos').select('*').order('created_at', { ascending: false }));
    return photos.map((p) => ({ ...p, url: this.urlPhoto(p.chemin) }));
  }
  async ajouterPhoto(fichier: File, titre: string, categorie: string) {
    const extension = fichier.name.split('.').pop()?.toLowerCase() || 'jpg';
    const chemin = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    this.verifier(await this.db.storage.from('galerie').upload(chemin, fichier, { contentType: fichier.type }));
    this.verifier(await this.db.from('photos').insert({ titre, categorie, chemin }));
  }
  async supprimerPhoto(p: Photo) {
    this.verifier(await this.db.storage.from('galerie').remove([p.chemin]));
    this.verifier(await this.db.from('photos').delete().eq('id', p.id!));
  }

  // ---------- Pré-inscriptions ----------
  async envoyerInscription(i: Inscription) {
    this.verifier(await this.db.from('inscriptions').insert(i));
  }
  async listerInscriptions(): Promise<Inscription[]> {
    return this.verifier(await this.db.from('inscriptions').select('*').order('created_at', { ascending: false }));
  }
  async changerStatut(id: number, statut: string) {
    this.verifier(await this.db.from('inscriptions').update({ statut }).eq('id', id));
  }
  async supprimerInscription(id: number) {
    this.verifier(await this.db.from('inscriptions').delete().eq('id', id));
  }

  // ---------- Messages ----------
  async envoyerMessage(m: Message) {
    this.verifier(await this.db.from('messages').insert(m));
  }
  async listerMessages(): Promise<Message[]> {
    return this.verifier(await this.db.from('messages').select('*').order('created_at', { ascending: false }));
  }
  async marquerLu(id: number, lu: boolean) {
    this.verifier(await this.db.from('messages').update({ lu }).eq('id', id));
  }
  async supprimerMessage(id: number) {
    this.verifier(await this.db.from('messages').delete().eq('id', id));
  }

  // ---------- Tableau de bord ----------
  async compter(table: 'actualites' | 'photos' | 'inscriptions' | 'messages', filtre?: [string, unknown]) {
    let requete = this.db.from(table).select('*', { count: 'exact', head: true });
    if (filtre) requete = requete.eq(filtre[0], filtre[1]);
    const { count, error } = await requete;
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
}
