# BFF — Connexion

Référentiel de besoins harmonisé le 5 septembre 2026. Documentation uniquement : aucune route ni migration n'est créée par ces fichiers. Les chemins BFF sont relatifs au service indiqué, pas au préfixe des proxies Next.js ; les chemins backend conservent leurs préfixes réels.

Le front branche la connexion et le changement obligatoire à la première connexion. Mot de passe oublié, réinitialisation et défi MFA restent des besoins cibles, pas des écrans déjà raccordés.

Tables et routes propriétaires : [BACKEND.md](BACKEND.md).

`Existant` : déclaré dans les sources locales ; `Partiel` : route présente mais données manquantes, SQL direct ou mémoire ; `Client généré` : chemin observé dans le client installé, déploiement non vérifié ; `Proposé` : contrat cible à implémenter/valider. Pour les tables, `SQL observé` ne prouve pas qu'une migration est déployée.

## Routes communes

Les identifiants renvoyés par un domaine restent ceux de son backend, même lorsqu'un BFF les sérialise en chaîne. `phone` côté Core/DTO correspond à `users.phone_number` en SQL ; `name`/`fullName` est composé à partir du prénom et du nom, sans découpage automatique inverse. Les rôles d'affichage sont adaptés par chaque front à partir de `roles`, sans nouvelle table de rôles par module. Le profil s'édite dans **Paramètres > Profil** ; les anciennes pages `/profile` ne définissent pas un stockage distinct.

| Méthode | Service et route BFF | Route backend / source | Données nécessaires au front | État |
| --- | --- | --- | --- | --- |
| GET | BFF User `/me` (alias `/session/me`) | Core `GET /api/v1/user/me/` + `GET /api/v1/groups/` | Identité, rôles et groupes communs ; réponse actuelle `{user, groups, roles}` ; enrichir avec identifiant, avatar, service, poste et dernière connexion | Partiel |
| POST | BFF User `/auth/logout` | Actuel : suppression du cookie ; cible : Core `POST /api/v1/sessions/revoke` avec le refresh token de la session courante | Déconnexion ; révocation serveur à brancher, pas une suppression de toutes les sessions | Partiel |
| GET | BFF User `/notifications` | Core `GET /api/v1/user/me/notifications/` | Notifications du bandeau et compteur non lu ; ne pas utiliser la constante de démonstration 3 | Proposé |
| PATCH | BFF User `/notifications/{notificationId}/read` | Core `PATCH /api/v1/user/me/notifications/{notificationId}/read` | Marquage lu et compteur actualisé pour l'utilisateur connecté | Proposé |

## Routes du module

| Méthode | Service et route BFF | Route backend / source | Données nécessaires au front | État |
| --- | --- | --- | --- | --- |
| POST | BFF User `/auth/login` | Core `POST /api/v1/auth/login` | E-mail, mot de passe, appareil ; jeton d'accès transmis en en-tête Authorization et refresh token ; 412 à la première connexion | Existant |
| POST | BFF User `/auth/force_change_password` | Core `POST /api/v1/auth/force_change_password` | Jeton temporaire, nouveau mot de passe ; BFF écrit aussi actuellement users/Redis | Partiel : double persistance |
| POST | BFF User `/auth/forgot_password` | Core `POST /api/v1/auth/forgot_password` | E-mail de récupération ; réponse ne révélant pas l'existence du compte | Proposé côté BFF |
| POST | BFF User `/auth/reset_password` | Core `POST /api/v1/auth/reset_password` | Jeton à usage unique, nouveau mot de passe, appareil | Proposé côté BFF |
| POST | BFF User `/auth/register` | Actuel : Core `POST /api/v1/admin/users/` ; cible auto-inscription : `POST /api/v1/auth/register` | Compte utilisateur ; respecter le réglage global d'inscription publique | Partiel : route actuelle de création administrative, pas d'auto-inscription branchée |
| POST | BFF User `/auth/mfa/verify` | Core `POST /api/v1/auth/mfa/verify` | Défi, méthode SMS/authenticator, code ; session authentifiée seulement après validation | Proposé ; commun à la sécurité Paramètres |

## Points d'alignement

| Sujet | Contrat / écart |
| --- | --- |
| Proxies Next existants | `POST /api/auth/login` → `/auth/login` ; `POST /api/auth/force_change_password` (alias `/api/auth/force-change-password`) → `/auth/force_change_password`. Les routes Core d'authentification n'ont pas de slash final dans les handlers locaux. |

## Sources

| Périmètre | Référence |
| --- | --- |
| Front inspecté | [src/components/Login.tsx](src/components/Login.tsx) |
| Identité / sessions / groupes | [Core_API 9904624](https://github.com/mairie360/Core_API/tree/99046240dd9742217d2a2c3d282721b785cacca0/src) ; [BFF_user b7c3477](https://github.com/mairie360/BFF_user/tree/b7c3477f858073aa846ba0129cbb29152528e6d2/src) |
