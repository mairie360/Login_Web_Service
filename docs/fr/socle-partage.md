# Socle frontend partagé

Les huit fronts utilisent exactement `@mairie360/front-kit@0.1.0`, livré par l’archive versionnée `vendor/mairie360-front-kit-0.1.0.tgz`. Le fichier de provenance donne le commit source de Front_End_Template et les empreintes SHA-256/SHA-512. Cette distribution est vérifiable hors publication npm ; elle ne prétend pas publier une nouvelle version de lib-components (0.8.0 conservée).

## Session et proxy

Les sept modules authentifiés partagent le garde : un cookie absent, opaque, malformé ou expiré est invalide. Les requêtes de données reçoivent un JSON 401 ; une navigation de document reprend via `GET /api/auth/resume?next=<chemin local>`. Les chemins externes, API, internes et ambigus sont refusés. Les routes de documentation restent en 404.

Un 401 ordinaire déclenche `POST /api/auth/refresh` sur l’origine courante, où le cookie HttpOnly refreshToken, limité à /api, est réellement envoyé. Les requêtes simultanées partagent le renouvellement ; chaque requête métier est rejouée au plus une fois et son corps est préservé. Un refus du propriétaire Login arrête cette reprise ; une panne reste une erreur récupérable. Aucun jeton n’est lu en JavaScript, ajouté à l’URL ou stocké dans localStorage.

La déconnexion est un POST avec contrôle d’origine. Le propriétaire Login lit refreshToken côté serveur, demande la révocation publiée, puis efface les cookies après confirmation. Une panne ne devient pas un faux succès. Les cookies rafraîchis restent HttpOnly, Secure en production, SameSite=Strict ; refreshToken a maxAge de 30 jours. La durée effective dépend encore de la rétention Core/BFF ; cette modification frontend ne la prolonge pas côté serveur.

Le proxy applique la liste des opérations publiées, filtre les en-têtes entrants/sortants et borne le corps. Authorization vient du cookie serveur, jamais d’un en-tête arbitraire du navigateur. Les Set-Cookie et en-têtes internes amont ne sont pas relayés librement ; seules les paires de session validées sont reposées avec la politique locale.

## Configuration au runtime

Renseigner LOGIN_FRONT_URL et l’URL de ce module ; les liens utilisent les URL publiques configurées, sans repli localhost. COOKIE_DOMAIN est requis en production pour partager la session et l’apparence confirmée entre les sous-domaines ; une configuration de session incomplète échoue avant rotation.

INSTANCE_TIMEZONE désigne le fuseau IANA unique de l’instance (par exemple Indian/Reunion). Le repli documenté est UTC. Le layout transmet ce fuseau aux composants ; les dates civiles restent des dates et les instants sont affichés dans ce fuseau. La conversion serveur et la récurrence Calendar restent sous la responsabilité du BFF/API ; aucun code serveur métier n’est modifié ici.

Le layout lit le claim role du JWT pour afficher l’entrée Admin dès le rendu initial. Une seule table d’alias est partagée ; claim manquant, inconnu ou expiré => Guest. Cette lecture ne vérifie pas la signature et n’accorde aucun droit : les BFF restent seuls décisionnaires pour chaque opération.

Après lecture ou enregistrement confirmé dans Settings, les préférences d’apparence valides (thème, densité, police) alimentent un cookie public versionné, sans données personnelles ni secret. Les autres modules et onglets reprennent ce cache ; les brouillons et refus ne publient pas un nouvel état. Le stockage facultatif indisponible ne transforme pas la réponse serveur en échec.

## Vérification

Exécuter npm test, npm run lint, tsc --noEmit --incremental false et npm run contracts:check sous Node 24/npm 11. Les tests vérifient l’intégrité de l’archive, le rôle SSR, les frontières réseau, les renouvellements/refus, la révocation et les dates aux limites de jour. Les rapports Node natifs sont conservés ; la couverture V8 des composants, quand présente, écrit séparément dans coverage/components. Les seuils de 60 % ne constituent pas une certification RGAA. La recette déployée, le lecteur d’écran et les contrôles exhaustifs de zoom/espacement restent à réaliser.
