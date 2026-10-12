---
id: auth-premiere-connexion
titre: Compte créé par un admin, changement de mot de passe forcé à la première connexion
modules: [login-front, bff-user, core-api]
besoins: [navigateur, db, redis]
utilisateurs:
  - label: newcomer
    role: User
---

## Objectif
Un compte créé par un administrateur ne peut pas ouvrir de session tant que son mot de passe temporaire n'a pas été changé, et le jeton à usage unique ne sert qu'une fois.

## Étapes
1. **Connexion avec le mot de passe temporaire** (donné par `users.mjs create`).
   - Écran: formulaire de changement de mot de passe, pas de dashboard. Cookie `passwordChangeToken` (HttpOnly, path `/api/auth`), pas de cookie `accessToken`.
   - Base: aucune session ouverte pour l'utilisateur.
   - Redis: un jeton de première connexion existe (clé préfixée `core-api:`, `scan 'core-api:*'` avant/après), avec un TTL borné.
2. **Mot de passe trop court** (7 caractères) puis valide (≥ 8).
   - Écran: erreur de validation puis succès; reconnexion automatique avec le nouveau mot de passe, arrivée sur le dashboard.
   - Base: `users.password` change et reste un hash argon2 (`$argon2id$…`, jamais le clair); une session est ouverte.
3. **Rejouer l'ancien jeton** (requête `force_change_password` avec le jeton déjà consommé).
   - Attendu: 401/403, et le cookie `passwordChangeToken` est effacé; l'ancien mot de passe temporaire ne permet plus de se connecter.
4. **Rejouer le mot de passe temporaire** en connexion.
   - Écran: « Email ou mot de passe incorrect. »

## Cas limites
- Rafraîchir la page de changement de mot de passe après expiration (10 min): retour au formulaire de connexion (`restartLogin`).
