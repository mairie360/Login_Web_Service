| Route actuelle | Donnée | JSON ou en-tête réellement disponible | JSON absent ou route absente | Origine actuelle | État |
|---|---|---|---|---|---|
| `POST /auth/login` | Requête de connexion | `{"email":"string","password":"string","device_info":"string"}` | `{}` | `Core API` | `complet` |
| `POST /api/auth/login` | Information appareil envoyée par le navigateur | `{"device_info":"navigator.platform"}` | `{"device_info_transmis":"en-tête user-agent ou Navigateur inconnu"}` | `proxy Next Web Service` | `valeur cliente remplacée` |
| `POST /auth/login` | Connexion réussie | `{"body":{"refresh_token":"string"},"header":{"Authorization":"Bearer {accessToken}"}}` | `{}` | `Core API` | `complet` |
| `POST /auth/login` | Première connexion | `{"status":412,"body":{"token":"string"}}` | `{}` | `Core API` | `complet` |
| `POST /auth/force_change_password` | Changement forcé | `{"token":"string","new_password":"string"}` | `{"password_et_first_connect":"réécrits directement par le BFF","token_première_connexion":"supprimé directement par le BFF"}` | `Core API + SQL BFF + Redis BFF` | `route présente avec écritures directes BFF` |
| `POST /auth/forgot_password` | Mot de passe oublié | `{}` | `{"request":{"email":"string"},"response":{}}` | `route Core disponible, route BFF absente` | `manquant` |
| `POST /auth/reset_password` | Réinitialisation | `{}` | `{"request":{"token":"string","new_password":"string","device_info":"string"},"response":{"refresh_token":"string"}}` | `route Core disponible, route BFF absente` | `manquant` |

| Type | Route BFF manquante | Route Core disponible | JSON entrée | JSON sortie attendue | Données couvertes |
|---|---|---|---|---|---|
| `BFF` | `POST /auth/forgot_password` | `POST /api/v1/auth/forgot_password/` | `{"email":"string"}` | `{}` | `email` |
| `BFF` | `POST /auth/reset_password` | `POST /api/v1/auth/reset_password/` | `{"token":"string","new_password":"string","device_info":"string"}` | `{"refresh_token":"string"}` | `token`, `new_password`, `device_info`, `refresh_token` |
