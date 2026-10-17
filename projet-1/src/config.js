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

  // Poids de chaque force dans la somme des comportements d'une chauve-souris
  poids: {
    wander: 1.0,
    contention: 1.6,
  },

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
