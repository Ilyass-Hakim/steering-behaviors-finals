# Écho — une nuit de chauves-souris

Une grotte **noire**. On ne voit que ce que le **sonar** des chauves-souris révèle : chaque cri
envoie une onde, les parois, les papillons et le hibou s'allument au passage du front d'onde puis
s'éteignent. Toute la simulation est pilotée par des **steering behaviors** de Reynolds.

## Lancer

```bash
cd projet-1
python -m http.server 8080      # puis ouvrir http://localhost:8080
# ou simplement ouvrir index.html dans le navigateur
npm test                        # 92 tests unitaires (Node ≥ 18, aucune dépendance)
```

## Les steering behaviors et où les voir

| Behavior | Où | Ce qu'on voit |
|---|---|---|
| **wander** | Chauves-souris la nuit, papillons | Courbes douces, direction continue ; cercle d'errance dans l'inspecteur |
| **obstacle avoidance** | Tout le monde | 7 rayons de sonar ; virage vers le rayon le plus dégagé |
| **separation** | Colonie | Les voisines s'écartent |
| **alignment** | Crépuscule | La nuée prend un cap commun |
| **cohesion** | Crépuscule | La nuée reste groupée |
| **seek** | Sortie (suit le chef de colonie), chasse, approche du gîte | Flèche violette |
| **pursue** | Chasse | Viseur rose : on vise où le papillon *sera* |
| **evade** | Papillons | Le papillon fuit la position *future* de la chasseuse |
| **flee** | Arrivée du hibou | La colonie s'éparpille à l'opposé du danger |
| **arrive** | Aube | Freinage doux jusqu'à la place, puis suspension tête en bas |

Seules des **forces** modifient la vitesse : `steering = désiré − vitesse`, limité à `maxForce`,
appliqué par `applyForce`. L'interface permet de **désactiver chaque comportement** en direct pour
constater son effet, et l'**inspecteur** affiche l'intensité de chaque force sur la bête cliquée.

## Cycle d'une nuit

Crépuscule (sortie en nuée) → Nuit (errance, chasse, hibou) → Aube (retour au gîte) → Repos.

## Architecture

```
src/vehicle.js   Vehicle : tous les comportements (pos, vel, acc, forces)
src/bat.js       Bat, machine à états : repos · sortie · errance · chasse · fuite · retour
src/moth.js      Moth : vol, pose, fuite (evade)
src/owl.js       Owl : prédateur lent et lourd
src/chef.js      Chef : meneur de la nuée (suit un chemin avec seek)
src/cave.js      Cave : parois, concrétions, places au gîte, lancer de rayons
src/sonar.js     Sonar : ondes, points de surface, révélation
src/cycle.js     NightCycle : phases et lumière
src/world.js     Monde : assemble et fait avancer la simulation (pas fixe de 1/60 s)
src/stats.js     Calculs de l'interface (fonctions pures)
src/ui.js        Interface HTML ; src/sketch.js : boucle p5
```

Chaque entité mobile étend `Vehicle`, une sous-classe par fichier. La simulation est déterministe
(graine fixe) et tourne sans navigateur dans les tests.

## Raccourcis

`Espace` pause · `N` phase suivante · `1 2 3` crépuscule/nuit/aube · `H` hibou · `V` vecteurs ·
`R` rayons · `L` lumière · `G` nouvelle grotte · `Tab` panneau · `?` aide.
