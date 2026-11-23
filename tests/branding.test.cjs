const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { loadRootLayout } = require('./support/root-layout.cjs');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => readFileSync(path.join(root, relativePath));

test('browser and app icons use the same Mairie360 mark', () => {
  const logo = read('public/mairie360-logo.png');
  const appleIcon = read('src/app/apple-icon.png');
  const faviconPng = read('public/mairie360-favicon.png');
  const appIcon = read('src/app/icon.png');
  const faviconIco = read('src/app/favicon.ico');

  assert.deepEqual(logo, appleIcon);
  assert.deepEqual(faviconPng, appIcon);
  assert.deepEqual(faviconIco.subarray(22), faviconPng);
  assert.equal(logo.readUInt32BE(16), 192);
  assert.equal(logo.readUInt32BE(20), 192);
  assert.equal(existsSync(path.join(root, 'src/app/icon0.svg')), false);
  assert.equal(existsSync(path.join(root, 'src/app/icon1.png')), false);
});

test('page metadata expose the branded browser icon', async () => {
  const { metadata, default: RootLayout } = loadRootLayout(() => require('./support/load-ts.cjs').requireTs('src/app/layout.tsx'));
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');

  assert.equal(metadata.title, "Connexion | Mairie360");
  const icon = metadata.icons.icon.find(item => new URL(item.url, 'https://frontend.test').pathname === '/mairie360-favicon.png');
  assert.ok(icon, 'metadata contains the public browser icon');
  assert.ok(new URL(icon.url, 'https://frontend.test').searchParams.get('v'), 'the icon keeps its cache key');
  const appleIcon = metadata.icons.apple.find(item => new URL(item.url, 'https://frontend.test').pathname === '/mairie360-logo.png');
  assert.ok(appleIcon, 'metadata contains the public app icon');
  assert.ok(new URL(appleIcon.url, 'https://frontend.test').searchParams.get('v'), 'the app icon keeps its cache key');
  assert.equal((await RootLayout({ children: null })).props.lang, 'fr');
  const html = renderToStaticMarkup(await RootLayout({children:React.createElement('span', { id: 'branding-child' }, 'Preserved child')}));
  assert.match(html, /<span id="branding-child">Preserved child<\/span>/);
});

// MAIR-1102: the ribbons of the public pages behind the card, the commune of the instance in the card.
test('MAIR-1102 the layout draws the lib PublicBackdrop behind the page and names the commune of LEGAL_CONFIG', async () => {
  const saved = process.env.LEGAL_CONFIG;
  try {
    const { default: RootLayout } = loadRootLayout(() => require('./support/load-ts.cjs').requireTs('src/app/layout.tsx'));
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { requireTs } = require('./support/load-ts.cjs');
    const RecoveryLayout = requireTs('src/components/RecoveryLayout/RecoveryLayout.tsx').default;

    process.env.LEGAL_CONFIG = JSON.stringify({ mairie: { name: 'Saint-André' } });
    const html = renderToStaticMarkup(await RootLayout({ children: React.createElement(RecoveryLayout, null, 'Carte') }));
    const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)[1];
    assert.match(body, /^<svg[^>]*data-m360-component="PublicBackdrop"/, 'the backdrop is the first element of the page');
    assert.match(body, /^<svg[^>]*aria-hidden="true"[^>]*class="[^"]*pointer-events-none fixed/);
    assert.equal((body.match(/data-ribbon=/g) ?? []).length, 4, 'the four ribbons of lib-components 2.3');
    assert.match(body, /<main id="login-content"[^>]*class="[^"]*relative z-\[1\]/, 'the content sits above the ribbons');
    assert.match(body, /<footer[^>]*class="[^"]*relative z-\[1\]/, 'the Footer sits above the ribbons');
    assert.match(body, /Mairie de Saint-André<span class="sr-only">, <\/span><span aria-hidden="true"> · <\/span>espace agents et élus/);
    assert.doesNotMatch(html, /dark:|prefers-color-scheme/, 'light mode only (MAIR-933)');
    assert.match(html, /<html[^>]*data-theme="light"/);

    delete process.env.LEGAL_CONFIG;
    const unnamed = renderToStaticMarkup(await RootLayout({ children: React.createElement(RecoveryLayout, null, 'Carte') }));
    assert.match(unnamed, />Espace agents et élus</);
    assert.doesNotMatch(unnamed, /Mairie de /);
  } finally {
    if (saved === undefined) delete process.env.LEGAL_CONFIG; else process.env.LEGAL_CONFIG = saved;
  }
});

test('MAIR-1102 no dark mode is left in the front (charte: light mode only)', () => {
  const { readdirSync } = require('node:fs');
  const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
  const found = files(path.join(root, 'src')).filter((file) => /\.(tsx?|jsx?|css)$/.test(file) && !/\.test\./.test(file))
    .filter((file) => /dark:|prefers-color-scheme|data-theme="dark"/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(found, []);
});
