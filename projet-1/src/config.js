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
    contention: '#94a3b8',
  },

  // Les comportements présentés dans l'interface : où les voir dans la simulation
  comportements: [
    { id: 'wander', nom: 'Errance', terme: 'wander', ou: 'Nuit', texte: 'Les chauves-souris explorent la grotte noire en courbes douces : la direction est continue.' },
    { id: 'avoid', nom: 'Évitement d’obstacles', terme: 'obstacle avoidance', ou: 'Partout', texte: 'Sept rayons de sonar devant chaque bête : on vire vers le rayon le plus dégagé (traits roses).' },
    { id: 'separation', nom: 'Séparation', terme: 'separation', ou: 'Colonie', texte: 'S’écarter des voisines trop proches pour ne pas se heurter.' },
    { id: 'alignment', nom: 'Alignement', terme: 'alignment', ou: 'Crépuscule', texte: 'Prendre la direction moyenne du groupe : la nuée coule comme une rivière.' },
    { id: 'cohesion', nom: 'Cohésion', terme: 'cohesion', ou: 'Crépuscule', texte: 'Rester groupée autour du centre des voisines : la colonie ne s’éparpille pas.' },
    { id: 'seek', nom: 'Chercher', terme: 'seek', ou: 'Crépuscule, aube', texte: 'Suivre le chef de colonie, rejoindre le point d’approche, cueillir un papillon posé.' },
    { id: 'pursue', nom: 'Poursuivre', terme: 'pursue', ou: 'Chasse', texte: 'Viser l’endroit où le papillon SERA, pas où il est (viseur rose).' },
    { id: 'evade', nom: 'S’échapper', terme: 'evade', ou: 'Papillons', texte: 'Le papillon fuit l’endroit où la chasseuse SERA, en zigzag (traits verts).' },
    { id: 'flee', nom: 'Fuir', terme: 'flee', ou: 'Hibou', texte: 'Devant le hibou, la colonie s’éparpille : fuite à l’opposé du danger.' },
    { id: 'arrive', nom: 'Arriver', terme: 'arrive', ou: 'Aube', texte: 'Freiner en approchant de sa place, puis se suspendre tête en bas au plafond.' },
  ],
};

if (typeof module !== 'undefined' && module.exports) module.exports = { CONFIG };
