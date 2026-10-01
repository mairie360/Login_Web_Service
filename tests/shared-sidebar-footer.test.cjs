const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { AppShell, Footer } = require('@mairie360/lib-components');

test('the installed shared UI matches the exact published sidebar-footer release', () => {
  const root = join(__dirname, '..');
  const read = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
  const manifest = read('package.json');
  const lock = read('package-lock.json');
  const entry = lock.packages['node_modules/@mairie360/lib-components'];
  const installed = read('node_modules/@mairie360/lib-components/package.json');
  assert.equal(manifest.dependencies['@mairie360/lib-components'], '0.6.5');
  assert.equal(lock.packages[''].dependencies['@mairie360/lib-components'], '0.6.5');
  assert.equal(entry.version, '0.6.5');
  assert.equal(installed.version, '0.6.5');
  assert.equal(entry.resolved, 'https://npm.pkg.github.com/download/@mairie360/lib-components/0.6.5/aec5908d28ed00fe0be065ddcf6784e5909c648c');
  assert.equal(entry.integrity, 'sha512-7AFNzGUe2LTl4BYbIET5LTtrUA2JkwtDEmNx6fZDIBIILjbs8pW0PbtbjxpBM3NTNulTy/bC0k8wAfbgjygXcw==');
});

test('the published shell keeps copyright inside the sidebar without a fictitious version', () => {
  const html = renderToStaticMarkup(React.createElement(AppShell, {
    user: { name: '' },
    hrefs: { projects: 'https://projects.example/' },
    footerProps: { year: 2026 },
  }, React.createElement('p', null, 'Contenu du module')));
  assert.match(html, /<aside\b[^]*?<footer\b[^]*?<\/footer>[^]*?<\/aside>/);
  assert.match(html, /<footer\b[^>]*role="contentinfo"/);
  assert.match(html, /© 2026 Mairie360/);
  assert.doesNotMatch(html, /<\/main>\s*<footer\b/);
  assert.doesNotMatch(html, /Version|Utilisateur/);
  assert.match(html, /Contenu du module/);
});

test('standalone Footer retains horizontal compatibility', () => {
  const html = renderToStaticMarkup(React.createElement(Footer, { year: 2026 }));
  assert.match(html, /<footer\b/);
  assert.match(html, /border-t/);
});
