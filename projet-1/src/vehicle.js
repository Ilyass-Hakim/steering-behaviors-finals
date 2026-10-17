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
    this.angleErrance = random(-Math.PI, Math.PI);   // état de wander : persiste d'un pas à l'autre
    this.debugErrance = null;                         // cercle d'errance, pour le dessin
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

  // ====================================================================
  // STEERING BEHAVIORS — chacun renvoie une force, aucun ne déplace l'entité
  // ====================================================================

  /**
   * WANDER (errance de Reynolds).
   * Un cercle est placé devant l'entité ; la cible se trouve sur ce cercle, à un angle
   * qui varie un peu à chaque pas. L'angle est CONSERVÉ d'un pas à l'autre : la direction
   * est continue, l'entité décrit des courbes douces et non des zigzags.
   * @param {object} o  distance du cercle, rayon, variation max de l'angle par pas,
   *                    vitesse de croisière (fraction de maxSpeed)
   */
  wander({ distance = 70, rayon = 30, variation = 0.28, croisiere = 0.6 } = {}) {
    this.angleErrance += random(-variation, variation);
    const cap = this.cap;
    const centre = createVector(Math.cos(cap) * distance, Math.sin(cap) * distance);
    const decalage = createVector(
      Math.cos(cap + this.angleErrance) * rayon,
      Math.sin(cap + this.angleErrance) * rayon,
    );
    const desire = centre.copy().add(decalage).setMag(this.maxSpeed * croisiere);
    this.debugErrance = {
      cx: this.pos.x + centre.x, cy: this.pos.y + centre.y, r: rayon,
      tx: this.pos.x + centre.x + decalage.x, ty: this.pos.y + centre.y + decalage.y,
    };
    return this.steerVers(desire);
  }

  /**
   * CONTENTION (« boundaries » de Shiffman) : filet de sécurité qui repousse l'entité
   * vers l'intérieur quand elle approche du plafond, du sol ou des parois de la grotte.
   */
  contenir(grotte, marge = 70) {
    const p = this.pos;
    let dx = 0;
    let dy = 0;
    if (p.y < grotte.plafondY(p.x) + marge) dy = this.maxSpeed;
    else if (p.y > grotte.solY(p.x) - marge) dy = -this.maxSpeed;
    if (p.x < marge) dx = this.maxSpeed;
    else if (p.x > grotte.w - marge) dx = -this.maxSpeed;
    if (dx === 0 && dy === 0) return createVector(0, 0);
    const desire = createVector(dx !== 0 ? dx : this.vel.x, dy !== 0 ? dy : this.vel.y);
    if (desire.magSq() < 1e-9) desire.set(dx, dy);
    return this.steerVers(desire.setMag(this.maxSpeed));
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Vehicle };
