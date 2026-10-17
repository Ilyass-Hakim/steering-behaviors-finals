import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Ville, CONFIG } = chargerMonde(BASE, NOMS_BASE);

test('la ville est déterministe pour une graine donnée', () => {
  const a = new Ville(42);
  const b = new Ville(42);
  assert.deepEqual(a.livraisons, b.livraisons);
  assert.equal(a.blocs.length, b.blocs.length);
  assert.notDeepEqual(new Ville(43).livraisons, a.livraisons);
});

test('malgré les rues fermées, toute la ville reste connexe', () => {
  for (const g of [1, 2, 3, 4, 5]) {
    const v = new Ville(g);
    assert.ok(v.aretes.some((e) => e.ferme), 'des rues sont fermées');
    assert.ok(v.estConnexe());
    const { dist } = v.dijkstra(v.hub);
    assert.ok(dist.every(Number.isFinite));
  }
});

test('Dijkstra : chemin valide, longueur cohérente avec la distance', () => {
  const v = new Ville(7);
  const cible = v.livraisons[0];
  const chemin = v.plusCourtChemin(v.hub, cible);
  assert.equal(chemin[0], v.hub);
  assert.equal(chemin[chemin.length - 1], cible);
  let l = 0;
  for (let i = 0; i + 1 < chemin.length; i++) {
    const arete = v.noeuds[chemin[i]].voisins.find((n) => n.vers === chemin[i + 1]);
    assert.ok(arete, 'deux noeuds consécutifs sont voisins');
    l += arete.longueur;
  }
  assert.ok(Math.abs(l - v.dijkstra(v.hub).dist[cible]) < 1e-6);
});

test('la matrice des distances est symétrique et nulle sur la diagonale', () => {
  const v = new Ville(9);
  const m = v.matriceDistances();
  for (let i = 0; i < m.length; i++) {
    assert.equal(m[i][i], 0);
    for (let j = 0; j < m.length; j++) assert.ok(Math.abs(m[i][j] - m[j][i]) < 1e-6);
  }
});

test('le hub, les livraisons et les chargeurs sont des noeuds distincts', () => {
  const v = new Ville(11);
  const tous = [v.hub, ...v.livraisons, ...v.chargeurs];
  assert.equal(new Set(tous).size, tous.length);
  assert.equal(v.livraisons.length, CONFIG.ville.livraisons);
});

test('les immeubles ne recouvrent pas les intersections', () => {
  const v = new Ville(5);
  for (const n of v.noeuds) assert.equal(v.dansBatiment(n.x, n.y), false);
});
