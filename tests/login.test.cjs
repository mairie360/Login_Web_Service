const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const originalLoader = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
const { POST } = require('../src/app/api/auth/login/route.ts');
require.extensions['.ts'] = originalLoader;
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const loginRequest = () => new NextRequest('http://localhost/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'alice@example.test', password: 'fixture-password' }) });

test('the access cookie uses the Authorization token returned by the BFF', async () => {
  global.fetch = async () => Response.json({ refresh_token: 'refresh-fixture' }, { headers: { Authorization: 'Bearer access-fixture' } });
  const result = await POST(loginRequest());
  assert.equal(result.status, 200);
  assert.equal(result.cookies.get('accessToken').value, 'access-fixture');
  assert.deepEqual(await result.json(), { success: true });
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
