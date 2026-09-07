# Contrat web service / BFF

Ce web service consomme **BFF_user**. La copie [OpenAPI](contracts/openapi.json) définit les routes et les données échangées ; les [types TypeScript](src/contracts/bff.d.ts) sont générés depuis cette copie.

## Routes implémentées

Les chemins sont relatifs au BFF. Les proxies web conservent méthode, paramètres, contenu binaire, statuts et cookies. Les chemins `/api/auth/*` restent des adaptateurs de session vers BFF User ; les pages Next.js sont distinctes des routes de données.

| Méthode | Route | Réponse / schéma |
| --- | --- | --- |
| GET | `/health` | 200 OK |
| GET | `/check_apis` | 200 CheckApiResponse |
| POST | `/auth/login` | 200 AuthTokenResponse |
| POST | `/auth/register` | 201 Utilisateur créé avec succès |
| POST | `/auth/force_change_password` | 204 Mot de passe changé avec succès |
| POST | `/auth/logout` | 200 LogoutResponse |
| GET | `/user/{userId}/about` | 200 AboutResponseView |
| GET | `/bff/admin/users` | 200 AdministrationUsersPage ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| POST | `/bff/admin/users` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| PATCH | `/bff/admin/users/{userId}` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| DELETE | `/bff/admin/users/{userId}` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| PATCH | `/bff/admin/users/{userId}/password` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| POST | `/bff/admin/users/{userId}/roles` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| DELETE | `/bff/admin/users/{userId}/roles/{roleId}` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| GET | `/bff/admin/roles` | 200 Données de l’administration ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| POST | `/bff/admin/roles` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| PUT | `/bff/admin/roles/{roleId}` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| PATCH | `/bff/admin/roles/{roleId}` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| DELETE | `/bff/admin/roles/{roleId}` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| GET | `/bff/admin/groups` | 200 Données de l’administration ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| POST | `/bff/admin/groups` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| GET | `/bff/admin/groups/{groupId}` | 200 AdministrationGroup ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| PATCH | `/bff/admin/groups/{groupId}` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| DELETE | `/bff/admin/groups/{groupId}` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| GET | `/bff/admin/groups/{groupId}/users` | 200 Données de l’administration ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| POST | `/bff/admin/groups/{groupId}/users` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| DELETE | `/bff/admin/groups/{groupId}/users/{userId}` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| GET | `/bff/admin/sessions` | 200 Données de l’administration ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| GET | `/bff/admin/sessions/history` | 200 Données de l’administration ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| POST | `/bff/admin/sessions/refresh` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| POST | `/bff/admin/sessions/revoke` | 200 CoreResponse ; 201 CoreResponse ; 204 Aucun contenu retourné par le Core API |
| GET | `/me` | 200 SessionResponse |
| GET | `/session/me` | 200 SessionResponse |

## Mise à jour et validation

Dans le BFF associé, exécuter `npm run contracts:generate`. Dans ce web service, exécuter `npm run contracts:sync`, puis `npm run contracts:check` et `npm run test:contracts`. Les dépôts peuvent être voisins ; sinon `BFF_CONTRACT_DIR` indique le répertoire `contracts` du BFF. La CI vérifie que les types correspondent au document livré, même sans checkout du dépôt voisin.

Le générateur de types est fixé à `openapi-typescript@7.10.1`. Il est exécuté via npm ; aucun jeton privé ne figure dans les contrats.
