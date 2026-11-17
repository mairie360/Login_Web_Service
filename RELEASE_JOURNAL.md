# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "89a5f910e83c01bd48704f5a5a3de42a637d02be", "prod": "7503ac1dfdfc043716bf99cfb30698e61ac73611", "prod_tag": "v0.5.0", "staging": "7503ac1dfdfc043716bf99cfb30698e61ac73611", "updated": {"dev": "2026-11-17 18:20 UTC", "prod": "2026-11-13 01:41 UTC", "staging": "2026-11-12 19:05 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.5.0 | `7503ac1` | 2026-11-13 01:41 UTC |
| staging | — | `7503ac1` | 2026-11-12 19:05 UTC |
| dev | — | `89a5f91` | 2026-11-17 18:20 UTC |

## Ajouté sur main depuis la dernière release prod (v0.5.0)

- feat: MAIR-866 [Login] F1 Connexion : champs, lien et messages avec les composants de la lib (#279) ([#279](https://github.com/mairie360/Login_Web_Service/pull/279))
- feat: MAIR-875 [Login] F2 Première connexion : champs de la lib et règle des 12 caractères (#278) ([#278](https://github.com/mairie360/Login_Web_Service/pull/278))
- feat: MAIR-888 [Login] F4 Réinitialiser le mot de passe : refonte avec la lib et règle des 12 caractères (#277) ([#277](https://github.com/mairie360/Login_Web_Service/pull/277))
- feat: MAIR-881 [Login] F3 Mot de passe oublié : refonte avec les composants de la lib (#276) ([#276](https://github.com/mairie360/Login_Web_Service/pull/276))
- feat: MAIR-830 [Login] Mise en page commune : Logo, Card, Footer et textes de la lib, et écran « Connexion indisponible » (#275) ([#275](https://github.com/mairie360/Login_Web_Service/pull/275))
- feat!: MAIR-895 [Login] Retirer la connexion par compte unique (Keycloak) (#274) ([#274](https://github.com/mairie360/Login_Web_Service/pull/274))
- feat!: MAIR-900 [Login] Retirer la page de déconnexion et la reprise de session (#273) ([#273](https://github.com/mairie360/Login_Web_Service/pull/273))
- feat: MAIR-998 Test stacks follow the moving upstream tag of the stage (#263) ([#263](https://github.com/mairie360/Login_Web_Service/pull/263))
- chore(deps): update dependency mairie360/cicd to v5.11.0 (#265) ([#265](https://github.com/mairie360/Login_Web_Service/pull/265))
- ci: MAIR-1008 Nightly rehearsal of the promotion gates (#261) ([#261](https://github.com/mairie360/Login_Web_Service/pull/261))
- chore(deps): update dependency mairie360/cicd to v5.6.1 (#264) ([#264](https://github.com/mairie360/Login_Web_Service/pull/264))
- chore(deps): update mairie360 database schema to v3.4.0 (#258) ([#258](https://github.com/mairie360/Login_Web_Service/pull/258))
- chore(deps): update ghcr.io/mairie360/core-api docker tag to v2.3.0 (#257) ([#257](https://github.com/mairie360/Login_Web_Service/pull/257))

## Différence dev → staging (en dev, pas encore en staging)

- feat: MAIR-866 [Login] F1 Connexion : champs, lien et messages avec les composants de la lib (#279) ([#279](https://github.com/mairie360/Login_Web_Service/pull/279))
- feat: MAIR-875 [Login] F2 Première connexion : champs de la lib et règle des 12 caractères (#278) ([#278](https://github.com/mairie360/Login_Web_Service/pull/278))
- feat: MAIR-888 [Login] F4 Réinitialiser le mot de passe : refonte avec la lib et règle des 12 caractères (#277) ([#277](https://github.com/mairie360/Login_Web_Service/pull/277))
- feat: MAIR-881 [Login] F3 Mot de passe oublié : refonte avec les composants de la lib (#276) ([#276](https://github.com/mairie360/Login_Web_Service/pull/276))
- feat: MAIR-830 [Login] Mise en page commune : Logo, Card, Footer et textes de la lib, et écran « Connexion indisponible » (#275) ([#275](https://github.com/mairie360/Login_Web_Service/pull/275))
- feat!: MAIR-895 [Login] Retirer la connexion par compte unique (Keycloak) (#274) ([#274](https://github.com/mairie360/Login_Web_Service/pull/274))
- feat!: MAIR-900 [Login] Retirer la page de déconnexion et la reprise de session (#273) ([#273](https://github.com/mairie360/Login_Web_Service/pull/273))
- feat: MAIR-998 Test stacks follow the moving upstream tag of the stage (#263) ([#263](https://github.com/mairie360/Login_Web_Service/pull/263))
- chore(deps): update dependency mairie360/cicd to v5.11.0 (#265) ([#265](https://github.com/mairie360/Login_Web_Service/pull/265))
- ci: MAIR-1008 Nightly rehearsal of the promotion gates (#261) ([#261](https://github.com/mairie360/Login_Web_Service/pull/261))
- chore(deps): update dependency mairie360/cicd to v5.6.1 (#264) ([#264](https://github.com/mairie360/Login_Web_Service/pull/264))
- chore(deps): update mairie360 database schema to v3.4.0 (#258) ([#258](https://github.com/mairie360/Login_Web_Service/pull/258))
- chore(deps): update ghcr.io/mairie360/core-api docker tag to v2.3.0 (#257) ([#257](https://github.com/mairie360/Login_Web_Service/pull/257))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

> Résumé Claude indisponible pour ce passage : listes brutes des commits.

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-17 18:20 UTC | dev | — | `89a5f91` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/44145457866) |
| 2026-11-17 14:22 UTC | dev | — | `9b169cb` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/44100544644) |
| 2026-11-17 13:29 UTC | dev | — | `8a1695a` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/44092295130) |
| 2026-11-17 12:42 UTC | dev | — | `a8e6e9b` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/44084344571) |
| 2026-11-17 08:11 UTC | dev | — | `316dcca` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/44043643712) |
| 2026-11-13 20:05 UTC | dev | — | `8123c69` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/43497318594) |
| 2026-11-13 06:10 UTC | dev | — | `31925c7` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/43376093256) |
| 2026-11-13 01:41 UTC | prod | v0.5.0 | `7503ac1` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/43340544894) |
| 2026-11-12 19:05 UTC | staging | — | `7503ac1` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/43285863490) |
| 2026-11-12 17:05 UTC | dev | — | `7503ac1` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/43264207817) |
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
