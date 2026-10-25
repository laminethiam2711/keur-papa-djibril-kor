// =====================================================================
//  Calcul des totaux, moyennes, rangs et statistiques de classe.
//  Fonctions « pures » : elles ne font que calculer, sans accès à la base.
// =====================================================================
import { BulletinCode, ClasseConfig, maxMatiere, ModeleReleve, toutesMatieres } from './modeles';

export interface NoteLigne {
  eleve_id: number;
  periode: number;
  evaluation: string;
  matiere: string;
  valeur: number;
}

export interface ResultatPeriode {
  total: number | null; // somme des notes saisies (vide si aucune note)
  totalMax: number;     // somme des maximums des matières notées
  moyenne: number | null;
  rang: number | null;
  exAequo: boolean;
  nbNotes: number;
  complet: boolean;     // toutes les matières sont notées
}

export interface StatsClasse {
  plusForte: number | null;
  plusFaible: number | null;
  moyenneClasse: number | null;
  nbClasses: number;    // élèves ayant une moyenne
}

export const arrondi = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

/** Barème de la moyenne : celui de la classe, sauf l'anglais toujours sur 10 (modèle de l'école). */
export function baremeMoyenne(classe: ClasseConfig, bulletin: BulletinCode): number {
  return bulletin === 'en' ? 10 : classe.bareme;
}

/** Index rapide : « eleve|periode|evaluation|matiere » → note */
export function indexer(notes: NoteLigne[]): Map<string, number> {
  const idx = new Map<string, number>();
  for (const n of notes) idx.set(cle(n.eleve_id, n.periode, n.evaluation, n.matiere), Number(n.valeur));
  return idx;
}
export const cle = (eleve: number, periode: number, evaluation: string, matiere: string) =>
  `${eleve}|${periode}|${evaluation}|${matiere}`;

/** Total et moyenne d'un élève pour une période. Seule l'évaluation « comptée » entre dans la moyenne. */
export function calculerEleve(
  idx: Map<string, number>, eleveId: number, periode: number,
  modele: ModeleReleve, classe: ClasseConfig, evaluation = modele.evaluationComptee,
): Omit<ResultatPeriode, 'rang' | 'exAequo'> {
  const matieres = toutesMatieres(modele);
  let total = 0, totalMax = 0, nbNotes = 0;
  for (const mat of matieres) {
    const v = idx.get(cle(eleveId, periode, evaluation, mat.code));
    if (v === undefined) continue;
    total += v;
    totalMax += maxMatiere(classe, modele.code, mat);
    nbNotes++;
  }
  const moyenne = totalMax > 0 ? arrondi((total / totalMax) * baremeMoyenne(classe, modele.code)) : null;
  return { total: nbNotes ? arrondi(total) : null, totalMax, moyenne, nbNotes, complet: nbNotes === matieres.length };
}

/**
 * Classement « olympique » : deux élèves ex aequo ont le même rang, le suivant saute un rang.
 * Les élèves sans moyenne n'ont pas de rang.
 */
export function classer(moyennes: Map<number, number | null>): Map<number, { rang: number; exAequo: boolean }> {
  const notes = [...moyennes.entries()].filter((e): e is [number, number] => e[1] !== null);
  notes.sort((a, b) => b[1] - a[1]);
  const res = new Map<number, { rang: number; exAequo: boolean }>();
  for (const [id, moy] of notes) {
    const rang = notes.findIndex(([, m]) => m === moy) + 1;
    const nbMeme = notes.filter(([, m]) => m === moy).length;
    res.set(id, { rang, exAequo: nbMeme > 1 });
  }
  return res;
}

/** Résultats de toute la classe pour une période (avec rangs). */
export function resultatsPeriode(
  eleves: { id: number }[], idx: Map<string, number>, periode: number,
  modele: ModeleReleve, classe: ClasseConfig, evaluation = modele.evaluationComptee,
): Map<number, ResultatPeriode> {
  const base = new Map(eleves.map((e) => [e.id, calculerEleve(idx, e.id, periode, modele, classe, evaluation)]));
  const rangs = classer(new Map([...base].map(([id, r]) => [id, r.moyenne])));
  return new Map([...base].map(([id, r]) => [id, { ...r, rang: rangs.get(id)?.rang ?? null, exAequo: rangs.get(id)?.exAequo ?? false }]));
}

/** Moyenne annuelle = moyenne des trimestres qui ont une moyenne. */
export function resultatsAnnuels(parPeriode: Map<number, ResultatPeriode>[], eleves: { id: number }[]) {
  const moyennes = new Map<number, number | null>();
  for (const e of eleves) {
    const ms = parPeriode.map((p) => p.get(e.id)?.moyenne).filter((x): x is number => x !== null && x !== undefined);
    moyennes.set(e.id, ms.length ? arrondi(ms.reduce((a, b) => a + b, 0) / ms.length) : null);
  }
  const rangs = classer(moyennes);
  return new Map(eleves.map((e) => [e.id, {
    moyenne: moyennes.get(e.id) ?? null,
    rang: rangs.get(e.id)?.rang ?? null,
    exAequo: rangs.get(e.id)?.exAequo ?? false,
  }]));
}

/** Plus forte, plus faible et moyenne de la classe. */
export function statsClasse(moyennes: (number | null | undefined)[]): StatsClasse {
  const ms = moyennes.filter((x): x is number => x !== null && x !== undefined);
  if (!ms.length) return { plusForte: null, plusFaible: null, moyenneClasse: null, nbClasses: 0 };
  return {
    plusForte: Math.max(...ms),
    plusFaible: Math.min(...ms),
    moyenneClasse: arrondi(ms.reduce((a, b) => a + b, 0) / ms.length),
    nbClasses: ms.length,
  };
}

/** « 1er », « 2e », « 3e ex » … */
export function formatRang(rang: number | null, exAequo = false, langue: 'fr' | 'en' | 'ar' = 'fr'): string {
  if (rang === null) return '';
  if (langue === 'en') {
    const s = rang % 100 >= 11 && rang % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[rang % 10] ?? 'th';
    return `${rang}${s}${exAequo ? ' (tie)' : ''}`;
  }
  if (langue === 'ar') return `${rang}${exAequo ? ' م' : ''}`;
  return `${rang}${rang === 1 ? 'er' : 'e'}${exAequo ? ' ex' : ''}`;
}

/** Affichage d'un nombre à la française (virgule). */
export function nombre(x: number | null | undefined, decimales = 2): string {
  if (x === null || x === undefined) return '';
  return Number.isInteger(x) ? String(x) : x.toFixed(decimales).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
}

/** Appréciation d'une note ou d'une moyenne, selon la part du maximum obtenue. */
export type Niveau = 'tb' | 'b' | 'ab' | 'p' | 'i';
export function appreciation(note: number | null | undefined, max: number): { niveau: Niveau; texte: string } | null {
  if (note === null || note === undefined || !max) return null;
  const r = note / max;
  if (r >= 0.8) return { niveau: 'tb', texte: 'Très bien' };
  if (r >= 0.7) return { niveau: 'b', texte: 'Bien' };
  if (r >= 0.6) return { niveau: 'ab', texte: 'Assez bien' };
  if (r >= 0.5) return { niveau: 'p', texte: 'Passable' };
  return { niveau: 'i', texte: 'Insuffisant' };
}
