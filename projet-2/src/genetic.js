// genetic.js — algorithme génétique pour l'ordre des livraisons (voyageur de commerce).
//
//  gène        : l'indice d'une livraison
//  chromosome  : une permutation de toutes les livraisons (l'ordre de la tournée)
//  fitness     : 1 / longueur de la tournée par la route (hub → livraisons → hub)
//  sélection   : tournoi ; croisement : OX (order crossover) ; mutation : échange ou inversion
//  élitisme    : les meilleurs passent tels quels à la génération suivante

class Genetique {
  /**
   * @param {number[][]} distances  matrice (n+1)×(n+1) ; l'indice 0 est le hub
   * @param {object} options        population, mutation, elitisme, tournoi, rng
   */
  constructor(distances, { population = 120, mutation = 0.12, elitisme = 4, tournoi = 4, rng = Math.random } = {}) {
    this.d = distances;
    this.n = distances.length - 1;
    this.taille = population;
    this.mutation = mutation;
    this.elitisme = elitisme;
    this.tournoi = tournoi;
    this.rng = rng;
    this.generation = 0;
    this.historique = [];           // meilleure longueur à chaque génération
    this.historiqueMoyenne = [];    // longueur moyenne de la population
    this.individus = [];
    for (let i = 0; i < population; i++) this.individus.push(this.melanger());
    this.evaluer();
  }

  melanger() {
    const g = Array.from({ length: this.n }, (_, i) => i + 1);
    for (let i = g.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [g[i], g[j]] = [g[j], g[i]];
    }
    return g;
  }

  /** Longueur de la tournée hub → g[0] → … → g[n-1] → hub */
  longueur(g) {
    let l = this.d[0][g[0]];
    for (let i = 0; i + 1 < g.length; i++) l += this.d[g[i]][g[i + 1]];
    return l + this.d[g[g.length - 1]][0];
  }

  fitness(g) { return 1 / this.longueur(g); }

  evaluer() {
    this.scores = this.individus.map((g) => this.fitness(g));
    let b = 0;
    this.scores.forEach((s, i) => { if (s > this.scores[b]) b = i; });
    this.meilleur = this.individus[b].slice();
    this.meilleureLongueur = 1 / this.scores[b];
    this.moyenne = this.individus.reduce((a, g) => a + this.longueur(g), 0) / this.taille;
    this.historique.push(this.meilleureLongueur);
    this.historiqueMoyenne.push(this.moyenne);
  }

  choisir() {
    let best = -1;
    for (let k = 0; k < this.tournoi; k++) {
      const i = Math.floor(this.rng() * this.taille);
      if (best < 0 || this.scores[i] > this.scores[best]) best = i;
    }
    return this.individus[best];
  }

  /** OX : un segment du parent A est conservé, le reste est rempli dans l'ordre du parent B */
  croiser(a, b) {
    const n = a.length;
    let i = Math.floor(this.rng() * n);
    let j = Math.floor(this.rng() * n);
    if (i > j) [i, j] = [j, i];
    const enfant = new Array(n).fill(0);
    const pris = new Set();
    for (let k = i; k <= j; k++) { enfant[k] = a[k]; pris.add(a[k]); }
    let p = (j + 1) % n;
    for (let k = 0; k < n; k++) {
      const gene = b[(j + 1 + k) % n];
      if (pris.has(gene)) continue;
      enfant[p] = gene;
      p = (p + 1) % n;
    }
    return enfant;
  }

  muter(g) {
    if (this.rng() >= this.mutation) return g;
    const n = g.length;
    let i = Math.floor(this.rng() * n);
    let j = Math.floor(this.rng() * n);
    if (this.rng() < 0.5) {
      [g[i], g[j]] = [g[j], g[i]];                    // échange
    } else {                                          // inversion d'un tronçon (supprime les croisements)
      if (i > j) [i, j] = [j, i];
      while (i < j) { [g[i], g[j]] = [g[j], g[i]]; i++; j--; }
    }
    return g;
  }

  /** Une génération : élites, puis enfants par sélection → croisement → mutation */
  suivante() {
    const ordre = this.individus.map((_, i) => i).sort((x, y) => this.scores[y] - this.scores[x]);
    const nouvelle = ordre.slice(0, this.elitisme).map((i) => this.individus[i].slice());
    while (nouvelle.length < this.taille) {
      nouvelle.push(this.muter(this.croiser(this.choisir(), this.choisir())));
    }
    this.individus = nouvelle;
    this.generation++;
    this.evaluer();
    return this.meilleur;
  }

  /** Longueur d'une tournée prise au hasard : la référence « sans intelligence » */
  longueurAleatoire() { return this.longueur(this.melanger()); }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Genetique };
