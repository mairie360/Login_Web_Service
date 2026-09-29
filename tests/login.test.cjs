const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const originalLoader = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const { POST } = require('../src/app/api/auth/login/route.ts');
require.extensions['.ts'] = originalLoader;
const originalFetch = global.fetch;
const originalBffUrl = process.env.BFF_USER_API_URL;
beforeEach(() => { process.env.BFF_USER_API_URL = 'http://bff.example'; });
afterEach(() => {
  global.fetch = originalFetch;
  if (originalBffUrl === undefined) delete process.env.BFF_USER_API_URL;
  else process.env.BFF_USER_API_URL = originalBffUrl;
});
const loginRequest = () => new NextRequest('http://localhost/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'alice@example.test', password: 'fixture-password' }) });

test('the access cookie uses the Authorization token returned by the BFF', async () => {
  global.fetch = async () => Response.json({ refresh_token: 'refresh-fixture' }, { headers: { Authorization: 'Bearer access-fixture' } });
  const result = await POST(loginRequest());
  assert.equal(result.status, 200);
  assert.equal(result.cookies.get('accessToken').value, 'access-fixture');
  assert.equal(result.cookies.get('accessToken').maxAge, 3600, 'opaque tokens must not keep a 24-hour cookie');
  assert.deepEqual(await result.json(), { success: true });
});
test('a JWT access cookie expires no later than its token', async () => {
  const exp = Math.floor(Date.now() / 1000) + 1800;
  const token = `header.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.signature`;
  global.fetch = async () => Response.json({ refresh_token: 'refresh-fixture' }, { headers: { Authorization: `Bearer ${token}` } });
  const result = await POST(loginRequest());
  assert.equal(result.status, 200);
  assert.equal(result.cookies.get('accessToken').value, token);
  assert.ok(result.cookies.get('accessToken').maxAge > 0);
  assert.ok(result.cookies.get('accessToken').maxAge <= 1800);
});
test('a malformed JWT expiry gets only a short fallback cookie', async () => {
  const token = `header.${Buffer.from(JSON.stringify({ exp: 'tomorrow' })).toString('base64url')}.signature`;
  global.fetch = async () => Response.json({ refresh_token: 'refresh-fixture' }, { headers: { Authorization: `Bearer ${token}` } });
  const result = await POST(loginRequest());
  assert.equal(result.status, 200);
  assert.equal(result.cookies.get('accessToken').maxAge, 3600);
});
test('a far-future JWT cannot create a cookie beyond one day', async () => {
  const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 7 * 86400 })).toString('base64url')}.signature`;
  global.fetch = async () => Response.json({ refresh_token: 'refresh-fixture' }, { headers: { Authorization: `Bearer ${token}` } });
  const result = await POST(loginRequest());
  assert.equal(result.status, 200);
  assert.equal(result.cookies.get('accessToken').maxAge, 86400);
});
test('an already expired JWT cannot create an access session', async () => {
  const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 10 })).toString('base64url')}.signature`;
  global.fetch = async () => Response.json({ refresh_token: 'refresh-fixture' }, { headers: { Authorization: `Bearer ${token}` } });
  const result = await POST(loginRequest());
  assert.equal(result.status, 502);
  assert.equal(result.cookies.get('accessToken'), undefined);
  assert.deepEqual(await result.json(), { message: 'Le service de connexion a renvoyé une session expirée.' });
});
test('a refresh token alone cannot become an access session', async () => {
  global.fetch = async () => Response.json({ refresh_token: 'refresh-fixture' });
  const result = await POST(loginRequest());
  assert.equal(result.status, 502); assert.equal(result.cookies.get('accessToken'), undefined);
});
test('first connection keeps the one-time token in an HttpOnly cookie', async () => {
  global.fetch = async () => Response.json({ token: 'first-connection-fixture' }, { status: 412 });
  const result = await POST(loginRequest());
  assert.equal(result.status, 200);
  assert.equal(result.cookies.get('passwordChangeToken').value, 'first-connection-fixture');
  assert.equal(result.cookies.get('passwordChangeToken').httpOnly, true);
  assert.equal((await result.json()).requiresPasswordChange, true);
  assert.equal(result.cookies.get('accessToken'), undefined);
});
