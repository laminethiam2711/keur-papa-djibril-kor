// Prépare tout ce qu'il faut pour afficher ou imprimer les bulletins d'une classe.
import { BulletinCode, ModeleReleve, modelePour, PERIODES } from './modeles';
import { indexer, NoteLigne, resultatsAnnuels, resultatsPeriode, ResultatPeriode, statsClasse, StatsClasse } from './calcul';
import { Appreciation, Classe, Eleve, NotesService } from './notes.service';
import { Absence, resumeParTrimestre, ResumeAssiduite } from '../absences/regles';
import { AbsencesService } from '../absences/absences.service';

export interface LigneBulletin {
  eleve: Eleve;
  periodes: (ResultatPeriode | undefined)[];          // composition (comptée), index 0 = 1er trimestre
  periodesControle: (ResultatPeriode | undefined)[];  // contrôle (modèle 2), pour information
  annuel: { moyenne: number | null; rang: number | null; exAequo: boolean };
  observations: string[];                             // index 0 = 1er trimestre
  decision: string;
  assiduite?: ResumeAssiduite[];                     // index 0-2 = trimestres, 3 = année (si le module Absences est installé)
}

export interface DonneesBulletin {
  classe: Classe;
  bulletin: BulletinCode;
  modele: ModeleReleve;
  idx: Map<string, number>;
  lignes: LigneBulletin[];
  stats: StatsClasse[];        // par période
  statsAnnuel: StatsClasse;
  nbEleves: number;
}

export async function chargerBulletins(ns: NotesService, classeId: number, bulletin: BulletinCode, abs?: AbsencesService): Promise<DonneesBulletin> {
  const [classe, eleves, notes, apps, absences] = await Promise.all([
    ns.classe(classeId), ns.eleves(classeId), ns.notes(classeId, bulletin), ns.appreciations(classeId, bulletin),
    abs ? abs.classeSiDisponible(classeId) : Promise.resolve(undefined),
  ]);
  return construireBulletins(classe, eleves, notes, apps, bulletin, absences);
}

/** Calcule tout le bulletin à partir des données brutes (sans accès à la base). */
export function construireBulletins(classe: Classe, eleves: Eleve[], notes: NoteLigne[], apps: Appreciation[], bulletin: BulletinCode, absences?: Absence[]): DonneesBulletin {
  const modele = modelePour(classe, bulletin);
  const idx = indexer(notes);
  const ids = eleves as { id: number }[];
  const parPeriode = PERIODES.map((p) => resultatsPeriode(ids, idx, p, modele, classe));
  const parPeriodeCtrl = modele.evaluations.includes('controle')
    ? PERIODES.map((p) => resultatsPeriode(ids, idx, p, modele, classe, 'controle'))
    : [];
  const annuel = resultatsAnnuels(parPeriode, ids);
  const app = new Map<string, Appreciation>(apps.map((a) => [`${a.eleve_id}|${a.periode}`, a]));

  const lignes: LigneBulletin[] = eleves.map((e) => ({
    eleve: e,
    periodes: parPeriode.map((p) => p.get(e.id!)),
    periodesControle: parPeriodeCtrl.map((p) => p.get(e.id!)),
    annuel: annuel.get(e.id!)!,
    observations: PERIODES.map((p) => app.get(`${e.id}|${p}`)?.observation ?? ''),
    decision: app.get(`${e.id}|0`)?.decision ?? '',
    assiduite: absences ? resumeParTrimestre(absences.filter((a) => a.eleve_id === e.id)) : undefined,
  }));

  return {
    classe, bulletin, modele, idx, lignes,
    stats: parPeriode.map((p) => statsClasse([...p.values()].map((r) => r.moyenne))),
    statsAnnuel: statsClasse([...annuel.values()].map((a) => a.moyenne)),
    nbEleves: eleves.length,
  };
}
