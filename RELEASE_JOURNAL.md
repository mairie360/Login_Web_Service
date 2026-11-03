# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "4fd3fb6937714957eac498563b5b47fb11a0d866", "prod": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "prod_tag": "v0.4.0", "staging": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "updated": {"dev": "2026-11-03 14:57 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 10:57 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `c9d6a7f` | 2026-10-21 11:08 UTC |
| staging | — | `c9d6a7f` | 2026-10-21 10:57 UTC |
| dev | — | `4fd3fb6` | 2026-11-03 14:57 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Pages publiques « Mentions légales » (`/mentions-legales`) et « Politique de confidentialité » (`/confidentialite`), rendues à la demande depuis `LEGAL_CONFIG` (JSON de `global.legal` fourni par le chart). Une valeur absente s'affiche « À compléter par la mairie ». (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))
- Pied de page sur chaque page du front, avec les liens vers ces deux pages. (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))

#### Changements de comportement
- Bouton de connexion : pleine largeur et état de chargement via les props de la lib (`fullWidth`, `loading`) ; les surcharges `!text-white` et l'ancienne ombre bleue sont retirées. Les boutons de la page de déconnexion gardent le style plein par défaut de la lib. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Stack de développement local `docker-compose.yml` seulement : `JWT_SECRET` devient obligatoire, `JWT_ALLOW_WEAK_SECRET` vaut `false`, et les ports 3000, 4000 et 3001 ne sont plus publiés que sur 127.0.0.1. (sans clé Jira, [#232](https://github.com/mairie360/Login_Web_Service/pull/232))

#### Corrections
- Erreur de connexion : avant, un `Toast` autonome hors `ToastProvider` n'était pas annoncé aux lecteurs d'écran ; maintenant c'est l'`ErrorAlert` de la lib, annoncé et fermable via « Fermer le message ». (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Page « Connexion temporairement indisponible » à 320 px avec espacement du texte augmenté : avant, le padding fixe et les mots longs débordaient ; maintenant le padding est réduit sous `sm` et les mots longs passent à la ligne. (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))

