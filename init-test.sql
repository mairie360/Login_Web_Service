-- Seed minimal pour les tests isolés (performance / sécurité) du front Login.
-- L'utilisateur 2 est celui référencé par les JWT de test (claim sub = "2") :
--   * load-test.js le signe dynamiquement et l'envoie en cookie accessToken,
--   * docker-compose-security.yml injecte un cookie statique via le replacer ZAP.
-- Le mot de passe n'est pas un hash valide : POST /api/auth/login n'est pas
-- exercé, seules la page de connexion et les lectures de session le sont.
INSERT INTO users (id, first_name, last_name, email, password, status)
VALUES (2, 'Perf', 'Tester', 'perf-tester@mairie360.fr', 'dummy', 'active')
ON CONFLICT (id) DO NOTHING;
-- Core API >= 1.1.1 exige au moins un rôle sur l'utilisateur pour GET /user/me
-- (sinon 502 côté BFF User, donc sur /api/user/me et sur le shell du front).
INSERT INTO user_roles (user_id, role_id)
SELECT 2, r.id FROM roles r WHERE lower(r.name) = 'user'
ON CONFLICT DO NOTHING;
