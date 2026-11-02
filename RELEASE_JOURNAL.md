# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "a80b60a3e039b3a1c0d4e7825967e5f1d5759322", "prod": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "prod_tag": "v0.4.0", "staging": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "updated": {"dev": "2026-11-02 19:56 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 10:57 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `c9d6a7f` | 2026-10-21 11:08 UTC |
| staging | — | `c9d6a7f` | 2026-10-21 10:57 UTC |
| dev | — | `a80b60a` | 2026-11-02 19:56 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Nouvelles pages publiques `/mentions-legales` (mentions légales) et `/confidentialite` (politique de confidentialité), rendues à la demande à partir de `LEGAL_CONFIG` ; une valeur absente s'affiche « À compléter par la mairie ». (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))
- Pied de page sur chaque page du front, avec des liens vers ces deux pages. (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))

#### Changements de comportement
- Le bouton de connexion utilise les props `fullWidth` et `loading` de la lib : le texte blanc forcé et l'ombre bleue sont retirés. Les boutons de la page de déconnexion gardent le style plein par défaut. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Environnement de développement (`docker-compose.yml`) : `JWT_SECRET` est obligatoire (Compose échoue sans lui), `JWT_ALLOW_WEAK_SECRET` passe à `false`, et les ports 3000, 3001 et 4000 ne sont plus publiés que sur 127.0.0.1. ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))

#### Corrections
- Erreur de connexion : avant, un `Toast` autonome hors `ToastProvider` n'était pas annoncé aux lecteurs d'écran ; maintenant l'erreur est une `ErrorAlert` annoncée, fermable par « Fermer le message ». (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Page « Connexion temporairement indisponible » : avant, un padding fixe pouvait faire déborder le message à 320px avec espacement de texte augmenté ; maintenant le padding se réduit sous `sm` et les mots longs passent à la ligne. (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))

#### Technique
- Les scripts `postinstall`, `prebuild` et `pretest` ne interrogent plus le service d'avis npm ; la vérification upstream passe dans `npm run audit:upstream`, lancée chaque jour par `upstream-advisories.yml`. (MAIR-744, [#246](https://github.com/mairie360/Login_Web_Service/pull/246))
- Mise à jour de `follow-redirects` vers 1.16.2 (GHSA-mrwp-f3q8-3g9p) et test de politique associé. ([#243](https://github.com/mairie360/Login_Web_Service/pull/243))
- Stack et tests RGAA : `accessibility_test.sh`, `docker-compose-accessibility.yml`, verrou de run, pin CICD v5.1.0 dans les workflows, et tests Playwright d'accessibilité en CI. (MAIR-316, MAIR-768, [#150](https://github.com/mairie360/Login_Web_Service/pull/150), [#241](https://github.com/mairie360/Login_Web_Service/pull/241), [#141](https://github.com/mairie360/Login_Web_Service/pull/141))
- Checklist RGPD sur les PR (`gdpr-pr.yml`, pin CICD v4.12.2). (MAIR-295, [#160](https://github.com/mairie360/Login_Web_Service/pull/160))
- Zod 3 vendorisé avec backport de validation bornée et garde d'intégrité ; le diff est tronqué, détail non vérifié. ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))
- Lock de dépendances réparé, provenance du bundle et source maps limitées à la mesure CI. ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))
- Node 24.22.1 (images digest), Next.js 16.4.2 et mises à jour TypeScript/tests. ([#231](https://github.com/mairie360/Login_Web_Service/pull/231), [#230](https://github.com/mairie360/Login_Web_Service/pull/230))
- Mises à jour Renovate de `mairie360/CICD` (v4.5.0, puis v4.12.0). ([#222](https://github.com/mairie360/Login_Web_Service/pull/222), [#235](https://github.com/mairie360/Login_Web_Service/pull/235))
- Découpage de `Login.tsx` en dossiers de composants et convention d'arborescence avec tests associés. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Nouvelles pages publiques `/mentions-legales` (mentions légales) et `/confidentialite` (politique de confidentialité), rendues à la demande à partir de `LEGAL_CONFIG` ; une valeur absente s'affiche « À compléter par la mairie ». (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))
- Pied de page sur chaque page du front, avec des liens vers ces deux pages. (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))

#### Changements de comportement
- Le bouton de connexion utilise les props `fullWidth` et `loading` de la lib : le texte blanc forcé et l'ombre bleue sont retirés. Les boutons de la page de déconnexion gardent le style plein par défaut. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Environnement de développement (`docker-compose.yml`) : `JWT_SECRET` est obligatoire (Compose échoue sans lui), `JWT_ALLOW_WEAK_SECRET` passe à `false`, et les ports 3000, 3001 et 4000 ne sont plus publiés que sur 127.0.0.1. ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))

#### Corrections
- Erreur de connexion : avant, un `Toast` autonome hors `ToastProvider` n'était pas annoncé aux lecteurs d'écran ; maintenant l'erreur est une `ErrorAlert` annoncée, fermable par « Fermer le message ». (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Page « Connexion temporairement indisponible » : avant, un padding fixe pouvait faire déborder le message à 320px avec espacement de texte augmenté ; maintenant le padding se réduit sous `sm` et les mots longs passent à la ligne. (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))

#### Technique
- Les scripts `postinstall`, `prebuild` et `pretest` ne interrogent plus le service d'avis npm ; la vérification upstream passe dans `npm run audit:upstream`, lancée chaque jour par `upstream-advisories.yml`. (MAIR-744, [#246](https://github.com/mairie360/Login_Web_Service/pull/246))
- Mise à jour de `follow-redirects` vers 1.16.2 (GHSA-mrwp-f3q8-3g9p) et test de politique associé. ([#243](https://github.com/mairie360/Login_Web_Service/pull/243))
- Stack et tests RGAA : `accessibility_test.sh`, `docker-compose-accessibility.yml`, verrou de run, pin CICD v5.1.0 dans les workflows, et tests Playwright d'accessibilité en CI. (MAIR-316, MAIR-768, [#150](https://github.com/mairie360/Login_Web_Service/pull/150), [#241](https://github.com/mairie360/Login_Web_Service/pull/241), [#141](https://github.com/mairie360/Login_Web_Service/pull/141))
- Checklist RGPD sur les PR (`gdpr-pr.yml`, pin CICD v4.12.2). (MAIR-295, [#160](https://github.com/mairie360/Login_Web_Service/pull/160))
- Zod 3 vendorisé avec backport de validation bornée et garde d'intégrité ; le diff est tronqué, détail non vérifié. ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))
- Lock de dépendances réparé, provenance du bundle et source maps limitées à la mesure CI. ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))
- Node 24.22.1 (images digest), Next.js 16.4.2 et mises à jour TypeScript/tests. ([#231](https://github.com/mairie360/Login_Web_Service/pull/231), [#230](https://github.com/mairie360/Login_Web_Service/pull/230))
- Mises à jour Renovate de `mairie360/CICD` (v4.5.0, puis v4.12.0). ([#222](https://github.com/mairie360/Login_Web_Service/pull/222), [#235](https://github.com/mairie360/Login_Web_Service/pull/235))
- Découpage de `Login.tsx` en dossiers de composants et convention d'arborescence avec tests associés. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
