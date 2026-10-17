// rng.js — hasard reproductible, indépendant de p5.
// Une même graine donne toujours la même grotte : on peut comparer deux exécutions
// et écrire des tests déterministes.

/** Générateur pseudo-aléatoire mulberry32 : renvoie une fonction () => [0, 1[ */
function creerRng(graine) {
  let a = (graine >>> 0) || 1;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bruit de valeur 1D lisse (interpolation en smoothstep), valeurs dans [0, 1] */
class Bruit1D {
  constructor(graine, taille = 256) {
    const rng = creerRng(graine);
    this.taille = taille;
    this.valeurs = Array.from({ length: taille }, () => rng());
  }

  /** Bruit à l'abscisse t */
  at(t) {
    const i = Math.floor(t);
    const f = t - i;
    const a = this.valeurs[((i % this.taille) + this.taille) % this.taille];
    const b = this.valeurs[(((i + 1) % this.taille) + this.taille) % this.taille];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  }

  /** Somme de deux octaves, ramenée dans [0, 1] */
  fbm(t) {
    return (this.at(t) * 0.68 + this.at(t * 2.3 + 17.7) * 0.32);
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { creerRng, Bruit1D };
