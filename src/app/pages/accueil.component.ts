import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CYCLES, ECOLE, ETABLISSEMENTS } from '../data/ecole';
import { Actualite, SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-accueil',
  imports: [RouterLink, DatePipe],
  template: `
    <!-- Bannière principale -->
    <section class="hero">
      <div class="conteneur hero-int">
        <div class="hero-texte">
          <span class="pastille-or">Inscriptions {{ ecole.anneeScolaire }} ouvertes</span>
          <p class="arabe hero-arabe">{{ ecole.nomArabe }}</p>
          <h1>École privée franco-arabe<br><span>Keur Papa Djibril Kor</span></h1>
          <p class="slogan">{{ ecole.slogan }} — un double enseignement en français et en arabe, de la crèche au CM2.</p>
          <div class="actions">
            <a routerLink="/inscriptions" class="btn btn-or">Inscrire mon enfant</a>
            <a routerLink="/contact" class="btn btn-contour">Nous contacter</a>
          </div>
        </div>
        <div class="hero-visuel" aria-hidden="true">
          <div class="arche">
            <span class="arabe grand">اقرأ</span>
            <span class="sous">« Lis » — le premier mot révélé</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Chiffres clés -->
    <section class="conteneur chiffres">
      <div class="chiffre"><strong>2</strong><span>établissements à Dakar</span></div>
      <div class="chiffre"><strong>3</strong><span>cycles : crèche, préscolaire, élémentaire</span></div>
      <div class="chiffre"><strong>2</strong><span>langues : français et arabe</span></div>
      <div class="chiffre"><strong>CI → CM2</strong><span>préparation au CFEE</span></div>
    </section>

    <!-- Double programme -->
    <section class="section">
      <div class="conteneur">
        <div class="titre-section">
          <span class="arabe">تعليم مزدوج</span>
          <h2>Un double programme, une seule école</h2>
          <p>Chaque élève suit le programme officiel en français et un enseignement arabo-islamique complet.</p>
        </div>
        <div class="grille grille-2">
          <div class="carte programme">
            <div class="icone fr">Fr</div>
            <h3>Enseignement en français</h3>
            <p>Lecture, écriture, mathématiques, éveil scientifique, histoire-géographie et éducation civique selon le programme officiel du Sénégal.</p>
          </div>
          <div class="carte programme">
            <div class="icone ar arabe">ع</div>
            <h3>Enseignement en arabe</h3>
            <p>Langue arabe, mémorisation du Coran avec tajwid, éducation islamique et bonnes manières (adab) au quotidien.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Cycles -->
    <section class="section sable">
      <div class="conteneur">
        <div class="titre-section">
          <span class="arabe">مراحلنا</span>
          <h2>Nos cycles</h2>
        </div>
        <div class="grille grille-3">
          @for (c of cycles; track c.nom) {
            <a routerLink="/niveaux" class="carte cycle">
              <span class="arabe">{{ c.arabe }}</span>
              <h3>{{ c.nom }}</h3>
              <span class="pastille">{{ c.ages }}</span>
              <p>{{ c.classes }}</p>
            </a>
          }
        </div>
      </div>
    </section>

    <!-- Établissements -->
    <section class="section">
      <div class="conteneur">
        <div class="titre-section">
          <span class="arabe">مدارسنا</span>
          <h2>Deux établissements près de chez vous</h2>
        </div>
        <div class="grille grille-2">
          @for (e of etablissements; track e.nom) {
            <div class="carte etab">
              <span class="pastille">{{ e.quartier }}</span>
              <h3>{{ e.nom }}</h3>
              <p>{{ e.adresse }}</p>
              <a routerLink="/etablissements">Voir sur la carte →</a>
            </div>
          }
        </div>
      </div>
    </section>

    <!-- Actualités -->
    <section class="section sable">
      <div class="conteneur">
        <div class="titre-section">
          <span class="arabe">الأخبار</span>
          <h2>Dernières actualités</h2>
        </div>
        <div class="grille grille-3">
          @for (a of actualites(); track a.titre) {
            <article class="carte">
              <span class="pastille">{{ a.categorie }}</span>
              <h3 class="titre-actu">{{ a.titre }}</h3>
              <time>{{ a.date_publication | date: 'd MMMM y' }}</time>
              <p>{{ a.resume }}</p>
            </article>
          }
        </div>
        <p class="centre"><a routerLink="/actualites" class="btn btn-contour-bleu">Toutes les actualités</a></p>
      </div>
    </section>

    <!-- Appel à l'action -->
    <section class="cta motif">
      <div class="conteneur cta-int">
        <h2>Prêt à rejoindre la famille Keur Papa Djibril Kor ?</h2>
        <p>Pré-inscrivez votre enfant en ligne en 2 minutes, nous vous rappelons.</p>
        <a routerLink="/inscriptions" class="btn btn-vert">Pré-inscription en ligne</a>
      </div>
    </section>
  `,
  styles: `
    .hero {
      background: radial-gradient(circle at 80% 20%, rgba(201,151,58,.25), transparent 45%),
                  linear-gradient(135deg, var(--bleu-nuit) 0%, #0d1a36 100%);
      color: #fff; padding: 72px 0 96px;
    }
    .hero-int { display: grid; grid-template-columns: 1.3fr 1fr; gap: 40px; align-items: center; }
    .pastille-or { display: inline-block; background: rgba(201,151,58,.18); color: var(--or); border: 1px solid var(--or);
      padding: 5px 14px; border-radius: 999px; font-size: .85rem; font-weight: 600; }
    .hero-arabe { font-size: 2rem; margin: 20px 0 0; text-align: left; }
    .hero h1 { color: #fff; margin-top: 4px; }
    .hero h1 span { color: var(--or); }
    .slogan { color: #d6dcea; font-size: 1.1rem; max-width: 540px; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 28px; }
    .hero-visuel { display: flex; justify-content: center; }
    .arche {
      width: 280px; height: 340px; border: 3px solid var(--or); border-radius: 140px 140px 16px 16px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
      background: rgba(255,255,255,.04);
      box-shadow: inset 0 0 0 10px rgba(201,151,58,.12);
    }
    .grand { font-size: 5.5rem; line-height: 1; }
    .sous { color: #d6dcea; font-size: .85rem; text-align: center; padding: 0 24px; }

    .chiffres {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
      margin-top: -48px; position: relative;
    }
    .chiffre { background: #fff; border-radius: var(--rayon); padding: 22px; box-shadow: var(--ombre); border-top: 4px solid var(--vert); }
    .chiffre strong { display: block; font-size: 1.7rem; color: var(--bleu-nuit); }
    .chiffre span { color: var(--texte-doux); font-size: .9rem; }

    .programme .icone {
      width: 56px; height: 56px; border-radius: 14px; display: grid; place-items: center;
      font-weight: 700; font-size: 1.3rem; margin-bottom: 16px;
    }
    .icone.fr { background: var(--bleu-nuit); color: #fff; }
    .icone.ar { background: var(--vert); color: #fff; font-size: 1.8rem; }

    .cycle { text-decoration: none; color: inherit; transition: transform .15s; }
    .cycle:hover { transform: translateY(-4px); }
    .cycle .arabe { display: block; font-size: 1.4rem; text-align: left; }
    .cycle p { color: var(--texte-doux); margin-bottom: 0; }
    .etab a { font-weight: 600; text-decoration: none; }
    .titre-actu { margin-top: 12px; }
    time { color: var(--texte-doux); font-size: .85rem; }
    .centre { text-align: center; margin-top: 32px; }

    .cta { background-color: var(--sable); padding: 72px 0; text-align: center; }
    .cta-int p { color: var(--texte-doux); margin-bottom: 24px; }

    @media (max-width: 860px) {
      .hero-int { grid-template-columns: 1fr; }
      .hero-visuel { display: none; }
      .chiffres { grid-template-columns: repeat(2, 1fr); }
    }
  `,
})
export class AccueilComponent implements OnInit {
  private sb = inject(SupabaseService);
  ecole = ECOLE;
  cycles = CYCLES;
  etablissements = ETABLISSEMENTS;
  actualites = signal<Actualite[]>([]);

  async ngOnInit() {
    // Les 3 actualités les plus récentes
    this.actualites.set((await this.sb.listerActualites()).slice(0, 3));
  }
}
