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
  { path: '**', redirectTo: '' },
];
