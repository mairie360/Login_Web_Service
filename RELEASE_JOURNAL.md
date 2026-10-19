# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "84a22992faa4b1ce0595fbbd7d91d29295eb9982", "prod": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "prod_tag": "v0.3.0", "staging": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "updated": {"dev": "2026-10-19 21:57 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.3.0 | `8fe4db0` | — |
| staging | — | `8fe4db0` | — |
| dev | — | `84a2299` | 2026-10-19 21:57 UTC |

## Ajouté sur main depuis la dernière release prod (v0.3.0)

#### Changements de comportement
- Les pages de connexion et de récupération de mot de passe utilisent désormais le thème commun publié par `@mairie360/lib-components` (0.9.0, importé via `@mairie360/lib-components/styles.css`) à la place de la copie locale `municipal-theme.css`. Cela couvre les couleurs claires et sombres, les boutons et les messages de validation qu'on peut fermer. Selon la PR, fermer un message conserve la saisie et n'envoie aucune requête supplémentaire ; le diff de `Login.tsx` est tronqué, ce point n'a donc pas pu être vérifié. Le fond de la page de connexion suit maintenant la variable de thème `--mairie-background` au lieu de la couleur fixe `#F5F3F0`. ([#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Corrections
- Police de l'interface : la feuille de styles imposait `Arial, Helvetica, sans-serif` au `body` et à `--font-sans`. Elle utilise maintenant la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`), comme les autres fronts, et la police suit donc le thème et la préférence d'apparence de l'utilisateur. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Dépendances :
  - Le socle partagé (session, déconnexion, proxy, CSP, thème) passe de l'archive `@mairie360/front-kit` du dossier `vendor/` aux sous-chemins de `@mairie360/lib-components@0.10.2`, sans changement de comportement annoncé, avec un nouveau contrôle `npm run test:bundle` sur le bundle client. (MAIR-126, [#206](https://github.com/mairie360/Login_Web_Service/pull/206))
  - Le contrat `@mairie360/bff-user-openapi` passe à la release `1.0.0`, et les images des stacks docker-compose passent en versions de prod : `bff-user` 1.0.0, `core-api` 2.1.0, `database` et `liquibase-migrations` 3.2.0. (MAIR-569, [#200](https://github.com/mairie360/Login_Web_Service/pull/200))
  - Backport `braces` limité au développement. ([#198](https://github.com/mairie360/Login_Web_Service/pull/198))
- CI/CD et images :
  - Jeton de workflow en lecture seule par défaut, avec les droits d'écriture réservés au job `CICD`.
  - Pipelines déclenchés sur `push` uniquement vers `main`.
  - Image de développement passée en Node 24.21.0 épinglée par digest, avec le token transmis comme secret BuildKit `node_auth_token`. (MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195))
  - CICD réutilisable passé en v4.3.1, avec l'étape de journal de release et ses secrets. (MAIR-571, [#203](https://github.com/mairie360/Login_Web_Service/pull/203))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Les pages de connexion et de récupération de mot de passe utilisent désormais le thème commun publié par `@mairie360/lib-components` (0.9.0, importé via `@mairie360/lib-components/styles.css`) à la place de la copie locale `municipal-theme.css`. Cela couvre les couleurs claires et sombres, les boutons et les messages de validation qu'on peut fermer. Selon la PR, fermer un message conserve la saisie et n'envoie aucune requête supplémentaire ; le diff de `Login.tsx` est tronqué, ce point n'a donc pas pu être vérifié. Le fond de la page de connexion suit maintenant la variable de thème `--mairie-background` au lieu de la couleur fixe `#F5F3F0`. ([#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Corrections
- Police de l'interface : la feuille de styles imposait `Arial, Helvetica, sans-serif` au `body` et à `--font-sans`. Elle utilise maintenant la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`), comme les autres fronts, et la police suit donc le thème et la préférence d'apparence de l'utilisateur. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Dépendances :
  - Le socle partagé (session, déconnexion, proxy, CSP, thème) passe de l'archive `@mairie360/front-kit` du dossier `vendor/` aux sous-chemins de `@mairie360/lib-components@0.10.2`, sans changement de comportement annoncé, avec un nouveau contrôle `npm run test:bundle` sur le bundle client. (MAIR-126, [#206](https://github.com/mairie360/Login_Web_Service/pull/206))
  - Le contrat `@mairie360/bff-user-openapi` passe à la release `1.0.0`, et les images des stacks docker-compose passent en versions de prod : `bff-user` 1.0.0, `core-api` 2.1.0, `database` et `liquibase-migrations` 3.2.0. (MAIR-569, [#200](https://github.com/mairie360/Login_Web_Service/pull/200))
  - Backport `braces` limité au développement. ([#198](https://github.com/mairie360/Login_Web_Service/pull/198))
- CI/CD et images :
  - Jeton de workflow en lecture seule par défaut, avec les droits d'écriture réservés au job `CICD`.
  - Pipelines déclenchés sur `push` uniquement vers `main`.
  - Image de développement passée en Node 24.21.0 épinglée par digest, avec le token transmis comme secret BuildKit `node_auth_token`. (MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195))
  - CICD réutilisable passé en v4.3.1, avec l'étape de journal de release et ses secrets. (MAIR-571, [#203](https://github.com/mairie360/Login_Web_Service/pull/203))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-19 21:57 UTC | dev | — | `84a2299` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39330932445) |
| 2026-10-19 20:06 UTC | dev | — | `e967205` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39315996478) |
<!-- release-journal-history:end -->
