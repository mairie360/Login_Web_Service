const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// MAIR-608: the sign-in card is a component tree. It reaches its sub-components through their
// folders and keeps its session/sign-in flow in a hook beside it.
test('MAIR-608 the sign-in card composes its sub-components through their folders and uses the lib feedback', () => {
  const login = read('src/components/Login/Login.tsx');
  for (const part of ['CredentialsFields', 'PasswordChangeFields', 'LoginFeedback', 'LoginSubmit', 'SingleAccountLink']) {
    assert.ok(login.includes(`./components/${part}"`), `Login composes ${part}`);
    assert.ok(fs.existsSync(path.join(root, 'src/components/Login/components', part, 'index.ts')), `${part} has its folder and index`);
  }
  assert.doesNotMatch(login, /from ["']\.\/components\/[^"'/]+\/[^"']+["']/, 'Login imports nothing deeper than a sub-component folder');
  assert.ok(login.includes('./use-login-form"'), 'the sign-in flow lives in use-login-form.ts');
  assert.doesNotMatch(login, /fetch\(/, 'the card itself sends no request');
  const feedback = read('src/components/Login/components/LoginFeedback/LoginFeedback.tsx');
  assert.match(feedback, /import \{ ErrorAlert \} from "@mairie360\/lib-components\/primitives"/);
  assert.doesNotMatch(login + feedback, /<Toast\b/, 'a standalone lib Toast is not announced');
});

test('MAIR-608 every page component is a folder with its index and co-located test', () => {
  for (const name of ['Login', 'Logout', 'ForgotPassword', 'ResetPassword', 'RecoveryLayout']) {
    assert.ok(fs.existsSync(path.join(root, 'src/components', name, 'index.ts')), `${name}/index.ts`);
    assert.ok(fs.existsSync(path.join(root, 'src/components', name, `${name}.test.jsx`)), `${name}/${name}.test.jsx`);
  }
});
