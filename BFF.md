# Contrat web service / BFF

Ce web service consomme un seul BFF : **BFF_user**, via son contrat publié dans le paquet `@mairie360/bff-user-openapi` (version exacte épinglée dans `package.json`). La copie [OpenAPI](contracts/openapi.json) est reconstruite depuis ce paquet et définit les routes relayées ; les types TypeScript sont importés directement du paquet (`@mairie360/bff-user-openapi/model`).

## Routes implémentées

Les chemins sont relatifs au BFF. Les proxies web conservent méthode, paramètres, contenu binaire, statuts et cookies. Les chemins `/api/auth/*` restent des adaptateurs de session vers BFF User ; les pages Next.js sont distinctes des routes de données.

| Méthode | Route | Réponse / schéma |
| --- | --- | --- |
| POST | `/auth/force_change_password` | 2XX sans corps |
| POST | `/auth/login` | 2XX AuthTokenResponse ; 412 PostAuthLogin412 |
| POST | `/auth/logout` | 2XX LogoutResponse |
| POST | `/auth/register` | 2XX sans corps |
| GET | `/bff/admin/groups` | 2XX GetBffAdminGroups200 ou CoreResponse |
| POST | `/bff/admin/groups` | 2XX CoreResponse |
| DELETE | `/bff/admin/groups/{groupId}` | 2XX CoreResponse |
| GET | `/bff/admin/groups/{groupId}` | 2XX GetBffAdminGroupsGroupId200 ou CoreResponse |
| PATCH | `/bff/admin/groups/{groupId}` | 2XX CoreResponse |
| GET | `/bff/admin/groups/{groupId}/users` | 2XX GetBffAdminGroupsGroupIdUsers200 ou CoreResponse |
| POST | `/bff/admin/groups/{groupId}/users` | 2XX CoreResponse |
| DELETE | `/bff/admin/groups/{groupId}/users/{userId}` | 2XX CoreResponse |
| GET | `/bff/admin/roles` | 2XX GetBffAdminRoles200 ou CoreResponse |
| POST | `/bff/admin/roles` | 2XX CoreResponse |
| DELETE | `/bff/admin/roles/{roleId}` | 2XX CoreResponse |
| PATCH | `/bff/admin/roles/{roleId}` | 2XX CoreResponse |
| PUT | `/bff/admin/roles/{roleId}` | 2XX CoreResponse |
| GET | `/bff/admin/sessions` | 2XX GetBffAdminSessions200 ou CoreResponse |
| GET | `/bff/admin/sessions/history` | 2XX GetBffAdminSessionsHistory200 ou CoreResponse |
| POST | `/bff/admin/sessions/refresh` | 2XX CoreResponse |
| POST | `/bff/admin/sessions/revoke` | 2XX CoreResponse |
| GET | `/bff/admin/users` | 2XX AdministrationUsersPage ou CoreResponse |
| POST | `/bff/admin/users` | 2XX CoreResponse |
| DELETE | `/bff/admin/users/{userId}` | 2XX CoreResponse |
| PATCH | `/bff/admin/users/{userId}` | 2XX CoreResponse |
| PATCH | `/bff/admin/users/{userId}/password` | 2XX CoreResponse |
| POST | `/bff/admin/users/{userId}/roles` | 2XX CoreResponse |
| DELETE | `/bff/admin/users/{userId}/roles/{roleId}` | 2XX CoreResponse |
| GET | `/check_apis` | 2XX CheckApiResponse |
| GET | `/health` | 2XX sans corps |
| GET | `/me` | 2XX SessionResponse |
| GET | `/session/me` | 2XX SessionResponse |
| GET | `/user/{userId}/about` | 2XX AboutResponseView |

## Mise à jour et validation

Après une release de BFF_user publiant une nouvelle version `X.Y.Z` du paquet (jamais une pré-version `0.0.0-dev`/`staging`, jamais une copie du checkout local du BFF) : `npm install --save-exact @mairie360/bff-user-openapi@X.Y.Z`, puis `npm run contracts:sync`, `npm run contracts:check` et `npm test`. Le paquet est une sortie orval sans `openapi.json` : `scripts/orval-contract.mjs` en reconstruit le contrat. Seuls les succès (`2XX`) et les réponses modélisées par statut (`412`) y figurent ; erreurs, formats et en-têtes de réponse n’y sont pas. Le tag de l’image `bff-user` des fichiers `docker-compose*.yml` doit suivre la même version.
