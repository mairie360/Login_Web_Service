# Gardes sémantiques frontend — MAIR-437

Les invariants de modules, imports, appels et dépendances sont vérifiés à partir de leur structure et de leurs valeurs réelles, sans imposer les guillemets, espaces ou la forme fonction/flèche d’une déclaration stable. Les gardes de contrat, propriété du BFF, origine réseau, planchers de sécurité et seuils de couverture restent conservés. Les suites exécutables de routes, composants et brouillons restent distinctes des politiques AST.

Seuls tests, helpers et documentation changent. Aucun source applicatif, manifeste/verrou de dépendances, contrat API/BFF, contrôle de sécurité ou configuration RGAA n’est modifié. Les fixtures de comparaison restent dans la recette isolée ; elles ne prouvent pas l’installation ou le fonctionnement d’une autre version. Les parcours dev authentifiés, droits, persistance et rollout restent non vérifiés sans compte utilisable.
