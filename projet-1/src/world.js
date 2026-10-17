// world.js — le monde simulé : la grotte, ses habitants et le temps qui passe.
// Il ne dessine rien lui-même sauf via dessiner(), et il ne dépend pas de p5 pour avancer :
// on peut donc le faire tourner sans écran dans les tests (voir tests/monde.test.mjs).

class Monde {
  constructor(graine = CONFIG.graine, nombre = CONFIG.chauveSouris.nombre) {
    this.graine = graine;
    this.grotte = new Cave(CONFIG.monde.largeur, CONFIG.monde.hauteur, graine);
    this.sonar = new Sonar(this.grotte, graine);
    this.cycle = new NightCycle();
    this.chef = null;         // chef de colonie, présent seulement au crépuscule
    this.actifs = {};         // comportements désactivés : { wander: false, ... }
    this.chauvesSouris = [];
    this.temps = 0;           // secondes simulées
    this.pasCourant = 0;
    Bat.reinitialiserCompteur();
    this.grotte.libererPlaces();
    const milieuRepos = (this.grotte.zoneRepos.x0 + this.grotte.zoneRepos.x1) / 2;
    for (let i = 0; i < nombre; i++) {
      const b = new Bat(0, 0);
      const place = this.grotte.reserverPlace(milieuRepos, 0);
      if (place) {
        b.pos.set(place.x, place.y);
        b.place = place;
      }
      this.chauvesSouris.push(b);
    }
    this.surPhase('crepuscule');
  }

  /** Les chauves-souris en vol (hors repos) à moins de `distance` de `bat`, sans `bat` */
  voisinsDe(bat, distance) {
    const liste = [];
    const d2max = distance * distance;
    for (const o of this.chauvesSouris) {
      if (o === bat || o.etat === 'repos') continue;
      const dx = o.pos.x - bat.pos.x;
      const dy = o.pos.y - bat.pos.y;
      if (dx * dx + dy * dy < d2max) liste.push(o);
    }
    return liste;
  }

  /** Chemin de la nuée au crépuscule : du gîte vers l'entrée, puis retour au centre */
  cheminColonie() {
    const g = this.grotte;
    const pt = (fx, dy = 0) => ({ x: g.w * fx, y: g.milieuY(g.w * fx) + dy });
    return [
      { x: (g.zoneRepos.x0 + g.zoneRepos.x1) / 2, y: g.plafondY(425) + 130 },
      pt(0.26), pt(0.42), pt(0.62), pt(0.8), pt(0.9), pt(0.7, -20), pt(0.5),
    ];
  }

  /** Réagit à un changement de phase du cycle */
  surPhase(phase) {
    if (phase === 'crepuscule') {
      this.chef = new Chef(this.cheminColonie());
      for (const b of this.chauvesSouris) if (b.etat === 'repos') b.delaiDepart = Math.floor(random(1, 280));
    } else if (phase === 'nuit') {
      this.chef = null;
      for (const b of this.chauvesSouris) {
        if (b.etat === 'repos') b.decoller(this, 'errance');
        else if (b.etat === 'sortie') b.etat = 'errance';
      }
    }
  }

  /** Décolle toutes les chauves-souris dans l'état donné, en cap aléatoire */
  liberer(etat = 'errance') {
    for (const b of this.chauvesSouris) {
      b.etat = etat;
      const a = random(-Math.PI, Math.PI);
      b.vel.set(Math.cos(a) * 1.5, Math.sin(a) * 1.5);
      if (b.place) { b.place.prise = false; b.place = null; }
    }
  }

  /** Avance la simulation d'un pas de 1/60 s */
  pas() {
    if (this.chef) { this.chef.penser(this); this.chef.update(); }
    for (const b of this.chauvesSouris) b.penser(this);
    for (const b of this.chauvesSouris) b.update();
    this.sonar.pas([]);
    const nouvelle = this.cycle.avancer(CONFIG.pasTemps);
    if (nouvelle) this.surPhase(nouvelle);
    this.temps += CONFIG.pasTemps;
    this.pasCourant++;
  }

  /** Dessine le monde (le contexte est déjà mis à l'échelle) */
  dessiner(ctx, options = {}) {
    if (options.lumiere) this.grotte.dessinerGeometrie(ctx, 0.35);
    this.sonar.dessiner(ctx, { jour: 0, ondes: options.ondes !== false });
    if (this.chef) this.chef.dessiner(ctx, options.chemin);
    if (options.rayons) for (const b of this.chauvesSouris) b.dessinerRayons(ctx);
    for (const b of this.chauvesSouris) b.dessiner(ctx);
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Monde };
