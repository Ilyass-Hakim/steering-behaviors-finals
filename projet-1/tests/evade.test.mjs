import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Vehicle, Monde, Moth, CONFIG } = chargerMonde(BASE, NOMS_BASE);

const fuyard = () => new Vehicle(0, 0, { maxSpeed: 3, maxForce: 0.3 });
const menace = (x, y, vx, vy) => ({ pos: { x, y }, vel: { x: vx, y: vy, copy() { return this; } } });

test('flee : la force s’éloigne du point fui, bornée par maxForce', () => {
  const v = fuyard();
  const f = v.flee({ x: 100, y: 0 });
  assert.ok(f.x < 0 && Math.abs(f.y) < 1e-9);
  assert.ok(f.mag() <= 0.3 + 1e-9);
});

test('flee : sur le point même, la direction est tirée au hasard sans produire de NaN', () => {
  const f = fuyard().flee({ x: 0, y: 0 });
  assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y));
});

test('evade fuit l’endroit où la menace sera, pas où elle est', () => {
  const v = fuyard();
  const m = menace(100, 0, 0, 2);                 // la menace descend (y croît)
  const f = v.evade(m);
  const simple = v.flee(m.pos);
  assert.ok(f.y < simple.y, 'doit s’écarter du futur de la menace : plus haut que flee seul');
  assert.ok(v.prediction.y > 0);
});

test('evade : un fuyard plus rapide garde ses distances face à un poursuivant', () => {
  const fuyard1 = new Vehicle(300, 0, { maxSpeed: 3, maxForce: 0.3 });
  const chasseur = new Vehicle(0, 0, { maxSpeed: 2.5, maxForce: 0.2 });
  fuyard1.vel.set(1, 0);
  chasseur.vel.set(1, 0);
  const initiale = fuyard1.pos.dist(chasseur.pos);
  let dmin = Infinity;
  for (let i = 0; i < 400; i++) {
    fuyard1.applyForce(fuyard1.evade(chasseur));
    chasseur.applyForce(chasseur.pursue(fuyard1));
    fuyard1.update();
    chasseur.update();
    dmin = Math.min(dmin, fuyard1.pos.dist(chasseur.pos));
  }
  assert.ok(dmin > 100, `le fuyard s’est fait rattraper (distance min ${dmin})`);
  assert.ok(fuyard1.pos.dist(chasseur.pos) >= initiale - 1);
});

function monde() {
  const m = new Monde(CONFIG.graine, 1);
  m.cycle.forcer('nuit');
  m.surPhase('nuit');
  m.papillons.length = 0;
  return m;
}

test('un papillon qui entend une chasseuse proche passe en fuite et l’évite', () => {
  const m = monde();
  const b = m.chauvesSouris[0];
  b.etat = 'chasse';
  b.pos.set(800, m.grotte.milieuY(800));
  const p = new Moth(900, m.grotte.milieuY(900));
  b.cible = p;
  m.papillons.push(p);
  m.pas();
  assert.equal(p.etat, 'fuite');
  assert.ok(p.forces.evade, 'la force evade doit exister');
  assert.equal(p.maxSpeed, CONFIG.papillons.vitesseFuite);
  assert.ok(m.journal.some((e) => e.type === 'fuite'));
});

test('la fuite s’interrompt un moment après la dernière menace entendue', () => {
  const m = monde();
  const b = m.chauvesSouris[0];
  b.etat = 'chasse';
  b.pos.set(800, m.grotte.milieuY(800));
  const p = new Moth(900, m.grotte.milieuY(900));
  b.cible = p;
  m.papillons.push(p);
  m.pas();
  assert.equal(p.etat, 'fuite');
  b.etat = 'errance'; b.cible = null; b.pos.set(100, m.grotte.milieuY(100)); b.eclat = 0;
  for (let i = 0; i < 90; i++) { b.eclat = 0; m.pas(); }
  assert.equal(p.etat, 'vol');
  assert.equal(p.maxSpeed, CONFIG.papillons.vitesseMax);
});

test('le zigzag : la composante perpendiculaire change de signe pendant la fuite', () => {
  const m = monde();
  const b = m.chauvesSouris[0];
  b.etat = 'chasse';
  b.pos.set(800, m.grotte.milieuY(800));
  b.vel.set(2, 0);
  const p = new Moth(1000, m.grotte.milieuY(1000));
  b.cible = p;
  m.papillons.push(p);
  const signes = new Set();
  for (let i = 0; i < 90; i++) {
    b.pos.set(800, m.grotte.milieuY(800));        // la menace reste fixe : seul le zigzag varie
    b.vel.set(0, 0);
    b.etat = 'chasse'; b.cible = p;
    m.pas();
    if (p.forces.evade) signes.add(Math.sign(p.forces.evade.y));
  }
  assert.ok(signes.has(1) && signes.has(-1), 'la force doit osciller des deux côtés');
});

test('nuit complète : des captures ET des échappées', () => {
  const m = new Monde(CONFIG.graine, 36);
  for (let i = 0; i < 76 * 60; i++) m.pas();
  assert.ok(m.stats.captures >= 2, `captures : ${m.stats.captures}`);
  assert.ok(m.stats.echappes >= 1, `échappées : ${m.stats.echappes}`);
});
