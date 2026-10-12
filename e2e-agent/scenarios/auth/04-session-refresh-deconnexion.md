---
id: auth-session
titre: Refresh du JWT, rotation du refresh token, déconnexion et révocation immédiate
modules: [login-front, bff-user, core-api, redis]
besoins: [navigateur, db, redis]
utilisateurs:
  - label: sessions
    role: User
---

## Objectif
Une session révoquée cesse de fonctionner tout de suite, partout, et le refresh token ne sert qu'une fois.

## Étapes
Prérequis: `sessions` a fait sa première connexion.

1. **Se connecter dans deux sessions navigateur** A et B avec `sessions`.
   - Base: deux lignes `sessions` actives pour l'utilisateur.
2. **Rafraîchir** (A): déclencher `/auth/refresh` avec le cookie `refreshToken`, puis rejouer l'**ancien** refresh token.
   - Attendu: le premier renvoie un nouveau JWT et un nouveau `refreshToken` (cookie remplacé); le rejeu est refusé (401).
   - Base: `token_hash` de la session change (rotation).
3. **Se déconnecter** (A).
   - Écran: retour à la connexion; cookies `accessToken` et `refreshToken` effacés.
   - Base: la session A est révoquée; B reste active.
   - Redis: `exists revoked:<sid de A>` = true, TTL > 0.
4. **Rejouer le JWT de A** (copié avant la déconnexion) sur `/me`.
   - Attendu: 401 immédiat (révocation), sans attendre l'expiration du JWT.
5. **Historique** (admin): `/bff/admin/sessions/history` liste la connexion de `sessions`; paginer avec `limit` et `offset`, et `limit=501` doit répondre 400.

## Cas limites
- Déconnexion avec Redis indisponible: non testable ici (noter « non vérifié »).
