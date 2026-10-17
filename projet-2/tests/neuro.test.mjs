import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Reseau, Neuroevolution, Arene, Pilote, creerRng, CONFIG } = chargerMonde(BASE, NOMS_BASE);

test('un réseau a (n+1)×m poids par couche et des sorties dans [-1, 1]', () => {
  const r = new Reseau([4, 3, 2], null, creerRng(1));
  assert.equal(r.nbPoids, 5 * 3 + 4 * 2);
  const s = r.activer([1, -1, 0.5, 0]);
  assert.equal(s.length, 2);
  assert.ok(s.every((v) => v >= -1 && v <= 1));
});

test('un réseau dont tous les poids sont nuls répond 0', () => {
  const r = new Reseau([3, 2, 2], new Array(3 * 2 + 2 + 3 * 2 + 2 - 2 + 0).fill(0).concat([]).slice(0, (4) * 2 + 3 * 2));
  assert.deepEqual(r.activer([1, 2, 3]), [0, 0]);
});

test('même entrée, même sortie : le réseau est déterministe', () => {
  const r = new Reseau([3, 4, 2], null, creerRng(2));
  assert.deepEqual(r.activer([0.1, 0.2, 0.3]), r.activer([0.1, 0.2, 0.3]));
});

test('la mutation change des poids, la copie est indépendante', () => {
  const evo = new Neuroevolution([3, 4, 2], { population: 10, rng: creerRng(3), mutation: 1 });
  const a = evo.reseaux[0];
  const b = a.copie();
  b.poids[0] += 1;
  assert.notEqual(a.poids[0], b.poids[0]);
  const e = evo.enfant(a, a);
  assert.ok(e.poids.some((w, i) => w !== a.poids[i]));
  assert.equal(e.poids.length, a.poids.length);
});

test('l’élite survit intacte à la génération suivante', () => {
  const evo = new Neuroevolution([3, 4, 2], { population: 12, elitisme: 2, rng: creerRng(4) });
  evo.fitness = evo.fitness.map((_, i) => i);          // le meilleur est le dernier
  const meilleur = evo.reseaux[11].poids.slice();
  evo.suivante();
  assert.deepEqual(evo.reseaux[0].poids, meilleur);
  assert.equal(evo.generation, 2);
  assert.equal(evo.reseaux.length, 12);
});

test('télémètre : un rayon s’arrête sur un cercle, un rectangle et le bord', () => {
  const a = new Arene(1, { obstacles: 0, murs: 0 });
  a.obstacles = [{ type: 'cercle', x: 300, y: 300, r: 50 }, { type: 'rect', x: 600, y: 250, l: 40, h: 100 }];
  assert.ok(Math.abs(a.rayon(100, 300, 1, 0, 1000) - 150) < 1e-6);
  assert.ok(Math.abs(a.rayon(400, 300, 1, 0, 1000) - 200) < 1e-6);
  assert.ok(Math.abs(a.rayon(700, 300, 1, 0, 2000) - (a.w - 700)) < 1e-6);
  assert.equal(a.rayon(100, 100, 1, 0, 80), 80);
});

test('l’arène est reproductible et laisse libres le départ et l’arrivée', () => {
  const a = new Arene(7);
  const b = new Arene(7);
  assert.deepEqual(a.obstacles, b.obstacles);
  assert.equal(a.collision(a.depart.x, a.depart.y, 10), false);
  assert.equal(a.collision(a.arrivee.x, a.arrivee.y, 10), false);
  assert.ok(Number.isFinite(a.distanceNav(a.depart.x, a.depart.y)), 'l’arrivée est atteignable par une brèche');
});

test('le pilote ne reçoit que des télémètres, la direction de l’arrivée et sa vitesse', () => {
  const a = new Arene(8);
  const p = new Pilote(a, new Reseau([CONFIG.neuro.capteurs + 4, CONFIG.neuro.cachees, 2], null, creerRng(5)));
  assert.equal(p.percevoir().length, CONFIG.neuro.capteurs + 4);
});

test('le pilote agit par force : steering = désiré − vitesse', () => {
  const a = new Arene(9);
  const p = new Pilote(a, new Reseau([CONFIG.neuro.capteurs + 4, CONFIG.neuro.cachees, 2], null, creerRng(6)));
  const x = p.pos.x;
  p.penser();
  assert.equal(p.pos.x, x);
  const attendu = p.desire.copy().sub(p.vel).limit(p.maxForce);
  assert.ok(Math.abs(p.forces.reseau.x - attendu.x) < 1e-9 && Math.abs(p.forces.reseau.y - attendu.y) < 1e-9);
});
