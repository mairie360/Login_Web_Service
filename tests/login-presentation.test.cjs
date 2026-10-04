const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const css = fs.readFileSync(path.join(__dirname, '../src/app/globals.css'), 'utf8');

test('Login preserves the reference 17px root scale without demo preferences', () => {
  const htmlRule = css.match(/(?:^|\n)html\s*\{([^}]+)\}/);
  assert.ok(htmlRule, 'Declare the root scale explicitly rather than using the browser default');
  assert.match(htmlRule[1], /\bfont-size\s*:\s*17px\s*;/);
  assert.doesNotMatch(css, /--demo-|demo\/preferences/);
});

test('the root scale does not replace the existing font family', () => {
  assert.match(css, /--font-sans\s*:\s*Arial, Helvetica, sans-serif\s*;/);
  assert.match(css, /font-family\s*:\s*Arial, Helvetica, sans-serif\s*;/);
});
