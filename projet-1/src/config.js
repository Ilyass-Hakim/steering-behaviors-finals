// config.js — réglages de la simulation « Écho ».
// Tout ce qui se règle (physique, sonar, durée des phases, couleurs) est ici.
// Les unités sont des pixels du monde logique (1600 × 900) et des pas de 1/60 s.

const CONFIG = {
  monde: { largeur: 1600, hauteur: 900 },
  graine: 20261017,
  pasTemps: 1 / 60,          // un pas de simulation = 1/60 s

  chauveSouris: {
    nombre: 36,
    vitesseMax: 3.3,         // px par pas
    forceMax: 0.14,
    rayon: 8,                // demi-envergure de dessin ~ 2 × rayon
    energieDepart: 0.8,
  },

  // Poids de chaque force dans la somme des comportements, selon l'état de la chauve-souris
  poids: {
    commun: { avoid: 2.0, contention: 0.8 },
    sortie: { separation: 1.8, alignment: 1.0, cohesion: 0.8, seek: 1.3 },
    errance: { wander: 1.0, separation: 1.1, alignment: 0.12, cohesion: 0.04 },
  },

  // Durée de chaque phase du cycle de la nuit (secondes simulées)
  cycle: { crepuscule: 16, nuit: 60 },

  // Couleur de chaque force (légende, vecteurs, jauges de l'inspecteur)
  couleurs: {
    wander: '#7dd3fc',
    avoid: '#fb7185',
    separation: '#fbbf24',
    alignment: '#34d399',
    cohesion: '#60a5fa',
    seek: '#a78bfa',
    pursue: '#f472b6',
    evade: '#2dd4bf',
    flee: '#f87171',
    arrive: '#facc15',
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = { CONFIG };
