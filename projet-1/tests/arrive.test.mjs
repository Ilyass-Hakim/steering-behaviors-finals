import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Vehicle, Monde, CONFIG } = chargerMonde(BASE, NOMS_BASE);

test('arrive : loin de la cible, la vitesse désirée est maxSpeed (comme seek)', () => {
  const v = new Vehicle(0, 0, { maxSpeed: 3, maxForce: 10 });
  const a = v.arrive({ x: 1000, y: 0 }, 100);
  assert.ok(Math.abs(a.x - 3) < 1e-9);
});

test('arrive : dans le rayon de ralentissement, la vitesse désirée est proportionnelle à la distance', () => {
  const v = new Vehicle(0, 0, { maxSpeed: 3, maxForce: 10 });
  const a = v.arrive({ x: 50, y: 0 }, 100);       // à mi-rayon : 1,5
  assert.ok(Math.abs(a.x - 1.5) < 1e-9);
  const b = v.arrive({ x: 10, y: 0 }, 100);
  assert.ok(Math.abs(b.x - 0.3) < 1e-9);
});

test('arrive : s’arrête sur la cible sans la dépasser de plus de quelques pixels', () => {
  const v = new Vehicle(0, 0, { maxSpeed: 3, maxForce: 0.14 });
  v.vel.set(3, 0);
  const cible = { x: 400, y: 0 };
  let maxX = 0;
  for (let i = 0; i < 700; i++) {
    v.applyForce(v.arrive(cible, 120));
    v.update();
    maxX = Math.max(maxX, v.pos.x);
  }
  assert.ok(v.pos.dist({ x: 400, y: 0, copy() { return this; } }) < 2, `position finale ${v.pos.x}`);
  assert.ok(v.vel.mag() < 0.1);
  assert.ok(maxX - 400 < 8, `dépassement de ${maxX - 400} px`);
});

test('arrive freine : la vitesse diminue au fil de l’approche', () => {
  const v = new Vehicle(0, 0, { maxSpeed: 3, maxForce: 0.14 });
  v.vel.set(3, 0);
  const vitesses = [];
  for (let i = 0; i < 300; i++) {
    v.applyForce(v.arrive({ x: 500, y: 0 }, 150));
    v.update();
    if (v.pos.x > 300 && v.pos.x < 490) vitesses.push(v.vel.mag());
  }
  assert.ok(vitesses[0] > vitesses[vitesses.length - 1]);
  assert.ok(vitesses.every((x, i) => i === 0 || x <= vitesses[i - 1] + 0.05), 'doit décélérer sans à-coups');
});

function aube() {
  const m = new Monde(CONFIG.graine, 24);
  m.cycle.forcer('nuit');
  m.surPhase('nuit');
  m.papillons.length = 0;
  m.hibouPrevu = null;
  for (let i = 0; i < 360; i++) m.pas();         // 6 s de vol libre
  m.cycle.forcer('aube');
  m.surPhase('aube');
  return m;
}

test('à l’aube chaque chauve-souris en vol reçoit une place différente et passe en retour', () => {
  const m = aube();
  const places = m.chauvesSouris.map((b) => b.place);
  assert.ok(places.every(Boolean));
  assert.equal(new Set(places).size, places.length, 'deux bêtes ne partagent pas une place');
  assert.ok(m.chauvesSouris.every((b) => b.etat === 'retour'));
  assert.ok(m.journal.some((e) => e.type === 'aube'));
});

test('à l’aube toute la colonie se suspend à sa place, sans collision', () => {
  const m = aube();
  let collisions = 0;
  for (let i = 0; i < 20 * 60; i++) {
    m.pas();
    for (const b of m.chauvesSouris) if (m.grotte.estSolide(b.pos.x, b.pos.y)) collisions++;
  }
  assert.equal(collisions, 0);
  assert.ok(m.chauvesSouris.every((b) => b.etat === 'repos'), `états : ${m.chauvesSouris.map((b) => b.etat).join(',')}`);
  for (const b of m.chauvesSouris) {
    assert.ok(Math.hypot(b.place.x - b.pos.x, b.place.y - b.pos.y) < 4);
    assert.equal(b.vel.mag(), 0);
  }
});

test('le cycle complet recommence : trois nuits d’affilée, la colonie dort chaque matin', () => {
  const m = new Monde(CONFIG.graine, 30);
  const total = CONFIG.cycle.crepuscule + CONFIG.cycle.nuit + CONFIG.cycle.aube + CONFIG.cycle.repos;
  for (let nuit = 1; nuit <= 3; nuit++) {
    assert.equal(m.cycle.numeroNuit, nuit);
    for (let i = 0; i < (total - 0.5) * 60; i++) m.pas();
    assert.equal(m.cycle.phase, 'repos');
    assert.ok(m.chauvesSouris.every((b) => b.etat === 'repos'), `nuit ${nuit} : ${m.chauvesSouris.filter((b) => b.etat !== 'repos').length} chauves-souris dehors`);
    for (let i = 0; i < 0.6 * 60; i++) m.pas();
  }
});

test('désactiver arrive empêche l’atterrissage (case à cocher)', () => {
  const m = aube();
  m.actifs.arrive = false;
  m.pas();
  assert.ok(m.chauvesSouris.every((b) => b.forces.arrive === undefined));
});

test('la lumière du jour monte à l’aube et la grotte s’éclaire', () => {
  const m = aube();
  assert.ok(m.cycle.lumiere < 0.05);
  for (let i = 0; i < 15 * 60; i++) m.pas();
  assert.ok(m.cycle.lumiere > 0.4);
  const allumes = Array.from(m.sonar.lumineux).filter((v) => v > 0.2).length;
  assert.ok(allumes > m.sonar.n * 0.9, 'la grotte entière doit être visible à l’aube');
});
