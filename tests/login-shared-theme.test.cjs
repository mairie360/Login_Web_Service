const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const { JSDOM } = require('jsdom');
const postcss = require('postcss');
const { transform, Features } = require('lightningcss');
const { requireTs } = require('./support/load-ts.cjs');
const { installReactRuntime, mount, stubModule } = require('./support/server-view.cjs');

installReactRuntime();
const React = require('react');
stubModule('next/image', { __esModule: true, default: ({ src, alt }) => React.createElement('img', { src, alt }) });
const Login = requireTs('src/components/Login.tsx').default;
const root = resolve(__dirname, '..');

// MAIR-608: colours come from the charte tokens; each pair must stay readable (WCAG AA, 4.5:1).
const channels = value => value.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
const luminance = value => {
  const [r, g, b] = channels(value).map(channel => { const c = channel / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (foreground, background) => {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
};
const sameColour = (actual, expected) => assert.deepEqual(channels(actual), channels(expected));

for (const theme of ['light', 'dark']) {
  test(`the loaded shared stylesheet keeps the real ${theme} sign-in controls and error readable`, async t => {
    const view = mount(React.createElement(Login));
    t.after(() => view.unmount());
    await view.fire((_props, _text, tag) => tag === 'form', 'onSubmit');
    const dom = new JSDOM(`<html data-theme="${theme}"><head></head><body class="mairie-ui"><main>${view.html}</main></body></html>`);
    t.after(() => dom.window.close());
    const document = dom.window.document;
    const classes = [...document.querySelectorAll('[class]')].flatMap(node => [...node.classList]);
    const { compile } = require('tailwindcss');
    const compiled = (await compile(readFileSync(resolve(root, 'src/app/globals.css'), 'utf8'), {
      base: resolve(root, 'src/app'),
      loadStylesheet: async (id, base) => {
        const path = id === 'tailwindcss' ? require.resolve('tailwindcss/index.css') : id.startsWith('.') || id.startsWith('/') ? resolve(base, id) : require.resolve(id);
        return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
      },
    })).build(classes);
    // Browser layout is checked separately. Expand nesting/layers only for JSDOM's CSS model.
    const parsed = postcss.parse(transform({ filename: 'login-theme.css', code: Buffer.from(compiled), include: Features.Nesting }).code.toString());
    parsed.walkAtRules('layer', rule => rule.replaceWith(...(rule.nodes ?? [])));
    const style = document.createElement('style');
    style.textContent = parsed.toString();
    document.head.append(style);
    const computed = node => dom.window.getComputedStyle(node);
    const tokens = computed(document.documentElement);
    const token = (name, seen = new Set()) => {
      if (seen.has(name)) return '';
      return tokens.getPropertyValue(name).trim().replace(/var\((--[\w-]+)\)/g, (_match, dependency) => token(dependency, new Set([...seen, name])));
    };
    style.textContent = style.textContent.replace(/var\((--[\w-]+)\)/g, (match, name) => token(name) || match);
    // Lib components set their tone colours inline with tokens; JSDOM does not resolve var() there either.
    for (const node of document.querySelectorAll('[style*="var("]')) node.setAttribute('style', node.getAttribute('style').replace(/var\((--[\w-]+)\)/g, (match, name) => token(name) || match));
    const field = computed(document.getElementById('email'));
    const error = computed(document.querySelector('[role="alert"]'));
    const primary = computed(document.querySelector('button[type="submit"]'));
    const probe = document.createElement('span');
    document.body.append(probe);
    const resolved = name => { probe.style.color = token(name); return computed(probe).color; };
    sameColour(field.color, resolved('--mairie-text'));
    sameColour(primary.backgroundColor, resolved('--mairie-action-background'));
    sameColour(primary.color, resolved('--mairie-on-action'));
    for (const [label, foreground, background] of [['field', field.color, field.backgroundColor], ['error', error.color, error.backgroundColor], ['primary', primary.color, primary.backgroundColor]]) {
      assert.ok(contrast(foreground, background) >= 4.5, `${theme} ${label} contrast ${contrast(foreground, background).toFixed(2)} (${foreground} on ${background})`);
    }
    assert.equal(document.querySelectorAll('[role="alert"]').length, 1);
  });
}
