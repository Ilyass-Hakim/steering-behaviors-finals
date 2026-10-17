// pilote.js — un drone piloté par un réseau de neurones.
//
// Il ne connaît pas la carte. Il perçoit seulement :
//   * 7 télémètres (distance libre devant lui, de 0 à 1) ;
//   * l'angle vers l'arrivée (sinus et cosinus) et la distance qui reste ;
//   * sa propre vitesse.
// Le réseau répond par une VITESSE DÉSIRÉE (un cap et une allure) ; la force appliquée est
// celle de Reynolds : steering = désiré − vitesse. Le cerveau choisit, la physique décide.

class Pilote extends Vehicle {
  constructor(arene, reseau) {
    super(arene.depart.x, arene.depart.y, {
      maxSpeed: CONFIG.drone.vitesseMax,
      maxForce: CONFIG.drone.forceMax,
      r: CONFIG.drone.rayon,
      vel: createVector(1, 0),
    });
    this.arene = arene;
    this.cerveau = reseau;
    this.etat = 'vol';                       // vol | arrive | crash | temps
    this.pas = 0;
    this.distInitiale = Math.hypot(arene.arrivee.x - arene.depart.x, arene.arrivee.y - arene.depart.y);
    this.navInitiale = Math.min(arene.distanceNav(arene.depart.x, arene.depart.y), 1e5);
    this.meilleureDistance = this.navInitiale;     // distance par les brèches : vue du professeur seulement
    this.capteurs = new Array(CONFIG.neuro.capteurs).fill(1);
    this.desire = createVector(0, 0);
    this.trace = [];
  }

  get vivant() { return this.etat === 'vol'; }

  /** Lance les télémètres et renvoie le vecteur d'entrées du réseau */
  percevoir() {
    const { capteurs, ouverture, portee } = CONFIG.neuro;
    const cap = this.cap;
    for (let i = 0; i < capteurs; i++) {
      const a = cap + (i / (capteurs - 1) - 0.5) * ouverture;
      this.capteurs[i] = this.arene.rayon(this.pos.x, this.pos.y, Math.cos(a), Math.sin(a), portee) / portee;
    }
    const dx = this.arene.arrivee.x - this.pos.x;
    const dy = this.arene.arrivee.y - this.pos.y;
    const rel = Math.atan2(dy, dx) - cap;
    return [
      ...this.capteurs,
      Math.sin(rel), Math.cos(rel),
      Math.min(1, Math.hypot(dx, dy) / this.distInitiale),
      this.vel.mag() / this.maxSpeed,
    ];
  }

  penser() {
    if (!this.vivant) return;
    const [allure, virage] = this.cerveau.activer(this.percevoir());
    const vitesse = ((allure + 1) / 2) * this.maxSpeed;
    const angle = this.cap + virage * (Math.PI / 2);
    this.desire = createVector(Math.cos(angle) * vitesse, Math.sin(angle) * vitesse);
    this.forces = { reseau: this.steerVers(this.desire) };
    this.applyForce(this.forces.reseau);
  }

  update() {
    if (!this.vivant) return;
    super.update();
    this.pas++;
    const d = Math.hypot(this.arene.arrivee.x - this.pos.x, this.arene.arrivee.y - this.pos.y);
    this.meilleureDistance = Math.min(this.meilleureDistance, this.arene.distanceNav(this.pos.x, this.pos.y));
    if (this.pas % 4 === 0) this.trace.push({ x: this.pos.x, y: this.pos.y });
    if (d < this.arene.rayonArrivee) this.etat = 'arrive';
    else if (this.arene.collision(this.pos.x, this.pos.y, this.r * 0.8)) this.etat = 'crash';
    else if (this.pas >= CONFIG.neuro.pasParEssai) this.etat = 'temps';
  }

  /** Progression vers l'arrivée de 0 à 1 */
  get progression() { return Math.max(0, Math.min(1, 1 - this.meilleureDistance / this.navInitiale)); }

  /**
   * Fitness : on récompense la progression, très fort l'arrivée (et sa rapidité),
   * et on retire un peu pour un crash (pour préférer les vols qui finissent).
   */
  get fitness() {
    let f = this.progression * 100;
    if (this.etat === 'arrive') f += 100 + 80 * (1 - this.pas / CONFIG.neuro.pasParEssai);
    else if (this.etat === 'crash') f *= 0.8;
    return f;
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Pilote };
