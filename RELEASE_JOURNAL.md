# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "5707b66940748411ee02cdae365564c368f5a646", "prod": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "prod_tag": "v0.3.0", "staging": "4acf656e1405c49450b37fb7f51b101943202368", "updated": {"dev": "2026-10-21 09:56 UTC", "staging": "2026-10-20 19:03 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.3.0 | `8fe4db0` | — |
| staging | — | `4acf656` | 2026-10-20 19:03 UTC |
| dev | — | `5707b66` | 2026-10-21 09:56 UTC |

## Ajouté sur main depuis la dernière release prod (v0.3.0)

#### Nouveautés

- Page de connexion : le bouton **Se connecter avec le compte unique** n'apparaît que si `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont définis. Nouvelles routes `GET /api/auth/keycloak?redirect=<module>` (303 vers le realm, cookie `keycloakLogin` de 10 min) et `GET /api/auth/keycloak/callback` (appelle BFF User `POST /auth/keycloak`, pose les cookies de session comme la connexion par mot de passe, puis 303 vers le module). Les échecs reviennent sur `/?keycloakError=<kind>` avec un message en français (annulation, session expirée, compte absent, trop de tentatives, configuration absente, service indisponible). La connexion par mot de passe ne change pas. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))

#### Changements de comportement

- La police du corps passe d'Arial à la pile Geist partagée (`var(--font-geist-sans), system-ui, sans-serif`) ; seuls le thème et la préférence d'apparence de l'utilisateur choisissent la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))
- Page de connexion et formulaires de récupération : thème partagé (couleurs clair/sombre, boutons, fond `var(--mairie-background)`) et messages de retour fermables. Fermer un message conserve le brouillon sans requête supplémentaire. ([#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Technique

- Socle partagé : `@mairie360/front-kit` (archive vendor) remplacé par `@mairie360/lib-components` 0.10.2 en sous-chemins ; test de bundle `npm run test:bundle` ajouté au workflow de performance. (MAIR-126, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#210](https://github.com/mairie360/Login_Web_Service/pull/210))
- Contrat BFF User et images des stacks de test : `@mairie360/bff-user-openapi` passe de `0.0.0-dev` à `1.0.0`, puis à `0.0.0-dev.699a1ef`, puis à `0.0.0-staging.b6b04cf` (image `staging-b6b04cf`) ; la politique de version accepte `0.0.0-staging.<sha40>`. Images de test : core-api 2.1.0, database et liquibase 3.2.0. (MAIR-569 [#200](https://github.com/mairie360/Login_Web_Service/pull/200), MAIR-575 [#212](https://github.com/mairie360/Login_Web_Service/pull/212), MAIR-600 [#214](https://github.com/mairie360/Login_Web_Service/pull/214))
- CI : `mairie360/CICD` épinglé de v4.2.1 à v4.4.0 (passages intermédiaires v4.3.1, v4.3.2, v4.3.3) ; secrets du journal de release transmis ; `cicd.yml` et `contracts.yml` ne se lancent sur `push` que pour `main` ; permissions en lecture seule par défaut. (MAIR-571 [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#208](https://github.com/mairie360/Login_Web_Service/pull/208), MAIR-436 [#195](https://github.com/mairie360/Login_Web_Service/pull/195))
- Image de dev : `development.Dockerfile` passe à Node 24.21.0 épinglé par digest et installe avec `npm ci` via le secret BuildKit `node_auth_token`, sans token dans une couche. (MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195))
- Promotion staging et prod séparée du workflow de base (MAIR-494, [#219](https://github.com/mairie360/Login_Web_Service/pull/219)) et CICD v4.4.0 (MAIR-494, [#220](https://github.com/mairie360/Login_Web_Service/pull/220)).
- Images `database` et `liquibase-migrations` des `docker-compose*.yml` passent en 3.3.0 ; le contenu de cette version n'est pas dans le diff. ([#224](https://github.com/mairie360/Login_Web_Service/pull/224))
- Tests et documentation : tests de non-régression ajoutés, `follow-redirects` 1.16.1 dans le lockfile, `CLAUDE.md` et docs mis à jour. ([#219](https://github.com/mairie360/Login_Web_Service/pull/219))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement

- Un push sur `main` ne déclenche plus que la release dev (`cicd.yml` s'arrête à `release-dev`). Staging et prod se lancent à la main via `promote-staging.yml` et `promote-prod.yml`, avec un verrou par cible. (MAIR-494, [#219](https://github.com/mairie360/Login_Web_Service/pull/219), [#220](https://github.com/mairie360/Login_Web_Service/pull/220))

#### Technique

- Images `database` et `liquibase-migrations` des stacks `docker-compose*.yml` passent de 3.2.0 à 3.3.0 ; le contenu de la migration n'est pas visible dans ce diff. ([#224](https://github.com/mairie360/Login_Web_Service/pull/224))
- `mairie360/CICD` passe de v4.3.2 à v4.3.3 (correctif du journal de release). ([#217](https://github.com/mairie360/Login_Web_Service/pull/217))

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés

- Page de connexion : bouton **Se connecter avec le compte unique** (Keycloak), visible seulement si `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont définis. Routes `GET /api/auth/keycloak?redirect=<module>` et `GET /api/auth/keycloak/callback`, qui échange le code via BFF User `POST /auth/keycloak`. Les échecs affichent un message en français sur `/?keycloakError=<kind>`. La connexion par mot de passe reste inchangée. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))

#### Changements de comportement

- La police du corps passe d'Arial à la pile Geist partagée ; le thème et la préférence d'apparence choisissent la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))
- Page de connexion et formulaires de récupération : thème partagé clair/sombre, boutons et messages de retour fermables, sans perte de brouillon ni requête supplémentaire. ([#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Technique

- Socle partagé : `@mairie360/front-kit` remplacé par `@mairie360/lib-components` 0.10.2 en sous-chemins, avec test de bundle `npm run test:bundle`. (MAIR-126, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#210](https://github.com/mairie360/Login_Web_Service/pull/210))
- Contrat BFF User et images de test : `0.0.0-dev` → `1.0.0` → `dev-699a1ef` → `0.0.0-staging.b6b04cf` (image `staging-b6b04cf`) ; la politique accepte `0.0.0-staging.<sha40>`. Images core-api 2.1.0, database et liquibase 3.2.0. (MAIR-569 [#200](https://github.com/mairie360/Login_Web_Service/pull/200), MAIR-575 [#212](https://github.com/mairie360/Login_Web_Service/pull/212), MAIR-600 [#214](https://github.com/mairie360/Login_Web_Service/pull/214))
- CI : `mairie360/CICD` passe à v4.3.1, puis v4.3.2 ; secrets du journal de release transmis ; `cicd.yml` et `contracts.yml` ne se lancent sur `push` que pour `main` ; permissions en lecture seule par défaut ; `development.Dockerfile` en Node 24.21.0 avec secret BuildKit `node_auth_token`. (MAIR-571 [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#208](https://github.com/mairie360/Login_Web_Service/pull/208), MAIR-436 [#195](https://github.com/mairie360/Login_Web_Service/pull/195))

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 09:56 UTC | dev | — | `5707b66` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39580294585) |
| 2026-10-21 01:41 UTC | dev | — | `45c1619` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39528123271) |
| 2026-10-20 19:03 UTC | staging | — | `4acf656` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39478764314) |
| 2026-10-20 18:58 UTC | dev | — | `4acf656` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39478764314) |
| 2026-10-20 13:39 UTC | dev | — | `2f50848` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39431614226) |
| 2026-10-20 12:23 UTC | dev | — | `e024f7a` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39421315470) |
| 2026-10-19 22:19 UTC | dev | — | `5bd5bb5` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39333586653) |
| 2026-10-19 22:12 UTC | dev | — | `872b60c` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39332846124) |
| 2026-10-19 21:57 UTC | dev | — | `84a2299` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39330932445) |
| 2026-10-19 20:06 UTC | dev | — | `e967205` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39315996478) |
<!-- release-journal-history:end -->
