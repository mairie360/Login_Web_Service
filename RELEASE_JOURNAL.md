# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "5bd5bb5a57c36a332ad35e851b695e196550a452", "prod": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "prod_tag": "v0.3.0", "staging": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "updated": {"dev": "2026-10-19 22:19 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.3.0 | `8fe4db0` | — |
| staging | — | `8fe4db0` | — |
| dev | — | `5bd5bb5` | 2026-10-19 22:19 UTC |

## Ajouté sur main depuis la dernière release prod (v0.3.0)

#### Nouveautés
- Connexion par compte unique Keycloak : la page de connexion affiche un bouton **Se connecter avec le compte unique** sous le formulaire mot de passe, seulement quand `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont configurées. La connexion par mot de passe reste disponible et inchangée. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Nouvelle route `GET /api/auth/keycloak?redirect=<module>` : elle valide la destination comme la connexion par mot de passe, conserve `state`, `nonce` et le vérificateur PKCE dans le cookie `keycloakLogin` (HttpOnly, SameSite Lax, chemin `/api/auth/keycloak`, 10 min), puis redirige en 303 vers `<realm>/protocol/openid-connect/auth` (`scope=openid email`, S256). (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Nouvelle route `GET /api/auth/keycloak/callback` : elle efface toujours le cookie `keycloakLogin` et s'arrête sans appeler le BFF si le cookie manque, si le `state` diffère ou si le `code` est absent. Sinon, elle échange le code via BFF User `POST /auth/keycloak`. En cas de succès, elle pose les mêmes cookies `accessToken` / `refreshToken` que la connexion par mot de passe et redirige en 303 vers le module demandé. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Chaque échec Keycloak ramène sur `/?keycloakError=<kind>` avec un message en français :
  - `cancelled` : connexion annulée ;
  - `expired` : retour expiré, `state` invalide ou 401 ;
  - `account` : 403, aucun compte Mairie360 actif ;
  - `busy` : 429 ;
  - `unconfigured` : 503 ou paramètres manquants ;
  - `unavailable` : autres cas.
  
  Une erreur Keycloak suspend la reprise automatique de session pour que le message reste affiché. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))

#### Changements de comportement
- La page de connexion et les écrans de récupération et de déconnexion adoptent le thème commun publié par `@mairie360/lib-components` (feuille `styles.css`) :
  - couleurs claires et sombres communes et boutons partagés ;
  - fond `var(--mairie-background)` au lieu de `#F5F3F0` ;
  - retours de validation refermables : la PR indique que la fermeture conserve la saisie et n'envoie aucune requête.
  
  La copie locale de `municipal-theme.css` est supprimée. ([#198](https://github.com/mairie360/Login_Web_Service/pull/198))
- La police n'est plus forcée en Arial/Helvetica : le corps de page utilise la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`). Seuls le thème et la préférence d'apparence de l'utilisateur choisissent désormais la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Mises à jour de dépendances sans changement de comportement annoncé :
  - le socle partagé passe de `@mairie360/front-kit` (archive dans `vendor/`) à `@mairie360/lib-components` `0.10.2`, avec un nouveau contrôle `npm run test:bundle` du bundle client, affiné par une PR suivante (MAIR-126, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#210](https://github.com/mairie360/Login_Web_Service/pull/210)) ;
  - le contrat passe à `@mairie360/bff-user-openapi` `1.0.0` et les images des stacks docker-compose passent aux versions prod (MAIR-569, [#200](https://github.com/mairie360/Login_Web_Service/pull/200)).
- CI et images :
  - CICD passe en v4.3.1 avec l'étape de journal de release (MAIR-571, [#203](https://github.com/mairie360/Login_Web_Service/pull/203)) ;
  - le jeton des workflows est en lecture seule par défaut et le push ne déclenche plus que sur `main` ;
  - l'image de développement passe en Node 24.21.0 épinglé par digest, avec le jeton npm en secret BuildKit (MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195)).

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Connexion par compte unique Keycloak : la page de connexion affiche un bouton **Se connecter avec le compte unique** sous le formulaire mot de passe, seulement quand `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont configurées. La connexion par mot de passe reste disponible et inchangée. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Nouvelle route `GET /api/auth/keycloak?redirect=<module>` : elle valide la destination comme la connexion par mot de passe, conserve `state`, `nonce` et le vérificateur PKCE dans le cookie `keycloakLogin` (HttpOnly, SameSite Lax, chemin `/api/auth/keycloak`, 10 min), puis redirige en 303 vers `<realm>/protocol/openid-connect/auth` (`scope=openid email`, S256). (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Nouvelle route `GET /api/auth/keycloak/callback` : elle efface toujours le cookie `keycloakLogin` et s'arrête sans appeler le BFF si le cookie manque, si le `state` diffère ou si le `code` est absent. Sinon, elle échange le code via BFF User `POST /auth/keycloak`. En cas de succès, elle pose les mêmes cookies `accessToken` / `refreshToken` que la connexion par mot de passe et redirige en 303 vers le module demandé. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Chaque échec Keycloak ramène sur `/?keycloakError=<kind>` avec un message en français :
  - `cancelled` : connexion annulée ;
  - `expired` : retour expiré, `state` invalide ou 401 ;
  - `account` : 403, aucun compte Mairie360 actif ;
  - `busy` : 429 ;
  - `unconfigured` : 503 ou paramètres manquants ;
  - `unavailable` : autres cas.
  
  Une erreur Keycloak suspend la reprise automatique de session pour que le message reste affiché. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))

#### Changements de comportement
- La page de connexion et les écrans de récupération et de déconnexion adoptent le thème commun publié par `@mairie360/lib-components` (feuille `styles.css`) :
  - couleurs claires et sombres communes et boutons partagés ;
  - fond `var(--mairie-background)` au lieu de `#F5F3F0` ;
  - retours de validation refermables : la PR indique que la fermeture conserve la saisie et n'envoie aucune requête.
  
  La copie locale de `municipal-theme.css` est supprimée. ([#198](https://github.com/mairie360/Login_Web_Service/pull/198))
- La police n'est plus forcée en Arial/Helvetica : le corps de page utilise la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`). Seuls le thème et la préférence d'apparence de l'utilisateur choisissent désormais la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Mises à jour de dépendances sans changement de comportement annoncé :
  - le socle partagé passe de `@mairie360/front-kit` (archive dans `vendor/`) à `@mairie360/lib-components` `0.10.2`, avec un nouveau contrôle `npm run test:bundle` du bundle client, affiné par une PR suivante (MAIR-126, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#210](https://github.com/mairie360/Login_Web_Service/pull/210)) ;
  - le contrat passe à `@mairie360/bff-user-openapi` `1.0.0` et les images des stacks docker-compose passent aux versions prod (MAIR-569, [#200](https://github.com/mairie360/Login_Web_Service/pull/200)).
- CI et images :
  - CICD passe en v4.3.1 avec l'étape de journal de release (MAIR-571, [#203](https://github.com/mairie360/Login_Web_Service/pull/203)) ;
  - le jeton des workflows est en lecture seule par défaut et le push ne déclenche plus que sur `main` ;
  - l'image de développement passe en Node 24.21.0 épinglé par digest, avec le jeton npm en secret BuildKit (MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-19 22:19 UTC | dev | — | `5bd5bb5` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39333586653) |
| 2026-10-19 22:12 UTC | dev | — | `872b60c` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39332846124) |
| 2026-10-19 21:57 UTC | dev | — | `84a2299` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39330932445) |
| 2026-10-19 20:06 UTC | dev | — | `e967205` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39315996478) |
<!-- release-journal-history:end -->
