# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "0d89bbe546a57c8727791031f35a904a9b8fc453", "prod": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "prod_tag": "v0.4.0", "staging": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "updated": {"dev": "2026-11-04 18:11 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 10:57 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `c9d6a7f` | 2026-10-21 11:08 UTC |
| staging | — | `c9d6a7f` | 2026-10-21 10:57 UTC |
| dev | — | `0d89bbe` | 2026-11-04 18:11 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Nouveautés
- Pages légales publiques « Mentions légales » (`/mentions-legales`) et « Politique de confidentialité » (`/confidentialite`), rendues à chaque requête depuis `LEGAL_CONFIG`. Une valeur absente s'affiche « À compléter par la mairie ». Un pied de page sur toutes les pages renvoie vers les deux. (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))

#### Changements de comportement
- Le message d'erreur de connexion est désormais l'alerte `ErrorAlert` de lib-components : elle est annoncée aux lecteurs d'écran et se ferme avec « Fermer le message ». Avant, un `Toast` autonome hors `ToastProvider` n'était pas annoncé. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Le bouton de connexion utilise les props `fullWidth` et `loading` de la lib ; les boutons de la page de déconnexion reprennent le style plein par défaut. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Dans le `docker-compose.yml` de développement local uniquement : `JWT_SECRET` est obligatoire (le démarrage échoue sans lui), `JWT_ALLOW_WEAK_SECRET` passe à `false` pour Core API, et les ports 3000, 3001 et 4000 ne sont publiés que sur `127.0.0.1`. (#232, [#232](https://github.com/mairie360/Login_Web_Service/pull/232))

#### Corrections
- Page « Connexion temporairement indisponible » : avant, le bloc débordait sur 320 px avec l'espacement de texte augmenté. Maintenant, le padding est réduit sous `sm` et les mots longs passent à la ligne (`overflow-wrap: anywhere`). (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))

#### Technique
- Backport vendorisé de Zod 3 avec validation bornée des collections (`vendor/zod`) et gardes d'intégrité ; le diff est tronqué, le détail du comportement de validation n'est pas vérifié ici. (#232, [#232](https://github.com/mairie360/Login_Web_Service/pull/232))
- Installation sans réseau : `postinstall`, `prebuild` et `pretest` ne contrôlent plus l'avis npm ; le contrôle amont passe dans `npm run audit:upstream` et un workflow quotidien (MAIR-744, [#246](https://github.com/mairie360/Login_Web_Service/pull/246)).
- Simulation RGPD d'usage avant la prod : stack `docker-compose-gdpr-simulation.yml`, personas, script `gdpr_simulation_test.sh` et corrections de son nettoyage (MAIR-497, [#248](https://github.com/mairie360/Login_Web_Service/pull/248), [#249](https://github.com/mairie360/Login_Web_Service/pull/249)).
- Stack d'accessibilité RGAA et ses garde-fous (projet Compose dédié, boucles de readiness bornées, verrou de run) ; suite Playwright et axe pour la route Login (MAIR-316, MAIR-768, MAIR-318, [#150](https://github.com/mairie360/Login_Web_Service/pull/150), [#241](https://github.com/mairie360/Login_Web_Service/pull/241), [#141](https://github.com/mairie360/Login_Web_Service/pull/141)).
- Checklist RGPD sur les PR (`gdpr-pr.yml`) et Renovate qui suit son tag CICD (MAIR-295, [#160](https://github.com/mairie360/Login_Web_Service/pull/160)).
- Composants de `src/components/` découpés en dossiers selon la convention d'arbre, avec le `Login` composé de sous-composants (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227)).
- Montées de dépendances et de toolchain : CICD (v4.5.0, v4.12.0, v5.1.0, v5.2.2, v5.3.0, v5.3.1), Node 24.22.1 avec digests d'image, Next 16.4.2, `follow-redirects` 1.16.2, puis lot de mises à jour TypeScript (#222, #235, #247, #248, #249, #231, #243, #230).
- Baseline de performance : la lock de référence est réparée à partir d'un commit contrôlé (`scripts/prepare-performance-baseline.cjs`) et une archive de provenance est produite (#232, [#232](https://github.com/mairie360/Login_Web_Service/pull/232)).

## Différence dev → staging (en dev, pas encore en staging)

#### Nouveautés
- Pages légales publiques « Mentions légales » (`/mentions-legales`) et « Politique de confidentialité » (`/confidentialite`), rendues à chaque requête depuis `LEGAL_CONFIG`. Une valeur absente s'affiche « À compléter par la mairie ». Un pied de page sur toutes les pages renvoie vers les deux. (MAIR-292, [#159](https://github.com/mairie360/Login_Web_Service/pull/159))

#### Changements de comportement
- Le message d'erreur de connexion est désormais l'alerte `ErrorAlert` de lib-components : elle est annoncée aux lecteurs d'écran et se ferme avec « Fermer le message ». Avant, un `Toast` autonome hors `ToastProvider` n'était pas annoncé. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Le bouton de connexion utilise les props `fullWidth` et `loading` de la lib ; les boutons de la page de déconnexion reprennent le style plein par défaut. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Dans le `docker-compose.yml` de développement local uniquement : `JWT_SECRET` est obligatoire (le démarrage échoue sans lui), `JWT_ALLOW_WEAK_SECRET` passe à `false` pour Core API, et les ports 3000, 3001 et 4000 ne sont publiés que sur `127.0.0.1`. (#232, [#232](https://github.com/mairie360/Login_Web_Service/pull/232))

#### Corrections
- Page « Connexion temporairement indisponible » : avant, le bloc débordait sur 320 px avec l'espacement de texte augmenté. Maintenant, le padding est réduit sous `sm` et les mots longs passent à la ligne (`overflow-wrap: anywhere`). (MAIR-318, [#141](https://github.com/mairie360/Login_Web_Service/pull/141))

#### Technique
- Backport vendorisé de Zod 3 avec validation bornée des collections (`vendor/zod`) et gardes d'intégrité ; le diff est tronqué, le détail du comportement de validation n'est pas vérifié ici. (#232, [#232](https://github.com/mairie360/Login_Web_Service/pull/232))
- Installation sans réseau : `postinstall`, `prebuild` et `pretest` ne contrôlent plus l'avis npm ; le contrôle amont passe dans `npm run audit:upstream` et un workflow quotidien (MAIR-744, [#246](https://github.com/mairie360/Login_Web_Service/pull/246)).
- Simulation RGPD d'usage avant la prod : stack `docker-compose-gdpr-simulation.yml`, personas, script `gdpr_simulation_test.sh` et corrections de son nettoyage (MAIR-497, [#248](https://github.com/mairie360/Login_Web_Service/pull/248), [#249](https://github.com/mairie360/Login_Web_Service/pull/249)).
- Stack d'accessibilité RGAA et ses garde-fous (projet Compose dédié, boucles de readiness bornées, verrou de run) ; suite Playwright et axe pour la route Login (MAIR-316, MAIR-768, MAIR-318, [#150](https://github.com/mairie360/Login_Web_Service/pull/150), [#241](https://github.com/mairie360/Login_Web_Service/pull/241), [#141](https://github.com/mairie360/Login_Web_Service/pull/141)).
- Checklist RGPD sur les PR (`gdpr-pr.yml`) et Renovate qui suit son tag CICD (MAIR-295, [#160](https://github.com/mairie360/Login_Web_Service/pull/160)).
- Composants de `src/components/` découpés en dossiers selon la convention d'arbre, avec le `Login` composé de sous-composants (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227)).
- Montées de dépendances et de toolchain : CICD (v4.5.0, v4.12.0, v5.1.0, v5.2.2, v5.3.0, v5.3.1), Node 24.22.1 avec digests d'image, Next 16.4.2, `follow-redirects` 1.16.2, puis lot de mises à jour TypeScript (#222, #235, #247, #248, #249, #231, #243, #230).
- Baseline de performance : la lock de référence est réparée à partir d'un commit contrôlé (`scripts/prepare-performance-baseline.cjs`) et une archive de provenance est produite (#232, [#232](https://github.com/mairie360/Login_Web_Service/pull/232)).

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
