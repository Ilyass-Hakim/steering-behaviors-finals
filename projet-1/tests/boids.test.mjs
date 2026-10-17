import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Vehicle, Monde, CONFIG, Chef, NightCycle } = chargerMonde(BASE, NOMS_BASE);

const voisin = (x, y, vx = 0, vy = 0) => ({ pos: { x, y }, vel: { x: vx, y: vy, copy() { return this; } } });
const vehicule = (x = 0, y = 0) => new Vehicle(x, y, { maxSpeed: 3, maxForce: 0.2 });

test('seek : la force pointe vers la cible, bornée par maxForce', () => {
  const v = vehicule();
  const f = v.seek({ x: 100, y: 0 });
  assert.ok(f.x > 0 && Math.abs(f.y) < 1e-9);
  assert.ok(f.mag() <= 0.2 + 1e-9);
  assert.equal(v.seek({ x: 0, y: 0 }).mag(), 0);
});

test('boids sans voisins : trois forces nulles', () => {
  const b = vehicule().boids([]);
  assert.equal(b.separation.mag() + b.alignment.mag() + b.cohesion.mag(), 0);
});

test('séparation : s’écarte d’un voisin trop proche, ignore un voisin lointain', () => {
  const v = vehicule(0, 0);
  const b = v.boids([voisin(10, 0)]);
  assert.ok(b.separation.x < 0, 'doit fuir vers la gauche');
  const loin = v.boids([voisin(200, 0)]);
  assert.equal(loin.separation.mag(), 0);
});

test('séparation : plus forte quand le voisin est plus près (pondération en 1/d)', () => {
  const v = vehicule(0, 0);
  v.vel.set(0, 0);
  const pres = v.boids([voisin(6, 0), voisin(-30, 0)]).separation;
  // le voisin à 6 px domine celui à 30 px : la poussée va vers la gauche
  assert.ok(pres.x < 0);
});

test('alignement : prend la vitesse moyenne des voisins', () => {
  const v = vehicule(0, 0);
  v.vel.set(1, 0);
  const f = v.boids([voisin(40, 0, 0, 2), voisin(0, 40, 0, 2)]).alignment;
  assert.ok(f.y > 0, 'doit virer dans le sens des voisins');
});

test('cohésion : se dirige vers le centre des voisins', () => {
  const v = vehicule(0, 0);
  const f = v.boids([voisin(60, 60), voisin(100, 60)]).cohesion;
  assert.ok(f.x > 0 && f.y > 0);
});

test('boids : un voisin à la même position ne produit pas de NaN', () => {
  const v = vehicule(5, 5);
  const b = v.boids([voisin(5, 5)]);
  for (const f of Object.values(b)) assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y));
});

test('chef : suit son chemin point par point et le termine', () => {
  const m = new Monde(CONFIG.graine, 4);
  const chef = new Chef(m.cheminColonie());
  let pas = 0;
  while (!chef.fini && pas < 4000) { chef.penser(m); chef.update(); pas++; }
  assert.ok(chef.fini, `chemin non terminé après ${pas} pas`);
  assert.ok(pas < 1500, `trop lent : ${pas} pas`);
  assert.equal(m.grotte.estSolide(chef.pos.x, chef.pos.y), false);
});

test('cycle : crépuscule → nuit au bout de la durée configurée, puis boucle', () => {
  const c = new NightCycle({ crepuscule: 2, nuit: 3 });
  assert.equal(c.phase, 'crepuscule');
  let changement = null;
  for (let i = 0; i < 119; i++) assert.equal(c.avancer(1 / 60), null);
  changement = c.avancer(1 / 60);
  assert.equal(changement, 'nuit');
  assert.equal(c.numeroNuit, 1);
  for (let i = 0; i < 180; i++) changement = c.avancer(1 / 60) || changement;
  assert.equal(c.phase, 'crepuscule');
  assert.equal(c.numeroNuit, 2);
  assert.equal(c.forcer('nuit'), 'nuit');
  assert.equal(c.temps, 0);
});

test('monde : les départs sont échelonnés et la colonie sort tout entière', () => {
  const m = new Monde(CONFIG.graine, 36);
  assert.ok(m.chauvesSouris.every((b) => b.etat === 'repos'));
  for (let i = 0; i < 60; i++) m.pas();
  const enVol1 = m.chauvesSouris.filter((b) => b.etat !== 'repos').length;
  assert.ok(enVol1 < 36, 'ils ne partent pas tous ensemble');
  for (let i = 0; i < 300; i++) m.pas();
  assert.ok(m.chauvesSouris.every((b) => b.etat === 'sortie'), 'tous en vol après 5 s');
  assert.ok(m.chauvesSouris.every((b) => b.place === null));
});

test('crépuscule : la nuée est polarisée (alignement des vitesses) et ne touche pas la roche', () => {
  const m = new Monde(CONFIG.graine, 36);
  let collisions = 0;
  let polarisation = 0;
  let mesures = 0;
  for (let i = 0; i < 16 * 60 - 5; i++) {
    m.pas();
    for (const b of m.chauvesSouris) if (b.etat !== 'repos' && m.grotte.estSolide(b.pos.x, b.pos.y)) collisions++;
    if (i > 8 * 60 && i % 30 === 0) {
      let sx = 0; let sy = 0; let somme = 0;
      for (const b of m.chauvesSouris) { sx += b.vel.x; sy += b.vel.y; somme += b.vel.mag(); }
      polarisation += Math.hypot(sx, sy) / somme;
      mesures++;
    }
  }
  assert.equal(collisions, 0);
  assert.ok(polarisation / mesures > 0.45, `polarisation moyenne ${polarisation / mesures}`);
});

test('monde : à la tombée de la nuit toutes les chauves-souris passent en errance', () => {
  const m = new Monde(CONFIG.graine, 20);
  m.cycle.forcer('nuit');
  m.surPhase('nuit');
  assert.ok(m.chauvesSouris.every((b) => b.etat === 'errance'));
  assert.equal(m.chef, null);
});

test('comportement désactivé : monde.actifs.wander = false supprime la force wander', () => {
  const m = new Monde(CONFIG.graine, 5);
  m.cycle.forcer('nuit');
  m.surPhase('nuit');
  m.actifs.wander = false;
  m.pas();
  assert.ok(m.chauvesSouris.every((b) => b.forces.wander === undefined));
});
