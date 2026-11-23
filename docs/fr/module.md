# Login_Web_Service — Présentation du module

[Documentation technique](technical.md) · [English](../en/module.md) · [README](../../README.md)

Fournir le point d’entrée de connexion de Mairie360 et le parcours de changement de mot de passe obligatoire à la première connexion. Le service transforme les réponses de BFF User en cookies de session utilisables par les autres interfaces.

## Public et utilité

Tous les utilisateurs accédant aux modules Mairie360.

Domaine fonctionnel: Identité et administration.

## Fonctions disponibles

- Formulaire de connexion avec remontée des erreurs serveur.
- Les champs de connexion et de changement obligatoire de mot de passe sont figés pendant une requête ; les doubles soumissions sont bloquées immédiatement et un échec efface les anciens messages de succès.
- Écrans de connexion, de premier changement de mot de passe, de configuration indisponible autonomes : aucun AppShell, header, sidebar ou footer applicatif avant le retour vers un module authentifié.
- Parcours de première connexion avec jeton temporaire et choix d’un nouveau mot de passe. Depuis MAIR-875/MAIR-888, le front refuse avant tout appel un nouveau mot de passe de moins de 12 caractères (`checkNewPassword` de lib-components). Depuis MAIR-757, Core API applique la politique CNIL 2022 (12 caractères, pas de mot de passe courant, rien de l’e-mail, du prénom ou du nom du compte, plus de règle chiffres et lettres) : son refus affiche toute la politique, et la page de réinitialisation l’énonce.
- Écrans V2 (MAIR-826) : toutes les pages sont construites avec lib-components (`Logo`, `Card`, `Footer`, `EmailField`, `PasswordField`, `NewPasswordField`, `LinkButton`, `BackButton`, alertes), les pages mot de passe oublié et réinitialisation suivent la maquette (F3, F4) et l’écran d’indisponibilité est « Connexion indisponible » (F0). Les fronts produit sont toujours en mode clair (MAIR-933). Les la connexion par passkey est dans ce front (MAIR-811, voir plus bas). `Login` expose un `passkeySlot` qui remplace le contrôle de connexion par passkey du formulaire, avant l’authentification ; ce n’est pas un point de création d’une passkey après la connexion (c’est la proposition F8 ci-dessous).
- Second pas d’un compte protégé (MAIR-806, maquette F6) : « Code de vérification » (6 chiffres de l’application d’authentification) ou « Code de secours » (`XXXX-XXXX`), avec les états de la maquette : code incomplet (aucune requête), code incorrect, trop de tentatives (champ et bouton désactivés pendant le délai `Retry-After`), code de secours déjà utilisé et session de connexion terminée (retour au formulaire avec « Votre session de connexion a expiré. »).
- Connexion par passkey (MAIR-811, maquette F5) : sous « Se connecter », un séparateur « ou » puis « Se connecter avec une passkey », et le remplissage automatique du champ e-mail (`autocomplete="username webauthn"`, médiation conditionnelle) quand le navigateur le permet. Une passkey vaut double authentification : aucune étape de code ensuite. Fermer la fenêtre du navigateur n’affiche rien ; passkey refusée (401), compte désactivé (403) et trop de tentatives (429) ont chacun leur message ; sans service de passkeys sur l’instance (503) le bouton est remplacé par « Connexion par passkey indisponible pour le moment. Utilisez votre mot de passe. », et rien n’est affiché sans WebAuthn ou quand la mairie n’accepte pas les passkeys (403).
- Proposition de passkey après une connexion par mot de passe (MAIR-811, maquette F8) : quand la mairie accepte les passkeys, que le compte n’en a pas, que le navigateur sait en créer une et que l’agent ne l’a pas refusée sur cet appareil, la connexion par mot de passe (avec ou sans étape de code) affiche « Connectez-vous plus vite avec une passkey » (trois avantages, « Créer une passkey », « Plus tard », « Ne plus me le proposer sur cet appareil »). « Plus tard » ouvre le module et la reproposera à la prochaine connexion ; « Ne plus me le proposer » est mémorisé sur ce navigateur seulement. « Créer une passkey » ouvre la fenêtre du navigateur, puis « Passkey enregistrée » propose le nom du gestionnaire (modifiable, obligatoire) et l’enregistre avant d’ouvrir le module. Un navigateur qui crée la passkey tout seul pour le mot de passe enregistré (création conditionnelle) ouvre directement le module, la passkey nommée d’après son gestionnaire. Fermer la fenêtre du navigateur n’affiche rien ; les refus ont chacun leur message en français.
- Activité inhabituelle (MAIR-773, maquette F9) : juste après une connexion (mot de passe, étape de code ou passkey), avant la proposition de passkey, le dernier usage non lu d’une session de l’agent depuis un autre appareil affiche « Activité inhabituelle sur votre compte » : « Quelqu’un a essayé d’utiliser votre session depuis un autre appareil. » (certain, alerte d’erreur) ou « Votre session a été utilisée depuis une autre connexion, peut-être vous après un changement de réseau. » (possible, alerte d’avertissement), puis la date, l’appareil et le début de l’adresse (`92.184.xxx.xxx`). « J’ai compris, continuer » / « C’était moi, continuer » la marquent lue et poursuivent ; « Ce n’était pas moi : changer mon mot de passe » la marque lue et ouvre la page mot de passe oublié avec l’e-mail prérempli. Si l’alerte ne peut pas être lue, la connexion continue sans l’écran.
- Création de passkey pendant l’enrôlement obligatoire (maquette F7, branche passkey) : « Créer une passkey » demande le nom de la passkey (1 à 100 caractères), puis le navigateur la crée (`navigator.credentials.create`) et la session s’ouvre, sans codes de secours, sur « Compte sécurisé ». Fermer la fenêtre du navigateur revient au nom sans erreur ; une réponse refusée (400), trop de tentatives (429) et un service injoignable ont chacun leur message ; une session d’enrôlement terminée (expirée, ou le compte a reçu un facteur entre-temps) renvoie au mot de passe. Un navigateur sans WebAuthn ne se voit pas proposer la passkey : l’application reste, ou, quand la mairie n’autorise que les passkeys, « Votre navigateur ne permet pas de créer une passkey. » s’affiche.
- Création du cookie d’accès puis retour vers la page demandée si son URL appartient à un front Mairie360 configuré ; sinon, redirection vers le tableau de bord configuré.

