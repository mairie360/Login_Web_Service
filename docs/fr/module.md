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
- Parcours de première connexion avec jeton temporaire et choix d’un nouveau mot de passe. Depuis MAIR-875/MAIR-888, le front refuse avant tout appel un nouveau mot de passe de moins de 12 caractères ou sans chiffre ou sans lettre (`checkNewPassword` de lib-components) ; l’API accepte encore 8 caractères jusqu’à MAIR-757.
- Écrans V2 (MAIR-826) : toutes les pages sont construites avec lib-components (`Logo`, `Card`, `Footer`, `EmailField`, `PasswordField`, `NewPasswordField`, `LinkButton`, `BackButton`, alertes), les pages mot de passe oublié et réinitialisation suivent la maquette (F3, F4) et l’écran d’indisponibilité est « Connexion indisponible » (F0). Les fronts produit sont toujours en mode clair (MAIR-933). Les passkeys ne sont pas encore dans ce front (MAIR-809, MAIR-811) : `Login` n’expose qu’un `passkeySlot`.
- Second pas d’un compte protégé (MAIR-806, maquette F6) : « Code de vérification » (6 chiffres de l’application d’authentification) ou « Code de secours » (`XXXX-XXXX`), avec les états de la maquette : code incomplet (aucune requête), code incorrect, trop de tentatives (champ et bouton désactivés pendant le délai `Retry-After`), code de secours déjà utilisé et session de connexion terminée (retour au formulaire avec « Votre session de connexion a expiré. »).
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

Le portail ne gère pas les utilisateurs ni les habilitations. La présence de routes BFF User dans le proxy ne signifie pas que le portail possède les écrans d’administration correspondants.

## Pour développer ou exploiter ce module

Le [guide technique](technical.md) détaille architecture, configuration, routes, session, persistance, tests et CI/CD. Il décrit les sources de vérité et les étapes de synchronisation des contrats avec les dépôts associés.


## Direction visuelle commune — MAIR-547

DA claire option 1 : tokens et police communs, navigation accessible et contenu métier conservé. Voir la [recette visuelle](../qa/design-qa.md) pour les preuves, vérifications et limites RGAA.
