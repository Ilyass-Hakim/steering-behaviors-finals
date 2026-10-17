// moth.js — un papillon de nuit. Étend Vehicle.
//
// États : vol (errance dans la grotte), pose (immobile sur la paroi), fuite (il a entendu
// le sonar d'une chasseuse), mange (capturé, il reviendra par l'entrée de la grotte).
// Il est presque invisible : il ne brille que quand l'écho d'un cri le frappe (this.echo).

class Moth extends Vehicle {
  constructor(x, y) {
    super(x, y, { maxSpeed: CONFIG.papillons.vitesseMax, maxForce: CONFIG.papillons.forceMax, r: 3.5 });
    this.id = ++Moth.compteur;
    this.etat = 'vol';
    this.echo = 0;                    // 0..1 : éclat laissé par le dernier écho reçu
    this.minuteur = 0;                // pas restants : pose ou réapparition
    this.phaseAiles = random(Math.PI * 2);
    this.forces = {};
  }

  static reinitialiserCompteur() { Moth.compteur = 0; }

  /** Un papillon posé sur le plafond, à l'abscisse x */
  static pose(grotte, x) {
    const m = new Moth(x, grotte.plafondY(x) + 4);
    m.etat = 'pose';
    m.minuteur = Math.floor(random(360, 900));
    return m;
  }

  penser(monde) {
    this.forces = {};
    if (this.etat === 'mange') {
      if (--this.minuteur <= 0) monde.refaireEntrer(this);
      return;
    }
    if (this.etat === 'pose') {
      if (--this.minuteur <= 0) this.etat = 'vol';
      return;
    }
    const poids = CONFIG.poids.papillon;
    const ajouter = (nom, force) => {
      if (monde.actifs[nom] === false || !poids[nom]) return;
      this.forces[nom] = force.mult(poids[nom]);
    };
    ajouter('wander', this.wander({ croisiere: 0.55, variation: 0.35 }));
    ajouter('avoid', this.eviter(monde.grotte, { portee: 70, marge: 4 }));
    ajouter('contention', this.contenir(monde.grotte, 50));
    for (const f of Object.values(this.forces)) this.applyForce(f);
  }

  update() {
    if (this.etat === 'mange' || this.etat === 'pose') { this.echo *= 0.96; return; }
    super.update();
    this.phaseAiles += 0.55 + this.vel.mag() * 0.12;
    this.echo *= 0.965;
  }

  /** Capturé par une chauve-souris */
  etreMange() {
    this.etat = 'mange';
    this.minuteur = Math.floor(random(240, 480));
    this.vel.set(0, 0);
  }

  get visible() { return this.etat !== 'mange'; }

  dessiner(ctx) {
    if (!this.visible) return;
    const lueur = Math.min(1, this.echo);
    const a = 0.12 + 0.88 * Math.pow(lueur, 0.6);
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    if (this.etat !== 'pose') ctx.rotate(this.cap);
    if (lueur > 0.25) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
      g.addColorStop(0, `rgba(255,214,140,${0.32 * lueur})`);
      g.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    const battement = this.etat === 'pose' ? 0.3 : Math.abs(Math.sin(this.phaseAiles));
    ctx.fillStyle = `rgba(255,214,150,${a})`;
    for (const cote of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(-0.5, cote * (1.8 + 2.4 * battement), 3.4, 1.8 + 1.8 * battement, cote * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(255,236,200,${Math.min(1, a + 0.15)})`;
    ctx.fillRect(-2, -0.7, 4, 1.4);
    ctx.restore();
  }
}
Moth.compteur = 0;

if (typeof module !== 'undefined' && module.exports) module.exports = { Moth };
