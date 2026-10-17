// vehicle.js — la classe de base de toute entité mobile (Reynolds).
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
  }

  /** Accumule une force (masse = 1 : force = accélération) */
  applyForce(force) {
    this.acc.add(force);
  }

  /** Intègre un pas de temps : accélération → vitesse → position */
  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }

  /** Direction du mouvement en radians (0 si immobile : on garde le cap par défaut) */
  get cap() {
    return this.vel.magSq() > 1e-6 ? this.vel.heading() : 0;
  }

  /**
   * Règle de Reynolds : force = vitesse désirée − vitesse actuelle, bornée par maxForce.
   * `desire` est un vecteur déjà dimensionné en vitesse.
   */
  steerVers(desire) {
    const steering = desire.copy().sub(this.vel);
    steering.limit(this.maxForce);
    return steering;
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Vehicle };
