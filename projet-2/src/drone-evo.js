// drone-evo.js — drone autonome à batterie de la mission 4.
//
// Comportements combinés, pondérés par son ADN :
//   SEEK  vers le colis le plus proche      ARRIVE  vers un chargeur (quand la batterie baisse)
//   FLEE  loin des orages                   SEPARATION  entre drones         WANDER  sinon
// La batterie se vide en volant (plus vite = plus cher) : à 0, le drone tombe.

class DroneEvo extends Vehicle {
  constructor(x, y, adn, options = {}) {
    const p = CONFIG.evo;
    super(x, y, { maxSpeed: p.vitesseMax, maxForce: p.forceMax, r: 6 });
    this.adn = adn;
    this.batterie = options.batterie ?? p.batterieMax * 0.8;
    this.age = 0;
    this.livraisons = 0;
    this.generation = options.generation ?? 1;
    this.mort = false;
    this.cause = null;                 // 'batterie' | 'orage'
    this.recharge = false;             // en train de se recharger (dessin)
    this.maxSpeed = p.vitesseMax * adn.get('vitesse');
    this.vel.set(random(-1, 1), random(-1, 1));
  }

  get niveau() { return this.batterie / CONFIG.evo.batterieMax; }

  /** Calcule les forces à partir de ce que le drone perçoit dans `colonie` */
  penser(colonie) {
    if (this.mort) return;
    const a = this.adn;
    const vue = a.get('vue');
    this.forces = {};

    const colis = colonie.plusProche(colonie.colis, this.pos, vue);
    if (colis) this.forces.seek = this.seek(colis).mult(a.get('colis'));

    const besoin = Math.max(0, Math.min(1, (a.get('seuil') - this.niveau) / a.get('seuil')));
    if (besoin > 0) {
      const c = colonie.plusProche(colonie.chargeurs, this.pos, vue * 1.6);
      if (c) this.forces.arrive = this.arrive(c, 120).mult(a.get('chargeur') * (0.3 + 1.7 * besoin));
    }

    const orage = colonie.plusProche(colonie.orages, this.pos, vue * 0.7 + 60, (o) => o.r);
    if (orage) {
      const fuite = createVector(this.pos.x - orage.x, this.pos.y - orage.y).setMag(this.maxSpeed);
      this.forces.flee = this.steerVers(fuite).mult(a.get('orage'));
    }

    const voisins = colonie.voisinsDe(this, 38);
    if (voisins.length) this.forces.separation = this.separation(voisins, 38).mult(a.get('separation'));

    this.forces.wander = this.wander({ croisiere: 0.7 }).mult(a.get('wander') + 0.15);   // un minimum d'errance : pas de drone figé

    for (const f of Object.values(this.forces)) this.applyForce(f);
  }

  update() {
    if (this.mort) return;
    super.update();
    this.age++;
    const p = CONFIG.evo;
    this.batterie -= p.coutParPas + p.coutVitesse * this.vel.magSq() * 0.25;
    if (this.batterie <= 0) { this.batterie = 0; this.mort = true; this.cause = 'batterie'; }
  }

  /** Bords du terrain : le drone rebondit doucement (il reste dans la zone de livraison) */
  contenir(l, h, marge = 20) {
    if (this.pos.x < marge) { this.pos.x = marge; this.vel.x = Math.abs(this.vel.x); }
    if (this.pos.x > l - marge) { this.pos.x = l - marge; this.vel.x = -Math.abs(this.vel.x); }
    if (this.pos.y < marge) { this.pos.y = marge; this.vel.y = Math.abs(this.vel.y); }
    if (this.pos.y > h - marge) { this.pos.y = h - marge; this.vel.y = -Math.abs(this.vel.y); }
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { DroneEvo };