## Parcours type

1. Saisir ses identifiants et soumettre le formulaire.
2. Si le serveur impose un changement de mot de passe, terminer ce parcours puis se reconnecter.
3. Si le compte est protégé par un second facteur, saisir le code de l’application d’authentification ou un code de secours.
4. Accéder au module configuré une fois le cookie de session créé.

## Place dans Mairie360

Dépôts associés: [BFF_user](https://github.com/mairie360/BFF_user).

Ce dépôt contient l’interface navigateur et ses adaptateurs Next.js. Le BFF associé fournit les données métier et coordonne leurs sources.

## Données et état actuel

Core fournit les opérations d’identité et de session. Les dépôts SQL du BFF lisent aussi les utilisateurs et rôles, et réalisent certaines mutations de mots de passe et de groupes. Le parcours de première connexion utilise PostgreSQL et Redis. Les données ne sont donc pas toutes accessibles exclusivement par HTTP.

## Périmètre et limites

Les fonctions de supervision, sauvegarde, journaux applicatifs et politique système décrites dans les besoins d’administration ne sont pas garanties par ce contrat. Les accès SQL exigent un schéma compatible, notamment `group_members`; ne pas confondre ce nom avec `group_users` utilisé dans d’autres contrats.

Le portail ne gère pas les utilisateurs ni les habilitations. Le proxy ne relaie que les routes de connexion, l’utilisateur courant, la création de passkey et les sondes (MAIR-700) : les routes d’administration de BFF User ne sont pas joignables par ce portail, seulement par la console d’administration.

## Pour développer ou exploiter ce module

Le [guide technique](technical.md) détaille architecture, configuration, routes, session, persistance, tests et CI/CD. Il décrit les sources de vérité et les étapes de synchronisation des contrats avec les dépôts associés.


## Direction visuelle commune — MAIR-547

DA claire option 1 : tokens et police communs, navigation accessible et contenu métier conservé. Voir la [recette visuelle](../qa/design-qa.md) pour les preuves, vérifications et limites RGAA.
