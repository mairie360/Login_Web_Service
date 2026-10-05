# Login_Web_Service — Présentation du module

[Documentation technique](technical.md) · [English](../en/module.md) · [README](../../README.md)

Fournir le point d’entrée de connexion de Mairie360 et le parcours de changement de mot de passe obligatoire à la première connexion. Le service transforme les réponses de BFF User en cookies de session utilisables par les autres interfaces.

## Public et utilité

Tous les utilisateurs accédant aux modules Mairie360.

Domaine fonctionnel: Identité et administration.

## Fonctions disponibles

- Formulaire de connexion avec remontée des erreurs serveur.
- Écrans de connexion, de premier changement de mot de passe, de configuration indisponible et de déconnexion autonomes : aucun AppShell, header, sidebar ou footer applicatif avant le retour vers un module authentifié.
- Pendant la connexion ou la confirmation du premier mot de passe, les champs et le bouton sont désactivés et le formulaire annonce son attente. Un verrou synchrone ignore les soumissions répétées, y compris pendant la reconnexion automatique dépendante. Un refus réseau efface le message de reconnexion devenu obsolète et permet une reprise explicite, sans rejouer automatiquement une mutation.
- Parcours de première connexion avec jeton temporaire et choix d’un nouveau mot de passe.
- Création du cookie d’accès puis retour vers la page demandée si son URL appartient à un front Mairie360 configuré ; sinon, redirection vers le tableau de bord configuré.
- La déconnexion centrale revient vers Login standalone après un succès amont ou401 d'une session déjà refusée, uniquement après confirmation de l'expiration des deux cookies par la route locale existante. Un403, un échec service/réseau ou un refus d'expiration locale conserve l'erreur et l'action Réessayer. Le nettoyage local ne prouve pas la révocation des jetons côté serveur ni des sessions Keycloak/n8n (MAIR-143).

## Parcours type

1. Saisir ses identifiants et soumettre le formulaire.
2. Si le serveur impose un changement de mot de passe, terminer ce parcours puis se reconnecter.
3. Accéder au module configuré une fois le cookie de session créé.

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
