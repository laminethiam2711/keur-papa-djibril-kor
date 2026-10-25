// =====================================================================
//  Modèles de relevés de notes de l'école (repris des relevés papier)
//  Pour ajouter ou renommer une matière, il suffit de modifier ce fichier.
// =====================================================================

export type BulletinCode = 'fr' | 'ar' | 'en';
export type Evaluation = 'composition' | 'controle';
export type ModeleFr = 'composition' | 'controle';

export interface Matiere {
  code: string;      // identifiant enregistré en base (ne pas changer une fois des notes saisies)
  nom: string;       // nom affiché
  nomAr?: string;    // nom arabe (relevé arabe)
  maxFixe?: number;  // note maximale imposée (relevé anglais)
}

export interface Domaine {
  nom: string;
  matieres: Matiere[];
}

export interface ModeleReleve {
  code: BulletinCode;
  titre: string;
  evaluations: Evaluation[];      // évaluations saisies dans chaque période
  evaluationComptee: Evaluation;  // celle qui compte pour la moyenne
  domaines: Domaine[];
}

const m = (code: string, nom: string, extra: Partial<Matiere> = {}): Matiere => ({ code, nom, ...extra });

// ---------- Français, modèle 1 : composition seule, matières détaillées ----------
export const FR_COMPOSITION: ModeleReleve = {
  code: 'fr',
  titre: 'Relevé de notes',
  evaluations: ['composition'],
  evaluationComptee: 'composition',
  domaines: [
    { nom: 'Langue et communication', matieres: [
      m('lc_lecture', 'Lecture'), m('lc_ecriture', 'Écriture'), m('lc_copie', 'Copie'), m('lc_prod_ecrits', 'Production d’écrits'),
    ] },
    { nom: 'Maths', matieres: [
      m('ma_numeriques', 'Activités numériques'), m('ma_mesure', 'Activités de mesure'),
      m('ma_geometriques', 'Activités géométriques'), m('ma_problemes', 'Résolution de problèmes'), m('ma_competence', 'Compétence'),
    ] },
    { nom: 'Découverte du monde', matieres: [
      m('dm_ist', 'IST'), m('dm_histoire', 'Histoire'), m('dm_geographie', 'Géographie'), m('dm_competence', 'Compétence'),
    ] },
    { nom: 'EDD', matieres: [
      m('edd_vivre_ensemble', 'Vivre ensemble'), m('edd_vdsm', 'VDSM'), m('edd_competence', 'Compétence'),
    ] },
    { nom: 'EPSA', matieres: [m('epsa_arts', 'Arts plastiques')] },
    { nom: 'Éducation religieuse', matieres: [m('er_ressources', 'Ressources'), m('er_competence', 'Compétence')] },
    { nom: 'Langue arabe', matieres: [m('la_ressources', 'Ressources'), m('la_competence', 'Compétence')] },
  ],
};

// ---------- Français, modèle 2 : contrôle + composition, Ressources / Compétence ----------
export const FR_CONTROLE: ModeleReleve = {
  code: 'fr',
  titre: 'Relevé de notes',
  evaluations: ['controle', 'composition'],
  evaluationComptee: 'composition',
  domaines: [
    { nom: 'Langue et communication', matieres: [
      m('lc_lecture', 'Lecture'), m('lc_ressources', 'Ressources'), m('lc_competence', 'Compétence'),
    ] },
    { nom: 'Maths', matieres: [m('ma_ressources', 'Ressources'), m('ma_competence', 'Compétence')] },
    { nom: 'Découverte du monde', matieres: [m('dm_ressources', 'Ressources'), m('dm_competence', 'Compétence')] },
    { nom: 'Éducation au développement durable', matieres: [m('edd_ressources', 'Ressources'), m('edd_competence', 'Compétence')] },
    { nom: 'EPSA', matieres: [m('epsa_arts', 'Arts plastiques'), m('epsa_recitation', 'Récitation'), m('epsa_chant', 'Chant')] },
  ],
};

