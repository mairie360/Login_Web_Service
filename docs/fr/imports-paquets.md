# Imports de la bibliothèque UI

La configuration Next `experimental.optimizePackageImports` inclut `@mairie360/lib-components`. Le compilateur peut optimiser les imports du point d’entrée publié ; les fronts conservent tous la version exacte 0.8.0. Les nouvelles entrées par module demandent la publication de la bibliothèque candidate avant leur adoption.

Vérifier un build de production propre et les interactions rendues du module lorsque cette option change. Sa présence ne démontre aucun gain de JavaScript initial ni de LCP. Le rapport de performance existant conserve ces mesures ; les budgets proposés restent des propositions tant que leurs seuils ne sont pas retenus.
