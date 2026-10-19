# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "872b60c6f7b03fa923fb483f46166a739eae3f25", "prod": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "prod_tag": "v0.3.0", "staging": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "updated": {"dev": "2026-10-19 22:12 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.3.0 | `8fe4db0` | — |
| staging | — | `8fe4db0` | — |
| dev | — | `872b60c` | 2026-10-19 22:12 UTC |

## Ajouté sur main depuis la dernière release prod (v0.3.0)

#### Nouveautés
- La page de connexion et les formulaires de récupération de mot de passe utilisent le thème commun publié de `@mairie360/lib-components` 0.9.0 : couleurs claires/sombres, boutons et messages de validation refermables. D'après la PR, refermer un message conserve la saisie et n'envoie aucune requête supplémentaire. Le fond de page suit désormais `var(--mairie-background)` au lieu du `#F5F3F0` fixe. La feuille locale `municipal-theme.css` est remplacée par `@mairie360/lib-components/styles.css`. ([#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Corrections
- Police de l'interface : avant, la feuille de styles imposait `Arial, Helvetica, sans-serif` au `body` et à `--font-sans`. Maintenant, elle utilise la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`), et seuls le thème et la préférence d'apparence de l'utilisateur choisissent la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Dépendances : le socle partagé passe de `@mairie360/front-kit` (archive dans `vendor/`) aux sous-chemins de `@mairie360/lib-components` épinglé en `0.10.2`, sans changement de comportement annoncé, et un test `npm run test:bundle` vérifie le bundle client en CI. Le contrat `@mairie360/bff-user-openapi` passe en `1.0.0`, et les images des stacks docker-compose passent en versions de release (`bff-user:1.0.0`, `core-api:2.1.0`, `database:3.2.0`, `liquibase-migrations:3.2.0`). (MAIR-126, MAIR-569, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#210](https://github.com/mairie360/Login_Web_Service/pull/210), [#200](https://github.com/mairie360/Login_Web_Service/pull/200))
- CI et environnement de développement :
  - le workflow CICD réutilisable passe en v4.3.1, avec l'étape de journal de release ;
  - le jeton du workflow est en lecture seule par défaut et les pipelines ne se déclenchent sur `push` que pour `main` ;
  - l'image de développement passe de Node 23 à Node 24.21.0 épinglé par digest, avec le jeton npm fourni en secret BuildKit uniquement.
  (MAIR-571, MAIR-436, [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#195](https://github.com/mairie360/Login_Web_Service/pull/195))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- La page de connexion et les formulaires de récupération de mot de passe utilisent le thème commun publié de `@mairie360/lib-components` 0.9.0 : couleurs claires/sombres, boutons et messages de validation refermables. D'après la PR, refermer un message conserve la saisie et n'envoie aucune requête supplémentaire. Le fond de page suit désormais `var(--mairie-background)` au lieu du `#F5F3F0` fixe. La feuille locale `municipal-theme.css` est remplacée par `@mairie360/lib-components/styles.css`. ([#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Corrections
- Police de l'interface : avant, la feuille de styles imposait `Arial, Helvetica, sans-serif` au `body` et à `--font-sans`. Maintenant, elle utilise la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`), et seuls le thème et la préférence d'apparence de l'utilisateur choisissent la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Dépendances : le socle partagé passe de `@mairie360/front-kit` (archive dans `vendor/`) aux sous-chemins de `@mairie360/lib-components` épinglé en `0.10.2`, sans changement de comportement annoncé, et un test `npm run test:bundle` vérifie le bundle client en CI. Le contrat `@mairie360/bff-user-openapi` passe en `1.0.0`, et les images des stacks docker-compose passent en versions de release (`bff-user:1.0.0`, `core-api:2.1.0`, `database:3.2.0`, `liquibase-migrations:3.2.0`). (MAIR-126, MAIR-569, [#206](https://github.com/mairie360/Login_Web_Service/pull/206), [#210](https://github.com/mairie360/Login_Web_Service/pull/210), [#200](https://github.com/mairie360/Login_Web_Service/pull/200))
- CI et environnement de développement :
  - le workflow CICD réutilisable passe en v4.3.1, avec l'étape de journal de release ;
  - le jeton du workflow est en lecture seule par défaut et les pipelines ne se déclenchent sur `push` que pour `main` ;
  - l'image de développement passe de Node 23 à Node 24.21.0 épinglé par digest, avec le jeton npm fourni en secret BuildKit uniquement.
  (MAIR-571, MAIR-436, [#203](https://github.com/mairie360/Login_Web_Service/pull/203), [#195](https://github.com/mairie360/Login_Web_Service/pull/195))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-19 22:12 UTC | dev | — | `872b60c` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39332846124) |
| 2026-10-19 21:57 UTC | dev | — | `84a2299` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39330932445) |
| 2026-10-19 20:06 UTC | dev | — | `e967205` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39315996478) |
<!-- release-journal-history:end -->
