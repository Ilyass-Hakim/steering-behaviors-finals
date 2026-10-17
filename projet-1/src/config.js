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
    boostChasse: 1.3,        // en chasse : vitesse × 1,3
  },

  papillons: {
    nombre: 10,
    vitesseMax: 2.1,
    forceMax: 0.1,
    vitesseFuite: 2.9,       // en fuite : plus rapide et plus agile
    forceFuite: 0.17,
  },

  hibou: {
    vitesseMax: 2.7,
    forceMax: 0.06,          // lourd : il tourne lentement
    rayonPanique: 300,       // distance à laquelle les chauves-souris le fuient
    duree: 22,               // secondes passées dans la grotte avant de repartir
  },

  // Poids de chaque force dans la somme des comportements, selon l'état de la chauve-souris
  poids: {
    commun: { avoid: 2.0, contention: 0.8 },
    sortie: { separation: 1.8, alignment: 1.0, cohesion: 0.8, seek: 1.3 },
    errance: { wander: 1.0, separation: 1.1, alignment: 0.12, cohesion: 0.04 },
    chasse: { pursue: 1.7, seek: 1.7, separation: 0.9 },
    fuite: { flee: 2.8, separation: 0.7, alignment: 0.8 },
    retour: { arrive: 2.4, seek: 1.4, wander: 0.8, separation: 0.5 },
    papillon: { wander: 1.0, avoid: 2.0, contention: 0.8 },
    papillonFuite: { evade: 2.2, wander: 0.15, avoid: 2.2, contention: 0.9 },
  },

  // Durée de chaque phase du cycle de la nuit (secondes simulées)
  cycle: { crepuscule: 16, nuit: 60, aube: 22, repos: 7 },
  hibouApparitionNuit: [18, 34],     // le hibou entre entre ces deux dates (s) de la nuit

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
