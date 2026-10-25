import { Routes } from '@angular/router';
import { AccueilComponent } from './pages/accueil.component';
import { PresentationComponent } from './pages/presentation.component';
import { EtablissementsComponent } from './pages/etablissements.component';
import { NiveauxComponent } from './pages/niveaux.component';
import { VieScolaireComponent } from './pages/vie-scolaire.component';
import { GalerieComponent } from './pages/galerie.component';
import { InscriptionsComponent } from './pages/inscriptions.component';
import { ActualitesComponent } from './pages/actualites.component';
import { ContactComponent } from './pages/contact.component';
import { ConnexionComponent } from './admin/connexion.component';
import { AdminLayoutComponent } from './admin/admin-layout.component';
import { TableauDeBordComponent } from './admin/tableau-de-bord.component';
import { ActualitesAdminComponent } from './admin/actualites-admin.component';
import { PhotosAdminComponent } from './admin/photos-admin.component';
import { InscriptionsAdminComponent } from './admin/inscriptions-admin.component';
import { MessagesAdminComponent } from './admin/messages-admin.component';
import { adminGuard } from './admin/admin.guard';

const suffixe = ' — Keur Papa Djibril Kor';

// Le "title" de chaque route devient le titre de l'onglet (utile aussi pour Google)
export const routes: Routes = [
  { path: '', component: AccueilComponent, title: 'École franco-arabe Keur Papa Djibril Kor — Dakar' },
  { path: 'presentation', component: PresentationComponent, title: 'Présentation' + suffixe },
  { path: 'etablissements', component: EtablissementsComponent, title: 'Nos établissements' + suffixe },
  { path: 'niveaux', component: NiveauxComponent, title: 'Niveaux et cycles' + suffixe },
  { path: 'vie-scolaire', component: VieScolaireComponent, title: 'Vie scolaire' + suffixe },
  { path: 'galerie', component: GalerieComponent, title: 'Galerie' + suffixe },
  { path: 'inscriptions', component: InscriptionsComponent, title: 'Inscriptions' + suffixe },
  { path: 'actualites', component: ActualitesComponent, title: 'Actualités' + suffixe },
  { path: 'contact', component: ContactComponent, title: 'Contact' + suffixe },
  { path: 'parents', loadComponent: () => import('./parents/espace-parents.component').then((m) => m.EspaceParentsComponent), title: 'Espace parents' + suffixe },
  {
    // Fiches « code parent » à découper (une par élève)
    path: 'admin/codes-parents/:id',
    canActivate: [adminGuard],
    loadComponent: () => import('./parents/codes-parents.component').then((m) => m.CodesParentsComponent),
    title: 'Codes parents',
  },

  // ----- Espace administrateur -----
  { path: 'admin/connexion', component: ConnexionComponent, title: 'Connexion — Administration' },
  {
    // Page d'impression des bulletins (sans le menu de l'administration)
    path: 'admin/impression/:id',
    canActivate: [adminGuard],
    loadComponent: () => import('./notes/impression.component').then((m) => m.ImpressionComponent),
    title: 'Impression des bulletins',
  },
  {
    // Reçu de paiement imprimable
    path: 'admin/recu/:numero',
    canActivate: [adminGuard],
    loadComponent: () => import('./paiements/recu.component').then((m) => m.RecuComponent),
    title: 'Reçu de paiement',
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    children: [
      { path: '', component: TableauDeBordComponent, title: 'Tableau de bord — Administration' },
      { path: 'actualites', component: ActualitesAdminComponent, title: 'Actualités — Administration' },
      { path: 'photos', component: PhotosAdminComponent, title: 'Photos — Administration' },
      { path: 'inscriptions', component: InscriptionsAdminComponent, title: 'Pré-inscriptions — Administration' },
      { path: 'messages', component: MessagesAdminComponent, title: 'Messages — Administration' },
      // ----- Plateforme de notes (chargée seulement quand on l'ouvre) -----
      { path: 'classes', loadComponent: () => import('./notes/classes.component').then((m) => m.ClassesComponent), title: 'Classes et notes — Administration' },
      { path: 'classes/:id', loadComponent: () => import('./notes/classe-detail.component').then((m) => m.ClasseDetailComponent), title: 'Élèves — Administration' },
      { path: 'saisie/:id', loadComponent: () => import('./notes/saisie.component').then((m) => m.SaisieComponent), title: 'Saisie des notes — Administration' },
      { path: 'eleve/:classe/:eleve', loadComponent: () => import('./notes/bulletin-eleve.component').then((m) => m.BulletinEleveComponent), title: 'Bulletin de l’élève — Administration' },
      { path: 'appel/:id', loadComponent: () => import('./absences/appel.component').then((m) => m.AppelComponent), title: 'Absences et retards — Administration' },
      // ----- Paiements de la scolarité -----
      { path: 'paiements', loadComponent: () => import('./paiements/paiements.component').then((m) => m.PaiementsComponent), title: 'Paiements — Administration' },
      { path: 'paiements/eleve/:id', loadComponent: () => import('./paiements/paiement-eleve.component').then((m) => m.PaiementEleveComponent), title: 'Paiements de l’élève — Administration' },
      { path: 'tarifs', loadComponent: () => import('./paiements/tarifs.component').then((m) => m.TarifsComponent), title: 'Tarifs — Administration' },
      { path: 'bulletins/:id', loadComponent: () => import('./notes/bulletins.component').then((m) => m.BulletinsComponent), title: 'Bulletins — Administration' },
    ],
  },
  { path: '**', redirectTo: '' },
];
