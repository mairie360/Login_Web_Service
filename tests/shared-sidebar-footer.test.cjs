const { assertPublishedSharedUi } = require('./helpers/published-shared-ui.cjs');
const sharedUiReleases = require('./fixtures/shared-ui-releases.json');
const assert = require('node:assert/strict');
const { join } = require('node:path');
const { test } = require('node:test');
const React = require('react');
const { JSDOM } = require('jsdom');
const { renderToStaticMarkup } = require('react-dom/server');
const { AppShell, Footer } = require('@mairie360/lib-components');

test('the installed shared UI matches the reviewed published artifact', () => {
  assertPublishedSharedUi(join(__dirname, '..'), sharedUiReleases);
});

test('sidebar information keeps copyright without creating a nested contentinfo landmark or fictitious version', () => {
  const html = renderToStaticMarkup(React.createElement(AppShell, {
    user: { name: '' },
    hrefs: { projects: 'https://projects.example/' },
    footerProps: { year: 2026 },
  }, React.createElement('p', null, 'Contenu du module')));
  const dom = new JSDOM(html);
  try {
    const sidebar = dom.window.document.querySelector('aside');
    assert.match(sidebar.textContent, /© 2026 Mairie360/);
    assert.equal(sidebar.querySelectorAll('footer, [role="contentinfo"]').length, 0);
    assert.equal(dom.window.document.querySelectorAll('main').length, 1);
  } finally { dom.window.close(); }
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
  const dom = new JSDOM(html);
  try {
    const sidebar = dom.window.document.querySelector('aside');
    assert.match(sidebar.textContent, /© 2024 Produit fourni/);
    assert.match(sidebar.textContent, /Version 0\.6\.11/);
    assert.equal(sidebar.querySelector('a[href="https://docs.example/"]')?.textContent, 'Documentation');
    assert.equal(sidebar.querySelectorAll('footer, [role="contentinfo"]').length, 0);
  } finally { dom.window.close(); }
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
