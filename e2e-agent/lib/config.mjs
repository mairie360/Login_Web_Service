import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadDotenv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trimStart().startsWith('#')) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
loadDotenv(path.join(ROOT, '.env'));

const env = (key, fallback) => (process.env[key] !== undefined && process.env[key] !== '' ? process.env[key] : fallback);

export function need(key) {
  const value = env(key);
  if (!value) throw new Error(`Variable ${key} manquante (voir .env.example)`);
  return value;
}

export const FRONTS = ['login', 'dashboard', 'project', 'calendar', 'message', 'settings', 'elearning', 'admin'];

const domain = env('E2E_DOMAIN', 'staging.mairie360-eip.fr');

// Garde-fou : ce harnais crée et supprime des comptes. Jamais en production.
if (!/^(staging|dev)\./.test(domain) && env('E2E_ALLOW_ANY_ENV') !== 'true') {
  throw new Error(`E2E_DOMAIN=${domain} n'est pas un environnement staging/dev: refus (E2E_ALLOW_ANY_ENV=true pour forcer).`);
}

export const cfg = {
  domain,
  apiFront: env('E2E_API_FRONT', 'admin'),
  get adminEmail() { return need('E2E_ADMIN_EMAIL'); },
  get adminPassword() { return need('E2E_ADMIN_PASSWORD'); },
  get mailbox() { return need('E2E_MAILBOX'); },
  get resendKey() { return need('RESEND_API_KEY'); },
  db: {
    host: env('E2E_DB_HOST', '127.0.0.1'),
    port: Number(env('E2E_DB_PORT', '55432')),
    database: env('E2E_DB_NAME', 'mairie_db_staging'),
    user: env('E2E_DB_USER', 'e2e_readonly'),
    get password() { return need('E2E_DB_PASSWORD'); },
  },
  redis: {
    host: env('E2E_REDIS_HOST', '127.0.0.1'),
    port: Number(env('E2E_REDIS_PORT', '55379')),
    username: env('E2E_REDIS_USERNAME', 'admin'),
    get password() { return need('E2E_REDIS_PASSWORD'); },
  },
};

export const frontUrl = (name) => `https://${name}.${cfg.domain}`;
export const keycloakUrl = () => `https://auth.${cfg.domain}`;

export function arg(name, argv = process.argv.slice(2)) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}
