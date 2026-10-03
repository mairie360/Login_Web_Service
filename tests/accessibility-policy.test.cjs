const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const root = join(__dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

function pages(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) return pages(join(directory, entry.name), path);
    return entry.name === 'page.tsx' ? [path.replace(/\/page\.tsx$/, '') || '/'] : [];
  });
}

test('accessibility scope inventories every actual Login UI page, not HTTP handlers', () => {
  assert.deepEqual(pages(join(root, 'src/app')).sort(), ['/', '/logout']);
  const scope = read('docs/accessibility.md');
  assert.match(scope, /UI routes are `\/` and `\/logout`/);
  assert.match(scope, /HTTP handlers, not UI/);
  assert.match(scope, /Transient final status is not scan-certified/);
  assert.match(scope, /MAIR-316/);
});

test('browser checks keep all default axe violations and measurable real zoom/spacing', () => {
  const fixtures = read('tests/accessibility/fixtures.mjs');
  assert.match(fixtures, /new AxeBuilder\(\{ page \}\)\.analyze\(\)/);
  assert.match(fixtures, /expect\(scan\.violations,/);
  assert.doesNotMatch(fixtures, /\.disableRules\(|\.exclude\(|\.withTags\(|bypassCSP|ignoreHTTPSErrors|\.route\.fetch\(|route\.fetch\(/);
  assert.match(fixtures, /default_zoom_level: \{ x: Math\.log\(mode\.zoom\)/);
  assert.match(fixtures, /expect\(metrics\.dpr\)\.toBeCloseTo\(mode\.zoom/);
  assert.match(fixtures, /expect\(metrics\.width\)\.toBeCloseTo\(mode\.width \/ mode\.zoom/);
  assert.match(fixtures, /expect\(Number\(metrics\.cssZoom\)\)\.toBe\(1\)/);
  assert.match(fixtures, /line-height: 1\.5 !important/);
  assert.match(fixtures, /paragraph\.style\.setProperty\('margin-bottom', '2em', 'important'\)/);
  assert.match(fixtures, /await rm\(profile, \{ recursive: true, force: true \}\)/);
});

test('browser workflow runs a fresh real build/test with read-only immutable actions', () => {
  const workflow = read('.github/workflows/accessibility.yml');
  assert.match(workflow, /permissions:\s*\n  contents: read\s*\n  packages: read/);
  assert.match(workflow, /node-version: '24\.21\.0'/);
  assert.match(workflow, /run: npm ci/);
  assert.match(workflow, /run: npm run build/);
  assert.match(workflow, /run: npm run test:accessibility/);
  assert.match(workflow, /playwright install --with-deps chromium/);
  assert.doesNotMatch(workflow, /continue-on-error|LOGIN_A11Y_RUNTIME_DIR|secrets: inherit|id-token:|contents: write|packages: write|audit-level/);
  for (const [, action, ref] of workflow.matchAll(/uses: ([^\s@]+)@([^\s#]+)/g)) {
    assert.match(ref, /^[a-f0-9]{40}$/, `${action} must be immutable`);
  }
  const config = read('playwright.accessibility.config.mjs');
  assert.match(config, /workers: 1/);
  assert.match(config, /retries: 0/);
  assert.match(config, /forbidOnly: true/);
  assert.equal(JSON.parse(read('package.json')).scripts['test:accessibility'], 'playwright test --config=playwright.accessibility.config.mjs');
});
