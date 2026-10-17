import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Cave, CONFIG } = chargerMonde(BASE, NOMS_BASE);
const { largeur, hauteur } = CONFIG.monde;

test('la grotte est déterministe : même graine, même géométrie', () => {
  const a = new Cave(largeur, hauteur, 123);
  const b = new Cave(largeur, hauteur, 123);
  assert.equal(a.cercles.length, b.cercles.length);
  for (let x = 0; x <= largeur; x += 50) {
    assert.equal(a.plafondY(x), b.plafondY(x));
    assert.equal(a.solY(x), b.solY(x));
  }
  const c = new Cave(largeur, hauteur, 124);
  assert.notEqual(a.plafondY(1000), c.plafondY(1000));
});

test('le plafond est toujours au-dessus du sol, avec un grand espace libre', () => {
  for (const graine of [1, 7, 99, CONFIG.graine]) {
    const g = new Cave(largeur, hauteur, graine);
    for (let x = 0; x <= largeur; x += 10) {
      assert.ok(g.solY(x) - g.plafondY(x) > 500, `écart trop faible à x=${x}, graine ${graine}`);
    }
  }
});

test('le couloir central (±55 px autour du milieu) reste libre de roche', () => {
  for (const graine of [1, 7, 99, CONFIG.graine]) {
    const g = new Cave(largeur, hauteur, graine);
    for (let x = 20; x < largeur - 20; x += 12) {
      const m = g.milieuY(x);
      for (const dy of [-50, 0, 50]) {
        assert.equal(g.estSolide(x, m + dy), false, `roche dans le couloir à x=${x}, dy=${dy}, graine ${graine}`);
      }
    }
  }
});

test('estSolide : hors de la grotte, dans le plafond, dans une stalactite', () => {
  const g = new Cave(largeur, hauteur, CONFIG.graine);
  assert.equal(g.estSolide(-5, 400), true);
  assert.equal(g.estSolide(largeur + 5, 400), true);
  assert.equal(g.estSolide(300, g.plafondY(300) - 3), true);
  assert.equal(g.estSolide(300, g.solY(300) + 3), true);
  const c = g.cercles[0];
  assert.equal(g.estSolide(c.x, c.y), true);
});

test('les concrétions restent en dehors de la zone de repos', () => {
  const g = new Cave(largeur, hauteur, CONFIG.graine);
  const { x0, x1 } = g.zoneRepos;
  for (const f of g.formes.filter((f) => f.type === 'stalactite')) {
    assert.ok(f.x < x0 - 40 || f.x > x1 + 40, `stalactite en zone de repos (x=${f.x})`);
  }
});

test('places de repos : assez nombreuses, sur le plafond, réservées une seule fois', () => {
  const g = new Cave(largeur, hauteur, CONFIG.graine);
  assert.ok(g.places.length >= 100);
  for (const p of g.places) assert.ok(p.y > g.plafondY(p.x) && p.y < g.plafondY(p.x) + 60);
  const p1 = g.reserverPlace(400, 0);
  const p2 = g.reserverPlace(400, 0);
  assert.notEqual(p1, p2);
  assert.equal(p1.prise, true);
  g.libererPlaces();
  assert.equal(p1.prise, false);
});

test('l’entrée de la grotte est à droite, au milieu', () => {
  const g = new Cave(largeur, hauteur, CONFIG.graine);
  assert.equal(g.entree.x, largeur);
  assert.ok(Math.abs(g.entree.y - g.milieuY(largeur - 1)) < 1e-9);
});
