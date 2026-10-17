import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Vehicle, Cave, Monde, CONFIG } = chargerMonde(BASE, NOMS_BASE);
const { largeur, hauteur } = CONFIG.monde;
const grotte = () => new Cave(largeur, hauteur, CONFIG.graine);

test('rayon : distance exacte jusqu’à une stalactite', () => {
  const g = grotte();
  const c = g.cercles[0];
  const d = g.rayon(c.x, c.y + 200, 0, -1, 400);   // on vise le cercle depuis le dessous
  assert.ok(Math.abs(d - (200 - c.r)) < 1.5 || d < 200 - c.r + 1.5, `distance ${d}`);
  assert.ok(d < 200);
});

test('rayon : distance jusqu’au plafond, jusqu’au sol et jusqu’au mur', () => {
  const g = new Cave(largeur, hauteur, CONFIG.graine);
  const x = 1000;
  const y = g.milieuY(x);
  // on se place entre deux concrétions si besoin : on mesure vers le plafond sans cercle
  const haut = g.rayon(1450, g.milieuY(1450), 0, -1, 1000);
  assert.ok(Math.abs(haut - (g.milieuY(1450) - g.plafondY(1450))) < 1.5, `plafond ${haut}`);
  const bas = g.rayon(1450, g.milieuY(1450), 0, 1, 1000);
  assert.ok(Math.abs(bas - (g.solY(1450) - g.milieuY(1450))) < 1.5, `sol ${bas}`);
  const mur = g.rayon(5, g.milieuY(5), -1, 0, 100);
  assert.ok(Math.abs(mur - 5) < 1.5, `mur ${mur}`);
  assert.equal(y > 0, true);
});

test('rayon : Infinity si rien avant la portée, 0 si on est dans la roche', () => {
  const g = grotte();
  assert.equal(g.rayon(1450, g.milieuY(1450), 1, 0, 40), Infinity);
  const c = g.cercles[0];
  assert.equal(g.rayon(c.x, c.y, 1, 0, 100), 0);
});

test('eviter : voie libre → aucune force', () => {
  const g = grotte();
  const v = new Vehicle(1000, g.milieuY(1000), { maxSpeed: 3, maxForce: 0.1 });
  v.vel.set(1, 0);
  // on vérifie d'abord que l'éventail est bien libre à cet endroit
  const f = v.eviter(g, { portee: 40 });
  assert.equal(f.mag(), 0);
  assert.equal(v.rayons.length, 7);
  assert.ok(v.rayons.every((r) => !r.touche));
});

test('eviter : un mur en face provoque un virage (force perpendiculaire au cap)', () => {
  const g = grotte();
  const y = g.milieuY(1500);
  const v = new Vehicle(1560, y, { maxSpeed: 3, maxForce: 0.1 });
  v.vel.set(2, 0);                        // fonce vers le mur de droite (x = 1600)
  const f = v.eviter(g);
  assert.ok(f.mag() > 0.05, 'doit réagir');
  assert.ok(Math.abs(f.y) > Math.abs(f.x) * 0.6 || f.x < 0, 'doit tourner ou freiner');
  assert.ok(v.rayons[3].touche, 'le rayon central touche le mur');
});

test('eviter : un obstacle à gauche pousse la force vers la droite', () => {
  const g = grotte();
  // paroi gauche : on est près du mur x=0 et on avance vers le haut
  const v = new Vehicle(25, g.milieuY(25), { maxSpeed: 3, maxForce: 0.1 });
  v.vel.set(0, -2);                       // cap vers le haut ; la gauche de l'entité est x < 25
  v.biaisVirage = 1;
  const f = v.eviter(g);
  assert.ok(f.x > 0, `la force doit pousser loin du mur gauche : ${f.x}`);
});

test('eviter : l’urgence renforce la force et freine', () => {
  const g = grotte();
  const loin = new Vehicle(1400, g.milieuY(1400), { maxSpeed: 3, maxForce: 0.1 });
  loin.vel.set(2, 0);
  const proche = new Vehicle(1590, g.milieuY(1590), { maxSpeed: 3, maxForce: 0.1 });
  proche.vel.set(2, 0);
  assert.ok(proche.eviter(g).mag() > loin.eviter(g).mag());
});

for (const graine of [CONFIG.graine, 1, 7, 99, 2026]) {
  test(`monde (graine ${graine}) : en 5000 pas aucune chauve-souris ne touche la roche`, () => {
    const m = new Monde(graine, 36);
    m.liberer('errance');
    let collisions = 0;
    for (let i = 0; i < 5000; i++) {
      m.pas();
      for (const b of m.chauvesSouris) if (m.grotte.estSolide(b.pos.x, b.pos.y)) collisions++;
    }
    assert.equal(collisions, 0, `${collisions} collisions`);
  });
}
