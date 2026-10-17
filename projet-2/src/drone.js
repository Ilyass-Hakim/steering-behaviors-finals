// drone.js — le drone livreur de la mission 2 : il suit le chemin calculé par l'algorithme
// génétique. Comportements : PATH FOLLOWING (projection scalaire) sur chaque tronçon, ARRIVE
// pour se poser au point de livraison, SEPARATION entre drones qui se croisent.
//
// États : attente → vol → livraison → vol → … → retour au hub → termine

class Drone extends Vehicle {
  /**
   * @param {Ville} ville
   * @param {number[]} etapes  ids de noeuds à visiter dans l'ordre, du hub au hub
   */
  constructor(ville, etapes, options = {}) {
    const p = ville.pos(etapes[0]);
    super(p.x, p.y, {
      maxSpeed: options.vitesseMax ?? CONFIG.drone.vitesseMax,
      maxForce: options.forceMax ?? CONFIG.drone.forceMax,
      r: CONFIG.drone.rayon,
    });
    this.ville = ville;
    this.etapes = etapes;
    this.indice = 0;                     // tronçon en cours : etapes[indice] → etapes[indice + 1]
    this.etat = options.delaiDepart ? 'attente' : 'vol';
    this.delai = options.delaiDepart || 0;
    this.pause = 0;
    this.livres = 0;
    this.distanceParcourue = 0;
    this.ecartMax = 0;
    this.sommeEcart = 0;
    this.pasVol = 0;
    this.chemin = null;
    this.trace = [];
    this.couleur = options.couleur || CONFIG.couleurs.drone;
    this.preparerTroncon();
  }

  /** Construit le chemin (suite d'intersections) du tronçon courant */
  preparerTroncon() {
    if (this.indice + 1 >= this.etapes.length) { this.chemin = null; return; }
    const ids = this.ville.plusCourtChemin(this.etapes[this.indice], this.etapes[this.indice + 1]);
    this.chemin = new Chemin(ids.map((i) => this.ville.pos(i)), CONFIG.drone.rayonChemin);
  }

  get termine() { return this.etat === 'termine'; }
  get cible() { return this.chemin ? this.chemin.fin : null; }

  /** Calcule les forces du pas (aucun déplacement ici) */
  penser(autres = []) {
    this.forces = {};
    if (this.etat === 'attente') {
      if (--this.delai <= 0) this.etat = 'vol';
      return;
    }
    if (this.etat === 'livraison') {
      this.forces.arrive = this.arrive(this.cible, 30);
      this.applyForce(this.forces.arrive);
      if (--this.pause <= 0) {
        this.indice++;
        this.preparerTroncon();
        this.etat = this.chemin ? 'vol' : 'termine';
      }
      return;
    }
    if (this.etat !== 'vol' || !this.chemin) return;

    const restant = Math.hypot(this.cible.x - this.pos.x, this.cible.y - this.pos.y);
    const rayonArrivee = 80;
    if (restant < rayonArrivee) {
      // les derniers mètres : on freine pour se poser pile sur le point
      this.forces.arrive = this.arrive(this.cible, rayonArrivee);
      this.applyForce(this.forces.arrive);
      if (restant < 5 && this.vel.mag() < 0.8) this.arriver();
    } else {
      this.forces.pathFollowing = this.suivreChemin(this.chemin, { anticipation: CONFIG.drone.anticipation, avance: 46 });
      this.applyForce(this.forces.pathFollowing);
    }
    if (autres.length) {
      this.forces.separation = this.separation(autres, 34).mult(1.4);
      this.applyForce(this.forces.separation);
    }
  }

  arriver() {
    const dernier = this.indice + 2 >= this.etapes.length;
    if (dernier) { this.etat = 'termine'; this.vel.mult(0); return; }
    this.etat = 'livraison';
    this.livres++;
    this.pause = 70;
  }

  update() {
    const avant = { x: this.pos.x, y: this.pos.y };
    super.update();
    if (this.etat === 'vol') {
      this.distanceParcourue += Math.hypot(this.pos.x - avant.x, this.pos.y - avant.y);
      this.pasVol++;
      if (this.chemin) {
        const e = this.chemin.ecart(this.pos);
        this.ecartMax = Math.max(this.ecartMax, e);
        this.sommeEcart += e;
      }
    }
    if (this.etat !== 'attente' && this.etat !== 'termine' && (this.pasVol % 3 === 0)) {
      this.trace.push({ x: this.pos.x, y: this.pos.y });
      if (this.trace.length > 140) this.trace.shift();
    }
  }

  get ecartMoyen() { return this.pasVol ? this.sommeEcart / this.pasVol : 0; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Drone };
