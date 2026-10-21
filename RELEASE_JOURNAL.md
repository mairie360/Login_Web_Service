# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "prod": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "prod_tag": "v0.3.0", "staging": "4acf656e1405c49450b37fb7f51b101943202368", "updated": {"dev": "2026-10-21 10:51 UTC", "staging": "2026-10-20 19:03 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.3.0 | `8fe4db0` | — |
| staging | — | `4acf656` | 2026-10-20 19:03 UTC |
| dev | — | `c9d6a7f` | 2026-10-21 10:51 UTC |

## Ajouté sur main depuis la dernière release prod (v0.3.0)

#### Nouveautés
- Connexion unique Keycloak : le bouton « Se connecter avec le compte unique » apparaît sur la page de connexion si `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont définis. Nouvelles routes `GET /api/auth/keycloak?redirect=<module>` (303 vers le realm) et `GET /api/auth/keycloak/callback` (pose les cookies de session puis 303 vers le module). En cas d'échec, retour sur `/?keycloakError=<kind>` avec un message en français (annulée, expirée, compte, trop de tentatives, non configurée, indisponible). (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Thème partagé (lib-components 0.9.0, puis 0.10.2) sur la connexion, la récupération de mot de passe et la déconnexion, en clair comme en sombre. Les messages de validation se ferment ; fermer un récépissé conserve le brouillon. (MAIR-526, [#198](https://github.com/mairie360/Login_Web_Service/pull/198))
#### Changements de comportement
- La police du corps de page passe d'Arial à la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`) : seuls le thème et la préférence d'apparence choisissent la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))
- Un push sur `main` ne déclenche plus la promotion staging ni prod : `cicd.yml` s'arrête à `release-dev`, et staging et prod se promeuvent à la main via `promote-staging.yml` et `promote-prod.yml`. (MAIR-494, [#219](https://github.com/mairie360/Login_Web_Service/pull/219), [#220](https://github.com/mairie360/Login_Web_Service/pull/220))
- Les stacks de test démarrent sur core-api 2.2.0, bff-user 1.1.0, database 3.3.0 et liquibase-migrations 3.3.0 ; le contrat `bff_user` est épinglé en 1.1.0. (MAIR-612, [#225](https://github.com/mairie360/Login_Web_Service/pull/225) ; [#224](https://github.com/mairie360/Login_Web_Service/pull/224))
- Le conteneur de développement ne monte plus le token GitHub Packages : le secret est renommé `node_auth_token` et ne sert qu'au build de l'image. (MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195))
#### Technique
- Contrat BFF User épinglé en 1.0.0 puis 1.1.0 (versions prod), contrat dev puis staging entre-temps ; scripts et docs acceptent `0.0.0-staging.<sha40>` (MAIR-569, MAIR-575, MAIR-600, [#200](https://github.com/mairie360/Login_Web_Service/pull/200), [#212](https://github.com/mairie360/Login_Web_Service/pull/212), [#214](https://github.com/mairie360/Login_Web_Service/pull/214)).
- Front migré de `@mairie360/front-kit` (archive vendored) vers `@mairie360/lib-components` 0.10.2, avec un test de bundle client (`npm run test:bundle`) (MAIR-126, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#210](https://github.com/mairie360/Login_Web_Service/pull/210)).
- CICD mis à jour de v4.2.1 à v4.4.3, avec journal des releases rédigé par Claude et secrets associés, et workflows de CI limités à `main` pour les pushs ; permissions en lecture seule par défaut (MAIR-571, MAIR-436, [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#208](https://github.com/mairie360/Login_Web_Service/pull/208), [#195](https://github.com/mairie360/Login_Web_Service/pull/195)).
- Renovate et tests de politique CI (`cicd-pin`, `follow-redirects` 1.16.1 dans le lockfile) ; mises à jour de dépendances et de la base de test (MAIR-494, [#217](https://github.com/mairie360/Login_Web_Service/pull/217)).

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Les stacks de test démarrent sur core-api 2.2.0 et sur bff-user 1.1.0 (images `docker-compose*.yml`, variables `CORE_API_IMAGE` et `BFF_USER_IMAGE` par défaut). Le snapshot `contracts/openapi.json` passe à `@mairie360/bff-user-openapi@1.1.0` ; les chemins du diff restent identiques. (MAIR-612, [#225](https://github.com/mairie360/Login_Web_Service/pull/225))
- Les stacks de test démarrent sur database 3.3.0 et liquibase-migrations 3.3.0 ; le contenu des migrations n'apparaît pas dans le diff. (Renovate, [#224](https://github.com/mairie360/Login_Web_Service/pull/224))
- Un push sur `main` ne déclenche plus la promotion staging ni prod : `cicd.yml` s'arrête à `release-dev`, et les workflows `promote-staging.yml` et `promote-prod.yml` sont lancés à la main avec `gh workflow run`. (MAIR-494, [#219](https://github.com/mairie360/Login_Web_Service/pull/219), [#220](https://github.com/mairie360/Login_Web_Service/pull/220))
#### Technique
- CICD épinglé à v4.4.3 (puis v4.4.0 et v4.3.3 en amont), dans `cicd.yml`, `dev-dependency-exception.yml` et les deux workflows de promotion ; `tests/cicd-pin.test.cjs` vérifie la cohérence des huit références.
- `CLAUDE.md` décrit la promotion, et `renovate.json` regroupe les quatre fichiers CICD dans une même PR (MAIR-494, [#219](https://github.com/mairie360/Login_Web_Service/pull/219)).
- Correctif de sécurité du lockfile : `follow-redirects` 1.16.1 (advisories GHSA-q3jh-wrc6-jgq8 et GHSA-8r9p-f939-6h3c), pour débloquer `npm audit`.

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Connexion unique Keycloak : sur la page de connexion, le bouton « Se connecter avec le compte unique » apparaît si `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont définis. Routes `GET /api/auth/keycloak?redirect=<module>` et `GET /api/auth/keycloak/callback` ; les échecs reviennent sur `/?keycloakError=<kind>` avec un message en français. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Thème partagé et retours accessibles sur la connexion, la récupération de mot de passe et la déconnexion (lib-components 0.9.0) : messages de validation fermables, brouillon conservé après fermeture d'un récépissé. (MAIR-526, [#198](https://github.com/mairie360/Login_Web_Service/pull/198))
#### Changements de comportement
- La police du corps de page passe d'Arial à la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`). (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))
- Les stacks de test passent à core-api 2.1.0, database et liquibase-migrations 3.2.0, et bff-user 1.0.0 (images des `docker-compose*.yml`) ; le contrat `bff_user` est épinglé en 1.0.0. (MAIR-569, [#200](https://github.com/mairie360/Login_Web_Service/pull/200))
- Le conteneur de développement ne monte plus le token GitHub Packages : le secret est renommé `node_auth_token`, passé au seul build (`npm ci`), et `contracts.yml` ne tourne plus que sur les PR et sur `main`. (MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195))
#### Technique
- Contrat BFF User pointé sur le paquet staging `0.0.0-staging.b6b04cf7470d7fd32db46923707789cf008d0dc1` (le paquet dev `699a1ef` était en place avant), et `scripts/contract-version.mjs` accepte désormais ce format ; l'image `bff-user` des stacks passe au tag `staging-b6b04cf`. (MAIR-575, [#212](https://github.com/mairie360/Login_Web_Service/pull/212) ; MAIR-600, [#214](https://github.com/mairie360/Login_Web_Service/pull/214))
- CICD passe à v4.3.1 puis v4.4.x selon les commits, avec les secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID` et `RELEASE_APP_PK` transmis au workflow réutilisable pour le journal des releases (MAIR-571, [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#208](https://github.com/mairie360/Login_Web_Service/pull/208)).
- Front migré de `@mairie360/front-kit` vers `@mairie360/lib-components` 0.10.2 ; test de bundle client `npm run test:bundle` ajouté au workflow de performance (MAIR-126, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#210](https://github.com/mairie360/Login_Web_Service/pull/210)).
- Backport `braces` de développement (vendored) et mises à jour de dépendances de test (MAIR-436, [#198](https://github.com/mairie360/Login_Web_Service/pull/198), [#200](https://github.com/mairie360/Login_Web_Service/pull/200)).

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 10:51 UTC | dev | — | `c9d6a7f` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39586512253) |
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
