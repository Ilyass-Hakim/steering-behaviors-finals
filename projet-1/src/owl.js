// owl.js — le hibou, prédateur de la nuit. Étend Vehicle.
//
// Il entre par l'entrée de la grotte, poursuit la chauve-souris la plus proche (pursue) mais
// il est lourd : peu agile, plus lent qu'une chauve-souris qui fuit. Au bout d'un moment il
// repart par l'entrée (seek). Seuls ses yeux dorés sont toujours visibles dans le noir.

class Owl extends Vehicle {
  constructor(x, y) {
    super(x, y, { maxSpeed: CONFIG.hibou.vitesseMax, maxForce: CONFIG.hibou.forceMax, r: 20 });
    this.etat = 'chasse';             // chasse | depart
    this.age = 0;                     // pas écoulés dans la grotte
    this.echo = 0;
    this.parti = false;
    this.phaseAiles = 0;
    this.forces = {};
    this.vel.set(-1.6, 0);
  }

  penser(monde) {
    this.forces = {};
    this.age++;
    if (this.etat === 'chasse' && this.age > CONFIG.hibou.duree * 60) {
      this.etat = 'depart';
      monde.noter('Le hibou quitte la grotte', 'hibou');
    }
    const ajouter = (nom, force, poids) => {
      if (monde.actifs[nom] === false) return;
      this.forces[nom] = force.mult(poids);
    };
    if (this.etat === 'depart') {
      const sortie = { x: monde.grotte.w + 60, y: monde.grotte.entree.y };
      ajouter('seek', this.seek(sortie), 1.2);
      if (this.pos.x > monde.grotte.w - 50) this.parti = true;
    } else {
      const proie = monde.chauveSourisLaPlusProche(this.pos);
      if (proie) ajouter('pursue', this.pursue(proie), 1.0);
      else ajouter('wander', this.wander({ croisiere: 0.7 }), 1.0);
    }
    ajouter('avoid', this.eviter(monde.grotte, { portee: 210, marge: 26 }), 2.2);
    ajouter('contention', this.contenir(monde.grotte, 90), 0.9);
    for (const f of Object.values(this.forces)) this.applyForce(f);
  }

  update() {
    super.update();
    this.phaseAiles += 0.09 + this.vel.mag() * 0.02;
    this.echo *= 0.97;
  }

  /** Cercle de danger : la distance à laquelle les chauves-souris prennent peur */
  dessinerZone(ctx, temps) {
    const r = CONFIG.hibou.rayonPanique * (0.96 + 0.04 * Math.sin(temps * 4));
    ctx.save();
    ctx.strokeStyle = 'rgba(248,113,113,0.20)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 9]);
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  dessiner(ctx) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.cap);
    const lueur = Math.min(1, this.echo);
    const battement = Math.sin(this.phaseAiles);
    const env = 30 + 10 * battement;
    // silhouette : visible seulement quand l'écho la frappe
    if (lueur > 0.04) {
      ctx.fillStyle = `rgba(30,22,18,${0.8 * lueur})`;
      ctx.strokeStyle = `rgba(255,200,120,${0.75 * lueur})`;
      ctx.lineWidth = 1.3;
      for (const cote of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(6, cote * 6);
        ctx.bezierCurveTo(2, cote * env * 0.7, -12, cote * env * 1.05, -22, cote * env * 0.8);
        ctx.quadraticCurveTo(-14, cote * env * 0.45, -20, cote * 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // les yeux : toujours là, dans le noir
    const pulse = 0.75 + 0.25 * Math.sin(this.age * 0.08);
    for (const cote of [-1, 1]) {
      const g = ctx.createRadialGradient(15, cote * 4.5, 0, 15, cote * 4.5, 11);
      g.addColorStop(0, `rgba(255,214,90,${0.55 * pulse})`);
      g.addColorStop(1, 'rgba(255,214,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(15, cote * 4.5, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,226,120,${0.95 * pulse})`;
      ctx.beginPath();
      ctx.arc(15, cote * 4.5, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Owl };
