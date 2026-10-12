# Jeux de données

Réservé au futur fichier Excel (`dataset.xlsx`) que l'agent utilisera comme base de référence:
comptes types, valeurs valides et invalides par champ (noms, e-mails, téléphones, mots de passe), événements, projets, messages…

Pistes de structure, à valider quand on le construira:

| Onglet | Colonnes |
|---|---|
| `utilisateurs` | label, prénom, nom, rôle, téléphone, pays |
| `champs_invalides` | champ, valeur, erreur attendue (400, message) |
| `calendrier`, `projets`, `messages`, `elearning` | un onglet par module, une ligne par objet à créer |

Un scénario y fera référence par nom (« jeu `utilisateurs`, ligne `agent-accueil` »). Le chargeur (`lib/dataset.mjs`, lecture avec `xlsx`) reste à écrire avec le fichier.
En attendant, les scénarios portent leurs valeurs en clair.
