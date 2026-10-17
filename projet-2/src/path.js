// path.js — un chemin = une polyligne. Sert au PATH FOLLOWING (suivi de chemin).
//
// Projection scalaire : pour un segment AB et un point P,
//    t = (AP · AB) / |AB|²      (la « longueur » de AP mesurée le long de AB)
//    N = A + t·AB               (point normal : le pied de la perpendiculaire)
// avec t borné à [0, 1] pour rester sur le segment.

/** Pied de la perpendiculaire de p sur le segment [a, b] (projection scalaire) */
function projectionScalaire(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-12) return { x: a.x, y: a.y, t: 0 };
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + abx * t, y: a.y + aby * t, t };
}

class Chemin {
  /** @param {Array<{x,y}>} points  sommets de la polyligne ; @param {number} rayon  demi-largeur du couloir */
  constructor(points, rayon = 16) {
    this.points = points.map((p) => ({ x: p.x, y: p.y }));
    this.rayon = rayon;
    this.cumul = [0];                 // longueur cumulée jusqu'à chaque sommet
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1];
      const b = this.points[i];
      this.cumul.push(this.cumul[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
    }
  }

  get longueur() { return this.cumul[this.cumul.length - 1] || 0; }
  get fin() { return this.points[this.points.length - 1]; }

  /** Point situé à l'abscisse curviligne s (0 = début) */
  pointA(s) {
    const pts = this.points;
    if (!pts.length) return null;
    if (s <= 0) return { ...pts[0] };
    if (s >= this.longueur) return { ...this.fin };
    let i = 1;
    while (this.cumul[i] < s) i++;
    const seg = this.cumul[i] - this.cumul[i - 1];
    const f = seg > 0 ? (s - this.cumul[i - 1]) / seg : 0;
    return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f };
  }

  /**
   * Cherche le point normal le plus proche de la position FUTURE du véhicule.
   * @returns {{futur, normal, cible, distance, s, segment}|null}
   *   futur : position prédite ; normal : pied de la perpendiculaire ;
   *   cible : point à `avance` px plus loin sur le chemin ; distance : écart futur↔chemin
   */
  viser(pos, vel, anticipation = 35, avance = 30) {
    const pts = this.points;
    if (pts.length < 2) return null;
    const norme = Math.hypot(vel.x, vel.y) || 1;
    const futur = { x: pos.x + (vel.x / norme) * anticipation, y: pos.y + (vel.y / norme) * anticipation };
    let meilleur = null;
    for (let i = 0; i + 1 < pts.length; i++) {
      const n = projectionScalaire(futur, pts[i], pts[i + 1]);
      const d = Math.hypot(futur.x - n.x, futur.y - n.y);
      if (!meilleur || d < meilleur.distance) {
        const seg = this.cumul[i + 1] - this.cumul[i];
        meilleur = { normal: n, distance: d, segment: i, s: this.cumul[i] + n.t * seg };
      }
    }
    meilleur.futur = futur;
    meilleur.cible = this.pointA(Math.min(this.longueur, meilleur.s + avance));
    return meilleur;
  }

  /** Distance minimale entre un point et le chemin (pour mesurer l'écart réel) */
  ecart(p) {
    let d = Infinity;
    for (let i = 0; i + 1 < this.points.length; i++) {
      const n = projectionScalaire(p, this.points[i], this.points[i + 1]);
      d = Math.min(d, Math.hypot(p.x - n.x, p.y - n.y));
    }
    return d;
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Chemin, projectionScalaire };
