// ecole.js — l'école de pilotage : neuroévolution + examen à l'aveugle.
//
// Entraînement : à chaque génération, toute la promotion vole sur un terrain TIRÉ AU HASARD
// (jamais le même) : impossible d'apprendre un parcours par cœur.
// Examen à l'aveugle : le meilleur pilote vole ensuite sur des terrains qu'il n'a jamais vus,
// fixés à l'avance (graines 9001…). Il n'a pas de carte, seulement ses télémètres.

class Ecole {
  constructor(graine = CONFIG.graine, params = CONFIG.neuro) {
    this.params = params;
    this.rng = creerRng(graine);
    this.tailles = [params.capteurs + 4, params.cachees, 2];
    this.evo = new Neuroevolution(this.tailles, {
      population: params.population, mutation: params.mutation, amplitude: params.amplitude,
      elitisme: params.elitisme, rng: this.rng,
    });
    this.arene = null;
    this.pilotes = [];
    this.generationsEcoulees = 0;
    this.dernierExamen = null;
    this.nouvelleGeneration();
  }

  /** Tire un terrain et lâche toute la promotion dessus (même famille que l'examen, jamais le même terrain) */
  nouvelEssai() {
    this.arene = new Arene(Math.floor(this.rng() * 1e9), {
      obstacles: 8 + Math.floor(this.rng() * 7), murs: 1 + Math.floor(this.rng() * 2), ouverture: 218 + this.rng() * 30,
    });
    this.pilotes = this.evo.reseaux.map((r) => new Pilote(this.arene, r));
  }

  nouvelleGeneration() {
    this.essai = 1;
    this.sommes = new Array(this.evo.taille).fill(0);
    this.arrivesGeneration = 0;
    this.nouvelEssai();
  }

  get terminee() { return this.pilotes.every((p) => !p.vivant); }
  get enVol() { return this.pilotes.filter((p) => p.vivant).length; }
  get arrives() { return this.pilotes.filter((p) => p.etat === 'arrive').length; }

  /** Avance toute la promotion d'un pas ; un essai fini en lance un autre, puis on passe à la génération suivante */
  pas() {
    for (const p of this.pilotes) p.penser();
    for (const p of this.pilotes) p.update();
    if (!this.terminee) return;
    this.pilotes.forEach((p, i) => { this.sommes[i] += p.fitness; });
    this.arrivesGeneration += this.arrives;
    if (this.essai < this.params.essais) { this.essai++; this.nouvelEssai(); } else this.cloreGeneration();
  }

  /**
   * Chaque génération = plusieurs terrains. La fitness d'un pilote est sa moyenne : un coup de
   * chance sur un seul terrain ne suffit plus pour être sélectionné.
   */
  cloreGeneration() {
    this.sommes.forEach((s, i) => { this.evo.fitness[i] = s / this.params.essais; });
    const tauxArrivee = this.arrivesGeneration / (this.evo.taille * this.params.essais);
    this.evo.suivante();
    this.generationsEcoulees++;
    this.derniereArrivee = tauxArrivee;
    this.evo.historique[this.evo.historique.length - 1].arrives = tauxArrivee;
    this.nouvelleGeneration();
  }

  /** Une génération complète sans affichage (tests, accélération) */
  genererVite() {
    const cible = this.generationsEcoulees + 1;
    let garde = 0;
    while (this.generationsEcoulees < cible && garde++ < (this.params.pasParEssai + 5) * this.params.essais) this.pas();
  }

  /** Vole un réseau sur une arène, sans affichage : renvoie le pilote à la fin du vol */
  static voler(reseau, arene) {
    const p = new Pilote(arene, reseau);
    while (p.vivant) { p.penser(); p.update(); }
    return p;
  }

  /** Terrains de l'examen : toujours les mêmes, jamais vus à l'entraînement */
  static terrainsExamen(n = CONFIG.neuro.examens) {
    return Array.from({ length: n }, (_, i) => new Arene(9001 + i, { obstacles: 8 + (i % 4) * 2, murs: 1 + (i % 2), ouverture: 230 - (i % 3) * 12 }));
  }

  /** Fait passer l'examen à un réseau : { reussites, total, details } */
  passerExamen(reseau = this.evo.meilleur) {
    const details = Ecole.terrainsExamen().map((arene) => {
      const p = Ecole.voler(reseau, arene);
      return { graine: arene.graine, etat: p.etat, progression: p.progression, pas: p.pas };
    });
    this.dernierExamen = { reussites: details.filter((d) => d.etat === 'arrive').length, total: details.length, details };
    return this.dernierExamen;
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Ecole };
