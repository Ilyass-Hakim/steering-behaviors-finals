import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Ecole, Reseau, creerRng, CONFIG } = chargerMonde(BASE, NOMS_BASE);

test('l’examen utilise des terrains fixes, jamais vus à l’entraînement', () => {
  const a = Ecole.terrainsExamen();
  const b = Ecole.terrainsExamen();
  assert.equal(a.length, CONFIG.neuro.examens);
  assert.deepEqual(a.map((t) => t.obstacles), b.map((t) => t.obstacles));
  const e = new Ecole(3);
  assert.ok(a.every((t) => t.graine >= 9001 && t.graine !== e.arene.graine));
});

test('un réseau aléatoire échoue à l’examen', () => {
  const e = new Ecole(11);
  const brut = new Reseau(e.tailles, null, creerRng(99));
  assert.ok(e.passerExamen(brut).reussites <= 2);
});

test('la neuroévolution apprend : l’examen à l’aveugle est réussi bien plus souvent', () => {
  const e = new Ecole(5);
  const avant = e.passerExamen().reussites;
  e.genererVite();
  const taux0 = e.derniereArrivee;
  for (let i = 0; i < 44; i++) e.genererVite();
  const apres = e.passerExamen();
  assert.ok(e.derniereArrivee > taux0 + 0.1, `arrivées ${taux0} → ${e.derniereArrivee}`);
  assert.ok(apres.reussites >= 4, `examen ${avant}/8 → ${apres.reussites}/8`);
  assert.ok(apres.reussites > avant);
});

test('l’évolution est reproductible (même graine)', () => {
  const run = () => { const e = new Ecole(2); for (let i = 0; i < 3; i++) e.genererVite(); return e.evo.meilleur.poids.slice(0, 5).join(); };
  assert.equal(run(), run());
});
