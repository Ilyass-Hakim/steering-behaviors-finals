// arene.js — un terrain d'entraînement ou d'examen : des obstacles, un départ, une arrivée.
// L'arène sait lancer un rayon ; le pilote, lui, ne connaît jamais sa carte.

class Arene {
  constructor(graine, { obstacles = 9, murs = 1, ouverture = 240 } = {}) {
    this.graine = graine;
    const rng = creerRng(graine);
    this.w = CONFIG.monde.largeur;
    this.h = CONFIG.monde.hauteur;
    this.depart = { x: 90, y: 160 + rng() * (this.h - 320) };
    this.arrivee = { x: this.w - 90, y: 160 + rng() * (this.h - 320) };
    this.rayonArrivee = 30;
    this.obstacles = [];             // { type: 'cercle', x, y, r } | { type: 'rect', x, y, l, h }
    this.passages = [];              // centre de chaque brèche des murs (pour le dessin)
    for (let m = 0; m < murs; m++) {   // des murs percés d'une brèche : il faut la trouver à l'aveugle
      const x = this.w * (0.3 + (0.4 * m) / Math.max(1, murs - 1 || 1)) + (rng() - 0.5) * 90 - (murs === 1 ? 0 : 0);
      const gy = 190 + rng() * (this.h - 380);
      this.obstacles.push({ type: 'rect', x, y: 0, l: 34, h: gy - ouverture / 2, mur: true });
      this.obstacles.push({ type: 'rect', x, y: gy + ouverture / 2, l: 34, h: this.h - gy - ouverture / 2, mur: true });
      this.passages.push({ x: x + 17, y: gy });
    }
    const murs0 = this.obstacles.length;
    let essais = 0;
    while (this.obstacles.length < murs0 + obstacles && essais++ < 400) {
      const o = rng() < 0.55
        ? { type: 'cercle', x: 260 + rng() * (this.w - 520), y: 60 + rng() * (this.h - 120), r: 28 + rng() * 40 }
        : { type: 'rect', x: 240 + rng() * (this.w - 520), y: 50 + rng() * (this.h - 140), l: 40 + rng() * 80, h: 50 + rng() * 120 };
      if (this.libre(o, this.depart, 130) && this.libre(o, this.arrivee, 130) && this.obstacles.every((p) => (p.mur ? this.ecart(o, p) > 60 : this.ecart(o, p) > 70))) this.obstacles.push(o);
    }
  }

  centre(o) { return o.type === 'cercle' ? { x: o.x, y: o.y } : { x: o.x + o.l / 2, y: o.y + o.h / 2 }; }
  taille(o) { return o.type === 'cercle' ? o.r : Math.hypot(o.l, o.h) / 2; }

  libre(o, p, marge) {
    const c = this.centre(o);
    return Math.hypot(c.x - p.x, c.y - p.y) > this.taille(o) + marge;
  }

  ecart(a, b) {
    const ca = this.centre(a);
    const cb = this.centre(b);
    return Math.hypot(ca.x - cb.x, ca.y - cb.y) - this.taille(a) - this.taille(b);
  }

  /** Le point (x, y), élargi de `marge`, touche-t-il un obstacle ou sort-il du terrain ? */
  collision(x, y, marge = 0) {
    if (x < marge || y < marge || x > this.w - marge || y > this.h - marge) return true;
    for (const o of this.obstacles) {
      if (o.type === 'cercle') {
        if ((x - o.x) ** 2 + (y - o.y) ** 2 < (o.r + marge) ** 2) return true;
      } else if (x > o.x - marge && x < o.x + o.l + marge && y > o.y - marge && y < o.y + o.h + marge) return true;
    }
    return false;
  }

  /**
   * Champ de distance « par les passages » jusqu'à l'arrivée (parcours en largeur sur une grille).
   * C'est le PROFESSEUR qui l'utilise pour noter un vol : le pilote, lui, ne le voit jamais.
   */
  champ() {
    if (this._champ) return this._champ;
    const c = 16;
    const nx = Math.ceil(this.w / c);
    const ny = Math.ceil(this.h / c);
    const dist = new Float32Array(nx * ny).fill(Infinity);
    const bloque = (i, j) => this.collision(i * c + c / 2, j * c + c / 2, 11);
    const si = Math.min(nx - 1, Math.floor(this.arrivee.x / c));
    const sj = Math.min(ny - 1, Math.floor(this.arrivee.y / c));
    let file = [[si, sj]];
    dist[sj * nx + si] = 0;
    while (file.length) {
      const suite = [];
      for (const [i, j] of file) {
        const d = dist[j * nx + i];
        for (const [di, dj, w] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]]) {
          const a = i + di;
          const b = j + dj;
          if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
          const k = b * nx + a;
          if (d + w * c < dist[k] && !bloque(a, b)) { dist[k] = d + w * c; suite.push([a, b]); }
        }
      }
      file = suite;
    }
    this._champ = { c, nx, ny, dist };
    return this._champ;
  }

  /** Distance restante jusqu'à l'arrivée en passant par les brèches (Infinity si enfermé) */
  distanceNav(x, y) {
    const { c, nx, ny, dist } = this.champ();
    const i = Math.max(0, Math.min(nx - 1, Math.floor(x / c)));
    const j = Math.max(0, Math.min(ny - 1, Math.floor(y / c)));
    return dist[j * nx + i];
  }

  /** Distance jusqu'au premier obstacle (ou bord) le long du rayon, bornée par `portee` */
  rayon(ox, oy, dx, dy, portee) {
    let t = portee;
    // bords du terrain
    if (dx > 1e-9) t = Math.min(t, (this.w - ox) / dx); else if (dx < -1e-9) t = Math.min(t, -ox / dx);
    if (dy > 1e-9) t = Math.min(t, (this.h - oy) / dy); else if (dy < -1e-9) t = Math.min(t, -oy / dy);
    for (const o of this.obstacles) {
      if (o.type === 'cercle') {
        const fx = ox - o.x;
        const fy = oy - o.y;
        const b = fx * dx + fy * dy;
        const c = fx * fx + fy * fy - o.r * o.r;
        const disc = b * b - c;
        if (disc >= 0) {
          const s = -b - Math.sqrt(disc);
          if (s >= 0 && s < t) t = s;
          else if (c < 0) t = 0;
        }
      } else {
        // rectangle : méthode des dalles (slab)
        let t0 = 0;
        let t1 = t;
        let hit = true;
        for (const [p, d, mn, mx] of [[ox, dx, o.x, o.x + o.l], [oy, dy, o.y, o.y + o.h]]) {
          if (Math.abs(d) < 1e-9) { if (p < mn || p > mx) { hit = false; break; } } else {
            let a = (mn - p) / d;
            let b2 = (mx - p) / d;
            if (a > b2) [a, b2] = [b2, a];
            t0 = Math.max(t0, a);
            t1 = Math.min(t1, b2);
            if (t0 > t1) { hit = false; break; }
          }
        }
        if (hit && t0 < t) t = t0;
      }
    }
    return Math.max(0, t);
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Arene };
