// Règles des absences et retards (sans accès à la base : testables).

export type TypeAbsence = 'absence' | 'retard';
export type Moment = 'journee' | 'matin' | 'apres-midi';

export interface Absence {
  id?: number;
  eleve_id: number;
  classe_id: number;
  date: string;          // AAAA-MM-JJ
  type: TypeAbsence;
  moment: Moment;
  justifie: boolean;
  motif: string;
}

export const MOMENTS: { code: Moment; libelle: string }[] = [
  { code: 'journee', libelle: 'Journée' },
  { code: 'matin', libelle: 'Matin' },
  { code: 'apres-midi', libelle: 'Après-midi' },
];
export const libelleMoment = (m: Moment) => MOMENTS.find((x) => x.code === m)?.libelle ?? m;

/** Trimestre d'une date : 1 = oct.–déc. (septembre compté au 1er), 2 = janv.–mars, 3 = avr.–juin (juillet-août : 3). */
export function trimestreDe(date: string): 1 | 2 | 3 {
  const mois = Number(date.slice(5, 7));
  if (mois >= 9) return 1;
  if (mois <= 3) return 2;
  return 3;
}

export interface ResumeAssiduite {
  absences: number;          // en demi-journées : une journée = 2, matin/après-midi = 1
  absencesJustifiees: number;
  retards: number;
}

const poids = (a: Absence) => (a.moment === 'journee' ? 2 : 1);

export function resumer(liste: Absence[]): ResumeAssiduite {
  const r: ResumeAssiduite = { absences: 0, absencesJustifiees: 0, retards: 0 };
  for (const a of liste) {
    if (a.type === 'retard') r.retards++;
    else {
      r.absences += poids(a);
      if (a.justifie) r.absencesJustifiees += poids(a);
    }
  }
  return r;
}

/** Résumé par trimestre (index 0 = 1er trimestre) puis total de l'année (index 3). */
export function resumeParTrimestre(liste: Absence[]): ResumeAssiduite[] {
  const parT = [1, 2, 3].map((t) => resumer(liste.filter((a) => trimestreDe(a.date) === t)));
  return [...parT, resumer(liste)];
}

/** « 3 demi-journées d'absence (1 justifiée) · 2 retards » */
export function texteAssiduite(r: ResumeAssiduite | undefined): string {
  if (!r || (!r.absences && !r.retards)) return 'Aucune absence ni retard';
  const morceaux: string[] = [];
  if (r.absences) {
    morceaux.push(`${r.absences} demi-journée${r.absences > 1 ? 's' : ''} d'absence` +
      (r.absencesJustifiees ? ` (${r.absencesJustifiees} justifiée${r.absencesJustifiees > 1 ? 's' : ''})` : ''));
  } else morceaux.push('Aucune absence');
  morceaux.push(r.retards ? `${r.retards} retard${r.retards > 1 ? 's' : ''}` : 'aucun retard');
  return morceaux.join(' · ');
}

/** Date du jour au format AAAA-MM-JJ (heure locale). */
export function aujourdhui(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
