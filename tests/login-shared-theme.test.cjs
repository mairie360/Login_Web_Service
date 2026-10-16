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

for (const [theme, fieldBackground, fieldText, errorBackground, errorText] of [
  ['light', 'rgb(255, 255, 255)', 'rgb(22, 32, 51)', 'rgb(255, 240, 241)', 'rgb(164, 14, 38)'],
  ['dark', 'rgb(16, 30, 49)', 'rgb(241, 245, 249)', 'rgb(72, 35, 43)', 'rgb(255, 193, 200)'],
]) {
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
    const field = computed(document.getElementById('email'));
    const error = computed(document.querySelector('[role="alert"]'));
    const primary = computed(document.querySelector('button[type="submit"]'));
    assert.equal(field.backgroundColor, fieldBackground);
    assert.equal(field.color, fieldText);
    assert.equal(error.backgroundColor, errorBackground);
    assert.equal(error.color, errorText);
    assert.equal(primary.backgroundColor, 'rgb(18, 86, 166)');
    assert.equal(primary.color, 'rgb(255, 255, 255)');
    assert.equal(document.querySelectorAll('[role="alert"]').length, 1);
  });
}
