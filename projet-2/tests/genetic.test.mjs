import test from 'node:test';
import assert from 'node:assert/strict';
import { chargerMonde, BASE, NOMS_BASE } from './helpers/monde.mjs';

const { Genetique, Ville, creerRng } = chargerMonde(BASE, NOMS_BASE);

function permutations(a) {
  if (a.length <= 1) return [a];
  return a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
}

test('chaque individu reste une permutation valide après croisement et mutation', () => {
  const v = new Ville(3);
  const ga = new Genetique(v.matriceDistances(), { rng: creerRng(1), mutation: 1 });
  for (let i = 0; i < 40; i++) ga.suivante();
  const attendu = Array.from({ length: ga.n }, (_, i) => i + 1).join(',');
  for (const g of ga.individus) assert.equal([...g].sort((a, b) => a - b).join(','), attendu);
});

test('la meilleure tournée ne se dégrade jamais (élitisme) et bat le hasard', () => {
  const v = new Ville(5);
  const ga = new Genetique(v.matriceDistances(), { rng: creerRng(2) });
  const depart = ga.meilleureLongueur;
  const moyenneHasard = ga.moyenne;
  for (let i = 0; i < 80; i++) ga.suivante();
  for (let i = 1; i < ga.historique.length; i++) assert.ok(ga.historique[i] <= ga.historique[i - 1] + 1e-9);
  assert.ok(ga.meilleureLongueur < depart);
  assert.ok(ga.meilleureLongueur < moyenneHasard * 0.75, 'bien plus court qu’une tournée au hasard');
});

test('sur 7 livraisons, il trouve l’optimum obtenu par force brute', () => {
  const v = new Ville(8, { ...{ colonnes: 8, lignes: 5, margeX: 130, margeY: 110, pasX: 191, pasY: 170, ruesSupprimees: 0.2, chargeurs: 4 }, livraisons: 7 });
  const d = v.matriceDistances();
  const ga = new Genetique(d, { rng: creerRng(4), population: 80 });
  for (let i = 0; i < 120; i++) ga.suivante();
  const optimum = Math.min(...permutations([1, 2, 3, 4, 5, 6, 7]).map((p) => ga.longueur(p)));
  assert.ok(ga.meilleureLongueur <= optimum + 1e-6, `${ga.meilleureLongueur} vs ${optimum}`);
});

test('même graine, même évolution', () => {
  const d = new Ville(6).matriceDistances();
  const run = () => { const g = new Genetique(d, { rng: creerRng(9) }); for (let i = 0; i < 30; i++) g.suivante(); return g.meilleur.join(); };
  assert.equal(run(), run());
});