// ---------- Arabe : كشف الدرجات ----------
export const ARABE: ModeleReleve = {
  code: 'ar',
  titre: 'كشف الدرجات الإختبارات',
  evaluations: ['composition'],
  evaluationComptee: 'composition',
  domaines: [
    { nom: 'المواد', matieres: [
      m('ar_coran', 'Coran', { nomAr: 'القرآن' }),
      m('ar_hadith', 'Hadith', { nomAr: 'الحديث' }),
      m('ar_tawhid', 'Tawhid', { nomAr: 'التوحيد' }),
      m('ar_fiqh', 'Jurisprudence', { nomAr: 'الفقه' }),
      m('ar_dictee', 'Dictée préparée', { nomAr: 'الاملاء المنقول' }),
      m('ar_lecture', 'Lecture', { nomAr: 'القراءة' }),
      m('ar_ecriture', 'Écriture', { nomAr: 'الخط' }),
      m('ar_chant', 'Chant', { nomAr: 'الأناشيد' }),
      m('ar_texte', 'Vocabulaire', { nomAr: 'النص' }),
      m('ar_prod_ecrits', 'Production d’écrits', { nomAr: 'الإنتاج الكتابي' }),
    ] },
  ],
};

// ---------- Anglais : Term examination ----------
export const ANGLAIS: ModeleReleve = {
  code: 'en',
  titre: 'Term examination',
  evaluations: ['composition'],
  evaluationComptee: 'composition',
  domaines: [
    { nom: 'Subjects', matieres: [
      m('en_language', 'Language and communication', { maxFixe: 50 }),
      m('en_maths', 'Mathematics', { maxFixe: 30 }),
      m('en_science', 'Science', { maxFixe: 20 }),
      m('en_civics', 'Civics', { maxFixe: 10 }),
      m('en_visual_art', 'Visual art', { maxFixe: 10 }),
    ] },
  ],
};

export interface ClasseConfig {
  modele_fr: ModeleFr;
  bareme: number;
  maximums: Record<string, number>;
}

/** Le modèle de relevé à utiliser pour une classe et un bulletin donnés. */
export function modelePour(classe: Pick<ClasseConfig, 'modele_fr'>, bulletin: BulletinCode): ModeleReleve {
  if (bulletin === 'ar') return ARABE;
  if (bulletin === 'en') return ANGLAIS;
  return classe.modele_fr === 'controle' ? FR_CONTROLE : FR_COMPOSITION;
}

export function toutesMatieres(modele: ModeleReleve): Matiere[] {
  return modele.domaines.flatMap((d) => d.matieres);
}

/** Note maximale d'une matière : imposée (anglais), sinon réglage de la classe, sinon le barème. */
export function maxMatiere(classe: ClasseConfig, bulletin: BulletinCode, matiere: Matiere): number {
  if (matiere.maxFixe) return matiere.maxFixe;
  const reglage = classe.maximums?.[`${bulletin}:${matiere.code}`];
  return reglage && reglage > 0 ? reglage : classe.bareme;
}

export const LIBELLES_BULLETIN: Record<BulletinCode, string> = { fr: 'Français', ar: 'Arabe', en: 'Anglais' };
export const LIBELLES_EVALUATION: Record<Evaluation, string> = { composition: 'Composition', controle: 'Contrôle' };
export const PERIODES = [1, 2, 3] as const;
export const NIVEAUX = ['Crèche', 'Préscolaire', 'CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'];
export const DECISIONS = ['Passe en classe supérieure', 'Redouble la classe', 'Test de passage', 'Cours de vacances', 'Exclu(e)'];

export function libellePeriode(bulletin: BulletinCode, p: number): string {
  if (bulletin === 'ar') return ['الإختبار الأول', 'الإختبار الثاني', 'الإختبار الثالث'][p - 1];
  if (bulletin === 'en') return ['First term', 'Second term', 'Third term'][p - 1];
  return p === 1 ? '1er trimestre' : `${p}e trimestre`;
}
