---
id: smoke-fronts
titre: Les 8 fronts répondent, exigent une session, partagent la session
modules: [tous les fronts, ingress, cert-manager]
besoins: [navigateur]
utilisateurs:
  - label: visiteur
    role: User
---

## Étapes
Prérequis: `visiteur` a fait sa première connexion.

1. Pour chacun de `login`, `dashboard`, `project`, `calendar`, `message`, `settings`, `elearning`, `admin` (sans session):
   - Écran: HTTP 200 ou redirection vers `login.<domaine>`, certificat TLS valide (Let's Encrypt, non expiré), aucune page d'erreur serveur.
   - Réseau: aucun contenu mixte, en-têtes de sécurité présents (CSP, `X-Content-Type-Options: nosniff`).
2. Connecté en `visiteur`, visiter chaque front.
   - Écran: pas de nouvelle demande de connexion, la page principale se charge sans erreur console ni réponse ≥ 500 (`session.failedRequests` vide).
3. `GET /health` de chaque front: 200.
4. `admin.<domaine>` avec `visiteur`: refusé (voir `admin/03`).

## Cas limites
- Cookie `accessToken` supprimé en cours de navigation: chaque front renvoie vers la connexion sans boucle de redirection.
