---
id: auth-rate-limit
titre: La limitation de débit bloque les tentatives répétées sans bloquer les autres
modules: [login-front, bff-user]
besoins: [navigateur]
utilisateurs:
  - label: throttled
    role: User
---

## Objectif
Des échecs répétés sur un même e-mail finissent en 429, sans bloquer un autre compte. S'arrêter au premier 429: pas de test de charge.

## Étapes
1. Enchaîner des connexions avec un **mauvais mot de passe** pour `throttled`, une par une, jusqu'au premier 429 (arrêt immédiat, 20 tentatives maximum).
   - Écran: message de limitation, pas d'erreur 5xx. Noter le nombre de tentatives avant le blocage.
2. Se connecter avec un **autre compte** (l'admin) depuis la même adresse.
   - Attendu: possible (limite par e-mail, pas globale).
3. Tenter le **bon mot de passe** de `throttled` pendant le blocage.
   - Attendu: noter si le 429 s'applique encore (la limite compte les échecs); consigner l'observation, ne pas conclure bug sans la règle documentée (`AUTH_RATE_LIMIT_*`).

## Cas limites
- L'adresse du testeur est bloquée côté IP: attendre la fenêtre (`AUTH_RATE_LIMIT_WINDOW_MS`) avant de relancer d'autres scénarios.
