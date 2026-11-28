const assert = require('node:assert/strict');
const { test } = require('node:test');
const { requireTs } = require('./support/load-ts.cjs');
const { installReactRuntime, mount, stubModule } = require('./support/server-view.cjs');

installReactRuntime();
const React = require('react');
// Next's image transform is build-owned; the actual sign-in form and feedback stay real.
stubModule('next/image', { __esModule: true, default: ({ src, alt }) => React.createElement('img', { src, alt }) });
const Login = requireTs('src/components/Login/Login.tsx').default;

test('dismissing a credential validation receipt preserves the form draft and sends no request', async t => {
  const previousWindow = global.window;
  const previousFetch = global.fetch;
  let requests = 0;
  global.window = { location: { assign() { assert.fail('A validation failure cannot navigate'); } } };
  global.fetch = async () => { requests += 1; assert.fail('An incomplete form cannot send credentials'); };
  const view = mount(React.createElement(Login));
  t.after(() => { view.unmount(); global.window = previousWindow; global.fetch = previousFetch; });

  await view.fire(props => props.id === 'email', 'onChange', { target: { value: 'draft@example.invalid' } });
  await view.fire((_props, _text, tag) => tag === 'form', 'onSubmit');
  // MAIR-1261 (F1 Cas 2): the missing password is said under its field, with no dismissible page alert.
  assert.deepEqual(view.hostElements(props => props.role === 'alert').map(node => node.text), ['Renseignez votre mot de passe.']);
  assert.equal(view.hostElements((props, _text, tag) => tag === 'button' && props['aria-label'] === 'Fermer le message').length, 0);

  // Typing in the field clears its message and keeps the draft.
  await view.fire(props => props.id === 'password', 'onChange', { target: { value: 'x' } });
  assert.equal(view.hostElements(props => props.role === 'alert').length, 0);
  assert.equal(view.hostElements(props => props.id === 'email')[0].props.value, 'draft@example.invalid');
  // Children handed through RecoveryLayout and Card are reported once per wrapping instance: read the rendered HTML.
  assert.equal(view.html.match(/<form\b/g).length, 1);
  assert.equal(requests, 0);
});
