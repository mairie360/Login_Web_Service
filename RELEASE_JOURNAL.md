# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "4acf656e1405c49450b37fb7f51b101943202368", "prod": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "prod_tag": "v0.3.0", "staging": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "updated": {"dev": "2026-10-20 18:58 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.3.0 | `8fe4db0` | — |
| staging | — | `8fe4db0` | — |
| dev | — | `4acf656` | 2026-10-20 18:58 UTC |

## Ajouté sur main depuis la dernière release prod (v0.3.0)

#### Nouveautés
- Connexion par compte unique Keycloak : la page de connexion affiche le bouton **Se connecter avec le compte unique** sous le formulaire mot de passe, seulement si `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont configurés. La connexion par mot de passe reste inchangée. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Nouvelle route `GET /api/auth/keycloak?redirect=<module>` : elle valide la destination comme la connexion par mot de passe, conserve `state`, `nonce` et le vérificateur PKCE dans le cookie `keycloakLogin` (HttpOnly, SameSite Lax, chemin `/api/auth/keycloak`, 10 min), puis répond 303 vers `<KEYCLOAK_REALM_URL>/protocol/openid-connect/auth` (`scope=openid email`, S256). (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Nouvelle route `GET /api/auth/keycloak/callback` : elle efface toujours le cookie `keycloakLogin` et s'arrête sans appeler le BFF si le cookie manque, si le `state` diffère ou s'il n'y a pas de `code`. Sinon, elle échange le code via BFF User `POST /auth/keycloak`. En cas de succès, elle pose les mêmes cookies `accessToken` / `refreshToken` que la connexion par mot de passe et redirige (303) vers le module demandé. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- En cas d'échec Keycloak, l'agent revient sur `/?keycloakError=<kind>` avec un message en français propre à chaque cas :
  - `cancelled` : connexion annulée ;
  - `expired` : retour expiré, `state` différent ou 401 ;
  - `account` : 403, pas de compte Mairie360 actif ;
  - `busy` : 429 ;
  - `unconfigured` : 503 ou paramètres absents ;
  - `unavailable` : autres cas.

  Dans ces cas, la reprise automatique de session est suspendue pour que le message reste affiché. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))

#### Changements de comportement
- La page de connexion et les formulaires de récupération adoptent le thème partagé de `@mairie360/lib-components` (feuille de styles publiée) :
  - couleurs claires et sombres communes, fond `var(--mairie-background)` au lieu de `#F5F3F0` ;
  - boutons communs ;
  - messages de validation refermables : fermer un message conserve la saisie et n'envoie aucune requête.

  (MAIR-526, [#198](https://github.com/mairie360/Login_Web_Service/pull/198))
- La police n'est plus forcée en Arial/Helvetica : le corps utilise la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`), ce qui laisse le thème et la préférence d'apparence de l'utilisateur choisir la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Dépendances et contrats, sans changement de comportement (6 PR) :
  - le contrat `@mairie360/bff-user-openapi` passe de `0.0.0-dev.46a698b…` à `1.0.0`, puis à `0.0.0-dev.699a1ef…`, puis à `0.0.0-staging.b6b04cf…` ; le contrat lui-même ne change pas ;
  - la politique de version accepte désormais `0.0.0-staging.<sha40>` ;
  - les images des stacks de test sont alignées ;
  - le socle partagé passe de `@mairie360/front-kit` à `@mairie360/lib-components@0.10.2`.

  (MAIR-569, MAIR-575, MAIR-600, MAIR-126, [#200](https://github.com/mairie360/Login_Web_Service/pull/200), [#212](https://github.com/mairie360/Login_Web_Service/pull/212), [#214](https://github.com/mairie360/Login_Web_Service/pull/214), [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#198](https://github.com/mairie360/Login_Web_Service/pull/198), [#210](https://github.com/mairie360/Login_Web_Service/pull/210))
- CI, build et tests (4 PR) :
  - jeton CI en lecture seule par défaut et pipeline sur `push` vers `main` uniquement ;
  - image de développement en Node 24.21.0 avec le jeton passé en secret BuildKit ;
  - CICD épinglé en v4.3.1 puis v4.3.2 (journal des releases), suivi par Renovate ;
  - nouveau contrôle `test:bundle` du bundle client.

  (MAIR-436, MAIR-571, MAIR-126, [#195](https://github.com/mairie360/Login_Web_Service/pull/195), [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#208](https://github.com/mairie360/Login_Web_Service/pull/208), [#210](https://github.com/mairie360/Login_Web_Service/pull/210))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Connexion par compte unique Keycloak : la page de connexion affiche le bouton **Se connecter avec le compte unique** sous le formulaire mot de passe, seulement si `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont configurés. La connexion par mot de passe reste inchangée. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Nouvelle route `GET /api/auth/keycloak?redirect=<module>` : elle valide la destination comme la connexion par mot de passe, conserve `state`, `nonce` et le vérificateur PKCE dans le cookie `keycloakLogin` (HttpOnly, SameSite Lax, chemin `/api/auth/keycloak`, 10 min), puis répond 303 vers `<KEYCLOAK_REALM_URL>/protocol/openid-connect/auth` (`scope=openid email`, S256). (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Nouvelle route `GET /api/auth/keycloak/callback` : elle efface toujours le cookie `keycloakLogin` et s'arrête sans appeler le BFF si le cookie manque, si le `state` diffère ou s'il n'y a pas de `code`. Sinon, elle échange le code via BFF User `POST /auth/keycloak`. En cas de succès, elle pose les mêmes cookies `accessToken` / `refreshToken` que la connexion par mot de passe et redirige (303) vers le module demandé. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- En cas d'échec Keycloak, l'agent revient sur `/?keycloakError=<kind>` avec un message en français propre à chaque cas :
  - `cancelled` : connexion annulée ;
  - `expired` : retour expiré, `state` différent ou 401 ;
  - `account` : 403, pas de compte Mairie360 actif ;
  - `busy` : 429 ;
  - `unconfigured` : 503 ou paramètres absents ;
  - `unavailable` : autres cas.

  Dans ces cas, la reprise automatique de session est suspendue pour que le message reste affiché. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))

#### Changements de comportement
- La page de connexion et les formulaires de récupération adoptent le thème partagé de `@mairie360/lib-components` (feuille de styles publiée) :
  - couleurs claires et sombres communes, fond `var(--mairie-background)` au lieu de `#F5F3F0` ;
  - boutons communs ;
  - messages de validation refermables : fermer un message conserve la saisie et n'envoie aucune requête.

  (MAIR-526, [#198](https://github.com/mairie360/Login_Web_Service/pull/198))
- La police n'est plus forcée en Arial/Helvetica : le corps utilise la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`), ce qui laisse le thème et la préférence d'apparence de l'utilisateur choisir la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Dépendances et contrats, sans changement de comportement (6 PR) :
  - le contrat `@mairie360/bff-user-openapi` passe de `0.0.0-dev.46a698b…` à `1.0.0`, puis à `0.0.0-dev.699a1ef…`, puis à `0.0.0-staging.b6b04cf…` ; le contrat lui-même ne change pas ;
  - la politique de version accepte désormais `0.0.0-staging.<sha40>` ;
  - les images des stacks de test sont alignées ;
  - le socle partagé passe de `@mairie360/front-kit` à `@mairie360/lib-components@0.10.2`.

  (MAIR-569, MAIR-575, MAIR-600, MAIR-126, [#200](https://github.com/mairie360/Login_Web_Service/pull/200), [#212](https://github.com/mairie360/Login_Web_Service/pull/212), [#214](https://github.com/mairie360/Login_Web_Service/pull/214), [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#198](https://github.com/mairie360/Login_Web_Service/pull/198), [#210](https://github.com/mairie360/Login_Web_Service/pull/210))
- CI, build et tests (4 PR) :
  - jeton CI en lecture seule par défaut et pipeline sur `push` vers `main` uniquement ;
  - image de développement en Node 24.21.0 avec le jeton passé en secret BuildKit ;
  - CICD épinglé en v4.3.1 puis v4.3.2 (journal des releases), suivi par Renovate ;
  - nouveau contrôle `test:bundle` du bundle client.

  (MAIR-436, MAIR-571, MAIR-126, [#195](https://github.com/mairie360/Login_Web_Service/pull/195), [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#208](https://github.com/mairie360/Login_Web_Service/pull/208), [#210](https://github.com/mairie360/Login_Web_Service/pull/210))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-20 18:58 UTC | dev | — | `4acf656` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39478764314) |
| 2026-10-20 13:39 UTC | dev | — | `2f50848` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39431614226) |
| 2026-10-20 12:23 UTC | dev | — | `e024f7a` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39421315470) |
| 2026-10-19 22:19 UTC | dev | — | `5bd5bb5` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39333586653) |
| 2026-10-19 22:12 UTC | dev | — | `872b60c` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39332846124) |
| 2026-10-19 21:57 UTC | dev | — | `84a2299` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39330932445) |
| 2026-10-19 20:06 UTC | dev | — | `e967205` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39315996478) |
<!-- release-journal-history:end -->
