---
id: auth-mot-de-passe-oublie
titre: Mot de passe oublié puis réinitialisation, e-mail réellement reçu
modules: [login-front, bff-user, core-api, resend]
besoins: [navigateur, mail, db, redis]
utilisateurs:
  - label: forgetful
    role: User
---

## Objectif
Le flux de récupération envoie un vrai e-mail, le lien fonctionne une seule fois, et un lien reçu ne révèle pas l'existence d'un compte.

## Étapes
Prérequis: `forgetful` a fait sa première connexion (voir `02`).

1. **Demander la réinitialisation** pour `forgetful` depuis la page de connexion, noter l'heure.
   - Écran: message de confirmation neutre.
   - Mail: un e-mail à l'alias de `forgetful` arrive via Resend (`last_event` = `delivered`), expéditeur `Mairie360 (staging) <noreply@mairie360-eip.fr>`, un lien vers `login.<domaine>` (jamais `localhost`, jamais un autre environnement).
2. **Même demande pour une adresse inconnue**.
   - Écran: exactement le même message qu'à l'étape 1; Mail: aucun e-mail.
3. **Suivre le lien** et définir un nouveau mot de passe.
   - Écran: confirmation puis connexion possible avec le nouveau mot de passe; l'ancien est refusé.
   - Base: `users.password` modifié (hash); les sessions antérieures de l'utilisateur sont révoquées (`sessions` révoquées/expirées).
   - Redis: clé `revoked:<sid>` présente pour la session révoquée, avec un TTL.
4. **Réutiliser le même lien**.
   - Attendu: refus (jeton consommé ou expiré), aucun changement de mot de passe.

## Cas limites
- Lien altéré (un caractère modifié): refus.
- Deux demandes de suite: seul le dernier lien (ou tous, selon la règle de Core: noter ce qui est observé) fonctionne.
