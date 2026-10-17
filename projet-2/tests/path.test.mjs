import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Chemin, projectionScalaire, Drone, Ville, Genetique, creerRng, CONFIG } = chargerMonde(BASE, NOMS_BASE);

test('projection scalaire : pied de la perpendiculaire', () => {
  const n = projectionScalaire({ x: 4, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 });
  assert.deepEqual([n.x, n.y, n.t], [4, 0, 0.4]);
});

test('projection scalaire : bornée au segment', () => {
  const a = projectionScalaire({ x: -5, y: 2 }, { x: 0, y: 0 }, { x: 10, y: 0 });
  const b = projectionScalaire({ x: 30, y: 2 }, { x: 0, y: 0 }, { x: 10, y: 0 });
  assert.deepEqual([a.x, a.t], [0, 0]);
  assert.deepEqual([b.x, b.t], [10, 1]);
});

test('projection scalaire sur un segment oblique', () => {
  const n = projectionScalaire({ x: 0, y: 4 }, { x: 0, y: 0 }, { x: 4, y: 4 });
  assert.ok(Math.abs(n.x - 2) < 1e-9 && Math.abs(n.y - 2) < 1e-9);
});

test('le chemin mesure sa longueur et retrouve un point à une abscisse donnée', () => {
  const c = new Chemin([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 20 }]);
  assert.equal(c.longueur, 30);
  assert.deepEqual(c.pointA(15), { x: 10, y: 5 });
  assert.deepEqual(c.pointA(99), { x: 10, y: 20 });
});

test('viser : le point normal le plus proche et une cible plus loin sur le chemin', () => {
  const c = new Chemin([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
  const info = c.viser({ x: 20, y: 10 }, { x: 1, y: 0 }, 30, 40);
  assert.equal(info.segment, 0);
  assert.ok(Math.abs(info.normal.x - 50) < 1e-9 && info.normal.y === 0);
  assert.ok(Math.abs(info.distance - 10) < 1e-9);
  assert.ok(Math.abs(info.cible.x - 90) < 1e-9);
});

test('viser passe les coins : la cible suit la polyligne, pas la droite du segment', () => {
  const c = new Chemin([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]);
  const info = c.viser({ x: 90, y: 0 }, { x: 1, y: 0 }, 5, 30);
  assert.ok(info.cible.x === 100 && info.cible.y > 0);
});

test('suivreChemin ne déplace pas le véhicule : il renvoie une force', () => {
  const c = new Chemin([{ x: 0, y: 0 }, { x: 300, y: 0 }], 10);
  const v = new Drone(new Ville(1), [0, 1]);
  v.pos.set(50, 60);
  v.vel.set(1, 0);
  const f = v.suivreChemin(c);
  assert.ok(f.y < 0, 'la force ramène vers le chemin');
  assert.equal(v.pos.x, 50);
});

test('dans le couloir, le véhicule n’est pas corrigé', () => {
  const c = new Chemin([{ x: 0, y: 0 }, { x: 300, y: 0 }], 20);
  const v = new Drone(new Ville(1), [0, 1]);
  v.pos.set(50, 5);
  v.vel.set(1, 0);
  const f = v.suivreChemin(c);
  assert.equal(f.mag(), 0);
});

function tournee(graine, k = 6) {
  const ville = new Ville(graine, { ...CONFIG.ville, livraisons: k });
  const ga = new Genetique(ville.matriceDistances(), { rng: creerRng(3) });
  for (let i = 0; i < 60; i++) ga.suivante();
  return { ville, etapes: [ville.hub, ...ga.meilleur.map((g) => [ville.hub, ...ville.livraisons][g]), ville.hub] };
}

test('un drone suit la tournée : toutes les livraisons, sans quitter les rues', () => {
  const { ville, etapes } = tournee(21);
  const d = new Drone(ville, etapes);
  let pas = 0;
  while (!d.termine && pas < 20000) { d.penser(); d.update(); pas++; }
  assert.ok(d.termine, `terminé en ${pas} pas`);
  assert.equal(d.livres, 6);
  assert.ok(d.ecartMax < CONFIG.drone.rayonChemin * 3, `écart max ${d.ecartMax.toFixed(1)}`);
  assert.ok(Math.hypot(d.pos.x - ville.pos(ville.hub).x, d.pos.y - ville.pos(ville.hub).y) < 8);
});

test('la vitesse ne dépasse jamais la vitesse max', () => {
  const { ville, etapes } = tournee(22, 4);
  const d = new Drone(ville, etapes);
  let vmax = 0;
  for (let i = 0; i < 4000 && !d.termine; i++) { d.penser(); d.update(); vmax = Math.max(vmax, d.vel.mag()); }
  assert.ok(vmax <= CONFIG.drone.vitesseMax + 1e-9);
});

test('plusieurs graines : le drone livre toujours tout', () => {
  for (const g of [31, 32, 33, 34]) {
    const { ville, etapes } = tournee(g, 5);
    const d = new Drone(ville, etapes);
    let pas = 0;
    while (!d.termine && pas < 20000) { d.penser(); d.update(); pas++; }
    assert.ok(d.termine && d.livres === 5, `graine ${g}`);
  }
});
