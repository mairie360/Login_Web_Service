# Login_Web_Service — Documentation technique

[Présentation du module](module.md) · [English](../en/technical.md) · [README](../../README.md)

## Architecture et traitement des requêtes

Application Next.js 15.5.25, React 19 et TypeScript avec App Router. Le navigateur appelle les routes de la même origine; le serveur Next.js relaie les données vers **BFF_user**.

```mermaid
flowchart LR
  Browser --> Next["Login_Web_Service"]
  Next --> BFF["BFF_user"]
```

La page valide côté serveur le paramètre `redirect` : seule une URL absolue HTTP(S) dont l’origine correspond à un `*_FRONT_URL` configuré est acceptée ; sinon elle utilise `PROJECT_FRONT_URL`. Cette destination validée sert après une connexion normale ou un changement de mot de passe à la première connexion. `/api/auth/login` vérifie le format de l’e-mail et la présence du mot de passe avant d’appeler BFF User, puis envoie e-mail, mot de passe et user-agent (jamais vide, comme l’exige `LoginView`) à BFF User. Un 412 avec jeton devient une réponse `requiresPasswordChange`; un succès normal exige un Bearer dans l’en-tête Authorization amont. Le changement de mot de passe adapte `newPassword` en `new_password` et transmet le jeton temporaire; un 401 ou 403 (jeton refusé ou expiré) le supprime et demande de se reconnecter. Les statuts amont sont conservés, mais le message affiché est choisi par le front selon le statut : les messages de BFF User sont techniques et en anglais.

Le proxy générique lit le contrat OpenAPI versionné pour autoriser chemins et méthodes. Il conserve paramètres de requête, corps binaire, statuts et en-têtes utiles, filtre les en-têtes de transport, désactive le cache et n’effectue pas de suivi automatique des redirections. Son délai est de 15 secondes.

## Données et persistance

Les sources et limites suivantes concernent le BFF associé, dont dépend la sauvegarde des données affichées.

Core fournit les opérations d’identité et de session. Les dépôts SQL du BFF lisent aussi les utilisateurs et rôles, et réalisent certaines mutations de mots de passe et de groupes. Le parcours de première connexion utilise PostgreSQL et Redis. Les données ne sont donc pas toutes accessibles exclusivement par HTTP.

Les fonctions de supervision, sauvegarde, journaux applicatifs et politique système décrites dans les besoins d’administration ne sont pas garanties par ce contrat. Les accès SQL exigent un schéma compatible, notamment `group_members`; ne pas confondre ce nom avec `group_users` utilisé dans d’autres contrats.

L’état React gère l’affichage et les opérations en cours. Ce dépôt ne définit pas de base métier propre; les garanties de sauvegarde sont celles du BFF et de ses sources décrites ci-dessus.

## Installation et lancement local

Utiliser Node.js 22 pour reproduire le job de contrats et npm avec le fichier de verrouillage versionné. Les versions des autres jobs et de Docker sont précisées plus bas.

Les dépendances privées `@mairie360/*` nécessitent un accès GitHub Packages. Configurer `NODE_AUTH_TOKEN` dans l’environnement avec un jeton autorisé à lire ces packages, conformément à `.npmrc`. Ne pas enregistrer la valeur dans Git.

```bash
npm ci
```

Créer `.env.local` à la racine. Exemple pour des BFF exécutés sur la même machine:

```dotenv
BFF_USER_API_URL=http://localhost:4000
PROJECT_FRONT_URL=http://localhost:5001/
```

Démarrer BFF User, seul BFF appelé par ce web service, puis lancer le web service. Le port `5000` ci-dessous est un choix local explicite pour éviter les collisions; ce n’est pas une affirmation sur les ports de tous les fichiers Compose.

```bash
npm run dev -- --port 5000
```

Ouvrir `http://localhost:5000`. Pour exécuter le build avec le script Next.js:

```bash
npm run build
npm run start -- --port 5000
```

## Configuration

Les valeurs ci-dessous sont des exemples locaux ou des comportements explicitement indiqués, pas des identifiants de production.

