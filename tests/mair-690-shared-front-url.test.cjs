const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { parseFrontUrl } = require('@mairie360/lib-components/shared');

const root = join(__dirname, '..');

test('mair-690: Login keeps no local copy of parseFrontUrl and imports the shared one', () => {
  assert.equal(existsSync(join(root, 'src/lib/front-url.ts')), false);
  for (const file of ['src/lib/auth-request.ts', 'src/lib/login-redirect.ts']) {
    const source = readFileSync(join(root, file), 'utf8');
    assert.match(source, /import \{ parseFrontUrl \} from "@mairie360\/lib-components\/shared";/, file);
    assert.doesNotMatch(source, /\.\/front-url"/, file);
  }
});

test('mair-690: the shared parseFrontUrl accepts only explicit http(s) destinations without credentials', () => {
  assert.equal(parseFrontUrl(' https://projects.example.test/x ')?.href, 'https://projects.example.test/x');
  for (const value of [undefined, '', 'javascript:alert(1)', 'https://user:secret@example.test', 'not a url']) assert.equal(parseFrontUrl(value), undefined);
});
