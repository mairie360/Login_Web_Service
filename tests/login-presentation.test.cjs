const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { JSDOM, VirtualConsole } = require('jsdom');
const { createRequire } = require('node:module');
const postcss = createRequire(require.resolve('next/package.json'))('postcss');

const css = fs.readFileSync(path.join(__dirname, '../src/app/globals.css'), 'utf8');

function loginDocument(t) {
  const errors = [];
  const console = new VirtualConsole();
  console.on('jsdomError', (error) => errors.push(error.message));
  const document = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'https://login.example/',
    virtualConsole: console,
  });
  t.after(() => document.window.close());
  const style = document.window.document.createElement('style');
  style.textContent = css;
  document.window.document.head.append(style);
  assert.deepEqual(errors, [], 'The document must accept the application stylesheet');
  postcss.parse(css).walkDecls((declaration) => {
    assert.equal(declaration.prop.startsWith('--demo-'), false, 'Do not add demo preference variables, including Tailwind theme declarations');
  });
  function checkRules(rules) {
    for (const rule of rules) {
      if (rule.href) {
        const segments = new URL(rule.href, document.window.location.href).pathname.split('/');
        assert.equal(segments.some((segment, index) => segment === 'demo' && segments[index + 1]?.startsWith('preferences')), false, 'Do not import demo preferences');
      }
      if (rule.cssRules) checkRules(rule.cssRules);
    }
  }
  checkRules(style.sheet.cssRules);
  return document.window;
}

test('Login applies the reference 17px root scale to its document', (t) => {
  const window = loginDocument(t);
  assert.equal(window.getComputedStyle(window.document.documentElement).fontSize, '17px');
});

test('the rendered document retains the existing body font family', (t) => {
  const window = loginDocument(t);
  assert.equal(window.getComputedStyle(window.document.body).fontFamily, 'Arial, Helvetica, sans-serif');
});
