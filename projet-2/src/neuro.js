// neuro.js — un petit réseau de neurones et son évolution (neuroévolution).
//
// Le réseau n'est PAS entraîné par rétropropagation : ses poids sont le génome d'une
// population qui évolue (sélection par fitness, croisement, mutation gaussienne).
// Architecture : entrées → couche cachée (tanh) → sorties (tanh).

/** Nombre gaussien (Box-Muller) à partir d'un rng uniforme */
function gaussien(rng) {
  const u = Math.max(1e-12, rng());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

class Reseau {
  /** @param {number[]} tailles  ex. [11, 8, 2] ; @param {number[]} [poids]  génome à plat (sinon aléatoire) */
  constructor(tailles, poids = null, rng = Math.random) {
    this.tailles = tailles;
    this.nbPoids = 0;
    for (let i = 0; i + 1 < tailles.length; i++) this.nbPoids += (tailles[i] + 1) * tailles[i + 1];   // +1 : biais
    this.poids = poids ? poids.slice() : Array.from({ length: this.nbPoids }, () => gaussien(rng) * 0.6);
    this.activations = [];           // dernière activation de chaque couche (dessin)
    this.score = null;               // fitness lissée sur les générations (null : jamais évalué)
  }

  /** Propage `entrees` dans le réseau et renvoie les sorties (chacune dans [-1, 1]) */
  activer(entrees) {
    let courant = entrees;
    this.activations = [entrees];
    let k = 0;
    for (let c = 0; c + 1 < this.tailles.length; c++) {
      const n = this.tailles[c];
      const m = this.tailles[c + 1];
      const suite = new Array(m);
      for (let j = 0; j < m; j++) {
        let s = this.poids[k + n * m + j];          // biais du neurone j
        for (let i = 0; i < n; i++) s += courant[i] * this.poids[k + i * m + j];
        suite[j] = Math.tanh(s);
      }
      k += (n + 1) * m;
      courant = suite;
      this.activations.push(suite);
    }
    return courant;
  }

  copie() {
    const r = new Reseau(this.tailles, this.poids);
    r.score = this.score;
    return r;
  }
}

class Neuroevolution {
  /**
   * @param {number[]} tailles  architecture du réseau
   * @param {object} o          population, mutation (proba par poids), amplitude (écart-type), elitisme, rng
   */
  constructor(tailles, { population = 70, mutation = 0.12, amplitude = 0.35, elitisme = 3, croisement = 0.25, rng = Math.random } = {}) {
    this.croisement = croisement;
    this.tailles = tailles;
    this.taille = population;
    this.mutation = mutation;
    this.amplitude = amplitude;
    this.elitisme = elitisme;
    this.rng = rng;
    this.generation = 1;
    this.reseaux = Array.from({ length: population }, () => new Reseau(tailles, null, rng));
    this.fitness = new Array(population).fill(0);
    this.meilleur = this.reseaux[0];
    this.meilleurFitness = 0;
    this.historique = [];            // { meilleur, moyenne } par génération
  }

  /** À appeler quand tous les individus ont été évalués (fitness[i] renseigné) */
  clore() {
    let b = 0;
    this.fitness.forEach((f, i) => { if (f > this.fitness[b]) b = i; });
    this.meilleur = this.reseaux[b].copie();
    this.meilleurFitness = this.fitness[b];
    const moyenne = this.fitness.reduce((a, f) => a + f, 0) / this.taille;
    this.historique.push({ meilleur: this.meilleurFitness, moyenne });
  }

  choisir() {
    let best = -1;
    for (let k = 0; k < 4; k++) {
      const i = Math.floor(this.rng() * this.taille);
      if (best < 0 || this.fitness[i] > this.fitness[best]) best = i;
    }
    return this.reseaux[best];
  }

  /**
   * Un enfant : copie du parent a, avec (une fois sur `croisement`) des gènes pris chez b,
   * puis mutation gaussienne. Croiser deux réseaux détruit souvent les deux : on mute surtout.
   */
  enfant(a, b) {
    const croise = this.rng() < this.croisement;
    const poids = a.poids.map((w, i) => {
      let v = croise && this.rng() < 0.5 ? b.poids[i] : w;
      if (this.rng() < this.mutation) v += gaussien(this.rng) * this.amplitude;
      return v;
    });
    return new Reseau(this.tailles, poids);
  }

  /** Passe à la génération suivante : élites conservés tels quels, le reste = enfants */
  suivante() {
    this.clore();
    const ordre = this.reseaux.map((_, i) => i).sort((x, y) => this.fitness[y] - this.fitness[x]);
    const nouveaux = ordre.slice(0, this.elitisme).map((i) => this.reseaux[i].copie());
    while (nouveaux.length < this.taille) nouveaux.push(this.enfant(this.choisir(), this.choisir()));
    this.reseaux = nouveaux;
    this.fitness = new Array(this.taille).fill(0);
    this.generation++;
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Reseau, Neuroevolution, gaussien };
