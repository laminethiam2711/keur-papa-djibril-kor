// Toutes les informations de l'école sont centralisées ici.
// Pour modifier un texte, un téléphone ou une adresse, il suffit de changer ce fichier.

export const ECOLE = {
  nom: 'Keur Papa Djibril Kor',
  nomComplet: 'École privée franco-arabe Keur Papa Djibril Kor',
  nomArabe: 'مدرسة كير بابا جبريل كور',
  slogan: 'Savoir, foi et excellence',
  anneeScolaire: '2026-2027',
  telephones: ['+221 77 230 79 05', '+221 70 602 92 15'],
  // Numéro WhatsApp au format international, sans espace ni « + »
  whatsapp: '221772307905',
  horaires: 'Lundi – Vendredi : 8h00 – 17h00 · Samedi : 8h00 – 13h00',
  // Qui signe les bulletins : mettre 'Le Directeur' si c'est un homme
  signatureDirection: 'La Directrice',
  ville: 'Dakar',
};

export interface Etablissement {
  nom: string;
  quartier: string;
  adresse: string;
  niveaux: string;
  carte: string; // requête Google Maps
}

export const ETABLISSEMENTS: Etablissement[] = [
  {
    nom: 'Keur Papa Djibril Kor 1',
    quartier: 'Sicap Mbao',
    adresse: 'Sicap Mbao, Tally Mame Diarra, Dakar',
    niveaux: 'Préscolaire et élémentaire',
    carte: 'Sicap Mbao Tally Mame Diarra Dakar',
  },
  {
    nom: 'Keur Papa Djibril Kor 2',
    quartier: 'Tivaouane Peul',
    adresse: 'Tivaouane Peul, 1er arrêt Socabeg, Dakar',
    niveaux: 'Crèche, préscolaire et élémentaire',
    carte: 'Tivaouane Peul Socabeg Dakar',
  },
];

export interface Cycle {
  nom: string;
  arabe: string;
  ages: string;
  classes: string;
  francais: string[];
  arabeProgramme: string[];
}

export const CYCLES: Cycle[] = [
  {
    nom: 'Crèche',
    arabe: 'الحضانة',
    ages: '2 – 3 ans',
    classes: 'Petits',
    francais: ['Éveil sensoriel et motricité', 'Langage et comptines', 'Jeux éducatifs'],
    arabeProgramme: ['Premières sourates courtes', 'Invocations du quotidien'],
  },
  {
    nom: 'Préscolaire',
    arabe: 'التعليم الأولي',
    ages: '3 – 6 ans',
    classes: 'Petite, moyenne et grande section',
    francais: ['Pré-lecture et pré-écriture', 'Nombres et formes', 'Dessin, chant, activités manuelles'],
    arabeProgramme: ['Alphabet arabe', 'Mémorisation du Coran (Juz Amma)', 'Bonnes manières (adab)'],
  },
  {
    nom: 'Élémentaire',
    arabe: 'التعليم الابتدائي',
    ages: '6 – 12 ans',
    classes: 'CI, CP, CE1, CE2, CM1, CM2',
    francais: [
      'Programme officiel : français, mathématiques, éveil scientifique',
      'Histoire, géographie, éducation civique',
      'Préparation au CFEE et à l’entrée en 6e',
    ],
    arabeProgramme: ['Lecture et écriture de l’arabe', 'Coran et tajwid', 'Éducation islamique et langue arabe'],
  },
];

export interface Actualite {
  date: string; // AAAA-MM-JJ
  titre: string;
  resume: string;
  categorie: string;
}

export const ACTUALITES: Actualite[] = [
  {
    date: '2026-10-05',
    titre: 'Rentrée scolaire 2026-2027',
    resume: 'Les cours ont repris dans nos deux établissements. Bienvenue aux nouveaux élèves et à leurs familles !',
    categorie: 'Rentrée',
  },
  {
    date: '2026-09-15',
    titre: 'Inscriptions ouvertes',
    resume: 'Les inscriptions pour l’année 2026-2027 sont ouvertes du lundi au samedi. Pré-inscription possible en ligne.',
    categorie: 'Inscriptions',
  },
  {
    date: '2026-08-28',
    titre: 'Participation au Gamou de Tivaouane',
    resume: 'Élèves et enseignants ont célébré le Mawlid avec récitations et chants religieux.',
    categorie: 'Vie scolaire',
  },
];
