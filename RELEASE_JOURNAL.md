# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "prod": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "prod_tag": "v0.3.0", "staging": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "updated": {"dev": "2026-10-21 10:51 UTC", "staging": "2026-10-21 10:57 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.3.0 | `8fe4db0` | — |
| staging | — | `c9d6a7f` | 2026-10-21 10:57 UTC |
| dev | — | `c9d6a7f` | 2026-10-21 10:51 UTC |

## Ajouté sur main depuis la dernière release prod (v0.3.0)

#### Nouveautés
- Connexion via Keycloak (compte unique) : la page de connexion affiche **Se connecter avec le compte unique** sous le formulaire, uniquement si `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont définis. La connexion par mot de passe reste disponible. Nouvelles routes : `GET /api/auth/keycloak?redirect=<module>` (redirection vers le realm) et `GET /api/auth/keycloak/callback` (retour : pose les mêmes cookies de session que la connexion par mot de passe, puis redirige vers le module). (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- En cas d'échec de la connexion Keycloak, retour sur `/?keycloakError=<kind>` avec un message en français : annulée (`cancelled`), expirée ou interrompue (`expired`), identité sans compte Mairie360 actif (`account`), trop de tentatives (`busy`), configuration absente (`unconfigured`), service indisponible (`unavailable`). La reprise automatique de session est suspendue pour que le message reste affiché. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Les écrans de connexion et de récupération de mot de passe adoptent le thème partagé de `@mairie360/lib-components` 0.9.0 (couleurs clair/sombre, boutons) et affichent des retours de validation fermables. Fermer un retour conserve le brouillon sans requête supplémentaire. (MAIR-526 et liés, [#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Corrections
- Police du corps : avant, `body` et Tailwind forçaient `Arial, Helvetica, sans-serif` ; maintenant la pile Geist partagée (`var(--font-geist-sans), system-ui, sans-serif`). Seuls le thème et la préférence d'apparence de l'utilisateur choisissent la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Contrat BFF User : `@mairie360/bff-user-openapi` passe de 1.0.0 à 1.1.0 (MAIR-569 [#200](https://github.com/mairie360/Login_Web_Service/pull/200), MAIR-612 [#225](https://github.com/mairie360/Login_Web_Service/pull/225)). Le diff du snapshot ne modifie que la métadonnée de source. Les images de test passent à `bff-user` 1.1.0, `core-api` 2.2.0, `database` et `liquibase-migrations` 3.3.0 (Renovate [#224](https://github.com/mairie360/Login_Web_Service/pull/224), [#225](https://github.com/mairie360/Login_Web_Service/pull/225)).
- Socle front : `@mairie360/front-kit` est remplacé par `@mairie360/lib-components` 0.10.2 (imports par sous-chemins), l'archive vendorisée est supprimée, et `npm run test:bundle` vérifie le bundle client (MAIR-126, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#210](https://github.com/mairie360/Login_Web_Service/pull/210)). Un backport de `braces` (dépendance de développement) est ajouté (MAIR-436 et lié, [#198](https://github.com/mairie360/Login_Web_Service/pull/198)).
- Promotion : `promote-staging.yml` et `promote-prod.yml` remplacent la promotion automatique ; la release dev s'arrête sur `main` (MAIR-494, [#219](https://github.com/mairie360/Login_Web_Service/pull/219)). Versions `mairie360/CICD` successives v4.3.1 à v4.4.3 (MAIR-571 [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#208](https://github.com/mairie360/Login_Web_Service/pull/208) ; [#217](https://github.com/mairie360/Login_Web_Service/pull/217), [#220](https://github.com/mairie360/Login_Web_Service/pull/220), [#225](https://github.com/mairie360/Login_Web_Service/pull/225)). Les secrets du journal de release sont transmis au workflow réutilisable.
- CI : `cicd.yml` et `contracts.yml` ne se déclenchent sur `push` que pour `main`, le token est en lecture seule par défaut, et `development.Dockerfile` passe à Node 24.21.0 avec le secret BuildKit `node_auth_token` (MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195)).
- Politique de version : `0.0.0-staging.<sha40>` est accepté pour le contrat (MAIR-600, [#214](https://github.com/mairie360/Login_Web_Service/pull/214)). `follow-redirects` passe en 1.16.1 dans le lockfile pour corriger des advisories (MAIR-494, [#219](https://github.com/mairie360/Login_Web_Service/pull/219)).
- Tests et documentation (MAIR-575, MAIR-571 et tests de politique) : aucun effet visible.

## Différence dev → staging (en dev, pas encore en staging)

_Rien._

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Connexion via Keycloak (compte unique) : la page de connexion affiche **Se connecter avec le compte unique** sous le formulaire, uniquement si `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont définis. La connexion par mot de passe reste disponible. Nouvelles routes : `GET /api/auth/keycloak?redirect=<module>` (redirection vers le realm) et `GET /api/auth/keycloak/callback` (retour : pose les mêmes cookies de session que la connexion par mot de passe, puis redirige vers le module). (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- En cas d'échec de la connexion Keycloak, retour sur `/?keycloakError=<kind>` avec un message en français : annulée (`cancelled`), expirée ou interrompue (`expired`), identité sans compte Mairie360 actif (`account`), trop de tentatives (`busy`), configuration absente (`unconfigured`), service indisponible (`unavailable`). La reprise automatique de session est suspendue pour que le message reste affiché. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Les écrans de connexion et de récupération de mot de passe adoptent le thème partagé de `@mairie360/lib-components` 0.9.0 (couleurs clair/sombre, boutons) et affichent des retours de validation fermables. Fermer un retour conserve le brouillon sans requête supplémentaire. (MAIR-526 et liés, [#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Corrections
- Police du corps : avant, `body` et Tailwind forçaient `Arial, Helvetica, sans-serif` ; maintenant la pile Geist partagée (`var(--font-geist-sans), system-ui, sans-serif`). Seuls le thème et la préférence d'apparence de l'utilisateur choisissent la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Contrat BFF User : `@mairie360/bff-user-openapi` passe de 1.0.0 à 1.1.0 (MAIR-569 [#200](https://github.com/mairie360/Login_Web_Service/pull/200), MAIR-612 [#225](https://github.com/mairie360/Login_Web_Service/pull/225)). Le diff du snapshot ne modifie que la métadonnée de source. Les images de test passent à `bff-user` 1.1.0, `core-api` 2.2.0, `database` et `liquibase-migrations` 3.3.0 (Renovate [#224](https://github.com/mairie360/Login_Web_Service/pull/224), [#225](https://github.com/mairie360/Login_Web_Service/pull/225)).
- Socle front : `@mairie360/front-kit` est remplacé par `@mairie360/lib-components` 0.10.2 (imports par sous-chemins), l'archive vendorisée est supprimée, et `npm run test:bundle` vérifie le bundle client (MAIR-126, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#210](https://github.com/mairie360/Login_Web_Service/pull/210)). Un backport de `braces` (dépendance de développement) est ajouté (MAIR-436 et lié, [#198](https://github.com/mairie360/Login_Web_Service/pull/198)).
- Promotion : `promote-staging.yml` et `promote-prod.yml` remplacent la promotion automatique ; la release dev s'arrête sur `main` (MAIR-494, [#219](https://github.com/mairie360/Login_Web_Service/pull/219)). Versions `mairie360/CICD` successives v4.3.1 à v4.4.3 (MAIR-571 [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#208](https://github.com/mairie360/Login_Web_Service/pull/208) ; [#217](https://github.com/mairie360/Login_Web_Service/pull/217), [#220](https://github.com/mairie360/Login_Web_Service/pull/220), [#225](https://github.com/mairie360/Login_Web_Service/pull/225)). Les secrets du journal de release sont transmis au workflow réutilisable.
- CI : `cicd.yml` et `contracts.yml` ne se déclenchent sur `push` que pour `main`, le token est en lecture seule par défaut, et `development.Dockerfile` passe à Node 24.21.0 avec le secret BuildKit `node_auth_token` (MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195)).
- Politique de version : `0.0.0-staging.<sha40>` est accepté pour le contrat (MAIR-600, [#214](https://github.com/mairie360/Login_Web_Service/pull/214)). `follow-redirects` passe en 1.16.1 dans le lockfile pour corriger des advisories (MAIR-494, [#219](https://github.com/mairie360/Login_Web_Service/pull/219)).
- Tests et documentation (MAIR-575, MAIR-571 et tests de politique) : aucun effet visible.

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-21 10:57 UTC | staging | — | `c9d6a7f` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39587839834) |
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
