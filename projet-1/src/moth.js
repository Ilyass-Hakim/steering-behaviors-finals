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
    this.horloge = 0;                 // pas écoulés : phase du zigzag
    this.menace = null;               // la chauve-souris qu'il fuit
    this.derniereAlerte = -9999;      // dernier pas où il a entendu une menace
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
    this.horloge++;
    this.ecouter(monde);
    if (this.etat === 'pose') {
      if (--this.minuteur <= 0) this.etat = 'vol';
      return;
    }
    const fuit = this.etat === 'fuite';
    // en fuite, le papillon est plus vif : il vire plus serré qu'une chauve-souris en chasse
    this.maxSpeed = fuit ? CONFIG.papillons.vitesseFuite : CONFIG.papillons.vitesseMax;
    this.maxForce = fuit ? CONFIG.papillons.forceFuite : CONFIG.papillons.forceMax;
    const poids = fuit ? CONFIG.poids.papillonFuite : CONFIG.poids.papillon;
    const ajouter = (nom, force) => {
      if (monde.actifs[nom] === false || !poids[nom]) return;
      this.forces[nom] = force.mult(poids[nom]);
    };
    if (fuit && this.menace) {
      // EVADE + zigzag : une composante perpendiculaire qui s'inverse sans cesse
      const e = this.evade(this.menace);
      const dir = e.copy().normalize();
      const zig = createVector(-dir.y, dir.x).mult(Math.sin(this.horloge * 0.3 + this.id) * this.maxForce * 1.3);
      ajouter('evade', e.add(zig));
    }
    ajouter('wander', this.wander({ croisiere: 0.55, variation: 0.35 }));
    ajouter('avoid', this.eviter(monde.grotte, { portee: 70, marge: 4 }));
    ajouter('contention', this.contenir(monde.grotte, 50));
    for (const f of Object.values(this.forces)) this.applyForce(f);
  }

  /**
   * Les papillons entendent les ultrasons : une chasseuse proche en pleine poursuite, ou une
   * chauve-souris qui vient de crier tout près, déclenche la fuite. La fuite dure encore un
   * instant après la dernière menace entendue.
   */
  ecouter(monde) {
    const menace = monde.menaceDe(this);
    if (menace) {
      this.menace = menace;
      this.derniereAlerte = this.horloge;
      if (this.etat !== 'fuite') {
        this.etat = 'fuite';
        monde.noter('Un papillon entend le sonar et part en zigzag', 'fuite');
      }
    } else if (this.etat === 'fuite' && this.horloge - this.derniereAlerte > 70) {
      this.etat = 'vol';
      this.menace = null;
      this.prediction = null;
    }
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

  /** Trait vers le point que le papillon fuit (visible seulement quand l'écho l'éclaire) */
  dessinerFuite(ctx) {
    if (this.etat !== 'fuite' || !this.prediction || this.echo < 0.2) return;
    ctx.save();
    ctx.strokeStyle = `rgba(45,212,191,${Math.min(0.7, this.echo * 0.7)})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(this.prediction.x, this.prediction.y);
    ctx.stroke();
    ctx.restore();
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
