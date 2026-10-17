// stats.js — petites fonctions pures pour l'interface (testées sans navigateur).

/**
 * Combien d'entités utilisent chaque comportement en ce moment ?
 * @param {Array<{forces: object}>} entites  chauves-souris, papillons, hibou...
 * @param {number} seuil  une force plus petite que ce seuil compte pour nulle
 * @returns {Object<string, number>}  { wander: 12, avoid: 30, ... }
 */
function compterComportements(entites, seuil = 0.004) {
  const comptes = {};
  for (const e of entites) {
    if (!e || !e.forces) continue;
    for (const [nom, f] of Object.entries(e.forces)) {
      if (Math.hypot(f.x, f.y) > seuil) comptes[nom] = (comptes[nom] || 0) + 1;
    }
  }
  return comptes;
}

/** Répartition des chauves-souris par état : { repos: 3, errance: 20, ... } */
function repartitionEtats(chauvesSouris) {
  const r = {};
  for (const b of chauvesSouris) r[b.etat] = (r[b.etat] || 0) + 1;
  return r;
}

/** 83.4 → « 1:23 » */
function formaterDuree(secondes) {
  const s = Math.max(0, Math.floor(secondes));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Bornes d'un segment d'une frise : la durée d'une phase en pourcentage de la nuit */
function partsDePhases(durees) {
  const total = Object.values(durees).reduce((a, b) => a + b, 0);
  return Object.fromEntries(Object.entries(durees).map(([k, v]) => [k, (100 * v) / total]));
}

/**
 * Force d'une jauge de l'inspecteur : la norme de la force ramenée à une échelle 0..1
 * (1 = force maximale qu'on s'attend à voir).
 */
function niveauForce(f, echelle = 0.9) {
  return Math.min(1, Math.hypot(f.x, f.y) / echelle);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compterComportements, repartitionEtats, formaterDuree, partsDePhases, niveauForce };
}
