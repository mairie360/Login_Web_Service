const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const { requireTs } = require('./support/load-ts.cjs');
const reset = requireTs('src/app/reset-password/page.tsx');
const forgot = requireTs('src/app/forgot-password/page.tsx');
const saved = Object.fromEntries(['DASHBOARD_FRONT_URL', 'PROJECT_FRONT_URL'].map(key => [key, process.env[key]]));
afterEach(() => { for (const [key, value] of Object.entries(saved)) value === undefined ? delete process.env[key] : process.env[key] = value; });
for (const [name, page] of [['forgot', forgot], ['reset', reset]]) test(name + ' page validates return destinations before passing them to the browser', async () => {
  process.env.DASHBOARD_FRONT_URL = 'https://dashboard.example.test/';
  process.env.PROJECT_FRONT_URL = 'https://projects.example.test/';
  for (const [redirect, expected] of [
    ['https://projects.example.test/work', 'https://projects.example.test/work'],
    ['https://foreign.example.test/', 'https://dashboard.example.test/'],
    ['javascript:alert(1)', 'https://dashboard.example.test/'],
    [['https://projects.example.test/'], 'https://dashboard.example.test/'],
  ]) {
    const element = await page.default({ searchParams: Promise.resolve({ redirect }) });
    assert.equal(element.props.redirectUrl, expected);
  }
  assert.equal(page.metadata.referrer, 'no-referrer'); assert.deepEqual(page.metadata.robots, { index: false, follow: false });
});
test('reset page accepts one token query value and rejects duplicate token parameters', async () => {
  for (const [token, expected] of [['disposable-token', 'disposable-token'], [['first', 'second'], undefined], [undefined, undefined]]) {
    const element = await reset.default({ searchParams: Promise.resolve({ token }) });
    assert.equal(element.props.token, expected);
  }
});
