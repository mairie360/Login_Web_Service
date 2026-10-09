# Vérification de l’artefact UI publié (MAIR-437)

La version stable exacte est choisie dans package.json. Un contrôle unique du paquet installé la compare au verrou et au paquet, puis vérifie l’URL de l’archive, son intégrité SHA-512, le commit publié, les points d’entrée et les empreintes SHA-256 des fichiers dist enregistrés. Les tests de rendu AppShell/Footer et de contrat/sécurité restent distincts.

La fixture consigne les métadonnées de la version réellement publiée sur GitHub Packages et les empreintes de son artefact téléchargé. Pour une montée de version revue, ajouter les métadonnées et empreintes vérifiées dans tests/fixtures/shared-ui-releases.json ; aucune version fictive ni allègement des contrôles. Les tests ne demandent ni accès registre ni requête réseau. Les pins produit et politiques npm restent définis dans leurs fichiers existants.
