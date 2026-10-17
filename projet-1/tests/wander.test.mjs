import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Vehicle, Cave, CONFIG, Monde } = chargerMonde(BASE, NOMS_BASE);

function ecart(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

test('wander renvoie une force bornée par maxForce et ne déplace rien', () => {
  const v = new Vehicle(100, 100, { maxSpeed: 3, maxForce: 0.1 });
  v.vel.set(2, 0);
  const avant = { x: v.pos.x, y: v.pos.y, vx: v.vel.x, vy: v.vel.y };
  const f = v.wander();
  assert.ok(f.mag() <= 0.1 + 1e-9);
  assert.deepEqual({ x: v.pos.x, y: v.pos.y, vx: v.vel.x, vy: v.vel.y }, avant);
});

test('wander garde la continuité : l’angle ne varie que de `variation` par pas', () => {
  const v = new Vehicle(0, 0, { maxSpeed: 3, maxForce: 0.1 });
  v.vel.set(1.5, 0);
  const variation = 0.28;
  for (let i = 0; i < 500; i++) {
    const avant = v.angleErrance;
    v.applyForce(v.wander({ variation }));
    v.update();
    assert.ok(Math.abs(v.angleErrance - avant) <= variation + 1e-9);
  }
});

test('wander décrit des courbes douces : le cap change peu à chaque pas', () => {
  const v = new Vehicle(0, 0, { maxSpeed: 3, maxForce: 0.1 });
  v.vel.set(1.8, 0);
  let capPrecedent = v.cap;
  let maxVirage = 0;
  const caps = [];
  for (let i = 0; i < 800; i++) {
    v.applyForce(v.wander());
    v.update();
    maxVirage = Math.max(maxVirage, Math.abs(ecart(v.cap, capPrecedent)));
    capPrecedent = v.cap;
    caps.push(v.cap);
  }
  assert.ok(maxVirage < 0.2, `virage trop brusque : ${maxVirage}`);
  // et pourtant la direction change réellement au fil du temps
  const min = Math.min(...caps);
  const max = Math.max(...caps);
  assert.ok(max - min > 0.5, 'le cap ne varie pas : pas d’errance');
});

test('wander garde la vitesse proche de la vitesse de croisière', () => {
  const v = new Vehicle(0, 0, { maxSpeed: 3, maxForce: 0.1 });
  v.vel.set(0.2, 0);
  for (let i = 0; i < 400; i++) {
    v.applyForce(v.wander({ croisiere: 0.6 }));
    v.update();
  }
  assert.ok(v.vel.mag() > 1.2 && v.vel.mag() < 2.2, `vitesse ${v.vel.mag()}`);
});

test('contenir : repousse vers le bas près du plafond, vers le haut près du sol', () => {
  const g = new Cave(CONFIG.monde.largeur, CONFIG.monde.hauteur, CONFIG.graine);
  const v = new Vehicle(1000, g.plafondY(1000) + 10, { maxSpeed: 3, maxForce: 0.2 });
  v.vel.set(2, 0);
  assert.ok(v.contenir(g).y > 0, 'doit pousser vers le bas (y croît vers le bas)');
  const w = new Vehicle(1000, g.solY(1000) - 10, { maxSpeed: 3, maxForce: 0.2 });
  w.vel.set(2, 0);
  assert.ok(w.contenir(g).y < 0);
  const centre = new Vehicle(1000, g.milieuY(1000), { maxSpeed: 3, maxForce: 0.2 });
  assert.equal(centre.contenir(g).mag(), 0);
});

test('monde : 36 chauves-souris en errance 3000 pas restent dans la grotte', () => {
  const m = new Monde(CONFIG.graine, 36);
  m.liberer('errance');
  for (let i = 0; i < 3000; i++) {
    m.pas();
    for (const b of m.chauvesSouris) {
      assert.ok(b.pos.x > 0 && b.pos.x < m.grotte.w, `sortie en x au pas ${i}`);
      assert.ok(b.pos.y > m.grotte.plafondY(b.pos.x) && b.pos.y < m.grotte.solY(b.pos.x), `sortie en y au pas ${i}`);
    }
  }
});

test('monde : au repos, les chauves-souris ne bougent pas', () => {
  const m = new Monde(CONFIG.graine, 10);
  for (const b of m.chauvesSouris) b.delaiDepart = 0;     // personne ne décolle
  const avant = m.chauvesSouris.map((b) => [b.pos.x, b.pos.y]);
  for (let i = 0; i < 100; i++) m.pas();
  m.chauvesSouris.forEach((b, i) => assert.deepEqual([b.pos.x, b.pos.y], avant[i]));
});