| Variable ou priorité | Exemple / repli indiqué | Rôle |
| --- | --- | --- |
| `BFF_USER_API_URL` → `USER_BFF_URL` | http://localhost:4000 | Priorité de gauche à droite dans le proxy; l’URL indiquée est le repli local. |
| `COOKIE_DOMAIN` | — | Domaine des cookies; vérifier sa cohérence avec Login et BFF User. |
| `PROJECT_FRONT_URL` | — | Destination par défaut si `redirect` est absent ou invalide. |
| `*_FRONT_URL` | — | Origines publiques des fronts acceptées pour `redirect`, lues à l’exécution côté serveur. |

Dans un conteneur, `localhost` désigne le conteneur lui-même. Utiliser le nom DNS du service BFF sur le réseau Docker, ou une adresse d’hôte accessible. Les fichiers Compose incluent parfois d’autres services et des paramètres hérités; vérifier les URL et ports effectifs avant de les employer.

## Routes et contrat de données

Inventaire extrait de `contracts/openapi.json`, reconstruit depuis le paquet publié `@mairie360/bff-user-openapi` épinglé dans `package.json`. Les paramètres entre accolades sont remplacés par des identifiants réels. Les types détaillés et champs requis sont définis dans ce contrat. Le paquet (sortie orval) ne type que les réponses de succès, notées `2XX`, et les réponses modélisées par statut comme `412` : erreurs, formats et en-têtes de réponse n’en font pas partie.

Ces chemins de données sont exposés à la même origine par le proxy; les pages Next.js sont distinctes. `/openapi.json` et `/swagger.json` sont également relayés. L’interface Swagger `/docs` se consulte directement sur le BFF.

| Méthode | Chemin | Corps déclaré | Statuts déclarés |
| --- | --- | --- | --- |
| POST | `/auth/force_change_password` | application/json | 2XX |
| POST | `/auth/login` | application/json | 2XX, 412 |
| POST | `/auth/logout` | — | 2XX |
| POST | `/auth/register` | application/json | 2XX |
| GET | `/bff/admin/groups` | — | 2XX |
| POST | `/bff/admin/groups` | application/json | 2XX |
| DELETE | `/bff/admin/groups/{groupId}` | — | 2XX |
| GET | `/bff/admin/groups/{groupId}` | — | 2XX |
| PATCH | `/bff/admin/groups/{groupId}` | application/json | 2XX |
| GET | `/bff/admin/groups/{groupId}/users` | — | 2XX |
| POST | `/bff/admin/groups/{groupId}/users` | application/json | 2XX |
| DELETE | `/bff/admin/groups/{groupId}/users/{userId}` | — | 2XX |
| GET | `/bff/admin/roles` | — | 2XX |
| POST | `/bff/admin/roles` | application/json | 2XX |
| DELETE | `/bff/admin/roles/{roleId}` | — | 2XX |
| PATCH | `/bff/admin/roles/{roleId}` | application/json | 2XX |
| PUT | `/bff/admin/roles/{roleId}` | application/json | 2XX |
| GET | `/bff/admin/sessions` | — | 2XX |
| GET | `/bff/admin/sessions/history` | — | 2XX |
| POST | `/bff/admin/sessions/refresh` | application/json | 2XX |
| POST | `/bff/admin/sessions/revoke` | application/json | 2XX |
| GET | `/bff/admin/users` | — | 2XX |
| POST | `/bff/admin/users` | application/json | 2XX |
| DELETE | `/bff/admin/users/{userId}` | — | 2XX |
| PATCH | `/bff/admin/users/{userId}` | application/json | 2XX |
| PATCH | `/bff/admin/users/{userId}/password` | application/json | 2XX |
| POST | `/bff/admin/users/{userId}/roles` | application/json | 2XX |
| DELETE | `/bff/admin/users/{userId}/roles/{roleId}` | — | 2XX |
| GET | `/check_apis` | — | 2XX |
| GET | `/health` | — | 2XX |
| GET | `/me` | — | 2XX |
| GET | `/session/me` | — | 2XX |
| GET | `/user/{userId}/about` | — | 2XX |

### Pages et adaptateurs locaux

