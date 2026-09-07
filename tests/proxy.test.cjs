const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const originalLoader = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, resolveJsonModule: true } }).outputText, filename);
const { proxyBffRequest, forwardToBff } = require('../src/lib/bff-proxy.ts');
require.extensions['.ts'] = originalLoader;
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

test('proxy preserves query, authorization, data, and upstream status', async () => {
  let called;
  global.fetch = async (url, init) => { called = { url: String(url), init }; return Response.json({ id: '42', value: null }, { status: 201 }); };
  const request = new NextRequest('http://localhost/health?q=a%26b', { headers: { cookie: 'accessToken=test-session', Authorization: 'Bearer explicit-session' } });
  const response = await proxyBffRequest(request, { params: Promise.resolve({ path: ['health'] }) });
  assert.equal(response.status, 201); assert.deepEqual(await response.json(), { id: '42', value: null });
  assert.equal(new URL(called.url).search, '?q=a%26b'); assert.equal(called.init.headers.get('Authorization'), 'Bearer explicit-session');
  assert.equal(called.init.headers.get('cookie'), null); assert.equal(called.init.redirect, 'manual');
});
test('proxy preserves binary upload bytes and 204 responses', async () => {
  const bytes = Uint8Array.from([0, 255, 128, 13]);
  let init;
  global.fetch = async (_url, options) => { init = options; return new Response(null, { status: 204 }); };
  const request = new NextRequest('http://localhost/upload', { method: 'POST', headers: { 'Content-Type': 'multipart/form-data; boundary=test', cookie: 'accessToken=test-session' }, body: bytes });
  const response = await forwardToBff(request, 'http://bff.example', '/files');
  assert.equal(response.status, 204); assert.equal(await response.text(), '');
  assert.deepEqual(new Uint8Array(init.body), bytes); assert.equal(init.headers.get('Authorization'), 'Bearer test-session');
  assert.equal(init.headers.get('Content-Type'), 'multipart/form-data; boundary=test');
});
test('contract rejects unknown routes and methods before contacting the BFF', async () => {
  global.fetch = async () => { throw new Error('must not be called'); };
  const missing = await proxyBffRequest(new NextRequest('http://localhost/unknown'), { params: Promise.resolve({ path: ['unknown'] }) });
  assert.equal(missing.status, 404);
  const wrongMethod = await proxyBffRequest(new NextRequest('http://localhost/health', { method: 'DELETE' }), { params: Promise.resolve({ path: ['health'] }) });
  assert.equal(wrongMethod.status, 405); assert.match(wrongMethod.headers.get('Allow'), /GET/);
});
test('BFF errors and cookie changes are preserved', async () => {
  global.fetch = async () => Response.json({ message: 'Denied' }, { status: 403, headers: { 'Set-Cookie': 'accessToken=; Max-Age=0; Path=/; HttpOnly' } });
  const result = await forwardToBff(new NextRequest('http://localhost/logout', { method: 'POST' }), 'http://bff.example', '/auth/logout');
  assert.equal(result.status, 403); assert.deepEqual(await result.json(), { message: 'Denied' }); assert.match(result.headers.get('Set-Cookie'), /Max-Age=0/);
});
test('unavailable BFF produces a controlled error', async () => {
  global.fetch = async () => { throw new Error('connection refused'); };
  const result = await forwardToBff(new NextRequest('http://localhost/health'), 'http://bff.example', '/health');
  assert.equal(result.status, 502); assert.equal(result.headers.get('Cache-Control'), 'no-store');
});
