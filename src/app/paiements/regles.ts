// =====================================================================
//  Règles des paiements : types de frais, mois de l'année scolaire,
//  calcul de ce qui est dû, payé et restant. Fonctions sans accès à la base.
// =====================================================================

export type TypeFrais = 'inscription' | 'tenue' | 'mensualite' | 'cantine' | 'transport';
export type Moyen = 'Espèces' | 'Wave' | 'Orange Money';

export const TYPES: { code: TypeFrais; libelle: string; mensuel: boolean; option?: 'cantine' | 'transport' }[] = [
  { code: 'inscription', libelle: 'Inscription', mensuel: false },
  { code: 'tenue', libelle: 'Tenue / fournitures', mensuel: false },
  { code: 'mensualite', libelle: 'Mensualité', mensuel: true },
  { code: 'cantine', libelle: 'Cantine', mensuel: true, option: 'cantine' },
  { code: 'transport', libelle: 'Transport', mensuel: true, option: 'transport' },
];
export const LIBELLE_TYPE: Record<TypeFrais, string> = Object.fromEntries(TYPES.map((t) => [t.code, t.libelle])) as Record<TypeFrais, string>;
export const MOYENS: Moyen[] = ['Espèces', 'Wave', 'Orange Money'];

/** Mois payés : d'octobre à juin (9 mois). */
export const MOIS_SCOLAIRES = [10, 11, 12, 1, 2, 3, 4, 5, 6];
const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const nomMois = (m: number) => NOMS_MOIS[m - 1];
export const nomMoisCourt = (m: number) => NOMS_MOIS[m - 1].slice(0, 4).replace(/\.$/, '') + (NOMS_MOIS[m - 1].length > 4 ? '.' : '');

/** Année de rentrée (« 2026-2027 » → 2026). */
export const anneeRentree = (annee: string) => Number(annee.match(/\d{4}/)?.[0] ?? new Date().getFullYear());

/** Année civile d'un mois scolaire (octobre 2026, janvier 2027…). */
export const anneeDuMois = (annee: string, mois: number) => anneeRentree(annee) + (mois >= 9 ? 0 : 1);

/**
 * Nombre de mois déjà échus à une date (le mois en cours compte).
 * Avant octobre : 0 ; après juin : 9.
 */
export function moisEchus(annee: string, date = new Date()): number {
  const debut = new Date(anneeRentree(annee), 9, 1); // 1er octobre
  if (date < debut) return 0;
  const n = (date.getFullYear() - debut.getFullYear()) * 12 + date.getMonth() - 9 + 1;
  return Math.min(Math.max(n, 0), MOIS_SCOLAIRES.length);
}

export interface Tarif { annee: string; niveau: string; type: TypeFrais; montant: number; }
export interface Paiement {
  id?: number;
  eleve_id: number;
  classe_id: number;
  annee: string;
  type: TypeFrais;
  mois: number | null;
  montant: number;
  moyen: Moyen;
  reference: string;
  date_paiement: string;
  numero_recu?: string;
  note: string;
  encaisse_par?: string;
  created_at?: string;
}

export interface EleveFrais { id: number; cantine?: boolean; transport?: boolean; }

/** Montant d'un frais pour un niveau (0 si non renseigné). */
export function tarif(tarifs: Tarif[], niveau: string, type: TypeFrais): number {
  return tarifs.find((t) => t.niveau === niveau && t.type === type)?.montant ?? 0;
}

/** Frais qui concernent cet élève (cantine et transport seulement s'il y est inscrit). */
export function typesDeLEleve(e: EleveFrais) {
  return TYPES.filter((t) => !t.option || e[t.option]);
}

export interface Situation {
  duAnnee: number;     // total de l'année
  duADate: number;     // ce qui devrait être payé aujourd'hui
  paye: number;
  reste: number;       // reste à payer sur l'année
  retard: number;      // dû à date − payé (≥ 0)
  moisEnRetard: number;
  moisImpayes: number[];  // mensualités échues non soldées
}

/** Situation financière d'un élève pour l'année. */
export function situation(e: EleveFrais, niveau: string, annee: string, tarifs: Tarif[], paiements: Paiement[], date = new Date()): Situation {
  const echus = moisEchus(annee, date);
  let duAnnee = 0, duADate = 0;
  for (const t of typesDeLEleve(e)) {
    const m = tarif(tarifs, niveau, t.code);
    if (t.mensuel) {
      duAnnee += m * MOIS_SCOLAIRES.length;
      duADate += m * echus;
    } else {
      duAnnee += m;
      if (echus > 0) duADate += m;
    }
  }
  const paye = paiements.reduce((s, p) => s + p.montant, 0);
  const mensualite = tarif(tarifs, niveau, 'mensualite');
  const moisImpayes = MOIS_SCOLAIRES.slice(0, echus).filter((mo) => {
    const verse = paiements.filter((p) => p.type === 'mensualite' && p.mois === mo).reduce((s, p) => s + p.montant, 0);
    return mensualite > 0 && verse < mensualite;
  });
  const retard = Math.max(0, duADate - paye);
  return { duAnnee, duADate, paye, reste: Math.max(0, duAnnee - paye), retard, moisEnRetard: moisImpayes.length, moisImpayes };
}

/** Montant déjà versé pour un frais (et un mois). */
export function verse(paiements: Paiement[], type: TypeFrais, mois: number | null = null): number {
  return paiements.filter((p) => p.type === type && (mois === null || p.mois === mois)).reduce((s, p) => s + p.montant, 0);
}

/** 25000 → « 25 000 F CFA » */
export function fcfa(n: number | null | undefined): string {
  if (n === null || n === undefined) return '';
  return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' F CFA';
}

// ---------- Montant en lettres (pour les reçus) ----------
const UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze',
  'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const DIZAINES = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function moinsDeCent(n: number): string {
  if (n < 20) return UNITES[n];
  const d = Math.floor(n / 10), u = n % 10;
  if (d === 7 || d === 9) {
    const reste = 10 + u;
    return DIZAINES[d] + (d === 7 && u === 1 ? '-et-' : '-') + UNITES[reste];
  }
  if (u === 0) return DIZAINES[d] + (d === 8 ? 's' : '');
  if (u === 1 && d !== 8) return DIZAINES[d] + '-et-un';
  return DIZAINES[d] + '-' + UNITES[u];
}

function moinsDeMille(n: number): string {
  const c = Math.floor(n / 100), r = n % 100;
  if (c === 0) return moinsDeCent(r);
  const cent = c === 1 ? 'cent' : UNITES[c] + '-cent' + (r === 0 ? 's' : '');
  return r === 0 ? cent : cent + '-' + moinsDeCent(r);
}

/** 125500 → « cent-vingt-cinq-mille-cinq-cents » (orthographe rectifiée, avec traits d'union). */
export function enLettres(n: number): string {
  n = Math.round(Math.abs(n));
  if (n === 0) return 'zéro';
  const parties: string[] = [];
  const millions = Math.floor(n / 1_000_000), milliers = Math.floor((n % 1_000_000) / 1000), reste = n % 1000;
  if (millions) parties.push(millions === 1 ? 'un-million' : moinsDeMille(millions) + '-millions');
  if (milliers) parties.push(milliers === 1 ? 'mille' : moinsDeMille(milliers).replace(/cents$/, 'cent') + '-mille');
  if (reste) parties.push(moinsDeMille(reste));
  return parties.join('-');
}
