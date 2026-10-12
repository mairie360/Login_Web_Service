#!/usr/bin/env node
/** Vérifie que tout est branché avant un run: `npm run doctor`. */
import { FRONTS, cfg, frontUrl, keycloakUrl } from './config.mjs';
import { adminSession, admin } from './api.mjs';
import { query } from './db.mjs';
import { redis } from './redis.mjs';

let failed = 0;
async function check(label, fn) {
  try {
    const detail = await fn();
    console.log(`  OK     ${label}${detail ? ` — ${detail}` : ''}`);
  } catch (e) {
    failed += 1;
    console.log(`  ECHEC  ${label} — ${e.message}`);
  }
}

console.log(`Cible: ${cfg.domain}`);
for (const front of FRONTS) {
  await check(`front ${front}`, async () => {
    const res = await fetch(frontUrl(front), { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
    return `HTTP ${res.status}`;
  });
}
await check('Keycloak (realm)', async () => {
  const res = await fetch(`${keycloakUrl()}/realms/mairie360/.well-known/openid-configuration`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
});
await check('connexion admin de base', async () => { await adminSession(); });
await check(`/bff/admin/users via le front « ${cfg.apiFront} »`, async () => {
  const res = await admin('GET', '/bff/admin/users?page_size=1');
  if (res.status !== 200) throw new Error(`HTTP ${res.status} (essayer un autre E2E_API_FRONT)`);
  return `${res.data.total} comptes`;
});
await check('base en lecture seule', async () => {
  const [row] = await query(
    `SELECT current_user AS who, r.rolsuper, r.rolcreatedb, r.rolcreaterole,
            (SELECT count(*) FROM information_schema.table_privileges
              WHERE grantee = current_user AND privilege_type IN ('INSERT','UPDATE','DELETE','TRUNCATE')) AS write_grants
       FROM pg_roles r WHERE r.rolname = current_user`,
  );
  if (row.rolsuper || row.rolcreatedb || row.rolcreaterole || Number(row.write_grants) > 0) {
    throw new Error(`le rôle ${row.who} a des droits d'écriture ou d'administration: corriger sql/readonly-role.sql`);
  }
  return `${row.who}, SELECT seul`;
});
await check('Redis', async () => `révocations en cours: ${(await redis('scan', 'revoked:*')).length}`);
await check('clé Resend', async () => {
  const res = await fetch('https://api.resend.com/emails?limit=1', { headers: { authorization: `Bearer ${cfg.resendKey}` } });
  if (!res.ok) throw new Error(`HTTP ${res.status} (clé en accès complet requise pour lire les e-mails)`);
});
console.log(`E2E_MAILBOX: ${process.env.E2E_MAILBOX ? 'défini' : 'MANQUANT'}`);
process.exit(failed ? 1 : 0);
