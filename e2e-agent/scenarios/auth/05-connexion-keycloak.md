---
id: auth-keycloak-sso
titre: Connexion SSO Keycloak, liaison de compte, déconnexion unique
modules: [login-front, bff-user, core-api, keycloak]
besoins: [navigateur, db]
utilisateurs:
  - label: sso
    role: User
---

## Objectif
Un utilisateur peut se connecter via Keycloak, le compte est résolu sans jamais en créer un, et la déconnexion ferme aussi la session Keycloak.

## Étapes
Prérequis: l'utilisateur doit exister côté Keycloak (créé par le miroir d'administration de Core ou par la migration). Vérifier d'abord son existence dans le realm (console par `port-forward.sh --keycloak`). Si le bouton SSO n'existe pas dans l'UI, noter « SSO non exposé » et s'arrêter.

1. **Connexion SSO** avec `sso`.
   - Écran: redirection vers `auth.<domaine>`, authentification, retour sur le front, session ouverte.
   - Base: une ligne dans `user_identities` liant le `sub` Keycloak à l'utilisateur; aucun nouvel utilisateur créé.
2. **Seconde connexion SSO**: même compte, aucune seconde ligne `user_identities`.
3. **Compte inexistant côté Core** (utilisateur Keycloak sans compte Core): refus, aucun compte créé.
4. **Déconnexion**.
   - Écran: navigation vers l'URL de fin de session Keycloak (`logout_url`), puis retour; une nouvelle tentative SSO redemande l'authentification.

## Cas limites
- Keycloak coupé: la connexion par mot de passe reste possible (le 503 de Core est géré). Non testable sans accès au cluster: « non vérifié ».
