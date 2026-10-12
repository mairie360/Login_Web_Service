---
id: smoke-explorer
titre: Exploration d'un module (calendrier, projets, messages, e-learning, paramètres, tableau de bord)
modules: [selon le module]
besoins: [navigateur, db]
utilisateurs:
  - label: explorateur
    role: User
---

## Objectif
Ces modules n'ont pas encore de scénarios écrits. Ce scénario produit les scénarios manquants.

## Consigne
Module cible: _à préciser dans la demande_ (ex. « explore `calendar` »).

1. Connecté en `explorateur`, parcourir le module comme un nouvel utilisateur: chaque page, bouton, formulaire, filtre.
2. Pour chaque fonctionnalité: la jouer (créer, modifier, supprimer ce qu'on a créé), puis relever en base (`db.mjs --tables`, requêtes `SELECT`) ce qui a changé.
3. Rapporter: liste des fonctionnalités, erreurs vues (console, 5xx, texte brut), incohérences écran/base, suppression des objets créés.
4. Proposer des scénarios au format `_template.md` dans `scenarios/<module>/`, avec les attentes écran/base observées.

## Nettoyage
Tout objet créé en dehors de `users.mjs create` est déclaré avec `users.mjs track …` ou supprimé à la main avant la fin.
