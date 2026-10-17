# AGENTS.md — consignes pour les agents qui travaillent sur ce dépôt

Ce fichier s'adresse aux assistants IA (et aux humains pressés). Il dit **quoi respecter** avant de modifier du code.

## Carte du dépôt

| Dossier | Contenu | Tests |
|---|---|---|
| `projet-1/` | Écho : chauves-souris, sonar, grotte | `cd projet-1 && npm test` (92) |
| `projet-2/` | SkyPost : drones, 4 missions | `cd projet-2 && npm test` (43) |

Aucune dépendance npm : les tests utilisent `node --test` (Node ≥ 18). p5.js est fourni dans `lib/`.

## Règles non négociables

1. **Forces uniquement.** Un comportement renvoie un vecteur `steering = désiré − vitesse` limité à `maxForce`. Il ne modifie jamais `pos` ni `vel`. Seule `update()` intègre.
2. **Tout ce qui bouge étend `Vehicle`**, une sous-classe par fichier, nom de fichier = nom de la classe.
3. **`wander` garde la continuité de direction** : l'angle sur le cercle persiste d'un pas à l'autre.
4. **Ne pas modifier `vehicle.js` à la légère.** Ajouter un comportement est possible ; changer le contrat de `steerVers`, `applyForce` ou `update` ne l'est pas.
5. **Pas de triche pour les agents appris** : un pilote neuronal ne reçoit que ses capteurs. Le « professeur » (fitness) peut voir la carte, le pilote jamais.
6. **Simulation déterministe** : le hasard passe par `creerRng(graine)` ou par `random()` p5 initialisé avec `randomSeed`. Pas de `Math.random()` dans la logique.
7. **Les tests passent avant chaque commit.** Une correction de bug s'accompagne d'un test qui échouait avant.

## Style de code

- Code et commentaires en **français**, noms explicites (`chauveSourisPres`, `meilleureLongueur`).
- Chaque fichier commence par un commentaire qui dit son rôle et les comportements qu'il applique.
- Les réglages numériques vivent dans `config.js`, pas dans les classes.
- La simulation ne dépend pas de p5 pour avancer (elle tourne dans Node) ; seul le dessin et `sketch.js` l'utilisent.

## Commits

Format : `type(comportement): résumé court`, puis un corps qui explique le *pourquoi*.

```
feat(pursue): viser la position future du papillon
fix(avoid): sortir de la roche quand la contention échoue
docs(projet-2): README avec les techniques de chaque mission
```

- Types : `feat`, `fix`, `test`, `docs`, `chore`.
- **Citer les steering behaviors appliqués** dans le résumé ou le corps.
- Un commit = une fonctionnalité. Une branche par fonctionnalité, fusion `--no-ff`.
- Un `fix:` séparé quand un problème est résolu.

## Vérifier son travail

```bash
npm test                              # dans le projet modifié
python3 -m http.server 8080           # puis ouvrir index.html?intro=0
```

Pour l'interface : ouvrir la page, parcourir chaque onglet ou phase, et vérifier la console (aucune erreur). Les captures de `docs/images/` se régénèrent avec le paramètre `?intro=0`.

## Pièges connus

- Un comportement absent de `CONFIG.poids` est **ignoré sans erreur** : ajouter son poids dans chaque état concerné.
- Ne pas utiliser `pkill -f` dans un shell de session (il tue le shell).
- Le réseau de neurones évolue mal avec un seul terrain par génération : garder la moyenne sur `CONFIG.neuro.essais`.
- Les rayons d'évitement partant d'une position déjà dans la marge d'un obstacle doivent rester libres, sinon le drone se fige.
