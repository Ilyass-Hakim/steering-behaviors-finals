import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Vehicle, Monde, Moth, Bat, CONFIG } = chargerMonde(BASE, NOMS_BASE);

const chasseur = () => new Vehicle(0, 0, { maxSpeed: 3, maxForce: 0.3 });
const cible = (x, y, vx, vy) => ({ pos: { x, y }, vel: { x: vx, y: vy, copy() { return this; } } });

test('pursue sur une cible immobile = seek', () => {
  const v = chasseur();
  const c = cible(100, 50, 0, 0);
  const p = v.pursue(c);
  const s = v.seek(c.pos);
  assert.ok(Math.abs(p.x - s.x) < 1e-12 && Math.abs(p.y - s.y) < 1e-12);
});

test('pursue vise devant une cible mobile, là où elle sera', () => {
  const v = chasseur();
  const c = cible(100, 0, 0, -2);               // la cible monte (y décroît)
  const poursuite = v.pursue(c);
  const direct = v.seek(c.pos);
  assert.ok(poursuite.y < direct.y, 'doit viser plus haut que la cible actuelle');
  assert.ok(v.prediction.y < 0, `point visé : ${JSON.stringify(v.prediction)}`);
});

test('pursue : le temps de prévision est plafonné par tMax', () => {
  const v = chasseur();
  const c = cible(10000, 0, 0, -2);
  v.pursue(c, { tMax: 30 });
  assert.ok(Math.abs(v.prediction.y - -60) < 1e-9);
});

test('pursue rattrape une cible qui s’éloigne en ligne droite', () => {
  const v = new Vehicle(0, 0, { maxSpeed: 3, maxForce: 0.3 });
  const proie = new Vehicle(200, 0, { maxSpeed: 1.5, maxForce: 0.1 });
  proie.vel.set(0, 1.5);
  let capture = false;
  for (let i = 0; i < 600 && !capture; i++) {
    v.applyForce(v.pursue(proie));
    v.update();
    proie.update();
    capture = v.pos.dist(proie.pos) < 6;
  }
  assert.ok(capture, 'la chasseuse doit rattraper la proie');
});

function monde(nBats = 1) {
  const m = new Monde(CONFIG.graine, nBats);
  m.cycle.forcer('nuit');
  m.surPhase('nuit');
  m.papillons.length = 0;
  return m;
}

test('chasse : un papillon révélé par l’écho déclenche la poursuite, puis la capture', () => {
  const m = monde(1);
  const b = m.chauvesSouris[0];
  b.pos.set(900, m.grotte.milieuY(900));
  b.vel.set(1.5, 0);
  const proie = new Moth(1050, m.grotte.milieuY(1050));
  proie.vel.set(0, -0.8);
  m.papillons.push(proie);
  proie.echo = 1;
  m.pas();
  assert.equal(b.etat, 'chasse');
  assert.equal(b.cible, proie);
  let pas = 0;
  while (m.stats.captures === 0 && pas++ < 600) { proie.echo = 1; m.pas(); }
  assert.equal(m.stats.captures, 1, 'le papillon doit être capturé');
  assert.equal(proie.etat, 'mange');
  assert.equal(b.etat, 'errance');
  assert.ok(b.satiete > 0, 'repue : elle ne rechasse pas tout de suite');
  assert.ok(m.journal.some((e) => e.type === 'capture'));
});

test('un papillon non révélé (aucun écho) n’est pas chassé', () => {
  const m = monde(1);
  const b = m.chauvesSouris[0];
  b.pos.set(900, m.grotte.milieuY(900));
  const proie = new Moth(950, m.grotte.milieuY(950));
  m.papillons.push(proie);
  proie.echo = 0;
  m.pas();
  assert.equal(b.etat, 'errance');
});

test('au plus trois chasseuses par papillon', () => {
  const m = monde(6);
  const proie = new Moth(900, m.grotte.milieuY(900));
  proie.echo = 1;
  m.papillons.push(proie);
  m.chauvesSouris.forEach((b, i) => { b.pos.set(850 + i * 8, m.grotte.milieuY(900)); b.vel.set(1, 0); });
  m.pas();
  assert.ok(m.chauvesSouris.filter((b) => b.cible === proie).length <= 3);
});

test('un papillon mangé réapparaît par l’entrée de la grotte', () => {
  const m = monde(1);
  const proie = new Moth(800, 400);
  m.papillons.push(proie);
  proie.etreMange();
  proie.minuteur = 5;
  for (let i = 0; i < 8; i++) m.pas();
  assert.equal(proie.etat, 'vol');
  assert.ok(proie.pos.x > m.grotte.w - 120, `réapparu en x=${proie.pos.x}`);
});

test('nuit complète : des captures ont lieu, sans collision ni sortie de la grotte', () => {
  const m = new Monde(CONFIG.graine, 36);
  let collisions = 0;
  for (let i = 0; i < 76 * 60; i++) {
    m.pas();
    for (const b of m.chauvesSouris) if (b.etat !== 'repos' && m.grotte.estSolide(b.pos.x, b.pos.y)) collisions++;
    for (const p of m.papillons) {
      if (p.etat === 'vol') assert.ok(p.pos.x > -5 && p.pos.x < m.grotte.w + 5, `papillon hors de la grotte (x=${p.pos.x})`);
    }
  }
  assert.equal(collisions, 0);
  assert.ok(m.stats.captures >= 2, `captures : ${m.stats.captures}`);
});
