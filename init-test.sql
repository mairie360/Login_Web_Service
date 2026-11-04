-- Seed minimal pour les tests isolés (performance / sécurité) du front Login.
-- L'utilisateur 2 est celui référencé par les JWT de test (claim sub = "2") :
--   * load-test.js le signe dynamiquement et l'envoie en cookie accessToken,
--   * docker-compose-security.yml injecte un cookie statique via le replacer ZAP.
-- The password must be an argon2id hash (chk_users_password_hashed constraint of the
-- database image, MAIR-169): it is the template hash of the Database repository, whose
-- clear text is `password_template`. load-test.js signs in with it through
-- POST /api/auth/login (MAIR-516), in addition to the sign-in page and the session reads.
-- first_connect = FALSE: a fresh account answers 200 { requiresPasswordChange: true } to the
-- sign-in and issues no session cookie; the load test needs a returning user.
INSERT INTO users (id, first_name, last_name, email, password, status, first_connect)
VALUES (2, 'Perf', 'Tester', 'perf-tester@mairie360.fr', '$argon2id$v=19$m=19456,t=2,p=1$/iKF9PbiDRDs4EKPjlIIhg$UKx9vfwwps250mEP/bYp63CXbEnQGULeUAhDq+az9Aw', 'active', FALSE)
ON CONFLICT (id) DO NOTHING;
-- Core API >= 1.1.1 exige au moins un rôle sur l'utilisateur pour GET /user/me
-- (sinon 502 côté BFF User, donc sur /api/user/me et sur le shell du front).
INSERT INTO user_roles (user_id, role_id)
SELECT 2, r.id FROM roles r WHERE lower(r.name) = 'user'
ON CONFLICT DO NOTHING;
-- End-to-end journeys (MAIR-603): user 3 keeps first_connect = TRUE (column default), so its first
-- sign-in asks for a new password instead of opening a session. Same template password as user 2.
INSERT INTO users (id, first_name, last_name, email, password, status)
VALUES (3, 'Membre', 'Lecteur', 'membre-lecteur@mairie360.fr', '$argon2id$v=19$m=19456,t=2,p=1$/iKF9PbiDRDs4EKPjlIIhg$UKx9vfwwps250mEP/bYp63CXbEnQGULeUAhDq+az9Aw', 'active')
ON CONFLICT (id) DO NOTHING;
INSERT INTO user_roles (user_id, role_id)
SELECT 3, r.id FROM roles r WHERE lower(r.name) = 'user'
ON CONFLICT DO NOTHING;
-- The users above carry explicit ids: move the id sequence past them, or the first account a
-- journey creates (Administrator) collides with user 2 (MAIR-603).
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
