# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "0e4ca843beb4ccadbd0d7696e31f0ee510c2585a", "prod": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "prod_tag": "v0.4.0", "staging": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "updated": {"dev": "2026-11-04 18:29 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 10:57 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `c9d6a7f` | 2026-10-21 11:08 UTC |
| staging | — | `c9d6a7f` | 2026-10-21 10:57 UTC |
| dev | — | `0e4ca84` | 2026-11-04 18:29 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés

- Nouvelles pages publiques `/mentions-legales` et `/confidentialite`, rendues à chaque requête à partir de `LEGAL_CONFIG` (JSON de `global.legal` de l’instance). Une valeur absente s’affiche « À compléter par la mairie ». (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))
- Pied de page sur toutes les pages du front, avec des liens vers les mentions légales et la politique de confidentialité. (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))

#### Changements de comportement

- Le message d’erreur de connexion est maintenant l’alerte de la bibliothèque (`ErrorAlert`), annoncée aux lecteurs d’écran et fermable avec « Fermer le message ». Avant, il s’affichait dans un `Toast` autonome non annoncé. Le bouton de connexion utilise `fullWidth` et `loading` ; les boutons de déconnexion reprennent le style plein par défaut. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Démarrage local de `docker-compose.yml` : `JWT_SECRET` doit venir de l’environnement ou d’un `.env` non versionné, sinon `docker compose` échoue. `JWT_ALLOW_WEAK_SECRET` passe à `false` pour Core API. Les ports 3000, 3001 et 4000 ne sont plus publiés que sur 127.0.0.1. ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))
- `postinstall`, `prebuild` et `pretest` ne interrogent plus le service d’avis npm : une panne ne bloque plus `npm ci`. La vérification amont passe dans `npm run audit:upstream`, lancée chaque jour par un workflow dédié. (MAIR-744, [#246](https://github.com/mairie360/Login_Web_Service/pull/246))

#### Corrections

- Message « Connexion temporairement indisponible » : avant, la carte pouvait déborder à 320 px avec un espacement de texte augmenté. Maintenant, le rembourrage est réduit sous `sm` et les mots longs sont coupés. (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))

#### Technique

- Vendoring de Zod 3 avec rétro-portage de la validation bornée, contrôle d’intégrité et `overrides` vers `vendor/zod` ; réparation des lockfiles. ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))
- Politique Gitleaks (`.gitleaks.toml`) et test de manifeste Zod ; corrections de `.gitleaksignore`. (MAIR-743, [#251](https://github.com/mairie360/Login_Web_Service/pull/251))
- Stacks de tests RGAA (`accessibility_test.sh`, `docker-compose-accessibility.yml`) et tests Playwright d’accessibilité ; durcissement des scripts. (MAIR-316, [#150](https://github.com/mairie360/Login_Web_Service/pull/150) ; MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141) ; MAIR-768, [#241](https://github.com/mairie360/Login_Web_Service/pull/241))
- Stack de simulation RGPD et script `gdpr_simulation_test.sh`, puis corrections de ce script. (MAIR-497, [#248](https://github.com/mairie360/Login_Web_Service/pull/248), [#249](https://github.com/mairie360/Login_Web_Service/pull/249))
- Workflow de checklist RGPD sur les PR. (MAIR-295, [#160](https://github.com/mairie360/Login_Web_Service/pull/160))
- Mises à jour des dépendances : `follow-redirects` 1.16.2 ([#243](https://github.com/mairie360/Login_Web_Service/pull/243)), TypeScript et outils ([#230](https://github.com/mairie360/Login_Web_Service/pull/230)), Node 24.22.1, Next.js 16.4.2 et digests Docker ([#231](https://github.com/mairie360/Login_Web_Service/pull/231)).
- Réorganisation des composants `Login/` et `ForgotPassword/` en dossiers, sans changement de rendu hors message d’erreur. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Montée de version de mairie360/CICD (v4.5.0 à v5.3.1) par Renovate et manuellement. ([#222](https://github.com/mairie360/Login_Web_Service/pull/222), [#235](https://github.com/mairie360/Login_Web_Service/pull/235), [#247](https://github.com/mairie360/Login_Web_Service/pull/247))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés

- Nouvelles pages publiques `/mentions-legales` et `/confidentialite`, rendues à chaque requête à partir de `LEGAL_CONFIG` (JSON de `global.legal` de l’instance). Une valeur absente s’affiche « À compléter par la mairie ». (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))
- Pied de page sur toutes les pages du front, avec des liens vers les mentions légales et la politique de confidentialité. (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))

#### Changements de comportement

- Le message d’erreur de connexion est maintenant l’alerte de la bibliothèque (`ErrorAlert`), annoncée aux lecteurs d’écran et fermable avec « Fermer le message ». Avant, il s’affichait dans un `Toast` autonome non annoncé. Le bouton de connexion utilise `fullWidth` et `loading` ; les boutons de déconnexion reprennent le style plein par défaut. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Démarrage local de `docker-compose.yml` : `JWT_SECRET` doit venir de l’environnement ou d’un `.env` non versionné, sinon `docker compose` échoue. `JWT_ALLOW_WEAK_SECRET` passe à `false` pour Core API. Les ports 3000, 3001 et 4000 ne sont plus publiés que sur 127.0.0.1. ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))
- `postinstall`, `prebuild` et `pretest` ne interrogent plus le service d’avis npm : une panne ne bloque plus `npm ci`. La vérification amont passe dans `npm run audit:upstream`, lancée chaque jour par un workflow dédié. (MAIR-744, [#246](https://github.com/mairie360/Login_Web_Service/pull/246))

#### Corrections

- Message « Connexion temporairement indisponible » : avant, la carte pouvait déborder à 320 px avec un espacement de texte augmenté. Maintenant, le rembourrage est réduit sous `sm` et les mots longs sont coupés. (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))

#### Technique

- Vendoring de Zod 3 avec rétro-portage de la validation bornée, contrôle d’intégrité et `overrides` vers `vendor/zod` ; réparation des lockfiles. ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))
- Politique Gitleaks (`.gitleaks.toml`) et test de manifeste Zod ; corrections de `.gitleaksignore`. (MAIR-743, [#251](https://github.com/mairie360/Login_Web_Service/pull/251))
- Stacks de tests RGAA (`accessibility_test.sh`, `docker-compose-accessibility.yml`) et tests Playwright d’accessibilité ; durcissement des scripts. (MAIR-316, [#150](https://github.com/mairie360/Login_Web_Service/pull/150) ; MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141) ; MAIR-768, [#241](https://github.com/mairie360/Login_Web_Service/pull/241))
- Stack de simulation RGPD et script `gdpr_simulation_test.sh`, puis corrections de ce script. (MAIR-497, [#248](https://github.com/mairie360/Login_Web_Service/pull/248), [#249](https://github.com/mairie360/Login_Web_Service/pull/249))
- Workflow de checklist RGPD sur les PR. (MAIR-295, [#160](https://github.com/mairie360/Login_Web_Service/pull/160))
- Mises à jour des dépendances : `follow-redirects` 1.16.2 ([#243](https://github.com/mairie360/Login_Web_Service/pull/243)), TypeScript et outils ([#230](https://github.com/mairie360/Login_Web_Service/pull/230)), Node 24.22.1, Next.js 16.4.2 et digests Docker ([#231](https://github.com/mairie360/Login_Web_Service/pull/231)).
- Réorganisation des composants `Login/` et `ForgotPassword/` en dossiers, sans changement de rendu hors message d’erreur. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Montée de version de mairie360/CICD (v4.5.0 à v5.3.1) par Renovate et manuellement. ([#222](https://github.com/mairie360/Login_Web_Service/pull/222), [#235](https://github.com/mairie360/Login_Web_Service/pull/235), [#247](https://github.com/mairie360/Login_Web_Service/pull/247))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-04 18:29 UTC | dev | — | `0e4ca84` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/41884151391) |
| 2026-11-04 18:11 UTC | dev | — | `0d89bbe` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/41882753076) |
| 2026-11-03 14:57 UTC | dev | — | `4fd3fb6` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/41656784311) |
| 2026-11-02 23:02 UTC | dev | — | `bf90ca2` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/41540155766) |
| 2026-11-02 19:56 UTC | dev | — | `a80b60a` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/41512986176) |
| 2026-11-02 18:22 UTC | dev | — | `28705d9` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/41470544794) |
| 2026-10-23 13:04 UTC | dev | — | `d71ddd5` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39957511454) |
| 2026-10-21 17:59 UTC | dev | — | `71c25b9` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39647891669) |
| 2026-10-21 11:08 UTC | prod | v0.4.0 | `c9d6a7f` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39588535378) |
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
