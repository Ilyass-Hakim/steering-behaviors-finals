# SkyPost — des drones qui apprennent la ville

Une flotte de drones de livraison médicale. Quatre missions, quatre façons de produire un comportement :
une **planifiée**, une **suivie**, une **apprise**, une **évoluée**. Toujours le même principe : seules des
**forces** (`steering = désiré − vitesse`, appliquées par `applyForce`) modifient la vitesse d'un drone.

## Lancer

```bash
cd projet-2
python -m http.server 8080      # puis ouvrir http://localhost:8080
# ou ouvrir index.html directement
npm test                        # 43 tests unitaires (Node ≥ 18, aucune dépendance)
```

## Les quatre missions

| Mission | Technique | Ce qu'on voit |
|---|---|---|
| **1 · Planifier** | **Algorithme génétique** : chromosome = ordre des livraisons, fitness = 1 / longueur par la route (Dijkstra), sélection par tournoi, croisement OX, mutation (échange, inversion), élitisme | La meilleure tournée s'améliore génération après génération ; les rues fermées rallongent les trajets |
| **2 · Voler** | **Path following** + **projection scalaire** (`t = (AP·AB)/|AB|²`), **seek**, **arrive**, **separation** | Anneau blanc = position prédite, point jaune = pied de la perpendiculaire, croix rose = cible visée ; couloir de tolérance |
| **3 · Apprendre** | **Neuroévolution** : réseau tanh 13 → 10 → 2 dont les poids évoluent ; le réseau choisit une vitesse désirée, la force reste celle de Reynolds. **Examen à l'aveugle** sur 8 terrains jamais vus | 70 drones sans carte (9 télémètres + cap vers l'arrivée), le meilleur passe son brevet |
| **4 · Survivre** | **Evolutionary steering** : l'ADN (8 gènes) pèse seek des colis, arrive au chargeur, flee des orages, separation, wander ; batterie, reproduction continue avec mutation | Les stratégies émergent : l'ADN moyen dérive, les morts diminuent |

### Détails qui comptent

- **Distances par la route** : la fitness de la mission 1 utilise Dijkstra sur le graphe des rues, pas la distance à vol d'oiseau.
- **Pas de triche pour le pilote** : le « professeur » note les vols avec un champ de distance par les brèches ; le pilote ne voit que ses télémètres.
- **Fitness moyenne sur 3 terrains** à chaque génération : un coup de chance ne suffit plus (corrigé après des examens instables).
- **Examen à l'aveugle** : 8 terrains fixes (graines 9001…), un brevet est délivré à partir de 6 réussites.
- **Chargeurs à capacité limitée** (3 drones) : les drones doivent se partager l'énergie, ce qui crée de la pression de sélection.

## Architecture

```
src/vehicle.js    Vehicle : seek, arrive, wander, separation, suivreChemin
src/path.js       Chemin (polyligne) + projection scalaire
src/city.js       Ville : graphe de rues, immeubles, Dijkstra
src/genetic.js    Genetique : algorithme génétique (mission 1)
src/drone.js      Drone : suit la tournée (mission 2)
src/neuro.js      Reseau + Neuroevolution (mission 3)
src/arene.js      Arene : terrains, télémètres, champ de distance
src/pilote.js     Pilote : drone à cerveau neuronal
src/ecole.js      Ecole : entraînement + examen à l'aveugle
src/adn.js        ADN : gènes de la mission 4
src/drone-evo.js  DroneEvo : drone à batterie et à ADN
src/colonie.js    Colonie : écosystème, reproduction, sélection
src/vue-*.js, rendu.js, ui.js, sketch.js   dessin, interface et boucle p5
```

Chaque entité mobile étend `Vehicle`, une sous-classe par fichier. Les simulations sont déterministes
(graines fixes) et tournent sans navigateur dans les tests.

## Raccourcis

`1 2 3 4` missions · `Espace` pause · `R` relancer · `V` vue épurée · `Tab` panneau · `?` aide.
