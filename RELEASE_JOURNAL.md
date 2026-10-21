# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "45c1619077c07a2f45fb88208ce9dee7084003ea", "prod": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "prod_tag": "v0.3.0", "staging": "4acf656e1405c49450b37fb7f51b101943202368", "updated": {"dev": "2026-10-21 01:41 UTC", "staging": "2026-10-20 19:03 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.3.0 | `8fe4db0` | — |
| staging | — | `4acf656` | 2026-10-20 19:03 UTC |
| dev | — | `45c1619` | 2026-10-21 01:41 UTC |

## Ajouté sur main depuis la dernière release prod (v0.3.0)

#### Nouveautés
- Connexion par compte unique Keycloak : le bouton « Se connecter avec le compte unique » apparaît sous le formulaire de mot de passe lorsque `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont définis. Nouvelles routes `GET /api/auth/keycloak?redirect=<module>` et `GET /api/auth/keycloak/callback`. En cas d'échec, la page affiche un message (annulation, retour expiré, compte sans accès Mairie360, trop de tentatives, service indisponible) via `/?keycloakError=<kind>`. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Retour d'action partagé sur les formulaires de connexion et de récupération : les messages sont fermables, la saisie est conservée et aucune requête supplémentaire n'est envoyée. (MAIR-526, [#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Changements de comportement
- La police du corps de page et la variable `--font-sans` ne sont plus Arial / Helvetica mais pile Geist (`var(--font-geist-sans), system-ui, sans-serif`) ; seuls le thème et la préférence d'apparence de l'utilisateur choisissent la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))
- Les couleurs de la page (thème clair / sombre, fond, boutons) viennent désormais de la feuille publiée de `@mairie360/lib-components` 0.9.0 et non plus de `municipal-theme.css`, supprimé. (MAIR-526, [#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Technique
- Alignement sur les paquets de contrat BFF User : `1.0.0` puis le paquet `0.0.0-staging` du même commit, et tags d'images `bff-user`, `core-api` et `database` des stacks de test mis à jour. (MAIR-569, [#200](https://github.com/mairie360/Login_Web_Service/pull/200) ; MAIR-575, [#212](https://github.com/mairie360/Login_Web_Service/pull/212) ; MAIR-600, [#214](https://github.com/mairie360/Login_Web_Service/pull/214))
- Remplacement de `@mairie360/front-kit` (archive `vendor/`) par `@mairie360/lib-components` 0.10.2 et ajout de `npm run test:bundle` au workflow de performance. (MAIR-126, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#210](https://github.com/mairie360/Login_Web_Service/pull/210))
- CI : workflows déclenchés sur `main` seulement pour les pushes, jeton en lecture seule par défaut, image de dev Node 24.21.0 avec le jeton en secret BuildKit, journal des releases (secrets `ANTHROPIC_API_KEY`, `RELEASE_APP_ID`, `RELEASE_APP_PK`), CICD en v4.3.1 puis v4.3.2 et v4.4.0, promotions staging et prod manuelles. (MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195) ; MAIR-571, [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#208](https://github.com/mairie360/Login_Web_Service/pull/208) ; MAIR-494, [#219](https://github.com/mairie360/Login_Web_Service/pull/219) ; Renovate [#217](https://github.com/mairie360/Login_Web_Service/pull/217), [#220](https://github.com/mairie360/Login_Web_Service/pull/220))
- Tests : `cicd-pin.test.cjs`, `workflow-permissions.test.cjs`, `dev-image-secret.test.cjs`, tests de contrat et de style mis à jour.

## Différence dev → staging (en dev, pas encore en staging)

#### Technique
- Promotion : `cicd.yml` passe à la CICD v4.4.0, un push sur `main` ne lance plus que la release dev. Les nouveaux workflows `promote-staging.yml` et `promote-prod.yml` se lancent à la main (MAIR-494, [#219](https://github.com/mairie360/Login_Web_Service/pull/219)).
- Renovate : mises à jour de la CICD vers v4.3.3 puis v4.4.0 (MAIR-571, [#217](https://github.com/mairie360/Login_Web_Service/pull/217) ; [#220](https://github.com/mairie360/Login_Web_Service/pull/220)).

## Différence staging → prod (en staging, pas encore en prod)

#### Nouveautés
- Connexion par compte unique Keycloak : le bouton « Se connecter avec le compte unique » apparaît sous le formulaire de mot de passe lorsque `KEYCLOAK_REALM_URL`, `KEYCLOAK_CLIENT_ID` et `LOGIN_FRONT_URL` sont définis. Nouvelles routes `GET /api/auth/keycloak?redirect=<module>` et `GET /api/auth/keycloak/callback`. En cas d'échec, la page affiche un message (annulation, retour expiré, compte sans accès Mairie360, trop de tentatives, service indisponible) via `/?keycloakError=<kind>`. (MAIR-153, [#205](https://github.com/mairie360/Login_Web_Service/pull/205))
- Retour d'action partagé sur les formulaires de connexion et de récupération : messages fermables, saisie conservée, aucune requête supplémentaire. (MAIR-526, [#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Changements de comportement
- La police du corps de page et `--font-sans` passent d'Arial / Helvetica à la pile Geist (`var(--font-geist-sans), system-ui, sans-serif`). (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))
- Les couleurs de la page viennent de la feuille publiée de `@mairie360/lib-components` 0.9.0 au lieu de `municipal-theme.css`, supprimé. (MAIR-526, [#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Technique
- Contrats et images de test : `bff-user-openapi` passe à `1.0.0`, puis au paquet `0.0.0-staging` du même commit ; images `bff-user`, `core-api` et `database` des stacks mises à jour. (MAIR-569, [#200](https://github.com/mairie360/Login_Web_Service/pull/200) ; MAIR-575, [#212](https://github.com/mairie360/Login_Web_Service/pull/212) ; MAIR-600, [#214](https://github.com/mairie360/Login_Web_Service/pull/214))
- Remplacement de `@mairie360/front-kit` par `@mairie360/lib-components` 0.10.2 et ajout de `npm run test:bundle` au workflow de performance. (MAIR-126, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#210](https://github.com/mairie360/Login_Web_Service/pull/210))
- CI : journal des releases avec ses secrets, CICD v4.3.1 puis v4.3.2, déclenchements limités à `main` pour les pushes, jeton en lecture seule, image de dev Node 24.21.0. (MAIR-571, [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#208](https://github.com/mairie360/Login_Web_Service/pull/208) ; MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195))
- Tests : `cicd-pin.test.cjs`, `workflow-permissions.test.cjs`, `dev-image-secret.test.cjs`, tests de contrat et de style mis à jour.

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
