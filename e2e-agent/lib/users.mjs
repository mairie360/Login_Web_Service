#!/usr/bin/env node
/**
 * Comptes de test : l'admin de base crée les autres utilisateurs, ils sont tous supprimés à la fin.
 *
 *   node lib/users.mjs create <label> [--role User]   crée un compte, l'enregistre, imprime ses identifiants
 *   node lib/users.mjs track <user|group|role> <id>   enregistre une ressource créée à la main (via l'UI)
 *   node lib/users.mjs list                           ressources enregistrées pour ce run
 *   node lib/users.mjs cleanup                        supprime tout ce qui est enregistré (à lancer en fin de run, même en échec)
 *   node lib/users.mjs sweep                          filet de sécurité : supprime tout compte « +e2e- » resté d'un run interrompu
 *
 * Les e-mails sont des alias de E2E_MAILBOX (vous+e2e-<run>-<label>@domaine), donc livrés dans la vraie boîte.
 * La suppression d'un compte l'archive (Core ne supprime pas les lignes).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, arg, cfg } from './config.mjs';
import { admin, findUserByEmail, listRoles } from './api.mjs';

const STATE_DIR = path.join(ROOT, '.state');
const STATE = path.join(STATE_DIR, 'current.json');

export function run() {
  mkdirSync(STATE_DIR, { recursive: true });
  if (existsSync(STATE)) return JSON.parse(readFileSync(STATE, 'utf8'));
  const fresh = { runId: `${Date.now().toString(36)}`, startedAt: new Date().toISOString(), created: [] };
  writeFileSync(STATE, JSON.stringify(fresh, null, 2));
  return fresh;
}
const save = (state) => writeFileSync(STATE, JSON.stringify(state, null, 2));

export function aliasFor(label, runId) {
  const [local, domain] = cfg.mailbox.split('@');
  const safe = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${local}+e2e-${runId}-${safe}@${domain}`;
}

const newPassword = () => `E2e-${randomBytes(9).toString('base64url')}`;

export async function createUser(label, roleName) {
  const state = run();
  const email = aliasFor(label, state.runId);
  const password = newPassword();
  const created = await admin('POST', '/bff/admin/users', {
    email,
    first_name: 'E2E',
    last_name: label.replace(/[<>]/g, '').slice(0, 60) || 'Test',
    password,
  });
  if (![200, 201, 204].includes(created.status)) throw new Error(`Création refusée (${created.status}) ${JSON.stringify(created.data)}`);
  const user = await findUserByEmail(email);
  if (!user) throw new Error(`Compte créé mais introuvable par recherche: ${email}`);
  state.created.push({ type: 'user', id: user.id, email });
  save(state);
  if (roleName) {
    const role = (await listRoles()).find((r) => r.name.toLowerCase() === roleName.toLowerCase());
    if (!role) throw new Error(`Rôle inconnu: ${roleName}`);
    const granted = await admin('POST', `/bff/admin/users/${user.id}/roles`, { role_id: role.id });
    if (![200, 201, 204].includes(granted.status)) throw new Error(`Attribution du rôle refusée (${granted.status})`);
  }
  return { id: user.id, email, password, role: roleName ?? null, runId: state.runId, createdAt: new Date().toISOString() };
}

export async function cleanup() {
  const state = run();
  const order = { group: 0, role: 1, user: 2 };
  const failures = [];
  for (const item of [...state.created].sort((a, b) => order[a.type] - order[b.type])) {
    const route = { group: 'groups', role: 'roles', user: 'users' }[item.type];
    const res = await admin('DELETE', `/bff/admin/${route}/${item.id}`);
    if (![200, 204, 404].includes(res.status)) failures.push(`${item.type} ${item.id} -> ${res.status}`);
  }
  if (failures.length) {
    console.error(`Nettoyage incomplet (état conservé dans .state/current.json):\n${failures.join('\n')}`);
    process.exitCode = 1;
    return;
  }
  renameSync(STATE, path.join(STATE_DIR, `${state.runId}.done.json`));
  console.log(`Nettoyage terminé: ${state.created.length} ressource(s) supprimée(s).`);
}

export async function sweep() {
  const { data } = await admin('GET', '/bff/admin/users?search=%2Be2e-&page_size=100');
  const leftovers = (data?.users ?? []).filter((u) => u.email.includes('+e2e-') && !u.is_archived);
  for (const u of leftovers) {
    const res = await admin('DELETE', `/bff/admin/users/${u.id}`);
    console.log(`${u.email} -> ${res.status}`);
  }
  console.log(`${leftovers.length} compte(s) de test restant(s) traité(s).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, a, b] = process.argv.slice(2);
  try {
    if (cmd === 'create') console.log(JSON.stringify(await createUser(a ?? 'user', arg('role')), null, 2));
    else if (cmd === 'track') {
      const state = run();
      state.created.push({ type: a, id: Number(b) });
      save(state);
      console.log(`suivi: ${a} ${b}`);
    } else if (cmd === 'list') console.log(JSON.stringify(run(), null, 2));
    else if (cmd === 'cleanup') await cleanup();
    else if (cmd === 'sweep') await sweep();
    else console.log('usage: users.mjs create <label> [--role Nom] | track <type> <id> | list | cleanup | sweep');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
