# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "bf90ca23216b59481d6f285d927ad54b5b4b2c2f", "prod": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "prod_tag": "v0.4.0", "staging": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "updated": {"dev": "2026-11-02 23:02 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 10:57 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `c9d6a7f` | 2026-10-21 11:08 UTC |
| staging | — | `c9d6a7f` | 2026-10-21 10:57 UTC |
| dev | — | `bf90ca2` | 2026-11-02 23:02 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- `/mentions-legales` et `/confidentialite` sont des pages publiques, rendues à chaque requête à partir de `LEGAL_CONFIG` (mentions de la mairie, directeur de la publication, DPO, hébergeur, durées de conservation, sous-traitants). Une valeur absente s'affiche « À compléter par la mairie ». (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))
- Chaque page du front affiche un pied de page avec les liens « Mentions légales » et « Politique de confidentialité ». (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))

#### Changements de comportement
- Environnement de développement local (`docker-compose.yml`) : `JWT_SECRET` est désormais obligatoire (variable d'environnement ou `.env`, sinon l'appel échoue avec « Set JWT_SECRET to a unique strong local signing key »), `JWT_ALLOW_WEAK_SECRET` passe à `false` pour Core API, et les ports 3000, 3001 et 4000 ne sont plus publiés que sur `127.0.0.1`. ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))

#### Corrections
- Message « Connexion temporairement indisponible » : avant, un padding fixe débordait à 320px avec un espacement de texte agrandi ; maintenant le padding se réduit sous `sm` et les mots longs passent à la ligne (`overflow-wrap:anywhere`). (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))
- Erreur de connexion : avant, un `Toast` autonome hors `ToastProvider` n'était pas annoncé aux lecteurs d'écran ; maintenant c'est l'`ErrorAlert` de lib-components, annoncé et fermable par « Fermer le message ». (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))

#### Technique
- CI : `mairie360/CICD` passe en v5.2.2 dans les workflows (MAIR-771, [#247](https://github.com/mairie360/Login_Web_Service/pull/247)) ; le workflow de checklist RGPD des PR `gdpr-pr.yml` est ajouté (MAIR-295, [#160](https://github.com/mairie360/Login_Web_Service/pull/160)).
- Sécurité et dépendances : `follow-redirects` 1.16.2 (GHSA-mrwp-f3q8-3g9p, [#243](https://github.com/mairie360/Login_Web_Service/pull/243)) ; Node 24.22.1 et Next 16.4.2 avec digests d'image mis à jour ([#231](https://github.com/mairie360/Login_Web_Service/pull/231)) ; mises à jour TypeScript et Renovate CICD v4.12.0 ([#230](https://github.com/mairie360/Login_Web_Service/pull/230), [#235](https://github.com/mairie360/Login_Web_Service/pull/235)).
- Zod vendorisé avec garde d'intégrité ; `postinstall`, `prebuild` et `pretest` ne interrogent plus le service d'avis npm, et un workflow planifié `upstream-advisories.yml` le fait à part (MAIR-744, [#246](https://github.com/mairie360/Login_Web_Service/pull/246)). Provenance des bundles et baseline de performance ([#232](https://github.com/mairie360/Login_Web_Service/pull/232)).
- Tests : stack RGAA `docker-compose-accessibility.yml`, script `accessibility_test.sh` et tests Playwright d'accessibilité des routes de connexion (MAIR-316, [#150](https://github.com/mairie360/Login_Web_Service/pull/150) ; MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141) ; MAIR-768, [#241](https://github.com/mairie360/Login_Web_Service/pull/241)).
- Refactor : composants `Login/`, `Logout/`, `ForgotPassword/`, `ResetPassword/` et `RecoveryLayout/` en dossiers avec sous-composants (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227)).

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- `/mentions-legales` et `/confidentialite` sont des pages publiques, rendues à chaque requête à partir de `LEGAL_CONFIG` (mentions de la mairie, directeur de la publication, DPO, hébergeur, durées de conservation, sous-traitants). Une valeur absente s'affiche « À compléter par la mairie ». (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))
- Chaque page du front affiche un pied de page avec les liens « Mentions légales » et « Politique de confidentialité ». (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))

#### Changements de comportement
- Environnement de développement local (`docker-compose.yml`) : `JWT_SECRET` est désormais obligatoire (variable d'environnement ou `.env`, sinon l'appel échoue avec « Set JWT_SECRET to a unique strong local signing key »), `JWT_ALLOW_WEAK_SECRET` passe à `false` pour Core API, et les ports 3000, 3001 et 4000 ne sont plus publiés que sur `127.0.0.1`. ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))

#### Corrections
- Message « Connexion temporairement indisponible » : avant, un padding fixe débordait à 320px avec un espacement de texte agrandi ; maintenant le padding se réduit sous `sm` et les mots longs passent à la ligne (`overflow-wrap:anywhere`). (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))
- Erreur de connexion : avant, un `Toast` autonome hors `ToastProvider` n'était pas annoncé aux lecteurs d'écran ; maintenant c'est l'`ErrorAlert` de lib-components, annoncé et fermable par « Fermer le message ». (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))

#### Technique
- CI : `mairie360/CICD` passe en v5.2.2 dans les workflows (MAIR-771, [#247](https://github.com/mairie360/Login_Web_Service/pull/247)) ; le workflow de checklist RGPD des PR `gdpr-pr.yml` est ajouté (MAIR-295, [#160](https://github.com/mairie360/Login_Web_Service/pull/160)).
- Sécurité et dépendances : `follow-redirects` 1.16.2 (GHSA-mrwp-f3q8-3g9p, [#243](https://github.com/mairie360/Login_Web_Service/pull/243)) ; Node 24.22.1 et Next 16.4.2 avec digests d'image mis à jour ([#231](https://github.com/mairie360/Login_Web_Service/pull/231)) ; mises à jour TypeScript et Renovate CICD v4.12.0 ([#230](https://github.com/mairie360/Login_Web_Service/pull/230), [#235](https://github.com/mairie360/Login_Web_Service/pull/235)).
- Zod vendorisé avec garde d'intégrité ; `postinstall`, `prebuild` et `pretest` ne interrogent plus le service d'avis npm, et un workflow planifié `upstream-advisories.yml` le fait à part (MAIR-744, [#246](https://github.com/mairie360/Login_Web_Service/pull/246)). Provenance des bundles et baseline de performance ([#232](https://github.com/mairie360/Login_Web_Service/pull/232)).
- Tests : stack RGAA `docker-compose-accessibility.yml`, script `accessibility_test.sh` et tests Playwright d'accessibilité des routes de connexion (MAIR-316, [#150](https://github.com/mairie360/Login_Web_Service/pull/150) ; MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141) ; MAIR-768, [#241](https://github.com/mairie360/Login_Web_Service/pull/241)).
- Refactor : composants `Login/`, `Logout/`, `ForgotPassword/`, `ResetPassword/` et `RecoveryLayout/` en dossiers avec sous-composants (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
