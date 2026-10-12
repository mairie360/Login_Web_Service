# e2e-agent — tests d'usage de toute l'app pilotés par un agent IA

Un agent (Claude) joue des scénarios décrits en Markdown sur **staging**: il pilote un vrai navigateur (Playwright),
lit les e-mails réellement envoyés (Resend) et vérifie l'état derrière l'écran (Postgres et Redis en **lecture seule**).
Ajouter un cas de test = ajouter un fichier dans `scenarios/`.

Ce dossier est autonome (son propre `package.json`), exclu de l'image Docker, et sans effet sur `npm test` du front.

```
AGENT.md        consignes de l'agent (règles, boucle d'exécution, rapport) — à lui donner en premier
scenarios/      un fichier par scénario (format: scenarios/_template.md)
lib/            outils appelés par l'agent: browser, api, users, db, redis, mail, doctor
scripts/        port-forward.sh (base + Redis de staging)
sql/            readonly-role.sql (rôle Postgres SELECT seul)
data/           jeux de données (l'Excel viendra ici, voir data/README.md)
reports/        résultats d'un run (ignoré par git)
```

## Mise en place (une fois)

1. **Accès au cluster**: `kubectl` avec un contexte sur la machine de staging (`E2E_KUBE_CONTEXT`). La base et Redis ne sont pas exposés (NetworkPolicy), d'où le `port-forward`.
2. **Rôle Postgres en lecture seule**: exécuter `sql/readonly-role.sql` (commande en tête du fichier), noter le mot de passe.
3. **Mot de passe Redis** (compte `admin` du chart):
   `kubectl --context staging -n mairie360-staging get secret staging-redis -o jsonpath='{.data.redis-password}' | base64 -d`
4. **Resend**: une clé API en **accès complet** (une clé « envoi seul » ne peut pas relire les e-mails).
   Le domaine d'envoi de staging est déjà `noreply@mairie360-eip.fr`.
5. **Boîte de test réelle**: `E2E_MAILBOX=vous@gmail.com`. Les comptes de test sont créés avec des alias `vous+e2e-<run>-<label>@gmail.com`,
   tous livrés dans cette même boîte (l'agent les retrouve par adresse exacte via Resend).
6. `cp .env.example .env`, remplir, puis `npm install` (Chromium: `npx playwright install chromium`, ou `PLAYWRIGHT_CHROMIUM_EXECUTABLE`).

## Lancer

```bash
./scripts/port-forward.sh &
npm run doctor                  # front, Keycloak, admin, /bff/admin, base lecture seule, Redis, Resend
```

Puis, dans Claude Code depuis ce dossier:

> Lis AGENT.md puis joue `scenarios/auth/` et `scenarios/admin/` sur staging. Écris le rapport dans `reports/`.

Pour un seul scénario: « joue `scenarios/auth/02-premiere-connexion.md` ».

## Points à confirmer au premier run

- **`E2E_API_FRONT`**: `/bff/admin/*` doit être relayé par le front choisi (par défaut `admin`). Le contrat embarqué dans Login_Web_Service est plus ancien que BFF_user (pas de routes groupes/rôles en lecture): `npm run doctor` le dit.
- **Libellés de la page de connexion** dans `lib/browser.mjs` (`loginViaUi`): un seul endroit à ajuster.
- **Noms de tables et colonnes**: les scénarios en donnent d'indicatifs; l'agent les confirme avec `db.mjs --tables` / `--describe`.
- **Trafic du `port-forward`** vers la base avec la NetworkPolicy Cilium de staging: à valider (`doctor`).
- **Limitation de débit** (`AUTH_RATE_LIMIT_*` du BFF, 429): les scénarios d'authentification enchaînent des connexions. Si l'IP du testeur est bloquée, attendre la fenêtre ou assouplir en staging.

## Garde-fous

Refus de tout domaine hors `staging.`/`dev.`; base et Redis en lecture seule (rôle, transaction `READ ONLY`, une instruction, commandes Redis limitées);
colonnes secrètes masquées; comptes de test supprimés en fin de run (`users.mjs cleanup`) avec un filet `sweep`.
