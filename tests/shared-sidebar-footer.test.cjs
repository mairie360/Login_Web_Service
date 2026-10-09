const { assertPublishedSharedUi } = require('./helpers/published-shared-ui.cjs');
const sharedUiReleases = require('./fixtures/shared-ui-releases.json');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { AppShell, Footer } = require('@mairie360/lib-components');

test('the installed shared UI matches the reviewed published artifact', () => {
  assertPublishedSharedUi(join(__dirname, '..'), sharedUiReleases);
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

test('supplied product, year, real version and actionable links remain in sidebar information', () => {
  const html = renderToStaticMarkup(React.createElement(AppShell, {
    user: { name: '' },
    hrefs: { projects: 'https://projects.example/' },
    footerProps: {
      productName: 'Produit fourni',
      year: 2024,
      version: '0.6.11',
      links: [{ label: 'Documentation', href: 'https://docs.example/' }],
    },
  }, React.createElement('p', null, 'Contenu du module')));
  assert.match(html, /<aside\b[^]*?<footer\b[^]*?© 2024 Produit fourni[^]*?Version 0\.6\.11[^]*?<a\b[^>]*href="https:\/\/docs\.example\/"[^>]*>Documentation<\/a>[^]*?<\/footer>[^]*?<\/aside>/);
  assert.doesNotMatch(html, /<\/main>\s*<footer\b/);
  assert.doesNotMatch(html, /Utilisateur/);
});

test('an explicitly requested legacy content footer remains supported', () => {
  const html = renderToStaticMarkup(React.createElement(AppShell, {
    user: { name: '' },
    hrefs: { projects: 'https://projects.example/' },
    footerPlacement: 'content',
    footerProps: { year: 2026 },
  }, React.createElement('p', null, 'Contenu du module')));
  assert.match(html, /<\/main>\s*<footer\b/);
  assert.doesNotMatch(html, /<aside\b[^]*?<footer\b[^]*?<\/aside>/);
});
