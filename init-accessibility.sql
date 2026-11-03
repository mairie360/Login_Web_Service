-- Data of the RGAA states of rgaa.yaml (MAIR-316), loaded by the seeder-a11y service of
-- docker-compose-accessibility.yml after init-test.sql. The ZAP / k6 stacks do not load it.
-- User 4 is a first-connection account: Core answers 412 to its login (first_connect = TRUE), so
-- the front shows the forced password change. Same argon2id hash as user 2 (clear text
-- "password_template", the template hash), so the state can sign in for real. Users and roles
-- are inserted in one transaction: otherwise a deferred trigger gives the new user the Guest role.
BEGIN;

INSERT INTO users (id, first_name, last_name, email, password, status, first_connect)
VALUES (4, 'Rgaa', 'First', 'rgaa-first@mairie360.fr', '$argon2id$v=19$m=19456,t=2,p=1$/iKF9PbiDRDs4EKPjlIIhg$UKx9vfwwps250mEP/bYp63CXbEnQGULeUAhDq+az9Aw', 'active', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT 4, r.id FROM roles r WHERE lower(r.name) = 'user'
ON CONFLICT DO NOTHING;

COMMIT;

-- The seeds insert explicit ids (users 2 and 4) without advancing the sequence: the next account an
-- administrator creates would draw id 2, then 4, and fail on uq_users_identity (Core answers 500).
-- The GDPR simulation creates accounts (MAIR-497).
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT max(id) FROM users));
