# Steering Behaviors — Projets finaux

Deux simulations [p5.js](https://p5js.org/) qui réunissent, à elles deux, **tous les steering behaviors** vus en cours (Craig Reynolds, *The Nature of Code* de Daniel Shiffman).

| Projet | Thème | Nature des comportements |
|---|---|---|
| [`projet-1/`](projet-1) — **Écho** | Une nuit de chauves-souris dans une grotte noire, révélée par leur sonar | Comportements **programmés**, combinés |
| [`projet-2/`](projet-2) — **SkyPost** | Des drones de livraison médicale qui apprennent une ville | Comportements **appris** (évolution, neuroévolution) |

## Répartition des steering behaviors

**Projet 1 — Écho** : wander, obstacle avoidance (sonar), boids (séparation, alignement, cohésion), seek, pursue, evade, flee, arrive.

**Projet 2 — SkyPost** : algorithme génétique, projection scalaire, path following, neuroévolution (avec examen à l'aveugle), evolutionary steering.

## Règles d'architecture

- Toute entité mobile étend `Vehicle`, une sous-classe par fichier.
- Uniquement des forces : `steering = désiré − vitesse`, appliquées via `applyForce`. Jamais de changement direct de position.
- `wander` conserve la continuité de direction.
- Les tests unitaires passent avant chaque commit.
- Aucun `vehicle.js` n'est modifié sans décision explicite.

## Historique

Un commit par fonctionnalité. Le message nomme le steering behavior appliqué :
`feat(wander): …`, `feat(obstacle-avoidance): …`, `fix(…): …`.
