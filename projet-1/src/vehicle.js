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
    this.prediction = null;                           // point visé par pursue/evade (dessin)
    this.rayons = [];                                 // derniers rayons de sonar (dessin, inspecteur)
    this.biaisVirage = random() < 0.5 ? -1 : 1;       // côté préféré quand deux issues se valent
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
   * SEEK : fonce vers un point. Vitesse désirée = direction de la cible × vitesse voulue.
   */
  seek(cible, vitesse = this.maxSpeed) {
    const desire = createVector(cible.x - this.pos.x, cible.y - this.pos.y);
    if (desire.magSq() < 1e-9) return createVector(0, 0);
    return this.steerVers(desire.setMag(vitesse));
  }

  /**
   * FLEE : fuit un point. C'est l'inverse de seek : vitesse désirée = s'éloigner du point.
   * @param {{x, y}} point  ce qu'on fuit
   */
  flee(point, vitesse = this.maxSpeed) {
    const desire = createVector(this.pos.x - point.x, this.pos.y - point.y);
    if (desire.magSq() < 1e-9) desire.set(random(-1, 1), random(-1, 1));
    return this.steerVers(desire.setMag(vitesse));
  }

  /**
   * EVADE : fuit un poursuivant en s'éloignant de l'endroit où il SERA (c'est pursue à l'envers).
   * @param {{pos, vel}} menace
   */
  evade(menace, { tMax = 35 } = {}) {
    const dx = menace.pos.x - this.pos.x;
    const dy = menace.pos.y - this.pos.y;
    const t = Math.min(tMax, Math.hypot(dx, dy) / Math.max(this.maxSpeed + Math.hypot(menace.vel.x, menace.vel.y) * 0.5, 0.1));
    const futur = { x: menace.pos.x + menace.vel.x * t, y: menace.pos.y + menace.vel.y * t };
    this.prediction = futur;
    return this.flee(futur);
  }

  /**
   * PURSUE : poursuit une cible mobile en visant l'endroit où elle SERA.
   * Le temps de rattrapage est estimé par distance / vitesse ; la cible est extrapolée de
   * ce temps (plafonné par `tMax` pour ne pas viser trop loin). Contre une cible immobile,
   * c'est exactement un seek.
   * @param {{pos, vel}} cible
   * @returns {p5.Vector} la force ; le point visé est mémorisé dans this.prediction
   */
  pursue(cible, { tMax = 45 } = {}) {
    const dx = cible.pos.x - this.pos.x;
    const dy = cible.pos.y - this.pos.y;
    const t = Math.min(tMax, Math.hypot(dx, dy) / Math.max(this.maxSpeed, 0.1));
    const futur = { x: cible.pos.x + cible.vel.x * t, y: cible.pos.y + cible.vel.y * t };
    this.prediction = futur;
    return this.seek(futur);
  }

  /**
   * BOIDS de Reynolds, calculés en une seule boucle sur les voisins :
   *  - séparation : s'écarter de ceux qui sont trop près (plus fort quand ils sont tout près) ;
   *  - alignement : prendre la vitesse moyenne des voisins ;
   *  - cohésion   : se rapprocher du centre des voisins.
   * @param {Array<{pos, vel}>} voisins  les autres entités du groupe (sans soi-même)
   * @returns {{separation, alignment, cohesion}} trois forces (vecteurs, éventuellement nuls)
   */
  boids(voisins, { rSeparation = 34, rAlignement = 80, rCohesion = 110 } = {}) {
    const sep = createVector(0, 0);
    const vit = createVector(0, 0);
    const centre = createVector(0, 0);
    let nSep = 0;
    let nAli = 0;
    let nCoh = 0;
    for (const o of voisins) {
      const dx = this.pos.x - o.pos.x;
      const dy = this.pos.y - o.pos.y;
      const d = Math.hypot(dx, dy);
      if (d <= 0) continue;
      if (d < rSeparation) {
        sep.x += dx / (d * d);          // d'autant plus fort que le voisin est près
        sep.y += dy / (d * d);
        nSep++;
      }
      if (d < rAlignement) { vit.add(o.vel); nAli++; }
      if (d < rCohesion) { centre.x += o.pos.x; centre.y += o.pos.y; nCoh++; }
    }
    const zero = () => createVector(0, 0);
    let separation = zero();
    let alignment = zero();
    let cohesion = zero();
    if (nSep && sep.magSq() > 0) separation = this.steerVers(sep.setMag(this.maxSpeed));
    if (nAli && vit.magSq() > 0) alignment = this.steerVers(vit.setMag(this.maxSpeed));
    if (nCoh) {
      centre.div(nCoh);
      cohesion = this.seek(centre);
    }
    return { separation, alignment, cohesion };
  }

  /**
   * OBSTACLE AVOIDANCE par rayons de sonar.
   * Sept rayons partent dans un éventail devant l'entité. Chacun mesure la distance libre
   * jusqu'à la roche. On vire vers le rayon le plus dégagé, d'autant plus fort qu'un
   * obstacle est proche du cap, et on ralentit quand l'espace se referme.
   * La force peut dépasser maxForce jusqu'à 3 × en cas d'urgence (freinage d'évitement).
   * @returns {p5.Vector} la force d'évitement (nulle si la voie est libre)
   */
  eviter(grotte, {
    portee = 130, marge = 10,
    angles = [-75, -50, -25, 0, 25, 50, 75],
    poidsAngle = [0.45, 0.65, 0.85, 1, 0.85, 0.65, 0.45],
  } = {}) {
    const cap = this.cap;
    const candidats = grotte.cerclesProches(this.pos.x, this.pos.y, portee + marge + 10);
    const rayons = [];
    let urgence = 0;
    let meilleur = -1;
    let libreMeilleur = -1;
    for (let i = 0; i < angles.length; i++) {
      const ang = cap + (angles[i] * Math.PI) / 180;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang);
      const d = Math.min(portee, grotte.rayon(this.pos.x, this.pos.y, dx, dy, portee, marge, candidats));
      const libre = d / portee;
      rayons.push({ ang, d, libre, touche: d < portee, hx: this.pos.x + dx * d, hy: this.pos.y + dy * d });
      urgence = Math.max(urgence, poidsAngle[i] * (1 - libre));
      // le rayon le plus dégagé gagne ; à égalité, le côté préféré de l'entité
      const score = libre + 0.04 * Math.sign(angles[i]) * this.biaisVirage;
      if (score > libreMeilleur) { libreMeilleur = score; meilleur = i; }
    }
    this.rayons = rayons;
    if (urgence < 0.02) return createVector(0, 0);
    const choisi = rayons[meilleur];
    const vitesse = this.maxSpeed * (0.4 + 0.6 * (1 - urgence));
    const desire = createVector(Math.cos(choisi.ang), Math.sin(choisi.ang)).setMag(vitesse);
    return this.steerVers(desire).mult(1 + 2 * urgence);
  }

  /**
   * CONTENTION (« boundaries » de Shiffman) : filet de sécurité qui repousse l'entité
   * vers l'intérieur quand elle approche du plafond, du sol ou des parois de la grotte.
   */
  contenir(grotte, marge = 70) {
    const p = this.pos;
    // secours : si l'entité est déjà dans la roche ou hors de la grotte, forte force vers le couloir central
    if (grotte.estSolide(p.x, p.y)) {
      const cx = Math.min(grotte.w - 40, Math.max(40, p.x));
      const rappel = createVector(cx - p.x, grotte.milieuY(cx) - p.y);
      if (rappel.magSq() < 1e-9) rappel.set(0, 1);
      return this.steerVers(rappel.setMag(this.maxSpeed)).mult(4);
    }
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
