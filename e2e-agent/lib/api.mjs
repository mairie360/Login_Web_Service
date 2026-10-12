import { cfg, frontUrl } from './config.mjs';

/**
 * Appels HTTP « comme le navigateur » vers les fronts de staging.
 * La route /api/auth/login du front refuse tout ce qui ne vient pas de sa propre page
 * (Sec-Fetch-Site + Origin), on reproduit donc ces deux en-têtes.
 */

function cookiesOf(response) {
  const jar = {};
  for (const line of response.headers.getSetCookie?.() ?? []) {
    const [pair] = line.split(';');
    const eq = pair.indexOf('=');
    jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return jar;
}

export async function login(email, password) {
  const origin = frontUrl('login');
  const response = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin, 'sec-fetch-site': 'same-origin' },
    body: JSON.stringify({ email, password }),
    redirect: 'manual',
  });
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = text; }
  const cookies = cookiesOf(response);
  return { status: response.status, body, cookies, accessToken: cookies.accessToken };
}

let adminToken;

export async function adminSession() {
  if (adminToken) return adminToken;
  const result = await login(cfg.adminEmail, cfg.adminPassword);
  if (result.status !== 200 || !result.accessToken) {
    throw new Error(`Connexion admin refusée (HTTP ${result.status}). Vérifier E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.`);
  }
  adminToken = result.accessToken;
  return adminToken;
}

/** Appel d'une route /bff/admin/* avec le JWT de l'admin de base. */
export async function admin(method, path, body) {
  const token = await adminSession();
  const response = await fetch(`${frontUrl(cfg.apiFront)}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data };
}

export async function findUserByEmail(email) {
  const { status, data } = await admin('GET', `/bff/admin/users?search=${encodeURIComponent(email)}&page_size=50`);
  if (status !== 200) throw new Error(`GET /bff/admin/users -> ${status}`);
  return (data.users ?? []).find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function listRoles() {
  const { status, data } = await admin('GET', '/bff/admin/roles');
  if (status !== 200) throw new Error(`GET /bff/admin/roles -> ${status}`);
  return data.roles;
}
