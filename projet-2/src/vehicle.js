// vehicle.js — la classe de base de tout drone (Reynolds).
//
// Règles du projet :
//  * toute entité qui bouge étend Vehicle (une sous-classe par fichier) ;
//  * un comportement ne déplace jamais l'entité : il RENVOIE une force
//    (steering = vitesse désirée − vitesse actuelle) ;
//  * seules les forces appliquées par applyForce() changent la vitesse ;
//  * la position n'est modifiée que dans update(), à partir de la vitesse.

class Vehicle {
  constructor(x, y, options = {}) {
    this.pos = createVector(x, y);
    this.vel = options.vel ? options.vel.copy() : createVector(0, 0);
    this.acc = createVector(0, 0);
    this.maxSpeed = options.maxSpeed ?? 3;
    this.maxForce = options.maxForce ?? 0.1;
    this.r = options.r ?? 6;
    this.angleErrance = random(-Math.PI, Math.PI);
    this.forces = {};                                   // dernière force de chaque comportement (dessin, inspecteur)
  }

  applyForce(force) { this.acc.add(force); }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  get cap() { return this.vel.magSq() > 1e-6 ? this.vel.heading() : 0; }

  /** Règle de Reynolds : force = vitesse désirée − vitesse actuelle, bornée par maxForce */
  steerVers(desire) {
    const s = desire.copy().sub(this.vel);
    s.limit(this.maxForce);
    return s;
  }

  /** SEEK : aller vers un point à pleine vitesse */
  seek(cible) {
    const desire = createVector(cible.x - this.pos.x, cible.y - this.pos.y);
    if (desire.magSq() < 1e-9) return createVector(0, 0);
    return this.steerVers(desire.setMag(this.maxSpeed));
  }

  /** ARRIVE : comme seek, mais on ralentit dans le rayon `rayon` pour s'arrêter sur la cible */
  arrive(cible, rayon = 90) {
    const desire = createVector(cible.x - this.pos.x, cible.y - this.pos.y);
    const d = desire.mag();
    if (d < 1e-9) return this.steerVers(createVector(0, 0));
    const v = d < rayon ? this.maxSpeed * (d / rayon) : this.maxSpeed;
    return this.steerVers(desire.setMag(v));
  }

  /** WANDER : errance à direction continue (l'angle sur le cercle est conservé d'un pas à l'autre) */
  wander({ distance = 60, rayon = 26, variation = 0.3, croisiere = 0.6 } = {}) {
    this.angleErrance += random(-variation, variation);
    const cap = this.cap;
    const cx = Math.cos(cap) * distance + Math.cos(cap + this.angleErrance) * rayon;
    const cy = Math.sin(cap) * distance + Math.sin(cap + this.angleErrance) * rayon;
    return this.steerVers(createVector(cx, cy).setMag(this.maxSpeed * croisiere));
  }

  /** SEPARATION : s'écarter des voisins trop proches (liste d'objets avec pos) */
  separation(voisins, distance = 40) {
    const somme = createVector(0, 0);
    let n = 0;
    for (const o of voisins) {
      if (o === this) continue;
      const dx = this.pos.x - o.pos.x;
      const dy = this.pos.y - o.pos.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < distance) {
        somme.add(createVector(dx / d / d, dy / d / d));
        n++;
      }
    }
    if (!n) return createVector(0, 0);
    return this.steerVers(somme.setMag(this.maxSpeed));
  }

  /**
   * PATH FOLLOWING (suivi de chemin, Reynolds / Shiffman).
   * 1. on prédit la position future (vitesse × anticipation) ;
   * 2. pour chaque segment, on y projette cette position (PROJECTION SCALAIRE → point normal) ;
   * 3. on garde le point normal le plus proche du chemin ;
   * 4. si on est à plus de `rayon` du chemin, on vise un point un peu plus loin sur le segment (seek) ;
   *    sinon on ne corrige pas : le drone peut s'écarter un peu de l'axe.
   * @param {Chemin} chemin  voir path.js
   * @returns {createVector} la force (nulle si le chemin est vide)
   */
  suivreChemin(chemin, { anticipation = 35, avance = 30 } = {}) {
    const info = chemin.viser(this.pos, this.vel, anticipation, avance);
    this.debugChemin = info;
    if (!info) return createVector(0, 0);
    if (info.distance <= chemin.rayon) return createVector(0, 0);
    return this.seek(info.cible);
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Vehicle };
