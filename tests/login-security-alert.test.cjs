// MAIR-773 F9: the pending security alert read right after the sign-in, and its acknowledgement.
const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const { NextRequest } = require('next/server');
const { requireTs } = require('./support/load-ts.cjs');
const { GET: pending } = requireTs('src/app/api/security-alert/route.ts');
const { POST: acknowledge } = requireTs('src/app/api/security-alert/acknowledge/route.ts');
const originalFetch = global.fetch;
const originalBffUrl = process.env.BFF_USER_API_URL;
beforeEach(() => { process.env.BFF_USER_API_URL = 'http://bff.example'; });
afterEach(() => {
  global.fetch = originalFetch;
  if (originalBffUrl === undefined) delete process.env.BFF_USER_API_URL; else process.env.BFF_USER_API_URL = originalBffUrl;
});

const SESSION = 'accessToken=access-fixture';
const get = (cookie = SESSION, site = 'same-origin') => new NextRequest('http://localhost/api/security-alert', {
  method: 'GET',
  headers: { 'Sec-Fetch-Site': site, ...(cookie ? { cookie } : {}) },
});
const post = (body, cookie = SESSION) => new NextRequest('http://localhost/api/security-alert/acknowledge', {
  method: 'POST',
  headers: { 'Sec-Fetch-Site': 'same-origin', 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const ALERT = { id: 12, level: 'certain', ip_address: '92.184.10.1', device_info: 'Firefox', created_at: '2026-11-23T08:12:00+00:00' };

test('MAIR-773 the pending alert is read with the session as a Bearer and only its fields come back', async () => {
  let sent;
  global.fetch = async (url, init) => { sent = { url: String(url), method: init.method, auth: init.headers.Authorization }; return Response.json({ ...ALERT, extra: 'dropped' }); };
  const result = await pending(get());
  assert.deepEqual(sent, { url: 'http://bff.example/user/me/security-alert', method: 'GET', auth: 'Bearer access-fixture' });
  assert.deepEqual(await result.json(), { alert: { id: 12, level: 'certain', ipAddress: '92.184.10.1', deviceInfo: 'Firefox', createdAt: '2026-11-23T08:12:00+00:00' } });
  assert.equal(result.headers.get('cache-control'), 'no-store');
});

test('MAIR-773 no alert, a refusal, an invalid answer or an unreachable BFF never block the sign-in', async () => {
  for (const answer of [
    () => new Response(null, { status: 204 }),
    () => Response.json({ error: {} }, { status: 401 }),
    () => Response.json({ ...ALERT, level: 'unknown' }),
    () => new Response('not json', { status: 200 }),
    () => { throw new TypeError('offline'); },
  ]) {
    global.fetch = async () => answer();
    assert.deepEqual(await (await pending(get())).json(), { alert: null });
  }
  let called = false;
  global.fetch = async () => { called = true; return Response.json(ALERT); };
  assert.deepEqual(await (await pending(get(''))).json(), { alert: null }, 'no session');
  assert.ok((await pending(get(SESSION, 'cross-site'))).status >= 400);
  assert.equal(called, false);
});

test('MAIR-773 the acknowledgement forwards the id, and an alert already read counts as read', async () => {
  let sent;
  global.fetch = async (url, init) => { sent = { url: String(url), method: init.method }; return new Response(null, { status: 204 }); };
  assert.equal((await acknowledge(post({ id: 12 }))).status, 204);
  assert.deepEqual(sent, { url: 'http://bff.example/user/me/security-alert/12/acknowledge', method: 'POST' });
  global.fetch = async () => Response.json({ error: {} }, { status: 404 });
  assert.equal((await acknowledge(post({ id: 12 }))).status, 204);
});

test('MAIR-773 the acknowledgement refuses an invalid id, keeps the session refusal and hides a BFF failure', async () => {
  let called = false;
  global.fetch = async () => { called = true; return new Response(null, { status: 204 }); };
  for (const body of [{}, { id: 'x' }, { id: 0 }, { id: 1.5 }, 'not json']) {
    assert.equal((await acknowledge(post(body))).status, 400);
  }
  assert.equal((await acknowledge(post({ id: 12 }, ''))).status, 401);
  assert.equal(called, false);
  global.fetch = async () => Response.json({ error: {} }, { status: 401 });
  assert.deepEqual([(await acknowledge(post({ id: 12 }))).status], [401]);
  global.fetch = async () => Response.json({ error: {} }, { status: 500 });
  const failed = await acknowledge(post({ id: 12 }));
  assert.equal(failed.status, 502);
  assert.doesNotMatch((await failed.json()).message, /error/i);
  global.fetch = async () => { throw new TypeError('offline'); };
  assert.equal((await acknowledge(post({ id: 12 }))).status, 502);
});