| Page | Source |
| --- | --- |
| `/` | [src/app/page.tsx](../../src/app/page.tsx) |

| Méthode | Route locale | Source |
| --- | --- | --- |
| POST | `/api/auth/force-change-password` | [src/app/api/auth/force-change-password/route.ts](../../src/app/api/auth/force-change-password/route.ts) |
| POST | `/api/auth/force_change_password` | [src/app/api/auth/force_change_password/route.ts](../../src/app/api/auth/force_change_password/route.ts) |
| POST | `/api/auth/login` | [src/app/api/auth/login/route.ts](../../src/app/api/auth/login/route.ts) |

## Session, permissions et erreurs

Le cookie `accessToken` est HttpOnly, SameSite strict, limité à `/`, valable 24 heures côté cookie et Secure en production. Il provient uniquement de l’en-tête Bearer de la réponse de connexion, jamais d’un refresh token. `passwordChangeToken` est HttpOnly, limité à `/api/auth` et expire après 10 minutes. Le succès du changement de mot de passe supprime ce cookie; il faut ensuite terminer le parcours de connexion. Les adaptateurs dédiés ont un délai de 10 secondes et distinguent 502 et 504.

Le proxy générique répond 400 pour un chemin invalide, 404 pour un chemin hors contrat, 405 pour une méthode interdite et 502 si le service est injoignable ou dépasse le délai. Les réponses amont sont conservées, y compris les corps vides 204/205/304.

Toutes les réponses portent `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` et `Cross-Origin-Resource-Policy`, `Cross-Origin-Embedder-Policy` et `Cross-Origin-Opener-Policy` (`next.config.ts`), et `X-Powered-By` est désactivé. [src/middleware.ts](../../src/middleware.ts) ajoute sur chaque page une `Content-Security-Policy` avec un nonce propre à chaque requête (la page de connexion est publique, il n'y a pas de garde d'authentification), que Next.js applique à ses scripts. Les pages sont donc rendues à la demande (`dynamic = "force-dynamic"` dans le layout). Les feuilles de style sont limitées à l'origine et au nonce ; seuls les attributs `style` rendus par les composants partagés passent par `style-src-attr 'unsafe-inline'`, et `next dev` autorise aussi `'unsafe-eval'`. Toute nouvelle ressource externe (image, police, API appelée depuis le navigateur) doit être ajoutée à la politique dans `src/lib/content-security-policy.ts`.

## Synchronisation et vérifications

Le seul contrat est celui de BFF User **publié** dans `@mairie360/bff-user-openapi`, épinglé à une version exacte `X.Y.Z` (jamais une pré-version `0.0.0-dev`/`staging`, jamais une copie d’un checkout du BFF, qui peut être en avance sur la release). Après une nouvelle release de BFF User :

```bash
npm install --save-exact @mairie360/bff-user-openapi@X.Y.Z
npm run contracts:sync
npm run contracts:check
npm test
npm run lint
npm run build
```

Le paquet contient du TypeScript orval, pas de `openapi.json` : [scripts/orval-contract.mjs](../../scripts/orval-contract.mjs) en reconstruit le document OpenAPI et `contracts:sync` l’écrit dans `contracts/openapi.json` (lu par le proxy et les tests). `contracts:check` échoue si la version n’est pas exacte, si le paquet installé diffère de `package.json`, si un second paquet `@mairie360/bff-*-openapi` apparaît ou si la copie est périmée. Les route handlers importent leurs types depuis `@mairie360/bff-user-openapi/model`. Aligner aussi le tag de l’image `bff-user` des fichiers `docker-compose*.yml` sur la même version. `npm test` exécute les tests Node et échoue sous 60 % de couverture des lignes, branches ou fonctions de `src/**` (`test:contracts` lance les mêmes tests sans couverture).

