import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { BulletinCode, LIBELLES_BULLETIN, libellePeriode, maxMatiere, PERIODES, toutesMatieres } from './modeles';
import { cle } from './calcul';
import { chargerBulletins, DonneesBulletin } from './donnees-bulletin';
import { Classe, NotesService } from './notes.service';

type Cellule = { value?: string | number | null; type?: StringConstructor | NumberConstructor; fontWeight?: 'bold';
  textColor?: string; backgroundColor?: string; align?: 'center' | 'left' | 'right' } | null;
type Feuille = { sheet: string; data: Cellule[][]; columns?: { width: number }[]; stickyRowsCount?: number };

const CLE_DERNIERE = 'kpdk-derniere-sauvegarde';

/** Exports Excel : sauvegarde complète de l'école ou export d'une classe. */
@Injectable({ providedIn: 'root' })
export class ExportService {
  private sb = inject(SupabaseService);
  private ns = inject(NotesService);

  /** Date de la dernière sauvegarde faite depuis cet ordinateur (ou null). */
  derniereSauvegarde(): Date | null {
    try {
      const v = localStorage.getItem(CLE_DERNIERE);
      return v ? new Date(v) : null;
    } catch {
      return null;
    }
  }

  // ---------- Sauvegarde complète ----------
  async sauvegardeComplete(): Promise<void> {
    const classes = await this.ns.classes();
    const lignesEleves: Cellule[][] = [this.entete(['Matricule', 'Prénom', 'Nom', 'Né(e) le', 'À', 'Téléphone parent', 'Classe', 'Établissement', 'Année'])];
    const lignesMoy: Cellule[][] = [this.entete(['Classe', 'Relevé', 'Matricule', 'Élève',
      'Moy. T1', 'Rang T1', 'Moy. T2', 'Rang T2', 'Moy. T3', 'Rang T3', 'Moy. annuelle', 'Rang annuel', 'Décision'])];
    const lignesNotes: Cellule[][] = [this.entete(['Classe', 'Relevé', 'Période', 'Évaluation', 'Matricule', 'Élève', 'Domaine', 'Matière', 'Note', 'Max'])];

    for (const c of classes) {
      for (const b of this.releves(c)) {
        const d = await chargerBulletins(this.ns, c.id!, b);
        if (b === 'fr') {
          for (const l of d.lignes) {
            const e = l.eleve;
            lignesEleves.push([this.t(e.matricule), this.t(e.prenom), this.t(e.nom), this.t(this.date(e.date_naissance)),
              this.t(e.lieu_naissance), this.t(e.telephone), this.t(c.nom), this.t(c.etablissement), this.t(c.annee)]);
          }
        }
        lignesMoy.push(...this.lignesMoyennes(d, true));
        lignesNotes.push(...this.lignesNotes(d));
      }
    }

    const [inscriptions, messages] = await Promise.all([
      this.sb.listerInscriptions().catch(() => []),
      this.sb.listerMessages().catch(() => []),
    ]);
    const lignesInsc: Cellule[][] = [this.entete(['Reçue le', 'Enfant', 'Né(e) le', 'Niveau', 'Établissement', 'Parent', 'Téléphone', 'Statut'])];
    for (const i of inscriptions) lignesInsc.push([this.t(this.date(i.created_at)), this.t(i.enfant), this.t(this.date(i.date_naissance)),
      this.t(i.niveau), this.t(i.etablissement), this.t(i.parent), this.t(i.telephone), this.t(i.statut)]);
    const lignesMsg: Cellule[][] = [this.entete(['Reçu le', 'Nom', 'Téléphone', 'Message', 'Lu'])];
    for (const m of messages) lignesMsg.push([this.t(this.date(m.created_at)), this.t(m.nom), this.t(m.telephone), this.t(m.message), this.t(m.lu ? 'Oui' : 'Non')]);
    const lignesClasses: Cellule[][] = [this.entete(['Classe', 'Niveau', 'Année', 'Établissement', 'Maître(sse)', 'Moyenne sur', 'Relevé français', 'Arabe', 'Anglais'])];
    for (const c of classes) lignesClasses.push([this.t(c.nom), this.t(c.niveau), this.t(c.annee), this.t(c.etablissement), this.t(c.maitre),
      this.n(c.bareme), this.t(c.modele_fr === 'controle' ? 'Modèle 2' : 'Modèle 1'), this.t(c.avec_arabe ? 'Oui' : 'Non'), this.t(c.avec_anglais ? 'Oui' : 'Non')]);

    await this.ecrire([
      { sheet: 'Élèves', data: lignesEleves, columns: this.largeurs([18, 16, 16, 12, 14, 16, 12, 22, 11]), stickyRowsCount: 1 },
      { sheet: 'Moyennes', data: lignesMoy, columns: this.largeurs([12, 10, 18, 24, 9, 8, 9, 8, 9, 8, 12, 11, 26]), stickyRowsCount: 1 },
      { sheet: 'Notes', data: lignesNotes, columns: this.largeurs([12, 10, 16, 13, 18, 24, 24, 26, 8, 7]), stickyRowsCount: 1 },
      { sheet: 'Classes', data: lignesClasses, columns: this.largeurs([12, 12, 11, 22, 18, 11, 14, 8, 8]), stickyRowsCount: 1 },
      { sheet: 'Pré-inscriptions', data: lignesInsc, columns: this.largeurs([12, 22, 12, 14, 26, 20, 16, 11]), stickyRowsCount: 1 },
      { sheet: 'Messages', data: lignesMsg, columns: this.largeurs([12, 20, 16, 60, 6]), stickyRowsCount: 1 },
    ], `Sauvegarde-KPDK-${this.aujourdhui()}.xlsx`);

    try { localStorage.setItem(CLE_DERNIERE, new Date().toISOString()); } catch { /* navigateur privé */ }
  }

