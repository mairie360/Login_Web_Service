# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "e024f7a92ae63c3bd9f2f43043f9846f143c76a0", "prod": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "prod_tag": "v0.3.0", "staging": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "updated": {"dev": "2026-10-20 12:23 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.3.0 | `8fe4db0` | — |
| staging | — | `8fe4db0` | — |
| dev | — | `e024f7a` | 2026-10-20 12:23 UTC |

## Ajouté sur main depuis la dernière release prod (v0.3.0)

#### Nouveautés
- Connexion par authentification unique Keycloak : la page de connexion affiche **Se connecter avec le compte unique** sous le formulaire, uniquement si `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont configurés. La connexion par mot de passe reste disponible. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Nouvelle route `GET /api/auth/keycloak?redirect=<module>` : elle valide la destination comme la connexion par mot de passe et pose le cookie `keycloakLogin` (`state`, `nonce` et vérificateur PKCE ; HttpOnly, SameSite Lax, chemin `/api/auth/keycloak`, 10 min). Elle répond ensuite 303 vers `<KEYCLOAK_REALM_URL>/protocol/openid-connect/auth`. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Nouvelle route `GET /api/auth/keycloak/callback` : elle efface toujours le cookie `keycloakLogin` et refuse, avant tout appel, un cookie absent, un `state` différent ou un `code` manquant. Sinon, elle échange le code via BFF User `POST /auth/keycloak`. En cas de succès, elle pose les mêmes cookies `accessToken` / `refreshToken` que la connexion par mot de passe et redirige (303) vers le module demandé. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- En cas d'échec, l'agent revient sur `/?keycloakError=<kind>` avec un message en français :
  - `cancelled` : connexion annulée ;
  - `expired` : retour expiré, `state` différent ou 401 ;
  - `account` : 403, pas de compte Mairie360 actif ;
  - `busy` : 429 ;
  - `unconfigured` : 503 ou réglages manquants ;
  - `unavailable` : autres cas.
  Un `keycloakError` bloque aussi la reprise automatique de session, pour que le message reste affiché. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))

#### Changements de comportement
- Les pages de connexion et de récupération adoptent le thème partagé publié de `@mairie360/lib-components` (0.9.0) :
  - couleurs claires/sombres et boutons communs ;
  - fond de page `var(--mairie-background)` au lieu de `#F5F3F0` ;
  - messages de validation que l'on peut fermer : fermer un message conserve la saisie et n'envoie aucune requête.
  La feuille locale `municipal-theme.css` est vidée au profit de `@mairie360/lib-components/styles.css`. (MAIR-526, [#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Corrections
- Police de l'interface : la feuille de styles imposait `Arial, Helvetica, sans-serif` au `body` et à `--font-sans`. Elle utilise maintenant la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`), si bien que seuls le thème et la préférence d'apparence de l'utilisateur choisissent la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Dépendances et socle :
  - le socle partagé (session, proxy, CSP, thème) passe de l'archive `@mairie360/front-kit` à `@mairie360/lib-components` 0.10.2, sans changement de comportement annoncé (MAIR-126, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#210](https://github.com/mairie360/Login_Web_Service/pull/210)) ;
  - le contrat `@mairie360/bff-user-openapi` passe en 1.0.0 et les stacks docker-compose utilisent les images de release `bff-user` 1.0.0, `core-api` 2.1.0, `database`/`liquibase-migrations` 3.2.0 (MAIR-569, [#200](https://github.com/mairie360/Login_Web_Service/pull/200)).
- CI/CD et images :
  - jeton de workflow en lecture seule par défaut, pipeline sur `push` limité à `main`, image de développement en Node 24.21.0 avec le jeton en secret BuildKit (MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195)) ;
  - `mairie360/CICD` passe en v4.3.1 puis v4.3.2, avec l'étape de journal des releases et l'épinglage suivi par Renovate (MAIR-571, [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#208](https://github.com/mairie360/Login_Web_Service/pull/208)).

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Connexion par authentification unique Keycloak : la page de connexion affiche **Se connecter avec le compte unique** sous le formulaire, uniquement si `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont configurés. La connexion par mot de passe reste disponible. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Nouvelle route `GET /api/auth/keycloak?redirect=<module>` : elle valide la destination comme la connexion par mot de passe et pose le cookie `keycloakLogin` (`state`, `nonce` et vérificateur PKCE ; HttpOnly, SameSite Lax, chemin `/api/auth/keycloak`, 10 min). Elle répond ensuite 303 vers `<KEYCLOAK_REALM_URL>/protocol/openid-connect/auth`. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Nouvelle route `GET /api/auth/keycloak/callback` : elle efface toujours le cookie `keycloakLogin` et refuse, avant tout appel, un cookie absent, un `state` différent ou un `code` manquant. Sinon, elle échange le code via BFF User `POST /auth/keycloak`. En cas de succès, elle pose les mêmes cookies `accessToken` / `refreshToken` que la connexion par mot de passe et redirige (303) vers le module demandé. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- En cas d'échec, l'agent revient sur `/?keycloakError=<kind>` avec un message en français :
  - `cancelled` : connexion annulée ;
  - `expired` : retour expiré, `state` différent ou 401 ;
  - `account` : 403, pas de compte Mairie360 actif ;
  - `busy` : 429 ;
  - `unconfigured` : 503 ou réglages manquants ;
  - `unavailable` : autres cas.
  Un `keycloakError` bloque aussi la reprise automatique de session, pour que le message reste affiché. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))

#### Changements de comportement
- Les pages de connexion et de récupération adoptent le thème partagé publié de `@mairie360/lib-components` (0.9.0) :
  - couleurs claires/sombres et boutons communs ;
  - fond de page `var(--mairie-background)` au lieu de `#F5F3F0` ;
  - messages de validation que l'on peut fermer : fermer un message conserve la saisie et n'envoie aucune requête.
  La feuille locale `municipal-theme.css` est vidée au profit de `@mairie360/lib-components/styles.css`. (MAIR-526, [#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Corrections
- Police de l'interface : la feuille de styles imposait `Arial, Helvetica, sans-serif` au `body` et à `--font-sans`. Elle utilise maintenant la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`), si bien que seuls le thème et la préférence d'apparence de l'utilisateur choisissent la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Dépendances et socle :
  - le socle partagé (session, proxy, CSP, thème) passe de l'archive `@mairie360/front-kit` à `@mairie360/lib-components` 0.10.2, sans changement de comportement annoncé (MAIR-126, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#210](https://github.com/mairie360/Login_Web_Service/pull/210)) ;
  - le contrat `@mairie360/bff-user-openapi` passe en 1.0.0 et les stacks docker-compose utilisent les images de release `bff-user` 1.0.0, `core-api` 2.1.0, `database`/`liquibase-migrations` 3.2.0 (MAIR-569, [#200](https://github.com/mairie360/Login_Web_Service/pull/200)).
- CI/CD et images :
  - jeton de workflow en lecture seule par défaut, pipeline sur `push` limité à `main`, image de développement en Node 24.21.0 avec le jeton en secret BuildKit (MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195)) ;
  - `mairie360/CICD` passe en v4.3.1 puis v4.3.2, avec l'étape de journal des releases et l'épinglage suivi par Renovate (MAIR-571, [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#208](https://github.com/mairie360/Login_Web_Service/pull/208)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 12:23 UTC | dev | — | `e024f7a` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39421315470) |
| 2026-10-19 22:19 UTC | dev | — | `5bd5bb5` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39333586653) |
| 2026-10-19 22:12 UTC | dev | — | `872b60c` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39332846124) |
| 2026-10-19 21:57 UTC | dev | — | `84a2299` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39330932445) |
| 2026-10-19 20:06 UTC | dev | — | `e967205` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39315996478) |
<!-- release-journal-history:end -->