Les tests unitaires exécutent les route handlers et le proxy avec le vrai `fetch` contre un faux BFF User servi en HTTP ([tests/support/contract-mock-server.cjs](../../tests/support/contract-mock-server.cjs)) et piloté par `contracts/openapi.json` : toute requête hors contrat (chemin, méthode, paramètre, corps), toute réponse mockée non conforme au statut déclaré ou tout appel vers une autre origine fait échouer le test. Les réponses d’erreur, que le paquet ne type pas, sont vérifiées contre son modèle `ApiErrorResponse`. Chaque opération du contrat est exercée à travers le proxy. [tests/network-calls.test.cjs](../../tests/network-calls.test.cjs) inventorie tous les appels réseau de `src/` (serveur et navigateur) : chacun doit viser une opération du contrat ou un route handler local, BFF User est le seul BFF et le proxy est le seul appel dynamique autorisé. [tests/package-contract.test.cjs](../../tests/package-contract.test.cjs) vérifie la version exacte, la copie du contrat et les tags d’images Docker. La couverture ne compte que les modules chargés par un test ; les composants React (`.tsx`) ne sont pas mesurés.

Pour une modification uniquement documentaire, vérifier les liens, l’exactitude des deux langues et `git diff --check`; ne pas régénérer les contrats sans changer la version du paquet.

## CI/CD et exécution Docker

Le job `contracts.yml` utilise Node.js 22, `actions/checkout@v7` et `actions/setup-node@v7`. Il s’exécute sur push, pull request et lancement manuel; il installe avec `npm ci`, contrôle les contrats et lance les tests dédiés.

`cicd.yml` appelle `mairie360/CICD/.github/workflows/frontend-cicd.yml@v2.0.0`, avec `cicd_version: v2.0.0` et `node_version: "23"`. Les étapes réutilisables et les environnements GitHub déterminent les contrôles, publications et déploiements effectifs.

Le workflow additionnel `nextjs.yml` exécute lint puis build sur Node.js 20 avec checkout v7.0.1 et setup-node v7.0.0.

Le Dockerfile utilise par défaut `NODE_VERSION=23.1.0` et le build Next.js `standalone`; la commande de l’image est `["node", "server.js"]`. Le port de l’image et les mappings Compose peuvent différer du port local proposé plus haut.

Avant un lancement Docker, vérifier les variables de service, les secrets de build et les réseaux dans les fichiers du dépôt. Une CI verte valide ses jobs; elle ne prouve pas la disponibilité des services métier dans un environnement distant.

## Diagnostic

Diagnostic du BFF associé: Si la connexion fonctionne mais que l’administration échoue, vérifier la configuration `JWT_SECRET`, le rôle enregistré et l’accès SQL. Si le changement de première connexion échoue, vérifier Redis, le jeton temporaire et PostgreSQL.

En cas d’erreur de proxy, comparer la route et la méthode à l’inventaire, vérifier l’URL du BFF puis la session. Pour un 401 après navigation entre modules, vérifier le cookie `accessToken`, son domaine et le service BFF User. Un 404 sur un besoin décrit dans `BACKEND.md` peut correspondre à une fonctionnalité seulement proposée.

## Repères dans le dépôt

- [src/app/page.tsx](../../src/app/page.tsx)
- [src/components/Login.tsx](../../src/components/Login.tsx)
- [src/app/api/auth/login/route.ts](../../src/app/api/auth/login/route.ts)
- [src/app/api/auth/force-change-password/route.ts](../../src/app/api/auth/force-change-password/route.ts)
- [src/lib/bff-proxy.ts](../../src/lib/bff-proxy.ts)
- [src/app/[...path]/route.ts](../../src/app/%5B...path%5D/route.ts)
- [contracts/openapi.json](../../contracts/openapi.json)
- [scripts/orval-contract.mjs](../../scripts/orval-contract.mjs)
- [scripts/contracts.mjs](../../scripts/contracts.mjs)
- [package.json](../../package.json)
- [.github/workflows/contracts.yml](../../.github/workflows/contracts.yml)
- [.github/workflows/cicd.yml](../../.github/workflows/cicd.yml)
- [Dockerfile](../../Dockerfile)
- [docker-compose.yml](../../docker-compose.yml)

Compléments historiques: [BFF.md](../../BFF.md), [BACKEND.md](../../BACKEND.md). Les besoins proposés doivent rester distincts du comportement effectivement implémenté.
