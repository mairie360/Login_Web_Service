# Régressions des styles du document Login

Les tests de présentation appliquent la véritable feuille de styles du front à
un document JSDOM isolé, puis vérifient la taille calculée de la police racine et
la famille de police du corps. Ils détectent une modification de la base de
référence de 17px ou de la police sans dépendre des espaces, des commentaires,
de l'ordre des déclarations ou du nom d'un token de thème inutilisé. Les
déclarations et chemins d'import parsés conservent la politique interdisant les
variables et imports de préférences de démonstration. Chaque document est fermé
après son test. La politique de ressources JSDOM par défaut ne télécharge aucune
feuille de styles externe.
La politique des déclarations utilise la dépendance PostCSS existante résolue
depuis le paquet Next, y compris les blocs de thème Tailwind ignorés par JSDOM.

Ce contrôle couvre les propriétés CSS prises en charge par JSDOM. Il ne lance
pas le compilateur Tailwind, ne résout pas toutes les propriétés personnalisées,
n'applique pas les media queries responsive et ne mesure pas la géométrie ou
les interactions du navigateur. Les contrôles natifs du véritable snapshot main
restent des preuves distinctes, avec leur largeur et leur date. Les tests de
connexion, premier mot de passe, configuration indisponible et déconnexion
continuent d'exécuter le vrai code des pages. Aucun style de production,
parcours d'authentification, dépendance, contrat API/BFF, workflow ou contrôle
RGAA n'est modifié.

Suivi : MAIR-437. L'audit plus large des tests lisant les sources reste ouvert.
