---
id: auth-connexion
titre: Connexion par mot de passe, cookie de session partagé, refus uniformes
modules: [login-front, bff-user, core-api]
besoins: [navigateur, db]
utilisateurs:
  - label: agent
    role: User
---

## Objectif
La connexion nominale pose un cookie sûr, ouvre une session en base et les échecs ne révèlent rien (compte inconnu, mauvais mot de passe, compte archivé = même réponse).

## Étapes
Prérequis: le compte `agent` a déjà changé son mot de passe (voir `02-premiere-connexion`), sinon le premier login répond 412. Pour ce scénario, joue d'abord le changement forcé par API (`login` → 412 → `/api/auth/force_change_password`).

1. **Se connecter** avec `agent` depuis `login.<domaine>`.
   - Écran: redirection vers le dashboard (`DASHBOARD_FRONT_URL`), aucune erreur console, aucun 5xx.
   - Cookie `accessToken`: HttpOnly, Secure, SameSite=Strict, path `/`, domaine `.staging.mairie360-eip.fr`; aucun token dans le corps ni dans le stockage local de la page.
   - Base: une ligne `sessions` récente pour l'utilisateur; `token_hash` fait 64 caractères hexadécimaux (SHA-256), jamais le token brut.
2. **Ouvrir un autre front** (calendrier, projets…) dans la même session.
   - Écran: pas de nouvelle demande de connexion (cookie partagé), le nom de l'utilisateur s'affiche.
3. **Échecs** (dans une session vierge): mauvais mot de passe, e-mail inconnu, champ vide, e-mail mal formé.
   - Écran: « Email ou mot de passe incorrect. » identique pour mauvais mot de passe et e-mail inconnu; message de validation (400) pour champ vide ou format invalide; pas de message technique anglais.
   - Base: aucune session créée pour ces tentatives.
4. **Compte archivé**: l'admin archive `agent` (`DELETE /bff/admin/users/{id}`), puis tentative de connexion.
   - Écran: même message qu'un mauvais mot de passe; l'ancienne session ne donne plus accès (401 puis retour à la connexion).
   - Base: l'utilisateur est archivé (absent de la vue des comptes actifs).

## Cas limites
- Adresse en majuscules: acceptée, même compte.
- Soumission du formulaire sans JavaScript: les identifiants ne se retrouvent pas dans l'URL.
