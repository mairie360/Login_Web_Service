# Contrôles de branding exécutés

MAIR-437 : les tests exécutent le layout et ses exports metadata. Un formatage équivalent reste accepté ; un titre ou chemin d’icône incorrect ne peut plus réussir grâce à un commentaire. Les contrôles binaires des icônes et du manifest restent inchangés. Calendars et Messages rendent aussi le vrai shell et le paquet UI installé pour vérifier le logo de navigation.

Le helper réutilise le loader TypeScript existant et les vraies implémentations React/ReactDOM/provider. Seules les transformations CSS et fontes effectuées par Next au build sont neutralisées. Ces tests ne certifient ni les fontes/pixels, ni le responsive, ni l’authentification ou la persistance. Sources produit, contrats, dépendances, workflows et contrôles RGAA inchangés ; les preuves navigateur restent distinctes et versionnées.
