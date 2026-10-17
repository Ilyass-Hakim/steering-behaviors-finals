// cycle.js — le cycle d'une nuit : une machine à états qui enchaîne les phases.
//
//   crepuscule : la colonie quitte le gîte, en nuée (boids)
//   nuit       : chasse, hibou
//   aube       : retour au gîte (arrive)
//   repos      : la colonie dort, puis le cycle recommence

const PHASES = {
  crepuscule: { label: 'Crépuscule', ordre: 0 },
  nuit: { label: 'Nuit', ordre: 1 },
  aube: { label: 'Aube', ordre: 2 },
  repos: { label: 'Repos', ordre: 3 },
};

class NightCycle {
  /** @param {object} durees  secondes par phase, dans l'ordre d'enchaînement */
  constructor(durees = CONFIG.cycle) {
    this.durees = durees;
    this.ordre = Object.keys(durees);
    this.indice = 0;
    this.temps = 0;           // secondes écoulées dans la phase courante
    this.numeroNuit = 1;
  }

  get phase() { return this.ordre[this.indice]; }
  get label() { return PHASES[this.phase].label; }
  get duree() { return this.durees[this.phase]; }
  /** Avancement dans la phase courante, de 0 à 1 */
  get progression() { return Math.min(1, this.temps / this.duree); }

  /**
   * Avance d'un pas de temps (secondes).
   * @returns {string|null} la nouvelle phase si on vient d'en changer, sinon null
   */
  avancer(dt) {
    this.temps += dt;
    if (this.temps < this.duree - 1e-9) return null;   // tolérance : la somme de pas de 1/60 s dérive
    return this.suivante();
  }

  /** Passe à la phase suivante (et à la nuit suivante après la dernière) */
  suivante() {
    this.temps = 0;
    this.indice++;
    if (this.indice >= this.ordre.length) {
      this.indice = 0;
      this.numeroNuit++;
    }
    return this.phase;
  }

  /** Force une phase (boutons de l'interface) */
  forcer(phase) {
    const i = this.ordre.indexOf(phase);
    if (i < 0) return null;
    this.indice = i;
    this.temps = 0;
    return phase;
  }

  /** Lumière du jour de 0 (nuit noire) à 1 (plein jour) : l'aube et le repos éclairent la grotte */
  get lumiere() {
    const lisse = (t) => t * t * (3 - 2 * t);
    switch (this.phase) {
      case 'crepuscule': return 0.28 * (1 - lisse(this.progression));
      case 'aube': return 0.7 * lisse(this.progression);
      case 'repos': return 0.7 - 0.42 * lisse(this.progression);
      default: return 0;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { NightCycle, PHASES };
