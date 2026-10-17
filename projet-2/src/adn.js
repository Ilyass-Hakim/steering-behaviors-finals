// adn.js — le génome d'un drone de la mission 4 (evolutionary steering).
// Chaque gène règle le POIDS d'un steering behavior ou une perception : la sélection naturelle
// choisit donc la manière de combiner les comportements, pas la trajectoire.

const GENES = [
  { id: 'wander',     nom: 'Errance',            min: 0,    max: 1.5,  couleur: '#7dd3fc' },
  { id: 'colis',      nom: 'Attrait des colis',  min: -0.5, max: 3,    couleur: '#fbbf24' },
  { id: 'chargeur',   nom: 'Attrait du chargeur', min: -0.5, max: 4,   couleur: '#34d399' },
  { id: 'orage',      nom: 'Fuite des orages',   min: -0.5, max: 4,    couleur: '#f87171' },
  { id: 'separation', nom: 'Séparation',         min: 0,    max: 2.5,  couleur: '#a78bfa' },
  { id: 'vitesse',    nom: 'Vitesse de croisière', min: 0.35, max: 1,  couleur: '#f472b6' },
  { id: 'vue',        nom: 'Rayon de vision',    min: 60,   max: 420,  couleur: '#38bdf8' },
  { id: 'seuil',      nom: 'Seuil de recharge',  min: 0.1,  max: 0.9,  couleur: '#facc15' },
];

class ADN {
  /** @param {number[]} [valeurs]  une valeur par gène (sinon tirage au hasard) */
  constructor(valeurs = null, rng = Math.random) {
    this.valeurs = valeurs ? valeurs.slice() : GENES.map((g) => g.min + rng() * (g.max - g.min));
  }

  get(id) { return this.valeurs[GENES.findIndex((g) => g.id === id)]; }

  /** Copie avec mutation : chaque gène change avec la probabilité `taux`, d'au plus ±15 % de son étendue */
  muter(taux, rng = Math.random) {
    const v = this.valeurs.map((x, i) => {
      if (rng() >= taux) return x;
      const g = GENES[i];
      return Math.max(g.min, Math.min(g.max, x + (rng() - 0.5) * 0.3 * (g.max - g.min)));
    });
    return new ADN(v);
  }

  /** Couleur de la lignée : la teinte dépend du goût pour les colis, de l'errance et de la vue */
  teinte() {
    const t = (id) => { const g = GENES.find((x) => x.id === id); return (this.get(id) - g.min) / (g.max - g.min); };
    return Math.round(360 * (0.55 * t('colis') + 0.25 * t('chargeur') + 0.2 * t('orage')) % 360);
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { ADN, GENES };