  // ---------- Export d'une classe (un relevé) ----------
  async exporterClasse(classeId: number, bulletin: BulletinCode): Promise<void> {
    const d = await chargerBulletins(this.ns, classeId, bulletin);
    const feuilles: Feuille[] = [{
      sheet: 'Moyennes', data: [this.entete(['Matricule', 'Élève', 'Moy. T1', 'Rang T1', 'Moy. T2', 'Rang T2', 'Moy. T3', 'Rang T3', 'Moy. annuelle', 'Rang annuel', 'Décision']),
        ...this.lignesMoyennes(d, false)],
      columns: this.largeurs([18, 26, 9, 8, 9, 8, 9, 8, 12, 11, 26]), stickyRowsCount: 1,
    }];
    const matieres = toutesMatieres(d.modele);
    for (const p of PERIODES) {
      for (const ev of d.modele.evaluations) {
        const titre = `${libellePeriode('fr', p)}${d.modele.evaluations.length > 1 ? (ev === 'controle' ? ' contrôle' : ' compo') : ''}`;
        const rows: Cellule[][] = [this.entete(['Matricule', 'Élève', ...matieres.map((m) => `${m.nom} /${maxMatiere(d.classe, bulletin, m)}`),
          ...(ev === d.modele.evaluationComptee ? ['Total', 'Moyenne', 'Rang'] : []), 'Observation'])];
        for (const l of d.lignes) {
          const r = l.periodes[p - 1];
          rows.push([this.t(l.eleve.matricule), this.t(`${l.eleve.prenom} ${l.eleve.nom}`),
            ...matieres.map((m) => this.n(d.idx.get(cle(l.eleve.id!, p, ev, m.code)))),
            ...(ev === d.modele.evaluationComptee ? [this.n(r?.total), { ...this.n(r?.moyenne), fontWeight: 'bold' as const }, this.n(r?.rang)] : []),
            this.t(l.observations[p - 1])]);
        }
        feuilles.push({ sheet: titre.slice(0, 31), data: rows, columns: this.largeurs([18, 24, ...matieres.map(() => 11), 8, 9, 6, 36]), stickyRowsCount: 1 });
      }
    }
    await this.ecrire(feuilles, `${d.classe.nom}-${LIBELLES_BULLETIN[bulletin]}-${this.aujourdhui()}.xlsx`.replace(/\s+/g, '_'));
  }

  // ---------- Outils ----------
  private releves(c: Classe): BulletinCode[] {
    return ['fr', ...(c.avec_arabe ? ['ar' as const] : []), ...(c.avec_anglais ? ['en' as const] : [])];
  }

  private lignesMoyennes(d: DonneesBulletin, avecClasse: boolean): Cellule[][] {
    return d.lignes.map((l) => [
      ...(avecClasse ? [this.t(d.classe.nom), this.t(LIBELLES_BULLETIN[d.bulletin])] : []),
      this.t(l.eleve.matricule), this.t(`${l.eleve.prenom} ${l.eleve.nom}`),
      ...l.periodes.flatMap((r) => [this.n(r?.moyenne), this.n(r?.rang)]),
      { ...this.n(l.annuel.moyenne), fontWeight: 'bold' as const }, this.n(l.annuel.rang), this.t(l.decision),
    ]);
  }

  private lignesNotes(d: DonneesBulletin): Cellule[][] {
    const rows: Cellule[][] = [];
    for (const l of d.lignes) for (const p of PERIODES) for (const ev of d.modele.evaluations) for (const dom of d.modele.domaines) for (const m of dom.matieres) {
      const v = d.idx.get(cle(l.eleve.id!, p, ev, m.code));
      if (v === undefined) continue;
      rows.push([this.t(d.classe.nom), this.t(LIBELLES_BULLETIN[d.bulletin]), this.t(libellePeriode('fr', p)), this.t(ev === 'controle' ? 'Contrôle' : 'Composition'),
        this.t(l.eleve.matricule), this.t(`${l.eleve.prenom} ${l.eleve.nom}`), this.t(dom.nom), this.t(m.nom), this.n(v), this.n(maxMatiere(d.classe, d.bulletin, m))]);
    }
    return rows;
  }

  private entete(titres: string[]): Cellule[] {
    return titres.map((t) => ({ value: t, type: String, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: '#13254A', align: 'center' }));
  }
  private t(v: string | null | undefined): Cellule { return { value: v ?? '', type: String }; }
  private n(v: number | null | undefined): Cellule { return v === null || v === undefined ? null : { value: Number(v), type: Number }; }
  private largeurs(l: number[]) { return l.map((width) => ({ width })); }
  private date(v: string | null | undefined) { return v ? new Date(v).toLocaleDateString('fr-FR') : ''; }
  private aujourdhui() { return new Date().toISOString().slice(0, 10); }

  private async ecrire(feuilles: Feuille[], nomFichier: string) {
    // Bibliothèque chargée seulement au moment de l'export
    const { default: writeXlsxFile } = await import('write-excel-file/browser');
    await (writeXlsxFile as unknown as (s: Feuille[]) => { toFile: (n: string) => Promise<void> })(feuilles).toFile(nomFichier);
  }
}
