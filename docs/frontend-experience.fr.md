# Expérience front et performance — MAIR-548 à MAIR-553

La navigation desktop se replie en icônes, conserve les noms accessibles et affiche une infobulle au focus/survol, fermée par Échap. La préférence `mairie360_sidebar=v1:collapsed|expanded` utilise uniquement un domaine parent validé fourni par `COOKIE_DOMAIN`. Les cookies d’authentification restent gérés par le transport publié. Le menu mobile conserve le composant publié, son piège de focus et le retour au déclencheur.

Les paramètres d’URL sont bornés et validés. Le bouton retour/avancer restaure les contrôles. Les lectures périmées sont ignorées/annulées ; les recherches serveur sont différées de 250 ms. Au retour au premier plan, les lectures sont regroupées ; les formulaires et données confirmées restent présents. Lors du retour au premier plan, Paramètres cesse de fusionner un ancien brouillon si l’adresse confirmée change ; un réessai explicite conserve les champs modifiés.

| Module | Contexte d’URL |
| --- | --- |
| Paramètres | `tab` (six sections) |
| Projets | `q`, `status`, `priority`, `dueBefore`, `view`, `page` |
| Calendrier | `date`, `view`, lien `event` préservé |
| Messagerie | `conversation` |
| Formation historique | `q`, `category`, `status`, lien de cours préservé |
| Administration | `tab`, `usersSearch` (100 caractères), `usersPage` |
| Dashboard / Connexion | Aucun filtre de page à ajouter |

Projets applique les reçus confirmés localement et relit silencieusement la page filtrée lorsque le contrat ne fournit pas les totaux/options à jour. La page n’est pas rechargée et les brouillons restent montés. Le premier chargement conserve un écran dédié jusqu’à réception du modèle afin de ne pas déplacer les filtres tardivement.

Messagerie utilise l’opération SSE publiée : contrôle de session avec le transport existant, délai borné uniquement pour la connexion, corps conservé au-delà de 15 s, curseur `Last-Event-ID`, déduplication bornée, cinq tentatives maximum, fermeture/annulation et reprise au premier plan. L’identité de la connexion est vérifiée avant de recevoir des événements. Une réception incompatible passe à l’actualisation existante ; une reprise explicite est disponible après échec. Aucune mutation n’est déduite d’un événement : les données confirmées viennent du contrat.

Calendrier utilise un cache de six périodes au maximum, 60 s, par instance et compte identifié. Le contexte vient du bootstrap ; les périodes suivantes utilisent `/calendar/period`. Les mutations confirmées invalident le cache et les réponses anciennes ne peuvent le remplir. Une période adjacente est préchargée pendant un temps libre du navigateur. Réessayer/retour au premier plan relit le contexte serveur ; aucun cache privé n’est persisté.

## Mesure reproductible

`npm ci`, puis `node node_modules/playwright-core/cli.js install --with-deps chromium --only-shell`, `npm run build -- --webpack` et `npm run performance:report -- --output performance/candidate/report.json`.

Node 24.21.0, Next et SDK épinglés dans le lock ; Playwright Core 1.64.0 fixe le navigateur. Trois contextes neufs, 390 × 844, CPU ×4, latence 100 ms, téléchargement 200 000 octets/s et envoi 93 750 octets/s. Date métier fixe sans modifier les horloges de performance. Le collecteur Web Vitals fourni par la version Next installée est identifié par SHA-256. Une valeur absente est un échec de mesure, jamais un zéro inventé.

Le laboratoire lie uniquement des serveurs loopback et des fixtures fictives. Son cookie `mairie360_lab_session` est traduit uniquement par le proxy de laboratoire ; aucun cookie réel n’est relayé. Les écritures ne sont pas simulées. Les sources front de production, leur middleware et leur CSP sont compilés tels quels. Les adaptations locales se limitent au nombre de workers de compilation (un). Ce scénario mesure le front avec une latence de données contrôlée ; il ne mesure pas un backend déployé ni le percentile des utilisateurs réels.

Le rapport distingue le JS produit et le JS demandé lors de l’ouverture, brut et gzip niveau 9. Il archive chaque échantillon, les médianes LCP/INP/CLS, les captures et les identifiants environnement/build/fixtures. La CI compile référence et candidat sur le même runner et archive les résultats. `node scripts/compare-performance.mjs baseline.json candidate.json comparison.json` refuse les profils non comparables.

Les budgets restent des propositions avant décision dans MAIR-549 : JS initial ≤ référence mesurée +10 % ; LCP ≤2 500 ms, INP ≤200 ms et CLS ≤0,1. Ces dernières valeurs sont des objectifs de qualité issus de [Web Vitals](https://web.dev/articles/vitals), pas une certification des mesures de terrain. Le workflow n’active aucun seuil de performance bloquant avant leur adoption.

## Choix et limites

Les imports des SDK conservent leurs points d’entrée générés. La bibliothèque 0.8.0 ne publie pas des points d’entrée UI par module : aucune entrée privée n’est inventée. Le CSS partagé est conservé dans les huit fronts et la bibliothèque. `optimizePackageImports` reste expérimental dans Next ; cette livraison conserve les imports pris en charge plutôt que modifier une frontière client/serveur sans preuve de gain. Les données privées restent obtenues par le transport authentifié existant ; un bootstrap serveur supplémentaire demanderait de préserver ses règles de reprise et de CSP.

Le composant partagé et le thème sont préparés dans la PR bibliothèque existante. Les fronts conservent le wrapper compatible avec la version publiée tant que la nouvelle version ne peut être livrée. La publication reste conditionnée aux contrôles de sécurité existants ; aucun audit/couverture/protection n’est abaissé.

Les tests locaux et captures utilisent des données fictives. Ils ne certifient pas le RGAA complet ni une instance déployée : lecteur d’écran et recette métier en dev restent à vérifier faute de compte utilisable. Les budgets ne constituent pas une date d’activation. Aucune source BFF/API ni déploiement Stage/Prod manuel n’est modifié.
