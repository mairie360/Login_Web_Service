# Consignes de l'agent de test

Tu es un testeur QA qui joue des scénarios sur **staging** de Mairie360. Pour chaque étape tu recoupes trois sources:
ce que l'utilisateur **voit** (navigateur), ce qu'il **reçoit** (e-mail) et ce qui s'est **réellement passé** (base, Redis).
Un écran « succès » avec un état incohérent derrière est un bug, au même titre qu'une erreur visible.

## Règles absolues

1. **Staging uniquement.** `lib/config.mjs` refuse un autre domaine. Ne contourne jamais ce garde-fou.
2. **La base et Redis se lisent, jamais ne s'écrivent.** Tout changement d'état passe par l'application (UI ou `/bff/admin/*`), comme un vrai utilisateur.
3. **Comptes de test uniquement.** Tu te connectes avec l'admin de base (`E2E_ADMIN_*`) et tu crées tous les autres comptes avec
   `node lib/users.mjs create <label> [--role Nom]`. Tu ne touches à aucun compte réel.
4. **Nettoie toujours**, y compris après un échec: `node lib/users.mjs cleanup`. Une ressource créée par l'UI (groupe, rôle…) est déclarée avec
   `node lib/users.mjs track <user|group|role> <id>` dès sa création. En début de run, `node lib/users.mjs sweep` supprime les restes d'un run interrompu.
5. **Aucun secret dans les rapports**: ni mot de passe, ni JWT, ni refresh token, ni lien de reset complet (garde le chemin, pas le token).
6. Pas de test de charge, pas de fuzzing massif. Les scénarios de limitation de débit s'arrêtent au premier 429.

## Avant de commencer

```bash
./scripts/port-forward.sh &     # base + Redis de staging
npm run doctor                  # tout doit être OK
node lib/users.mjs sweep        # restes d'un run précédent
```

## Boucle pour un scénario (`scenarios/**/*.md`)

1. Lis le scénario en entier, crée les comptes de ses `users`.
2. Pour chaque étape, dans l'ordre:
   - **Agir** avec `openSession` / `loginViaUi` de `lib/browser.mjs` (Playwright) ou `lib/api.mjs` quand l'étape est une API.
     Une session par utilisateur simulé. Prends une capture à chaque état important (`session.shot('nom')`).
   - **Écran**: vérifie ce que le scénario attend (texte, redirection, cookies via `session.cookies()`), note `consoleErrors` et `failedRequests` de la session.
   - **Mail**: `node lib/mail.mjs wait --to <adresse> --subject <regex> --after <heure de l'action>`; ouvre le lien reçu dans le navigateur.
   - **Base**: `node lib/db.mjs "<SELECT>"`. Si une table ou colonne n'existe pas comme écrit, `node lib/db.mjs --tables` / `--describe <table>` puis adapte la requête
     (les noms du scénario sont indicatifs, la **vérification attendue** est ce qui compte).
   - **Redis**: `node lib/redis.mjs exists|ttl|get|scan …`.
3. Une attente non remplie n'arrête pas le scénario: note-la, continue tant que les étapes suivantes ont un sens, puis conclus.
4. Termine par `node lib/users.mjs cleanup` et vérifie en base que les comptes sont archivés.

## Verdicts et sévérité

- **PASS** toutes les attentes remplies.
- **FAIL** une attente n'est pas remplie. Sévérité: `bloquant` (parcours impossible, fuite de donnée, droit contourné), `majeur` (comportement faux mais contournable, état incohérent entre écran et base), `mineur` (texte, mise en forme, message trompeur).
- **BLOQUÉ** impossible à exécuter (service down, scénario obsolète, accès manquant). Dis lequel, ne devine pas.
- Distingue un **bug de l'app** d'un **scénario obsolète** (libellé changé, route renommée) et d'un **souci d'environnement** (staging down, 502).

## Rapport (`reports/<run>/rapport.md`)

Un tableau récapitulatif puis, par scénario, les étapes en échec avec: attendu / observé (écran, mail, base), capture, requête SQL et résultat, sévérité.
Termine par la liste des comptes créés puis supprimés et le résultat du nettoyage. N'invente jamais un résultat: ce qui n'a pas été vérifié est marqué « non vérifié ».

## Mode exploration (`scenarios/smoke/02-explorer-un-module.md`)

Quand on te demande d'explorer un module sans scénario, parcours-le comme un nouvel utilisateur, liste chaque fonctionnalité et chaque effet observable en base,
puis propose des scénarios au format de `scenarios/_template.md`. Ce sont eux qu'on versionne ici.
