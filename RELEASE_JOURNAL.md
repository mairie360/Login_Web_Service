# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "5061df072afd5f31b11484512bd7dd38fab54cc2", "prod": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "prod_tag": "v0.4.0", "staging": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "updated": {"dev": "2026-11-04 21:13 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 10:57 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `c9d6a7f` | 2026-10-21 11:08 UTC |
| staging | — | `c9d6a7f` | 2026-10-21 10:57 UTC |
| dev | — | `5061df0` | 2026-11-04 21:13 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Nouvelles pages publiques `/mentions-legales` (mentions légales) et `/confidentialite` (politique de confidentialité), rendues à la demande depuis `LEGAL_CONFIG` : identité de la mairie, directeur de publication, DPO, hébergeur, durées de conservation et sous-traitants. Une valeur absente s'affiche « À compléter par la mairie ». (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))
- Le pied de page du layout affiche les liens « Mentions légales » et « Politique de confidentialité » sur chaque page du front. (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))

#### Changements de comportement
- L'erreur de connexion s'affiche dans l'alerte de la lib (`ErrorAlert`), annoncée aux lecteurs d'écran et fermable par « Fermer le message ». Avant : un Toast autonome, non annoncé hors `ToastProvider`. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Le bouton de connexion occupe toute la largeur et affiche l'état de chargement de la lib ; les surcharges de texte blanc et d'ombre bleue sont retirées. Les boutons de la page de déconnexion prennent le style plein par défaut de la lib. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Pour les développeurs : `docker-compose.yml` exige désormais `JWT_SECRET` (environnement ou `.env` non suivi) et refuse le secret faible (`JWT_ALLOW_WEAK_SECRET: "false"`) ; les ports 3000, 3001 et 4000 ne sont publiés que sur 127.0.0.1. Sans `JWT_SECRET`, la stack locale ne démarre pas. (PR [#232](https://github.com/mairie360/Login_Web_Service/pull/232))

#### Corrections
- Page « Connexion temporairement indisponible » à 320px avec espacement de texte augmenté : avant, le message débordait ; maintenant le padding est réduit sous `sm` et les mots longs passent à la ligne. (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))

#### Technique
- CI/CD : l'épingle de mairie360/CICD passe de v4.12.0 à v5.5.0 (workflows cicd, promotions, dev-exception) ; ajout de la checklist RGPD des PR (`gdpr-pr.yml`), des stacks de test isolés (E2E Playwright, accessibilité RGAA et axe, simulation RGPD), de la politique Gitleaks (`.gitleaks.toml`) et d'un workflow de veille des advisories (`upstream-advisories.yml`). Les tests des stacks ne changent pas le comportement en production.
- Dépendances : Node 24.22.1 (Dockerfile et digest, correctif de sécurité), Next.js et eslint-config-next 16.4.2, follow-redirects 1.16.2, mises à jour TypeScript et Vitest ; Zod 3 est backporté dans `vendor/zod` avec validation bornée des collections, `postinstall` ne consulte plus le service d'avis npm (MAIR-744), et `Login.tsx` est découpé en composants `Login/` (MAIR-608).

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Nouvelles pages publiques `/mentions-legales` (mentions légales) et `/confidentialite` (politique de confidentialité), rendues à la demande depuis `LEGAL_CONFIG` : identité de la mairie, directeur de publication, DPO, hébergeur, durées de conservation et sous-traitants. Une valeur absente s'affiche « À compléter par la mairie ». (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))
- Le pied de page du layout affiche les liens « Mentions légales » et « Politique de confidentialité » sur chaque page du front. (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))

#### Changements de comportement
- L'erreur de connexion s'affiche dans l'alerte de la lib (`ErrorAlert`), annoncée aux lecteurs d'écran et fermable par « Fermer le message ». Avant : un Toast autonome, non annoncé hors `ToastProvider`. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Le bouton de connexion occupe toute la largeur et affiche l'état de chargement de la lib ; les surcharges de texte blanc et d'ombre bleue sont retirées. Les boutons de la page de déconnexion prennent le style plein par défaut de la lib. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Pour les développeurs : `docker-compose.yml` exige désormais `JWT_SECRET` (environnement ou `.env` non suivi) et refuse le secret faible (`JWT_ALLOW_WEAK_SECRET: "false"`) ; les ports 3000, 3001 et 4000 ne sont publiés que sur 127.0.0.1. Sans `JWT_SECRET`, la stack locale ne démarre pas. (PR [#232](https://github.com/mairie360/Login_Web_Service/pull/232))

#### Corrections
- Page « Connexion temporairement indisponible » à 320px avec espacement de texte augmenté : avant, le message débordait ; maintenant le padding est réduit sous `sm` et les mots longs passent à la ligne. (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))

#### Technique
- CI/CD : l'épingle de mairie360/CICD passe de v4.12.0 à v5.5.0 (workflows cicd, promotions, dev-exception) ; ajout de la checklist RGPD des PR (`gdpr-pr.yml`), des stacks de test isolés (E2E Playwright, accessibilité RGAA et axe, simulation RGPD), de la politique Gitleaks (`.gitleaks.toml`) et d'un workflow de veille des advisories (`upstream-advisories.yml`). Les tests des stacks ne changent pas le comportement en production.
- Dépendances : Node 24.22.1 (Dockerfile et digest, correctif de sécurité), Next.js et eslint-config-next 16.4.2, follow-redirects 1.16.2, mises à jour TypeScript et Vitest ; Zod 3 est backporté dans `vendor/zod` avec validation bornée des collections, `postinstall` ne consulte plus le service d'avis npm (MAIR-744), et `Login.tsx` est découpé en composants `Login/` (MAIR-608).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-04 21:13 UTC | dev | — | `5061df0` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/41912443351) |
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
