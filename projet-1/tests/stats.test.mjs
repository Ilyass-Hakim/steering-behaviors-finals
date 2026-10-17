import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde } from './helpers/monde.mjs';

const { compterComportements, repartitionEtats, formaterDuree, partsDePhases, niveauForce } =
  chargerMonde(['src/stats.js'], ['compterComportements', 'repartitionEtats', 'formaterDuree', 'partsDePhases', 'niveauForce']);

test('compterComportements : compte les entités dont la force dépasse le seuil', () => {
  const entites = [
    { forces: { wander: { x: 0.1, y: 0 }, avoid: { x: 0, y: 0 } } },
    { forces: { wander: { x: 0, y: 0.2 }, flee: { x: 0.3, y: 0.3 } } },
    { forces: {} },
    null,
  ];
  assert.deepEqual({ ...compterComportements(entites) }, { wander: 2, flee: 1 });
});

test('repartitionEtats : une ligne par état', () => {
  const r = repartitionEtats([{ etat: 'repos' }, { etat: 'repos' }, { etat: 'chasse' }]);
  assert.deepEqual({ ...r }, { repos: 2, chasse: 1 });
});

test('formaterDuree : minutes:secondes', () => {
  assert.equal(formaterDuree(0), '0:00');
  assert.equal(formaterDuree(83.9), '1:23');
  assert.equal(formaterDuree(-5), '0:00');
});

test('partsDePhases : les pourcentages font 100', () => {
  const p = partsDePhases({ a: 16, b: 60, c: 22, d: 7 });
  assert.ok(Math.abs(Object.values(p).reduce((x, y) => x + y, 0) - 100) < 1e-9);
  assert.ok(p.b > p.a);
});

test('niveauForce : borné entre 0 et 1', () => {
  assert.equal(niveauForce({ x: 0, y: 0 }), 0);
  assert.equal(niveauForce({ x: 5, y: 5 }), 1);
  assert.ok(Math.abs(niveauForce({ x: 0.45, y: 0 }) - 0.5) < 1e-9);
});