#### Technique
- Tests navigateur d'accessibilité Playwright et axe sur les routes de Login, avec job CI dédié en lecture seule. (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))
- Stack et script RGAA (`accessibility_test.sh`, `docker-compose-accessibility.yml`, `rgaa.yaml`), puis durcissement du script et du projet compose. (MAIR-316, [#150](https://github.com/mairie360/Login_Web_Service/pull/150) ; MAIR-768, [#241](https://github.com/mairie360/Login_Web_Service/pull/241))
- Checklist RGPD sur les PR (`gdpr-pr.yml`) et simulation d'usage RGPD avant prod (`docker-compose-gdpr-simulation.yml`, diff tronqué). (MAIR-295, [#160](https://github.com/mairie360/Login_Web_Service/pull/160) ; MAIR-497, [#248](https://github.com/mairie360/Login_Web_Service/pull/248))
- mairie360/CICD monté de v4.5.0 à v4.12.0 (Renovate), puis à v5.1.0 et v5.2.2 pour les contrôles RGPD et RGAA. (MAIR-771, [#247](https://github.com/mairie360/Login_Web_Service/pull/247) ; [#235](https://github.com/mairie360/Login_Web_Service/pull/235) ; [#222](https://github.com/mairie360/Login_Web_Service/pull/222))
- Postinstall, prebuild et pretest n'interrogent plus le service d'avis npm : le contrôle distant passe dans `npm run audit:upstream`, lancé chaque jour par un workflow dédié. (MAIR-744, [#246](https://github.com/mairie360/Login_Web_Service/pull/246))
- Dépendances : `follow-redirects` 1.16.2 (GHSA-mrwp-f3q8-3g9p), TypeScript et outils de test mis à jour, Node 24.22.1 et image Docker de base sur ce patch, Next.js 16.4.2. (sans clé Jira, [#243](https://github.com/mairie360/Login_Web_Service/pull/243) ; [#230](https://github.com/mairie360/Login_Web_Service/pull/230) ; [#231](https://github.com/mairie360/Login_Web_Service/pull/231))
- Verrous npm réparés, Zod 3 vendorisé avec backport de validation bornée, et cartes sources utilisées seulement par le build de mesure CI. (sans clé Jira, [#232](https://github.com/mairie360/Login_Web_Service/pull/232))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Pages publiques « Mentions légales » (`/mentions-legales`) et « Politique de confidentialité » (`/confidentialite`), rendues à la demande depuis `LEGAL_CONFIG` (JSON de `global.legal` fourni par le chart). Une valeur absente s'affiche « À compléter par la mairie ». (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))
- Pied de page sur chaque page du front, avec les liens vers ces deux pages. (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))

#### Changements de comportement
- Bouton de connexion : pleine largeur et état de chargement via les props de la lib (`fullWidth`, `loading`) ; les surcharges `!text-white` et l'ancienne ombre bleue sont retirées. Les boutons de la page de déconnexion gardent le style plein par défaut de la lib. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Stack de développement local `docker-compose.yml` seulement : `JWT_SECRET` devient obligatoire, `JWT_ALLOW_WEAK_SECRET` vaut `false`, et les ports 3000, 4000 et 3001 ne sont plus publiés que sur 127.0.0.1. (sans clé Jira, [#232](https://github.com/mairie360/Login_Web_Service/pull/232))

#### Corrections
- Erreur de connexion : avant, un `Toast` autonome hors `ToastProvider` n'était pas annoncé aux lecteurs d'écran ; maintenant c'est l'`ErrorAlert` de la lib, annoncé et fermable via « Fermer le message ». (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Page « Connexion temporairement indisponible » à 320 px avec espacement du texte augmenté : avant, le padding fixe et les mots longs débordaient ; maintenant le padding est réduit sous `sm` et les mots longs passent à la ligne. (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))

#### Technique
- Tests navigateur d'accessibilité Playwright et axe sur les routes de Login, avec job CI dédié en lecture seule. (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))
- Stack et script RGAA (`accessibility_test.sh`, `docker-compose-accessibility.yml`, `rgaa.yaml`), puis durcissement du script et du projet compose. (MAIR-316, [#150](https://github.com/mairie360/Login_Web_Service/pull/150) ; MAIR-768, [#241](https://github.com/mairie360/Login_Web_Service/pull/241))
- Checklist RGPD sur les PR (`gdpr-pr.yml`) et simulation d'usage RGPD avant prod (`docker-compose-gdpr-simulation.yml`, diff tronqué). (MAIR-295, [#160](https://github.com/mairie360/Login_Web_Service/pull/160) ; MAIR-497, [#248](https://github.com/mairie360/Login_Web_Service/pull/248))
- mairie360/CICD monté de v4.5.0 à v4.12.0 (Renovate), puis à v5.1.0 et v5.2.2 pour les contrôles RGPD et RGAA. (MAIR-771, [#247](https://github.com/mairie360/Login_Web_Service/pull/247) ; [#235](https://github.com/mairie360/Login_Web_Service/pull/235) ; [#222](https://github.com/mairie360/Login_Web_Service/pull/222))
- Postinstall, prebuild et pretest n'interrogent plus le service d'avis npm : le contrôle distant passe dans `npm run audit:upstream`, lancé chaque jour par un workflow dédié. (MAIR-744, [#246](https://github.com/mairie360/Login_Web_Service/pull/246))
- Dépendances : `follow-redirects` 1.16.2 (GHSA-mrwp-f3q8-3g9p), TypeScript et outils de test mis à jour, Node 24.22.1 et image Docker de base sur ce patch, Next.js 16.4.2. (sans clé Jira, [#243](https://github.com/mairie360/Login_Web_Service/pull/243) ; [#230](https://github.com/mairie360/Login_Web_Service/pull/230) ; [#231](https://github.com/mairie360/Login_Web_Service/pull/231))
- Verrous npm réparés, Zod 3 vendorisé avec backport de validation bornée, et cartes sources utilisées seulement par le build de mesure CI. (sans clé Jira, [#232](https://github.com/mairie360/Login_Web_Service/pull/232))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
