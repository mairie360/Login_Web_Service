'use strict';

// MAIR-603: the end-to-end journeys the prod promotion runs (mairie360/CICD actions/e2e/fronts,
// MAIR-602) stay runnable: specs in e2e/, a Playwright pin equal to the browser image of the
// stack, a runner script that refuses to pass without journeys, and nothing of it in the image.

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const yaml = require('js-yaml');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));

test('e2e/ holds at least one journey, its own Playwright pin and the config the stack drives', () => {
  const specs = fs.readdirSync(path.join(root, 'e2e')).filter((name) => name.endsWith('.spec.ts'));
  assert.ok(specs.length > 0, 'at least one e2e/*.spec.ts');

  const manifest = readJson('e2e/package.json');
  const pinned = manifest.devDependencies['@playwright/test'];
  assert.match(pinned, /^\d+\.\d+\.\d+$/, 'exact @playwright/test version');
  assert.equal(manifest.scripts.test, 'playwright test');
  assert.ok(fs.existsSync(path.join(root, 'e2e/package-lock.json')), 'e2e/package-lock.json for npm ci in the runner');

  const config = read('e2e/playwright.config.ts');
  assert.match(config, /process\.env\.E2E_BASE_URL/);
  assert.match(config, /process\.env\.E2E_REPORT_DIR/);
  assert.match(config, /\['json', \{ outputFile: `\$\{reportDir\}\/results\.json` \}\]/, 'json report read by the promotion summary');
  assert.match(config, /trace: 'retain-on-failure'/);
  assert.match(config, /video: 'retain-on-failure'/);
});

test('docker-compose-e2e.yml runs the journeys with the browser image of the pinned Playwright', () => {
  const compose = yaml.load(read('docker-compose-e2e.yml'));
  const pinned = readJson('e2e/package.json').devDependencies['@playwright/test'];
  const runner = compose.services.playwright;
  assert.equal(runner.image, `mcr.microsoft.com/playwright:v${pinned}-noble`);
  // The browser reaches the front as localhost (a secure context) from the front's own network.
  assert.equal(runner.environment.E2E_BASE_URL, 'http://localhost:5000');
  assert.equal(runner.network_mode, 'service:login-front');
  assert.equal(runner.environment.E2E_REPORT_DIR, '/report');
  assert.deepEqual(runner.depends_on, { 'login-front': { condition: 'service_healthy' } });
  assert.ok(runner.volumes.includes('./e2e:/src/e2e:ro'), 'specs mounted read-only');
  assert.ok(runner.volumes.includes('./e2e-report:/report'), 'report kept on the host');
  assert.ok(!runner.build && !runner.secrets, 'the runner is a published image without secrets');
  // The front's public URL is the origin its guards accept on writes: the one the browser uses.
  assert.equal(compose.services['login-front'].environment.LOGIN_FRONT_URL, 'http://localhost:5000');
  assert.ok(compose.services['login-front'].ports.includes('${E2E_FRONT_PORT:-5000}:5000'));
});

test('the seeded users cover a returning agent and a first sign-in', () => {
  const seed = read('init-test.sql');
  assert.match(seed, /VALUES \(2, 'Perf', 'Tester'/);
  assert.match(seed, /VALUES \(3, 'Membre', 'Lecteur'/);
  assert.match(seed, /SELECT 3, r\.id FROM roles r WHERE lower\(r\.name\) = 'user'/);
});

test('e2e_test.sh refuses to run without journeys instead of passing silently', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'login-e2e-'));
  try {
    const result = spawnSync('bash', [path.join(root, 'e2e_test.sh')], { cwd: empty, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /No Playwright spec found in e2e\//);
  } finally {
    fs.rmSync(empty, { recursive: true, force: true });
  }
});

test('the journeys stay out of the production image and of the Next.js type check', () => {
  const patterns = read('.dockerignore').split(/\r?\n/).map((line) => line.trim());
  for (const item of ['e2e', 'e2e-report', 'docker-compose-e2e.yml', 'e2e_test.sh']) assert.ok(patterns.includes(item), item);
  const tsconfig = readJson('tsconfig.json');
  assert.ok(tsconfig.exclude.includes('e2e'));
  const scripts = readJson('package.json').scripts;
  assert.equal(scripts.e2e, 'npm --prefix e2e test');
  assert.match(scripts['e2e:install'], /npm --prefix e2e ci/);
});
