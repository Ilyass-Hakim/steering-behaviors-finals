// world.js — le monde simulé : la grotte, ses habitants et le temps qui passe.
// Il ne dessine rien lui-même sauf via dessiner(), et il ne dépend pas de p5 pour avancer :
// on peut donc le faire tourner sans écran dans les tests (voir tests/monde.test.mjs).

class Monde {
  constructor(graine = CONFIG.graine, nombre = CONFIG.chauveSouris.nombre) {
    this.graine = graine;
    this.grotte = new Cave(CONFIG.monde.largeur, CONFIG.monde.hauteur, graine);
    this.sonar = new Sonar(this.grotte, graine);
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
    for (const b of this.chauvesSouris) b.penser(this);
    for (const b of this.chauvesSouris) b.update();
    this.sonar.pas([]);
    this.temps += CONFIG.pasTemps;
    this.pasCourant++;
  }

  /** Dessine le monde (le contexte est déjà mis à l'échelle) */
  dessiner(ctx, options = {}) {
    if (options.lumiere) this.grotte.dessinerGeometrie(ctx, 0.35);
    this.sonar.dessiner(ctx, { jour: 0, ondes: options.ondes !== false });
    if (options.rayons) for (const b of this.chauvesSouris) b.dessinerRayons(ctx);
    for (const b of this.chauvesSouris) b.dessiner(ctx);
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Monde };
