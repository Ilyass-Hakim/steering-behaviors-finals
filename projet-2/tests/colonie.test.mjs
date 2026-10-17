import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Colonie, ADN, GENES, DroneEvo, creerRng, CONFIG } = chargerMonde(BASE, NOMS_BASE);

test('l’ADN reste dans les bornes de chaque gène, même après beaucoup de mutations', () => {
  const rng = creerRng(1);
  let adn = new ADN(null, rng);
  for (let i = 0; i < 500; i++) adn = adn.muter(1, rng);
  GENES.forEach((g, i) => { assert.ok(adn.valeurs[i] >= g.min && adn.valeurs[i] <= g.max, g.id); });
});

test('la mutation produit un enfant différent sans toucher au parent', () => {
  const rng = creerRng(2);
  const parent = new ADN(null, rng);
  const copie = parent.valeurs.slice();
  const enfant = parent.muter(1, rng);
  assert.deepEqual(parent.valeurs, copie);
  assert.notDeepEqual(enfant.valeurs, copie);
});

test('le drone combine des forces (seek, arrive, flee, separation, wander) sans toucher sa position', () => {
  const c = new Colonie(5);
  const d = new DroneEvo(300, 300, new ADN([1, 2, 2, 2, 1, 0.8, 300, 0.9], creerRng(3)));
  d.batterie = 20;                                   // en dessous du seuil : il cherche un chargeur
  c.colis.push({ x: 380, y: 300 });
  c.chargeurs[0].x = 300; c.chargeurs[0].y = 400;
  c.orages.push({ x: 260, y: 300, r: 60, vx: 0, vy: 0 });
  c.drones.push(d, new DroneEvo(310, 305, new ADN(null, creerRng(4))));
  d.penser(c);
  for (const k of ['seek', 'arrive', 'flee', 'separation', 'wander']) assert.ok(d.forces[k], k);
  assert.equal(d.pos.x, 300);
});

test('la batterie se vide en volant, plus vite quand on va vite, et le drone tombe à 0', () => {
  const lent = new DroneEvo(0, 0, new ADN(null, creerRng(5)));
  const vite = new DroneEvo(0, 0, new ADN(null, creerRng(5)));
  lent.vel.set(0.5, 0); vite.vel.set(3, 0);
  lent.batterie = vite.batterie = 50;
  lent.update(); vite.update();
  assert.ok(vite.batterie < lent.batterie);
  vite.batterie = 0.001;
  vite.update();
  assert.equal(vite.mort, true);
  assert.equal(vite.cause, 'batterie');
});

test('un chargeur recharge, avec une capacité limitée à 3 drones', () => {
  const c = new Colonie(6);
  c.drones = [];
  const ch = c.chargeurs[0];
  for (let i = 0; i < 5; i++) {
    const d = new DroneEvo(ch.x + i, ch.y, new ADN(null, creerRng(i + 1)));
    d.batterie = 10;
    c.drones.push(d);
  }
  c.pas();
  assert.equal(c.drones.filter((d) => d.recharge).length, 3);
});

test('livrer un colis recharge un peu et marque un point', () => {
  const c = new Colonie(7);
  c.drones = [];
  const d = new DroneEvo(500, 500, new ADN(null, creerRng(9)));
  d.batterie = 40;
  c.drones.push(d);
  c.colis[0] = { x: 500, y: 500 };
  c.interagir(d);
  assert.equal(d.livraisons, 1);
  assert.ok(d.batterie > 60);
});

test('la population ne s’éteint jamais et reste bornée', () => {
  const c = new Colonie(8);
  let min = Infinity;
  let max = 0;
  for (let i = 0; i < 60 * 60 * 3; i++) { c.pas(); const n = c.vivants().length; min = Math.min(min, n); max = Math.max(max, n); }
  assert.ok(min >= CONFIG.evo.population * 0.4);
  assert.ok(max <= CONFIG.evo.populationMax + 12);
});

test('la sélection naturelle fonctionne : moins de morts, plus de livraisons avec le temps', () => {
  let tot = { d0: 0, d1: 0, l0: 0, l1: 0 };
  for (const g of [3, 4, 5]) {
    const c = new Colonie(g);
    let morts0 = 0; let liv0 = 0;
    for (let i = 1; i <= 60 * 60 * 10; i++) {
      c.pas();
      if (i === 60 * 60 * 2) { morts0 = c.morts.batterie + c.morts.orage; liv0 = c.totalLivraisons; }
    }
    const mortsTot = c.morts.batterie + c.morts.orage;
    tot.d0 += morts0 / 2; tot.d1 += (mortsTot - morts0) / 8;     // morts par minute : début vs. reste
    tot.l0 += liv0 / 2; tot.l1 += (c.totalLivraisons - liv0) / 8;
  }
  assert.ok(tot.d1 < tot.d0, `morts/min ${tot.d0.toFixed(1)} → ${tot.d1.toFixed(1)}`);
  assert.ok(tot.l1 > tot.l0, `livraisons/min ${tot.l0.toFixed(0)} → ${tot.l1.toFixed(0)}`);
});

test('même graine, même histoire', () => {
  const run = () => { const { Colonie } = chargerMonde(BASE, NOMS_BASE, 12); const c = new Colonie(9); for (let i = 0; i < 1500; i++) c.pas(); return [c.totalLivraisons, c.nes, c.vivants().length].join(); };
  assert.equal(run(), run());
});
