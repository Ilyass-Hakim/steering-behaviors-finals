import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Cave, Sonar, SONAR, CONFIG } = chargerMonde(BASE, NOMS_BASE);

function nouveauSonar() {
  const grotte = new Cave(CONFIG.monde.largeur, CONFIG.monde.hauteur, CONFIG.graine);
  return { grotte, sonar: new Sonar(grotte, CONFIG.graine) };
}

test('le sonar échantillonne la grotte : parois et concrétions', () => {
  const { sonar } = nouveauSonar();
  assert.ok(sonar.n > 2500, `trop peu de points : ${sonar.n}`);
  assert.ok(sonar.types.includes(0) && sonar.types.includes(1));
  assert.ok(sonar.lumineux.every((v) => v === 0), 'au départ tout est noir');
});

test('les points de paroi sont collés au plafond, au sol ou aux murs', () => {
  const { grotte, sonar } = nouveauSonar();
  for (let i = 0; i < sonar.n; i++) {
    if (sonar.types[i] !== 0) continue;
    const x = sonar.xs[i];
    const y = sonar.ys[i];
    const surPlafond = y <= grotte.plafondY(Math.min(grotte.w, Math.max(0, x))) + 1 && y >= grotte.plafondY(Math.min(grotte.w, Math.max(0, x))) - 12;
    const surSol = y >= grotte.solY(Math.min(grotte.w, Math.max(0, x))) - 1 && y <= grotte.solY(Math.min(grotte.w, Math.max(0, x))) + 12;
    const surMur = x < 1 || x > grotte.w - 1;
    assert.ok(surPlafond || surSol || surMur, `point de paroi flottant (${x}, ${y})`);
  }
});

test('l’entrée de la grotte reste ouverte : aucun point de paroi dans l’ouverture', () => {
  const { grotte, sonar } = nouveauSonar();
  for (let i = 0; i < sonar.n; i++) {
    if (sonar.xs[i] > grotte.w - 0.5) {
      assert.ok(Math.abs(sonar.ys[i] - grotte.entree.y) >= grotte.entree.hauteur / 2 - 20);
    }
  }
});

test('une onde allume les points qu’elle traverse, jamais au-delà de sa portée', () => {
  const { sonar } = nouveauSonar();
  const x = 800;
  const y = 300;
  sonar.ping(x, y, 1);
  for (let i = 0; i < 80; i++) sonar.pas([]);
  let allumes = 0;
  for (let i = 0; i < sonar.n; i++) {
    const d = Math.hypot(sonar.xs[i] - x, sonar.ys[i] - y);
    if (sonar.lumineux[i] > 0.01) allumes++;
    if (d > SONAR.portee + SONAR.vitesseSon) assert.ok(sonar.lumineux[i] === 0, `point lointain allumé (d=${d})`);
  }
  assert.ok(allumes > 20, `trop peu de points allumés : ${allumes}`);
  assert.equal(sonar.ondes.length, 0, 'l’onde doit disparaître en bout de course');
});

test('le front d’onde avance à la vitesse du son', () => {
  const { sonar } = nouveauSonar();
  sonar.ping(800, 300, 1);
  for (let i = 0; i < 10; i++) sonar.pas([]);
  assert.ok(Math.abs(sonar.ondes[0].r - 10 * SONAR.vitesseSon) < 1e-9);
});

test('les points s’éteignent progressivement', () => {
  const { sonar } = nouveauSonar();
  sonar.lumineux.fill(1);
  for (let i = 0; i < 120; i++) sonar.pas([]);
  const attendu = Math.pow(SONAR.persistance, 120);
  assert.ok(Math.abs(sonar.lumineux[0] - attendu) < 1e-4);
  assert.ok(sonar.lumineux[0] < 0.2 && sonar.lumineux[0] > 0.05);
});

test('eclairer : la lumière du jour allume toute la grotte au niveau minimal', () => {
  const { sonar } = nouveauSonar();
  sonar.eclairer(0.3);
  assert.ok(sonar.lumineux.every((v) => v >= 0.3));
});

test('une entité touchée par le front d’onde reçoit un écho, pas les autres', () => {
  const { sonar } = nouveauSonar();
  const proche = { pos: { x: 900, y: 300 }, echo: 0 };
  const loin = { pos: { x: 1500, y: 800 }, echo: 0 };
  sonar.ping(800, 300, 1);
  for (let i = 0; i < 60; i++) sonar.pas([proche, loin]);
  assert.ok(proche.echo > 0.3, `écho trop faible : ${proche.echo}`);
  assert.equal(loin.echo, 0);
});

test('le nombre d’ondes simultanées est borné', () => {
  const { sonar } = nouveauSonar();
  for (let i = 0; i < SONAR.maxOndes + 50; i++) sonar.ping(100, 100, 1);
  assert.equal(sonar.ondes.length, SONAR.maxOndes);
});
