# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "28705d95ad6029b4e16cc75b3ffa6eef3fec3442", "prod": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "prod_tag": "v0.4.0", "staging": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "updated": {"dev": "2026-11-02 18:22 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 10:57 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `c9d6a7f` | 2026-10-21 11:08 UTC |
| staging | — | `c9d6a7f` | 2026-10-21 10:57 UTC |
| dev | — | `28705d9` | 2026-11-02 18:22 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Pages publiques « Mentions légales » (`/mentions-legales`) et « Politique de confidentialité » (`/confidentialite`), rendues à la demande depuis `LEGAL_CONFIG`. Une valeur absente s'affiche « À compléter par la mairie ». Le pied de page du layout renvoie vers les deux pages depuis chaque page du front. (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))

#### Changements de comportement
- Le message d'erreur de connexion est désormais l'alerte de la lib (`ErrorAlert`), annoncée et fermable par « Fermer le message ». Avant, c'était un `Toast` autonome, non annoncé hors `ToastProvider`. Le bouton de connexion utilise `fullWidth` et l'état `loading` de la lib ; les surcharges de texte blanc et d'ombre bleue sont retirées. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Stack Docker de développement (`docker-compose.yml`) : `JWT_SECRET` est obligatoire (`${JWT_SECRET:?...}`), `JWT_ALLOW_WEAK_SECRET` passe à `false`, et les ports 3000, 3001 et 4000 ne sont publiés que sur `127.0.0.1`. Un développeur doit définir un secret fort avant de lancer la stack. ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))

#### Corrections
- Panneau « Connexion temporairement indisponible » sur `/` : avant, un padding fixe `p-8` pouvait faire déborder le texte à 320px avec espacement de texte augmenté. Maintenant, le padding est réduit sous `sm` (`px-4 py-6`) et les mots longs passent à la ligne (`overflow-wrap:anywhere`). (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))

#### Technique
- Refactor de `Login.tsx` (356 → 243 lignes) en sous-composants `login/` suivant la convention d'arborescence, avec le même markup, et tests co-localisés. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Garde-fous CI : checklist RGPD sur les PR (`gdpr-pr.yml`), stack et script RGAA, tests Playwright d'accessibilité, épinglage du CICD. (MAIR-292/295/316/318, [#150](https://github.com/mairie360/Login_Web_Service/pull/150), [#141](https://github.com/mairie360/Login_Web_Service/pull/141), [#160](https://github.com/mairie360/Login_Web_Service/pull/160))
- Mises à jour : Node 24.22.1 (Dockerfile et CI), Next.js 16.4.2, `follow-redirects` 1.16.2 (GHSA-mrwp-f3q8-3g9p, [#243](https://github.com/mairie360/Login_Web_Service/pull/243)), dépendances TypeScript (user-event 14.6.8, vitest 5.0.5, jsdom 30.1.3, playwright-core 1.64.1, [#230](https://github.com/mairie360/Login_Web_Service/pull/230)), CICD v4.5.0 puis v4.12.0 ([#222](https://github.com/mairie360/Login_Web_Service/pull/222), [#235](https://github.com/mairie360/Login_Web_Service/pull/235)).
- Verrous npm réparés, backport de validation Zod 3 bornée (`vendor/zod`), source maps de bundle activées uniquement pour la mesure CI ([#232](https://github.com/mairie360/Login_Web_Service/pull/232)).

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Pages publiques « Mentions légales » (`/mentions-legales`) et « Politique de confidentialité » (`/confidentialite`), rendues à la demande depuis `LEGAL_CONFIG`. Une valeur absente s'affiche « À compléter par la mairie ». Le pied de page du layout renvoie vers les deux pages depuis chaque page du front. (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))

#### Changements de comportement
- Le message d'erreur de connexion est désormais l'alerte de la lib (`ErrorAlert`), annoncée et fermable par « Fermer le message ». Avant, c'était un `Toast` autonome, non annoncé hors `ToastProvider`. Le bouton de connexion utilise `fullWidth` et l'état `loading` de la lib ; les surcharges de texte blanc et d'ombre bleue sont retirées. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Stack Docker de développement (`docker-compose.yml`) : `JWT_SECRET` est obligatoire (`${JWT_SECRET:?...}`), `JWT_ALLOW_WEAK_SECRET` passe à `false`, et les ports 3000, 3001 et 4000 ne sont publiés que sur `127.0.0.1`. Un développeur doit définir un secret fort avant de lancer la stack. ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))

#### Corrections
- Panneau « Connexion temporairement indisponible » sur `/` : avant, un padding fixe `p-8` pouvait faire déborder le texte à 320px avec espacement de texte augmenté. Maintenant, le padding est réduit sous `sm` (`px-4 py-6`) et les mots longs passent à la ligne (`overflow-wrap:anywhere`). (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))

#### Technique
- Refactor de `Login.tsx` (356 → 243 lignes) en sous-composants `login/` suivant la convention d'arborescence, avec le même markup, et tests co-localisés. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Garde-fous CI : checklist RGPD sur les PR (`gdpr-pr.yml`), stack et script RGAA, tests Playwright d'accessibilité, épinglage du CICD. (MAIR-292/295/316/318, [#150](https://github.com/mairie360/Login_Web_Service/pull/150), [#141](https://github.com/mairie360/Login_Web_Service/pull/141), [#160](https://github.com/mairie360/Login_Web_Service/pull/160))
- Mises à jour : Node 24.22.1 (Dockerfile et CI), Next.js 16.4.2, `follow-redirects` 1.16.2 (GHSA-mrwp-f3q8-3g9p, [#243](https://github.com/mairie360/Login_Web_Service/pull/243)), dépendances TypeScript (user-event 14.6.8, vitest 5.0.5, jsdom 30.1.3, playwright-core 1.64.1, [#230](https://github.com/mairie360/Login_Web_Service/pull/230)), CICD v4.5.0 puis v4.12.0 ([#222](https://github.com/mairie360/Login_Web_Service/pull/222), [#235](https://github.com/mairie360/Login_Web_Service/pull/235)).
- Verrous npm réparés, backport de validation Zod 3 bornée (`vendor/zod`), source maps de bundle activées uniquement pour la mesure CI ([#232](https://github.com/mairie360/Login_Web_Service/pull/232)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
