// config.js — réglages de SkyPost. Unités : pixels du monde logique (1600 × 900) et pas de 1/60 s.

const CONFIG = {
  monde: { largeur: 1600, hauteur: 900 },
  graine: 20261018,
  pasTemps: 1 / 60,

  ville: {
    colonnes: 8,
    lignes: 5,
    margeX: 130,
    margeY: 110,
    pasX: 191,
    pasY: 170,
    ruesSupprimees: 0.2,       // part des tronçons fermés (travaux) : les plus courts chemins deviennent intéressants
    chargeurs: 4,
    livraisons: 10,
  },

  // Mission 1 — algorithme génétique (ordre des livraisons)
  genetique: { population: 120, mutation: 0.12, elitisme: 4, tournoi: 4, generationsParSeconde: 12 },

  // Mission 2 — path following
  drone: { vitesseMax: 4.2, forceMax: 0.22, rayon: 7, anticipation: 38, rayonChemin: 16 },

  // Mission 3 — neuroévolution
  neuro: {
    population: 70, mutation: 0.08, amplitude: 0.25, elitisme: 5,
    capteurs: 9, ouverture: 2.6, portee: 240, cachees: 10,
    pasParEssai: 900, essais: 3, examens: 8,
  },

  // Mission 4 — evolutionary steering avec batterie
  evo: {
    population: 36, populationMax: 70, batterieMax: 100, vitesseMax: 3.2, forceMax: 0.2,
    mutation: 0.12, coutParPas: 0.035, coutVitesse: 0.05, gainChargeur: 0.45, rayonChargeur: 34,
    colis: 14, gainColis: 30,
    reproduction: 0.0007,
  },

  couleurs: {
    fond: '#070b14', rue: '#1b2740', batiment: '#101a2e', arete: '#2b3b5f',
    hub: '#fbbf24', hopital: '#f472b6', chargeur: '#34d399', chemin: '#38bdf8',
    drone: '#e0f2fe', danger: '#f87171', vert: '#4ade80',
  },
};

if (typeof module !== 'undefined' && module.exports) module.exports = { CONFIG };
