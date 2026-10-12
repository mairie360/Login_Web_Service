---
id: admin-utilisateurs
titre: Cycle de vie d'un utilisateur par l'administrateur (création, modification, téléphone, archivage)
modules: [admin-front, bff-user, core-api, keycloak]
besoins: [navigateur, db]
utilisateurs: []
---

## Objectif
L'admin gère les comptes; chaque action est visible à l'écran **et** cohérente en base (et dans Keycloak quand le miroir est actif).

## Étapes
Connexion avec l'admin de base sur `admin.<domaine>`. Le compte créé ici est suivi avec `users.mjs track user <id>`.

1. **Créer** un utilisateur `crud` (alias de la boîte de test, mot de passe temporaire ≥ 8).
   - Écran: il apparaît dans la liste; la recherche par e-mail le retrouve.
   - Base: ligne `users`, mot de passe stocké en hash, état « première connexion » actif.
2. **Doublon**: recréer le même e-mail → erreur 409 affichée, pas de seconde ligne.
3. **Validation**: prénom vide, nom contenant `<script>` (accepté comme texte, pas interprété à l'affichage), e-mail mal formé, mot de passe de 7 caractères, prénom de 65 caractères.
   - Attendu: erreurs 400 nommant le champ, sauf `<script>` accepté; jamais de 5xx.
4. **Téléphone**: `06 12 34 56 78` avec pays `FR`; `+33 6 12 34 56 78` sans pays; pays seul sans numéro; vider le téléphone.
   - Base: `phone_country` = `FR`, `phone_number` = chiffres nationaux uniquement; réponse API en E.164. Pays seul = erreur 400; vider = valeurs à NULL.
5. **Réinitialiser le mot de passe** de `crud` par l'admin.
   - Base: hash modifié; sessions de `crud` révoquées (en ouvrir une avant).
6. **Archiver** `crud`.
   - Écran: il disparaît des comptes actifs (ou apparaît archivé selon le filtre).
   - Base: archivé, ligne conservée. Connexion de `crud` impossible.
7. **Pagination**: lister avec `page_size` 1, 2, puis une page hors limites (→ vide ou 400, noter lequel).

## Cas limites
- Modifier ou archiver l'admin de base depuis son propre compte: ne rien casser, noter le comportement (refus attendu ou garde-fou).
