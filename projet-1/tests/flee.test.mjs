import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Monde, Owl, CONFIG } = chargerMonde(BASE, NOMS_BASE);

function nuit(n = 12) {
  const m = new Monde(CONFIG.graine, n);
  m.cycle.forcer('nuit');
  m.surPhase('nuit');
  m.papillons.length = 0;
  m.hibouPrevu = null;
  return m;
}

test('le hibou entre par l’entrée de la grotte et il est annoncé dans le journal', () => {
  const m = nuit(2);
  m.appelerHibou();
  assert.ok(m.hibou);
  assert.ok(m.hibou.pos.x > m.grotte.w - 60);
  assert.ok(m.journal.some((e) => e.type === 'hibou'));
});

test('le hibou est programmé pendant la nuit, aux dates configurées', () => {
  const m = new Monde(CONFIG.graine, 4);
  m.cycle.forcer('nuit');
  m.surPhase('nuit');
  const [a, b] = CONFIG.hibouApparitionNuit;
  assert.ok(m.hibouPrevu >= a && m.hibouPrevu <= b);
  assert.equal(m.hibou, null);
  const prevu = m.hibouPrevu;
  while (!m.hibou && m.cycle.phase === 'nuit') m.pas();
  assert.ok(m.hibou, 'le hibou doit apparaître');
  assert.ok(Math.abs(m.cycle.temps - prevu) < 0.1);
});

test('une chauve-souris proche du hibou passe en fuite, pas une chauve-souris lointaine', () => {
  const m = nuit(2);
  const [proche, loin] = m.chauvesSouris;
  m.appelerHibou();
  m.hibou.pos.set(800, m.grotte.milieuY(800));
  proche.pos.set(900, m.grotte.milieuY(900)); proche.vel.set(1, 0);
  loin.pos.set(100, m.grotte.milieuY(100)); loin.vel.set(1, 0);
  m.pas();
  assert.equal(proche.etat, 'fuite');
  assert.equal(loin.etat, 'errance');
  assert.equal(m.stats.alertes, 1);
  assert.ok(proche.forces.flee, 'la force flee doit exister');
});

test('flee : la force pousse à l’opposé du hibou', () => {
  const m = nuit(1);
  const b = m.chauvesSouris[0];
  m.appelerHibou();
  m.hibou.pos.set(800, m.grotte.milieuY(800));
  b.pos.set(900, m.grotte.milieuY(900)); b.vel.set(0.5, 0);
  m.pas();
  assert.ok(b.forces.flee.x > 0, `la fuite doit aller vers la droite : ${b.forces.flee.x}`);
});

test('la chauve-souris en fuite s’éloigne et le hibou ne la rattrape jamais', () => {
  const m = nuit(1);
  const b = m.chauvesSouris[0];
  m.appelerHibou();
  m.hibou.pos.set(700, m.grotte.milieuY(700));
  b.pos.set(850, m.grotte.milieuY(850)); b.vel.set(1, 0);
  let dmin = Infinity;
  for (let i = 0; i < 900; i++) {
    m.pas();
    if (!m.hibou) break;
    dmin = Math.min(dmin, Math.hypot(m.hibou.pos.x - b.pos.x, m.hibou.pos.y - b.pos.y));
  }
  assert.ok(dmin > 25, `le hibou est passé à ${dmin} px`);
});

test('le hibou repart après sa durée et la colonie se calme', () => {
  const m = nuit(6);
  m.appelerHibou();
  let pas = 0;
  while (m.hibou && pas++ < 60 * 60) m.pas();
  assert.equal(m.hibou, null, 'le hibou doit quitter la grotte');
  for (let i = 0; i < 400; i++) m.pas();
  assert.ok(m.chauvesSouris.every((b) => b.etat !== 'fuite'), 'plus personne ne fuit');
});

test('désactiver flee supprime la fuite (case à cocher de l’interface)', () => {
  const m = nuit(1);
  const b = m.chauvesSouris[0];
  m.actifs.flee = false;
  m.appelerHibou();
  m.hibou.pos.set(800, m.grotte.milieuY(800));
  b.pos.set(900, m.grotte.milieuY(900));
  m.pas();
  assert.equal(b.forces.flee, undefined);
});

test('nuit entière avec hibou : personne dans la roche, le hibou non plus', () => {
  const m = new Monde(CONFIG.graine, 36);
  let collisions = 0;
  let vuHibou = false;
  for (let i = 0; i < 76 * 60; i++) {
    m.pas();
    if (m.hibou) {
      vuHibou = true;
      if (m.grotte.estSolide(m.hibou.pos.x, m.hibou.pos.y)) collisions++;
    }
    for (const b of m.chauvesSouris) if (b.etat !== 'repos' && m.grotte.estSolide(b.pos.x, b.pos.y)) collisions++;
  }
  assert.ok(vuHibou);
  assert.equal(collisions, 0);
  assert.ok(m.stats.alertes > 5, `alertes : ${m.stats.alertes}`);
});
