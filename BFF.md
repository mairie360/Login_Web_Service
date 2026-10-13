# Contrat web service / BFF

Ce web service consomme un seul BFF : **BFF_user**, via son contrat publié dans le paquet `@mairie360/bff-user-openapi` (version exacte épinglée dans `package.json`). La copie [OpenAPI](contracts/openapi.json) est reconstruite depuis ce paquet et définit les routes relayées ; les types TypeScript sont importés directement du paquet (`@mairie360/bff-user-openapi/model`).

## Routes implémentées

Les chemins sont relatifs au BFF. Les proxies web conservent méthode, paramètres, contenu binaire, statuts et cookies. Les chemins `/api/auth/*` restent des adaptateurs de session vers BFF User ; les pages Next.js sont distinctes des routes de données.

| Méthode | Route | Réponse / schéma |
| --- | --- | --- |
| POST | `/auth/force_change_password` | 2XX sans corps |
| POST | `/auth/keycloak` | 2XX AuthSessionResponse |
| POST | `/auth/login` | 2XX AuthSessionResponse ; 412 PostAuthLogin412 |
| POST | `/auth/logout` | 2XX LogoutResponse |
| POST | `/auth/refresh` | 2XX RefreshResponse |
| GET | `/admin/groups` | 2XX GetBffAdminGroups200 ou CoreResponse |
| POST | `/admin/groups` | 2XX CoreResponse |
| GET | `/admin/groups/{groupId}` | 2XX GetBffAdminGroupsGroupId200 ou CoreResponse |
| PATCH | `/admin/groups/{groupId}` | 2XX CoreResponse |
| DELETE | `/admin/groups/{groupId}` | 2XX CoreResponse |
| GET | `/admin/groups/{groupId}/users` | 2XX GetBffAdminGroupsGroupIdUsers200 ou CoreResponse |
| POST | `/admin/groups/{groupId}/users` | 2XX CoreResponse |
| DELETE | `/admin/groups/{groupId}/users/{userId}` | 2XX CoreResponse |
| GET | `/admin/roles` | 2XX GetBffAdminRoles200 ou CoreResponse |
| POST | `/admin/roles` | 2XX CoreResponse |
| PUT | `/admin/roles/{roleId}` | 2XX CoreResponse |
| PATCH | `/admin/roles/{roleId}` | 2XX CoreResponse |
| DELETE | `/admin/roles/{roleId}` | 2XX CoreResponse |
| GET | `/admin/sessions` | 2XX GetBffAdminSessions200 ou CoreResponse |
| GET | `/admin/sessions/history` | 2XX GetBffAdminSessionsHistory200 ou CoreResponse |
| POST | `/admin/sessions/revoke` | 2XX CoreResponse |
| GET | `/admin/users` | 2XX AdministrationUsersPage ou CoreResponse |
| POST | `/admin/users` | 2XX CoreResponse |
| PATCH | `/admin/users/{userId}` | 2XX CoreResponse |
| DELETE | `/admin/users/{userId}` | 2XX CoreResponse |
| PATCH | `/admin/users/{userId}/password` | 2XX CoreResponse |
| POST | `/admin/users/{userId}/roles` | 2XX CoreResponse |
| DELETE | `/admin/users/{userId}/roles/{roleId}` | 2XX CoreResponse |
| GET | `/check_apis` | 2XX CheckApisResponse |
| GET | `/health` | 2XX sans corps |
| GET | `/me` | 2XX SessionResponse |
| GET | `/session/me` | 2XX SessionResponse |
| GET | `/user/{userId}/about` | 2XX AboutResponseView |

## Mise à jour et validation

Le paquet est épinglé à une version exacte : une release `X.Y.Z` de BFF_user, ou, tant qu'aucune release n'est coupée, le paquet `0.0.0-dev.<sha>` publié par la CICD pour le commit courant de son `main` (MAIR-509 ; jamais une pré-version `staging`, jamais une copie du checkout local du BFF). Mise à jour : `npm install --save-exact @mairie360/bff-user-openapi@<version>`, puis `npm run contracts:sync`, `npm run contracts:check` et `npm test`. Le paquet est une sortie orval sans `openapi.json` : `scripts/orval-contract.mjs` en reconstruit le contrat. Seuls les succès (`2XX`) et les réponses modélisées par statut (`412`) y figurent ; erreurs, formats et en-têtes de réponse n’y sont pas. Le tag de l’image `bff-user` des fichiers `docker-compose*.yml` doit être construit depuis le même commit : `X.Y.Z` pour une release, `dev-<sha7>` pour un paquet dev (`scripts/contract-version.mjs`).
