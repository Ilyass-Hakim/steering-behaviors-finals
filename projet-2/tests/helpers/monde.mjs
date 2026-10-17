// Charge les scripts du projet (de simples <script> classiques) dans un contexte Node.
// Il remplace uniquement ce que p5 fournit : createVector, p5.Vector, random, constrain...
// Les classes du projet, elles, sont le vrai code de src/.
import { readFileSync } from 'node:fs';

export class Vecteur {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  copy() { return new Vecteur(this.x, this.y); }
  set(x, y) { this.x = x; this.y = y; return this; }
  add(v) { this.x += v.x; this.y += v.y; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; return this; }
  mult(k) { this.x *= k; this.y *= k; return this; }
  div(k) { this.x /= k; this.y /= k; return this; }
  mag() { return Math.hypot(this.x, this.y); }
  magSq() { return this.x * this.x + this.y * this.y; }
  dot(v) { return this.x * v.x + this.y * v.y; }
  normalize() { const n = this.mag(); if (n > 0) this.mult(1 / n); return this; }
  setMag(m) { return this.normalize().mult(m); }
  limit(max) { const n = this.mag(); if (n > max) this.mult(max / n); return this; }
  heading() { return Math.atan2(this.y, this.x); }
  dist(v) { return Math.hypot(v.x - this.x, v.y - this.y); }
  static sub(a, b) { return new Vecteur(a.x - b.x, a.y - b.y); }
  static add(a, b) { return new Vecteur(a.x + b.x, a.y + b.y); }
  static mult(a, k) { return new Vecteur(a.x * k, a.y * k); }
  static dist(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
  static fromAngle(a) { return new Vecteur(Math.cos(a), Math.sin(a)); }
}

function aleatoire(graine) {
  let a = graine >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Charge `fichiers` (chemins relatifs à projet-1/) dans un même contexte et expose `noms`.
 * Renvoie le contexte : ctx.Vehicle, ctx.Bat, ...
 */
export function chargerMonde(fichiers, noms, graine = 7) {
  const alea = aleatoire(graine);
  // Les « globales » de p5 sont passées en paramètres d'une fonction : les accès sont rapides
  // (un contexte vm ralentit chaque accès à Math ou à une globale d'un facteur 20).
  const globales = {
    performance: { now: () => 0 },
    window: { devicePixelRatio: 1 },
    createVector: (x, y) => new Vecteur(x, y),
    p5: { Vector: Vecteur },
    constrain: (v, a, b) => Math.min(b, Math.max(a, v)),
    random: (a, b) => (b === undefined ? (a === undefined ? alea() : alea() * a) : a + alea() * (b - a)),
    randomGaussian: () => 0,
  };
  const code = fichiers
    .map((f) => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'))
    .join('\n;\n');
  const retour = `return { ${noms.join(', ')} };`;
  const fabrique = new Function(...Object.keys(globales), `${code}\n;${retour}`);
  return fabrique(...Object.values(globales));
}

/** Les fichiers de base, dans l'ordre des <script> de index.html */
export const BASE = ['src/rng.js', 'src/config.js', 'src/vehicle.js', 'src/path.js', 'src/city.js', 'src/genetic.js', 'src/drone.js'];
export const NOMS_BASE = ['creerRng', 'CONFIG', 'Vehicle', 'Ville', 'Genetique', 'Chemin', 'projectionScalaire', 'Drone'];
