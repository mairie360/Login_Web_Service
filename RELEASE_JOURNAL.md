# Journal des releases — Login_Web_Service

<!-- release-journal-state {"dev": "e96720565a77d2cb8ab4c2ad617261723c84fb5e", "prod": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "prod_tag": "v0.3.0", "staging": "8fe4db0bfdfffe14dcbc14b46a3594f11fa1c8bb", "updated": {"dev": "2026-10-19 20:06 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v0.3.0 | `8fe4db0` | — |
| staging | — | `8fe4db0` | — |
| dev | — | `e967205` | 2026-10-19 20:06 UTC |

## Ajouté sur main depuis la dernière release prod (v0.3.0)

#### Changements de comportement
- La page de connexion et les formulaires de récupération (mot de passe oublié, réinitialisation, déconnexion) utilisent le thème commun publié par `@mairie360/lib-components` 0.9.0 (`@mairie360/lib-components/styles.css`) : couleurs claires et sombres communes, boutons partagés et fond de page `var(--mairie-background)` au lieu de `#F5F3F0`. La copie locale du thème dans `municipal-theme.css` est retirée. D'après la PR, les messages de validation peuvent être fermés sans perdre la saisie et sans envoyer de requête supplémentaire (diff tronqué). ([#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Corrections
- Police de l'interface : avant, la feuille de styles imposait `Arial, Helvetica, sans-serif` ; maintenant, le corps de page utilise la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`), et seuls le thème et la préférence d'apparence de l'utilisateur choisissent la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Le contrat `@mairie360/bff-user-openapi` passe de la version dev figée à `1.0.0`, sans changement des routes. Les stacks Docker de test passent sur les images prod `bff-user:1.0.0`, `core-api:2.1.0`, `database:3.2.0` et `liquibase-migrations:3.2.0`. (MAIR-569, [#200](https://github.com/mairie360/Login_Web_Service/pull/200))
- Deux changements de CI/CD et d'outillage. Le token des workflows est en lecture seule par défaut et le pipeline ne tourne plus deux fois sur les branches de PR. L'image de développement passe sur Node 24.21.0 épinglé par digest, et le token npm n'y est plus qu'un secret de build. Enfin, la CICD passe en v4.3.1, qui ajoute l'étape de journal des releases. (MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195) ; MAIR-571, [#203](https://github.com/mairie360/Login_Web_Service/pull/203))

## Différence dev → staging (en dev, pas encore en staging)

#### Changements de comportement
- La page de connexion et les formulaires de récupération (mot de passe oublié, réinitialisation, déconnexion) utilisent le thème commun publié par `@mairie360/lib-components` 0.9.0 (`@mairie360/lib-components/styles.css`) : couleurs claires et sombres communes, boutons partagés et fond de page `var(--mairie-background)` au lieu de `#F5F3F0`. La copie locale du thème dans `municipal-theme.css` est retirée. D'après la PR, les messages de validation peuvent être fermés sans perdre la saisie et sans envoyer de requête supplémentaire (diff tronqué). ([#198](https://github.com/mairie360/Login_Web_Service/pull/198))

#### Corrections
- Police de l'interface : avant, la feuille de styles imposait `Arial, Helvetica, sans-serif` ; maintenant, le corps de page utilise la pile Geist commune (`var(--font-geist-sans), system-ui, sans-serif`), et seuls le thème et la préférence d'apparence de l'utilisateur choisissent la police. (MAIR-526, [#201](https://github.com/mairie360/Login_Web_Service/pull/201))

#### Technique
- Le contrat `@mairie360/bff-user-openapi` passe de la version dev figée à `1.0.0`, sans changement des routes. Les stacks Docker de test passent sur les images prod `bff-user:1.0.0`, `core-api:2.1.0`, `database:3.2.0` et `liquibase-migrations:3.2.0`. (MAIR-569, [#200](https://github.com/mairie360/Login_Web_Service/pull/200))
- Deux changements de CI/CD et d'outillage. Le token des workflows est en lecture seule par défaut et le pipeline ne tourne plus deux fois sur les branches de PR. L'image de développement passe sur Node 24.21.0 épinglé par digest, et le token npm n'y est plus qu'un secret de build. Enfin, la CICD passe en v4.3.1, qui ajoute l'étape de journal des releases. (MAIR-436, [#195](https://github.com/mairie360/Login_Web_Service/pull/195) ; MAIR-571, [#203](https://github.com/mairie360/Login_Web_Service/pull/203))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-10-19 20:06 UTC | dev | — | `e967205` | [run](https://github.com/mairie360/Login_Web_Service/actions/runs/39315996478) |
<!-- release-journal-history:end -->
