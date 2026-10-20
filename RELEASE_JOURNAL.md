# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "2f508488b150175eb91c05e301c8ba2daa56b6d4", "prod": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "prod_tag": "v0.3.0", "staging": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "updated": {"dev": "2026-10-20 13:39 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.3.0 | `8fe4db0` | — |
| staging | — | `8fe4db0` | — |
| dev | — | `2f50848` | 2026-10-20 13:39 UTC |

## Ajouté sur main depuis la dernière release prod (v0.3.0)

#### Nouveautés
- Connexion par authentification unique Keycloak : la page de connexion affiche **Se connecter avec le compte unique** sous le formulaire, uniquement si `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont configurés. La connexion par mot de passe reste disponible. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
  - Nouvelle route `GET /api/auth/keycloak?redirect=<module>` : elle valide la destination comme la connexion par mot de passe, conserve `state`, `nonce` et le vérificateur PKCE dans le cookie `keycloakLogin` (HttpOnly, SameSite Lax, chemin `/api/auth/keycloak`, 10 min), puis répond 303 vers `<KEYCLOAK_REALM_URL>/protocol/openid-connect/auth`.
  - Nouvelle route `GET /api/auth/keycloak/callback` : elle efface toujours ce cookie. Un cookie absent, un `state` différent ou un `code` manquant arrêtent le parcours avant tout appel. Sinon, elle échange le code via BFF User `POST /auth/keycloak`. En cas de succès, elle pose les mêmes cookies `accessToken` / `refreshToken` que la connexion par mot de passe et répond 303 vers le module demandé.
  - En cas d'échec, l'agent revient sur `/?keycloakError=<kind>` avec un message en français. Les cas sont `cancelled`, `expired`, `account` (403 : pas de compte Mairie360 actif), `busy` (429), `unconfigured` et `unavailable`. Une erreur Keycloak empêche aussi la reprise automatique de session, pour que le message reste affiché.

#### Changements de comportement
- La page de connexion et les écrans de récupération adoptent le thème partagé de `@mairie360/lib-components`. Les couleurs claires et sombres et les boutons sont communs, et le fond suit `--mairie-background` au lieu de `#F5F3F0`. Les retours de validation peuvent être fermés : fermer un message conserve la saisie et n'envoie aucune requête. (MAIR-526, [#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Corrections
- Police de l'interface : avant, la feuille de styles imposait `Arial, Helvetica, sans-serif`. Maintenant, la police est la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`), et seuls le thème et la préférence d'apparence de l'utilisateur la choisissent. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Dépendances :
  - `@mairie360/front-kit` est remplacé par `@mairie360/lib-components@0.10.2`, sans changement de comportement.
  - `@mairie360/bff-user-openapi` passe à 1.0.0, puis au build dev `0.0.0-dev.699a1ef…`.
  - Les images des stacks de test sont alignées : `bff-user`, `core-api` 2.1.0, `database` / `liquibase-migrations` 3.2.0.
  - (MAIR-126, MAIR-569, MAIR-575, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#200](https://github.com/mairie360/Login_Web_Service/pull/200), [#212](https://github.com/mairie360/Login_Web_Service/pull/212))
- CI, image de dev et tests :
  - CICD passe en v4.3.1 puis v4.3.2, avec le journal des releases.
  - Le jeton CI est en lecture seule par défaut, et la CI ne tourne sur push que pour `main`.
  - `development.Dockerfile` passe à Node 24.21.0 avec un secret BuildKit.
  - Le test du bundle client est durci.
  - (MAIR-571, MAIR-436, MAIR-126, [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#208](https://github.com/mairie360/Login_Web_Service/pull/208), [#195](https://github.com/mairie360/Login_Web_Service/pull/195), [#210](https://github.com/mairie360/Login_Web_Service/pull/210))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Connexion par authentification unique Keycloak : la page de connexion affiche **Se connecter avec le compte unique** sous le formulaire, uniquement si `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont configurés. La connexion par mot de passe reste disponible. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
  - Nouvelle route `GET /api/auth/keycloak?redirect=<module>` : elle valide la destination comme la connexion par mot de passe, conserve `state`, `nonce` et le vérificateur PKCE dans le cookie `keycloakLogin` (HttpOnly, SameSite Lax, chemin `/api/auth/keycloak`, 10 min), puis répond 303 vers `<KEYCLOAK_REALM_URL>/protocol/openid-connect/auth`.
  - Nouvelle route `GET /api/auth/keycloak/callback` : elle efface toujours ce cookie. Un cookie absent, un `state` différent ou un `code` manquant arrêtent le parcours avant tout appel. Sinon, elle échange le code via BFF User `POST /auth/keycloak`. En cas de succès, elle pose les mêmes cookies `accessToken` / `refreshToken` que la connexion par mot de passe et répond 303 vers le module demandé.
  - En cas d'échec, l'agent revient sur `/?keycloakError=<kind>` avec un message en français. Les cas sont `cancelled`, `expired`, `account` (403 : pas de compte Mairie360 actif), `busy` (429), `unconfigured` et `unavailable`. Une erreur Keycloak empêche aussi la reprise automatique de session, pour que le message reste affiché.

#### Changements de comportement
- La page de connexion et les écrans de récupération adoptent le thème partagé de `@mairie360/lib-components`. Les couleurs claires et sombres et les boutons sont communs, et le fond suit `--mairie-background` au lieu de `#F5F3F0`. Les retours de validation peuvent être fermés : fermer un message conserve la saisie et n'envoie aucune requête. (MAIR-526, [#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Corrections
- Police de l'interface : avant, la feuille de styles imposait `Arial, Helvetica, sans-serif`. Maintenant, la police est la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`), et seuls le thème et la préférence d'apparence de l'utilisateur la choisissent. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Dépendances :
  - `@mairie360/front-kit` est remplacé par `@mairie360/lib-components@0.10.2`, sans changement de comportement.
  - `@mairie360/bff-user-openapi` passe à 1.0.0, puis au build dev `0.0.0-dev.699a1ef…`.
  - Les images des stacks de test sont alignées : `bff-user`, `core-api` 2.1.0, `database` / `liquibase-migrations` 3.2.0.
  - (MAIR-126, MAIR-569, MAIR-575, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#200](https://github.com/mairie360/Login_Web_Service/pull/200), [#212](https://github.com/mairie360/Login_Web_Service/pull/212))
- CI, image de dev et tests :
  - CICD passe en v4.3.1 puis v4.3.2, avec le journal des releases.
  - Le jeton CI est en lecture seule par défaut, et la CI ne tourne sur push que pour `main`.
  - `development.Dockerfile` passe à Node 24.21.0 avec un secret BuildKit.
  - Le test du bundle client est durci.
  - (MAIR-571, MAIR-436, MAIR-126, [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#208](https://github.com/mairie360/Login_Web_Service/pull/208), [#195](https://github.com/mairie360/Login_Web_Service/pull/195), [#210](https://github.com/mairie360/Login_Web_Service/pull/210))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 13:39 UTC | dev | — | `2f50848` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39431614226) |
| 2026-10-20 12:23 UTC | dev | — | `e024f7a` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39421315470) |
| 2026-10-19 22:19 UTC | dev | — | `5bd5bb5` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39333586653) |
| 2026-10-19 22:12 UTC | dev | — | `872b60c` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39332846124) |
| 2026-10-19 21:57 UTC | dev | — | `84a2299` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39330932445) |
| 2026-10-19 20:06 UTC | dev | — | `e967205` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39315996478) |
<!-- release-journal-history:end -->
