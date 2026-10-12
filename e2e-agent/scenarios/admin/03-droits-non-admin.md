---
id: admin-droits
titre: Un utilisateur ordinaire ne peut rien faire d'administratif
modules: [admin-front, bff-user, core-api]
besoins: [navigateur]
utilisateurs:
  - label: ordinaire
    role: User
---

## Objectif
Aucune route d'administration n'est accessible sans le rôle `admin`, même par détour d'URL.

## Étapes
Prérequis: `ordinaire` a fait sa première connexion et se connecte.

1. **Ouvrir `admin.<domaine>`** directement.
   - Écran: refus ou redirection, aucune donnée d'administration affichée.
2. **Appeler chaque route `/bff/admin/*`** (users, roles, groups, sessions, y compris POST/PATCH/DELETE sur un id inexistant) avec le JWT d'`ordinaire`.
   - Attendu: 403 partout (ou 401), jamais 200/404 qui révèleraient l'existence d'une ressource.
3. **Sans jeton / jeton falsifié** (signature modifiée): 401 sur `/me` et `/bff/admin/users`.
4. **Droit sur les données d'autrui**: `GET /user/{id de l'admin}/about` renvoie uniquement les champs publics (pas de rôle ni de groupes).

## Cas limites
- Le rôle lu dans le JWT n'a pas d'effet: se donner `role=admin` dans un JWT forgé est refusé (401, signature).
