const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

// MAIR-608: the sign-in card is composed of sub-components in src/components/login.
test('MAIR-608 the sign-in card is split into login sub-components and uses the lib feedback', () => {
  const login = fs.readFileSync(path.join(root, 'src/components/Login.tsx'), 'utf8');
  for (const part of ['CredentialsFields', 'PasswordChangeFields', 'LoginFeedback', 'LoginSubmit', 'SingleAccountLink']) {
    assert.ok(login.includes(`"./login/${part}"`), `Login composes ${part}`);
    assert.ok(fs.existsSync(path.join(root, 'src/components/login', `${part}.tsx`)), `${part}.tsx exists`);
  }
  const feedback = fs.readFileSync(path.join(root, 'src/components/login/LoginFeedback.tsx'), 'utf8');
  assert.match(feedback, /import \{ ErrorAlert \} from "@mairie360\/lib-components\/primitives"/);
  assert.doesNotMatch(login + feedback, /<Toast\b/, 'a standalone lib Toast is not announced');
});
