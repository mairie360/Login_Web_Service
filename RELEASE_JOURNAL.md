# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "d71ddd5d25cfd377350b9dbdbaaaa474c03cadd7", "prod": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "prod_tag": "v0.4.0", "staging": "c9d6a7f7bacfb539be294e4d79e03722d143ea96", "updated": {"dev": "2026-10-23 13:04 UTC", "prod": "2026-10-21 11:08 UTC", "staging": "2026-10-21 10:57 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.4.0 | `c9d6a7f` | 2026-10-21 11:08 UTC |
| staging | — | `c9d6a7f` | 2026-10-21 10:57 UTC |
| dev | — | `d71ddd5` | 2026-10-23 13:04 UTC |

## Ajouté sur main depuis la dernière release prod (v0.4.0)

#### Changements de comportement
- Le message d'erreur de connexion s'affiche désormais avec l'alerte de la lib (`ErrorAlert`), annoncée aux lecteurs d'écran et fermable via « Fermer le message ». (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Le bouton de connexion prend toute la largeur, affiche un état de chargement (props `fullWidth` / `loading` de la lib) et n'impose plus un texte blanc : c'est la couleur `--mairie-on-action` de la lib qui s'applique. Les boutons de l'écran de déconnexion gardent le style plein par défaut de la lib. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))

#### Corrections
- Avant : l'erreur de connexion était un `Toast` autonome hors `ToastProvider`, qui n'était pas annoncé aux lecteurs d'écran. Maintenant : `ErrorAlert` de la lib, annoncé et fermable. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))

#### Technique
- Correctif de sécurité : Node.js passe de 24.21.0 à 24.22.1 dans les workflows CI, le `Dockerfile` et `development.Dockerfile`, avec image de base épinglée par digest ; Next.js et `eslint-config-next` passent de 16.3.8 à 16.4.2. ([#231](https://github.com/mairie360/Login_Web_Service/pull/231))
- Refactor de la page de connexion : `Login.tsx` passe de 356 à 243 lignes, découpé en sous-composants dans `login/` selon une nouvelle convention d'arborescence, avec tests co-localisés, `@mairie360/lib-components` épinglé en 1.0.1 et docs Figma mises à jour. Le diff de #227 est tronqué, donc seuls les fichiers visibles ont été analysés. ([#227](https://github.com/mairie360/Login_Web_Service/pull/227))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- Le message d'erreur de connexion s'affiche désormais avec l'alerte de la lib (`ErrorAlert`), annoncée aux lecteurs d'écran et fermable via « Fermer le message ». (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))
- Le bouton de connexion prend toute la largeur, affiche un état de chargement (props `fullWidth` / `loading` de la lib) et n'impose plus un texte blanc : c'est la couleur `--mairie-on-action` de la lib qui s'applique. Les boutons de l'écran de déconnexion gardent le style plein par défaut de la lib. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))

#### Corrections
- Avant : l'erreur de connexion était un `Toast` autonome hors `ToastProvider`, qui n'était pas annoncé aux lecteurs d'écran. Maintenant : `ErrorAlert` de la lib, annoncé et fermable. (MAIR-608, [#227](https://github.com/mairie360/Login_Web_Service/pull/227))

#### Technique
- Correctif de sécurité : Node.js passe de 24.21.0 à 24.22.1 dans les workflows CI, le `Dockerfile` et `development.Dockerfile`, avec image de base épinglée par digest ; Next.js et `eslint-config-next` passent de 16.3.8 à 16.4.2. ([#231](https://github.com/mairie360/Login_Web_Service/pull/231))
- Refactor de la page de connexion : `Login.tsx` passe de 356 à 243 lignes, découpé en sous-composants dans `login/` selon une nouvelle convention d'arborescence, avec tests co-localisés, `@mairie360/lib-components` épinglé en 1.0.1 et docs Figma mises à jour. Le diff de #227 est tronqué, donc seuls les fichiers visibles ont été analysés. ([#227](https://github.com/mairie360/Login_Web_Service/pull/227))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
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
