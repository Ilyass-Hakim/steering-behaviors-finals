// chef.js — le chef de colonie : un point mobile que la colonie suit au crépuscule.
// C'est un Vehicle comme les autres : il SUIT son chemin en cherchant (seek) chaque point de
// passage, il ne « glisse » pas sur une courbe. La colonie, elle, le cherche (seek) avec des
// décalages individuels : cela donne une rivière de chauves-souris plutôt qu'une file.

class Chef extends Vehicle {
  constructor(chemin) {
    super(chemin[0].x, chemin[0].y, { maxSpeed: 2.4, maxForce: 0.12, r: 4 });
    this.chemin = chemin;          // liste de points { x, y }
    this.indice = 1;               // prochain point de passage
    this.fini = false;
    this.pasSurPoint = 0;          // pas passés sur le point courant : garde-fou anti-blocage
    this.vel.set(0.4, 1.2);
  }

  /** Cherche le point de passage courant ; passe au suivant quand il est atteint */
  penser(monde) {
    if (this.fini) {
      // chemin terminé : il flâne en attendant la fin du crépuscule
      this.applyForce(this.wander());
      this.applyForce(this.eviter(monde.grotte).mult(1.3));
      this.applyForce(this.contenir(monde.grotte).mult(0.8));
      return;
    }
    const cible = this.chemin[this.indice];
    const d = Math.hypot(cible.x - this.pos.x, cible.y - this.pos.y);
    this.pasSurPoint++;
    if (d < 70 || this.pasSurPoint > 600) {
      if (this.indice >= this.chemin.length - 1) { this.fini = true; return; }
      this.indice++;
      this.pasSurPoint = 0;
    }
    this.applyForce(this.seek(this.chemin[this.indice]));
    this.applyForce(this.eviter(monde.grotte).mult(1.3));
  }

  dessiner(ctx, visible) {
    if (!visible) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(125,211,252,0.35)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    this.chemin.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(125,211,252,0.9)';
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Chef };
