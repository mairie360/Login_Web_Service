const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { requireTs } = require('./support/load-ts.cjs');

const keys = ['DASHBOARD_FRONT_URL', 'PROJECT_FRONT_URL', 'CALENDAR_FRONT_URL'];
const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
const { resolveLoginRedirect } = requireTs('src/lib/login-redirect.ts');

before(() => {
  process.env.DASHBOARD_FRONT_URL = 'https://dashboard.mairie.test/';
  process.env.PROJECT_FRONT_URL = 'https://projects.mairie.test/';
  process.env.CALENDAR_FRONT_URL = 'https://calendar.mairie.test/';
});

after(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

test('a direct login and rejected return URLs use the configured Dashboard', () => {
  assert.equal(resolveLoginRedirect(undefined), 'https://dashboard.mairie.test/');
  assert.equal(resolveLoginRedirect('https://outside.mairie.test/'), 'https://dashboard.mairie.test/');
  assert.equal(resolveLoginRedirect('//outside.mairie.test/'), 'https://dashboard.mairie.test/');
});

test('an explicit allowed return URL takes precedence over Dashboard', () => {
  assert.equal(resolveLoginRedirect('https://calendar.mairie.test/events?date=2026-09-28'), 'https://calendar.mairie.test/events?date=2026-09-28');
  assert.equal(resolveLoginRedirect('https://projects.mairie.test/projects'), 'https://projects.mairie.test/projects');
});

test('missing Dashboard never silently falls back to Projects', () => {
  delete process.env.DASHBOARD_FRONT_URL;
  try {
    assert.equal(resolveLoginRedirect(undefined), undefined);
    assert.equal(resolveLoginRedirect('https://outside.mairie.test/'), undefined);
    assert.equal(resolveLoginRedirect('https://projects.mairie.test/projects'), 'https://projects.mairie.test/projects');
  } finally {
    process.env.DASHBOARD_FRONT_URL = 'https://dashboard.mairie.test/';
  }
});
