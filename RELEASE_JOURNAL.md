# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "7503ac1dfdfc043716bf99cfb30698e61ac73611", "prod": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "prod_tag": "v0.4.0", "staging": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "updated": {"dev": "2026-11-12 17:05 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 10:57 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `c9d6a7f` | 2026-10-21 11:08 UTC |
| staging | — | `c9d6a7f` | 2026-10-21 10:57 UTC |
| dev | — | `7503ac1` | 2026-11-12 17:05 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

- fix: MAIR-816 Release dev: align internal versions and deploy ([#255](https://github.com/mairie360/Login_Web_Service/pull/255))
- chore(deps): update dependency mairie360/cicd to v5.6.0 (#253) ([#253](https://github.com/mairie360/Login_Web_Service/pull/253))
- feat: MAIR-603 E2E - Parcours utilisateurs Playwright des fronts (#229) ([#229](https://github.com/mairie360/Login_Web_Service/pull/229))
- fix: MAIR-743 [Audit 30/10] Login, Calendars, Elearning, Projects: branch Gitleaks fingerprints invalid after squash, main likely red (N1) (#251) ([#251](https://github.com/mairie360/Login_Web_Service/pull/251))
- fix: MAIR-497 GDPR - Usage simulation and AI review of logs and database before prod ([#249](https://github.com/mairie360/Login_Web_Service/pull/249))
- feat: MAIR-497 RGPD - Simulation d'usage et revue IA des logs et de la base avant la prod ([#248](https://github.com/mairie360/Login_Web_Service/pull/248))
- ci: MAIR-771 APIs, BFFs, Database : monter CICD en v5.2.2 pour activer les contrôles RGPD (#247) ([#247](https://github.com/mairie360/Login_Web_Service/pull/247))
- fix: MAIR-744 [Audit 30/10] Login, Calendars, Elearning, Projects : le postinstall interroge le service d'avis npm, npm ci dépend du réseau (N2) (#246) ([#246](https://github.com/mairie360/Login_Web_Service/pull/246))
- fix(deps): bump follow-redirects to 1.16.2 (GHSA-mrwp-f3q8-3g9p) ([#243](https://github.com/mairie360/Login_Web_Service/pull/243))
- fix: MAIR-768 RGAA - Aligner les stacks d'accessibilité des fronts mergés en premier ([#241](https://github.com/mairie360/Login_Web_Service/pull/241))
- ci: MAIR-316 RGAA - Périmètre et états des pages par front (#150) ([#150](https://github.com/mairie360/Login_Web_Service/pull/150))
- test(login): MAIR-318 add isolated route accessibility checks (#141) ([#141](https://github.com/mairie360/Login_Web_Service/pull/141))
- feat: MAIR-292 Ajouter des tests Playwright RGPD et les pages légales aux fronts (#159) ([#159](https://github.com/mairie360/Login_Web_Service/pull/159))
- ci: MAIR-295 Ajouter une checklist RGPD aux PR et des rappels d'échéances automatiques (#160) ([#160](https://github.com/mairie360/Login_Web_Service/pull/160))
- chore(deps): update dependency mairie360/cicd to v4.12.0 (#235) ([#235](https://github.com/mairie360/Login_Web_Service/pull/235))
- fix(security): repair dependency locks and bound Zod validation (#232) ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))
- chore(deps): update dependency mairie360/cicd to v4.5.0 (#222) ([#222](https://github.com/mairie360/Login_Web_Service/pull/222))
- chore(deps): update typescript dependencies (#230) ([#230](https://github.com/mairie360/Login_Web_Service/pull/230))
- fix(security): patch Node.js and Next.js (#231) ([#231](https://github.com/mairie360/Login_Web_Service/pull/231))
- feat: MAIR-608 Lib UI - Normaliser la charte, les tailles et les composants partagés des fronts ([#227](https://github.com/mairie360/Login_Web_Service/pull/227))

## Différence dev → staging (en dev, pas encore en staging)

- fix: MAIR-816 Release dev: align internal versions and deploy ([#255](https://github.com/mairie360/Login_Web_Service/pull/255))
- chore(deps): update dependency mairie360/cicd to v5.6.0 (#253) ([#253](https://github.com/mairie360/Login_Web_Service/pull/253))
- feat: MAIR-603 E2E - Parcours utilisateurs Playwright des fronts (#229) ([#229](https://github.com/mairie360/Login_Web_Service/pull/229))
- fix: MAIR-743 [Audit 30/10] Login, Calendars, Elearning, Projects: branch Gitleaks fingerprints invalid after squash, main likely red (N1) (#251) ([#251](https://github.com/mairie360/Login_Web_Service/pull/251))
- fix: MAIR-497 GDPR - Usage simulation and AI review of logs and database before prod ([#249](https://github.com/mairie360/Login_Web_Service/pull/249))
- feat: MAIR-497 RGPD - Simulation d'usage et revue IA des logs et de la base avant la prod ([#248](https://github.com/mairie360/Login_Web_Service/pull/248))
- ci: MAIR-771 APIs, BFFs, Database : monter CICD en v5.2.2 pour activer les contrôles RGPD (#247) ([#247](https://github.com/mairie360/Login_Web_Service/pull/247))
- fix: MAIR-744 [Audit 30/10] Login, Calendars, Elearning, Projects : le postinstall interroge le service d'avis npm, npm ci dépend du réseau (N2) (#246) ([#246](https://github.com/mairie360/Login_Web_Service/pull/246))
- fix(deps): bump follow-redirects to 1.16.2 (GHSA-mrwp-f3q8-3g9p) ([#243](https://github.com/mairie360/Login_Web_Service/pull/243))
- fix: MAIR-768 RGAA - Aligner les stacks d'accessibilité des fronts mergés en premier ([#241](https://github.com/mairie360/Login_Web_Service/pull/241))
- ci: MAIR-316 RGAA - Périmètre et états des pages par front (#150) ([#150](https://github.com/mairie360/Login_Web_Service/pull/150))
- test(login): MAIR-318 add isolated route accessibility checks (#141) ([#141](https://github.com/mairie360/Login_Web_Service/pull/141))
- feat: MAIR-292 Ajouter des tests Playwright RGPD et les pages légales aux fronts (#159) ([#159](https://github.com/mairie360/Login_Web_Service/pull/159))
- ci: MAIR-295 Ajouter une checklist RGPD aux PR et des rappels d'échéances automatiques (#160) ([#160](https://github.com/mairie360/Login_Web_Service/pull/160))
- chore(deps): update dependency mairie360/cicd to v4.12.0 (#235) ([#235](https://github.com/mairie360/Login_Web_Service/pull/235))
- fix(security): repair dependency locks and bound Zod validation (#232) ([#232](https://github.com/mairie360/Login_Web_Service/pull/232))
- chore(deps): update dependency mairie360/cicd to v4.5.0 (#222) ([#222](https://github.com/mairie360/Login_Web_Service/pull/222))
- chore(deps): update typescript dependencies (#230) ([#230](https://github.com/mairie360/Login_Web_Service/pull/230))
- fix(security): patch Node.js and Next.js (#231) ([#231](https://github.com/mairie360/Login_Web_Service/pull/231))
- feat: MAIR-608 Lib UI - Normaliser la charte, les tailles et les composants partagés des fronts ([#227](https://github.com/mairie360/Login_Web_Service/pull/227))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

> Résumé Claude indisponible pour ce passage : listes brutes des commits.

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
