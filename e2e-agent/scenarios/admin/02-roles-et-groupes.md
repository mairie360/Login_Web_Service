---
id: admin-roles-groupes
titre: Rôles et groupes (attribution, protection des rôles de base, membres)
modules: [admin-front, bff-user, core-api]
besoins: [navigateur, db]
utilisateurs:
  - label: membre
    role: User
---

## Étapes
1. **Rôles de base**: lister; `Admin`, `Maire`, `Responsable`, `User`, `Guest` existent. Tenter d'en supprimer un → 403 et la ligne reste.
2. **Créer un rôle** `e2e-role` (suivi `track role`), l'attribuer à `membre`, puis le retirer.
   - Base: la liaison utilisateur–rôle apparaît puis disparaît; `GET /me` de `membre` reflète ses rôles.
3. **Supprimer** `e2e-role` quand il n'est plus attribué → OK; quand il l'est → refus ou retrait automatique (noter lequel).
4. **Créer un groupe** `e2e-groupe` (suivi `track group`), y ajouter `membre`, lister les membres, retirer `membre`, modifier le nom, supprimer le groupe.
   - Écran: la liste des membres suit; Base: lignes cohérentes à chaque étape.
5. **Listes paginées**: `/bff/admin/groups?limit=2&offset=0` puis `offset=2`; `limit=501` → 400.

## Cas limites
- Ajouter deux fois le même membre: pas de doublon (`created: false` ou 409, noter).
