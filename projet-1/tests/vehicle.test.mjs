import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Vehicle } = chargerMonde(BASE, NOMS_BASE);

test('applyForce accumule les forces sans toucher à la position', () => {
  const v = new Vehicle(10, 20);
  v.applyForce({ x: 1, y: 0, copy() { return this; } });
  v.applyForce({ x: 0, y: 2, copy() { return this; } });
  assert.equal(v.acc.x, 1);
  assert.equal(v.acc.y, 2);
  assert.equal(v.pos.x, 10);
  assert.equal(v.pos.y, 20);
});

test('update : accélération → vitesse → position, puis remise à zéro de l’accélération', () => {
  const v = new Vehicle(0, 0, { maxSpeed: 10 });
  v.applyForce(v.acc.copy().set(2, 0));
  v.update();
  assert.equal(v.vel.x, 2);
  assert.equal(v.pos.x, 2);
  assert.equal(v.acc.x, 0);
});

test('update borne la vitesse à maxSpeed', () => {
  const v = new Vehicle(0, 0, { maxSpeed: 3 });
  v.applyForce(v.acc.copy().set(50, 0));
  v.update();
  assert.ok(Math.abs(v.vel.mag() - 3) < 1e-9);
});

test('steerVers : force = vitesse désirée − vitesse actuelle, bornée par maxForce', () => {
  const v = new Vehicle(0, 0, { maxForce: 0.1 });
  v.vel.set(1, 0);
  const desire = v.vel.copy().set(0, 3);
  const f = v.steerVers(desire);
  // direction (−1, 3), longueur ramenée à maxForce
  assert.ok(Math.abs(f.mag() - 0.1) < 1e-9);
  assert.ok(f.y > 0 && f.x < 0);
});

test('cap : direction du mouvement, 0 à l’arrêt', () => {
  const v = new Vehicle(0, 0);
  assert.equal(v.cap, 0);
  v.vel.set(0, 2);
  assert.ok(Math.abs(v.cap - Math.PI / 2) < 1e-9);
});
