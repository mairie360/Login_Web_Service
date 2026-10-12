---
id: domaine-nom-court
titre: Une phrase qui dit ce qui est vérifié
modules: [login-front, bff-user, core-api]   # ce que le scénario traverse
besoins: [navigateur, mail, db, redis]       # ce qui doit être branché
utilisateurs:                                # comptes à créer via `users.mjs create`
  - label: newcomer
    role: User
---

## Objectif
Pourquoi ce scénario existe (le risque couvert).

## Préconditions
État attendu avant de commencer.

## Étapes
1. **Action** décrite comme le ferait l'utilisateur.
   - Écran: ce qu'on doit voir (texte, redirection, cookie…).
   - Mail: sujet, destinataire, contenu et lien attendus.
   - Base: requête indicative et résultat attendu (confirmer les noms avec `db.mjs --describe`).
   - Redis: clé et TTL attendus.

## Cas limites (optionnel)
Entrées invalides, droits insuffisants, double soumission…

## Nettoyage
Ce qui n'est pas déjà couvert par `users.mjs cleanup`.
