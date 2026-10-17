// bat.js — une chauve-souris. Étend Vehicle (règle du projet : une classe par fichier).
//
// États possibles :
//   repos     suspendue au plafond, immobile
//   sortie    la colonie quitte le gîte au crépuscule
//   errance   elle explore la grotte noire
//   chasse    elle poursuit un papillon révélé par son écho
//   fuite     elle s'éparpille devant le hibou
//   retour    elle rejoint sa place de repos à l'aube

const COULEURS_ETAT = {
  repos: '#8b7fb3',
  sortie: '#7dd3fc',
  errance: '#b79cff',
  chasse: '#ff5fa8',
  fuite: '#ff7a45',
  retour: '#facc15',
};

let compteurChauvesSouris = 0;

class Bat extends Vehicle {
  constructor(x, y) {
    super(x, y, {
      maxSpeed: CONFIG.chauveSouris.vitesseMax,
      maxForce: CONFIG.chauveSouris.forceMax,
      r: CONFIG.chauveSouris.rayon,
    });
    this.id = ++compteurChauvesSouris;
    this.etat = 'repos';
    this.energie = CONFIG.chauveSouris.energieDepart;
    this.phaseAiles = random(Math.PI * 2);
    this.eclat = 0;           // éclat lumineux après un cri de sonar (0..1)
    this.forces = {};         // dernière force de chaque comportement (inspecteur, vecteurs)
  }

  /** Remet le compteur d'identifiants à zéro (nouvelle simulation) */
  static reinitialiserCompteur() {
    compteurChauvesSouris = 0;
  }

  get couleur() {
    return COULEURS_ETAT[this.etat] || COULEURS_ETAT.errance;
  }

  /**
   * Calcule les forces de chaque comportement actif selon l'état, les pondère et les applique.
   * `monde` donne accès à la grotte (et plus tard aux papillons, au hibou, à la colonie).
   */
  penser(monde) {
    this.forces = {};
    if (this.etat === 'repos') return;
    const poids = CONFIG.poids;
    if (this.etat === 'errance') {
      this.forces.wander = this.wander().mult(poids.wander);
    }
    this.forces.contention = this.contenir(monde.grotte).mult(poids.contention);
    for (const f of Object.values(this.forces)) this.applyForce(f);
  }

  /** Un pas physique, puis le battement d'ailes (plus vite quand elle va vite) */
  update() {
    super.update();
    this.phaseAiles += 0.22 + this.vel.mag() * 0.05;
    this.eclat *= 0.93;
  }

  /** Dessin d'une chauve-souris : silhouette sombre, contour de la couleur de son état */
  dessiner(ctx) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    const eclat = Math.min(1, this.eclat);
    const r = this.r;
    ctx.lineWidth = 1.1;
    ctx.fillStyle = '#120d1d';
    ctx.strokeStyle = this.couleur;
    ctx.globalAlpha = 0.55 + 0.45 * eclat;

    if (this.etat === 'repos') {
      // suspendue, tête en bas, ailes repliées autour du corps
      ctx.beginPath();
      ctx.ellipse(0, r * 0.25, r * 0.5, r * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, r * 1.05);
      ctx.lineTo(-r * 0.45, r * 1.5);
      ctx.lineTo(-r * 0.05, r * 1.15);
      ctx.moveTo(r * 0.3, r * 1.05);
      ctx.lineTo(r * 0.45, r * 1.5);
      ctx.lineTo(r * 0.05, r * 1.15);
      ctx.stroke();
      ctx.restore();
      return;
    }

    ctx.rotate(this.cap);
    const battement = Math.sin(this.phaseAiles);
    const envergure = r * (1.05 + 1.15 * Math.abs(battement));
    const decalage = battement * r * 0.35;
    for (const cote of [-1, 1]) {
      // aile : épaule → pointe → bord festonné → arrière du corps
      ctx.beginPath();
      ctx.moveTo(r * 0.45, cote * r * 0.25);
      ctx.bezierCurveTo(r * 0.2, cote * envergure * 0.6, -r * 0.4 + decalage, cote * envergure * 1.0, -r * 0.9 + decalage, cote * envergure);
      ctx.quadraticCurveTo(-r * 0.7, cote * envergure * 0.55, -r * 0.95, cote * envergure * 0.52);
      ctx.quadraticCurveTo(-r * 0.75, cote * envergure * 0.28, -r * 1.0, cote * envergure * 0.22);
      ctx.lineTo(-r * 0.9, cote * r * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // corps
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // oreilles
    ctx.beginPath();
    ctx.moveTo(r * 0.75, -r * 0.18);
    ctx.lineTo(r * 1.05, -r * 0.62);
    ctx.lineTo(r * 1.0, -r * 0.05);
    ctx.moveTo(r * 0.75, r * 0.18);
    ctx.lineTo(r * 1.05, r * 0.62);
    ctx.lineTo(r * 1.0, r * 0.05);
    ctx.stroke();
    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Bat, COULEURS_ETAT };
