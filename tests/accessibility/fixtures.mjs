import { test as base, expect, chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const destination = 'http://127.0.0.1:5118/dashboard';
export const credentials = { email: 'agent@example.invalid', password: 'isolated-test-password' };
export const updatedPassword = 'isolated-updated-password';
const expectedResourceErrors = new WeakMap();
export const modes = [
  { name: 'desktop', width: 1280, height: 720, zoom: 1 },
  { name: '320px', width: 320, height: 720, zoom: 1 },
  { name: '200-percent-browser-zoom', width: 1280, height: 720, zoom: 2 },
  { name: '320px-text-spacing', width: 320, height: 720, zoom: 1, spacing: true },
];

async function unusedPort() {
  const lease = createServer();
  lease.listen(0, '127.0.0.1');
  await once(lease, 'listening');
  const port = lease.address().port;
  await new Promise((resolveClose) => lease.close(resolveClose));
  return port;
}

export const test = base.extend({
  mode: [modes[0], { option: true }],
  configured: [true, { option: true }],
  frontend: async ({ configured }, use) => {
    const port = await unusedPort();
    const root = process.env.LOGIN_A11Y_RUNTIME_DIR ?? repository;
    const child = spawn(process.execPath, [join(root, 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: root,
      env: {
        PATH: process.env.PATH,
        NODE_ENV: 'production', NODE_OPTIONS: '--max-old-space-size=768',
        NEXT_TELEMETRY_DISABLED: '1',
        BFF_USER_API_URL: '', USER_BFF_URL: '',
        DASHBOARD_FRONT_URL: configured ? destination : '',
        LOGIN_FRONT_URL: '', PROJECT_FRONT_URL: '', CALENDAR_FRONT_URL: '',
        MESSAGE_FRONT_URL: '', ELEARNING_FRONT_URL: '', SETTINGS_FRONT_URL: '',
        ADMINISTRATION_FRONT_URL: '', EMAIL_FRONT_URL: '', FILES_FRONT_URL: '',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let log = '';
    child.stdout.on('data', (data) => { log = (log + data).slice(-8000); });
    child.stderr.on('data', (data) => { log = (log + data).slice(-8000); });
    const origin = `http://127.0.0.1:${port}`;
    try {
      await expect.poll(async () => {
        if (child.exitCode !== null) throw new Error(`Frontend exited: ${log}`);
        try { return (await fetch(origin, { signal: AbortSignal.timeout(1000) })).status; }
        catch { return 0; }
      }, { timeout: 30_000, message: 'Fresh loopback frontend must start' }).toBe(200);
      await use({ origin });
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit');
        child.kill('SIGTERM');
        const deadline = setTimeout(() => child.kill('SIGKILL'), 5000);
        try { await exited; } finally { clearTimeout(deadline); }
      }
    }
  },
  context: async ({ mode }, use) => {
    const profile = await mkdtemp(join(tmpdir(), 'login-a11y-profile-'));
    let context;
    try {
      await mkdir(join(profile, 'Default'));
      // Chromium's default storage partition has the empty relative path, key "x".
      // This is a new disposable test profile, never the user's browser profile.
      await writeFile(join(profile, 'Default', 'Preferences'), JSON.stringify({
        partition: { default_zoom_level: { x: Math.log(mode.zoom) / Math.log(1.2) } },
      }));
      context = await chromium.launchPersistentContext(profile, {
        channel: 'chromium', headless: true,
        viewport: { width: mode.width, height: mode.height },
        deviceScaleFactor: 1, serviceWorkers: 'block', locale: 'fr-FR',
      });
      await use(context);
    } finally {
      await context?.close();
      await rm(profile, { recursive: true, force: true });
    }
  },
  page: async ({ context, frontend, mode }, use, testInfo) => {
    const page = await context.newPage();
    const problems = [];
    const expectedErrors = new Map();
    const console = [];
    expectedResourceErrors.set(page, expectedErrors);
    page.on('pageerror', (error) => problems.push({ type: 'pageerror', message: error.message }));
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) {
        const entry = { type: message.type(), message: message.text(), url: message.location().url };
        console.push(entry);
        const patterns = expectedErrors.get(entry.url) ?? [];
        if (!patterns.some((pattern) => pattern.test(entry.message))) problems.push(entry);
      }
    });
    // No request can escape to an authentication or business service. Endpoint
    // responses must be explicitly installed by the test before interaction.
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin === frontend.origin && request.method() === 'GET' && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/auth/')) {
        return route.continue();
      }
      problems.push({ type: 'unexpected-network', method: request.method(), url: request.url() });
      return route.abort();
    });
    if (mode.spacing) {
      // Preserve the real nonce CSP. Override only text spacing in the test DOM,
      // including the product's margin utility, without modifying production CSS.
      await page.addInitScript(() => {
        document.addEventListener('DOMContentLoaded', () => {
          const style = document.createElement('style');
          style.nonce = document.querySelector('script[nonce]')?.nonce ?? '';
          style.textContent = '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } html body main p { margin-bottom: 2em !important; }';
          document.head.append(style);
          // Inline !important wins over Tailwind's layered important margin reset.
          // Observe new error/status paragraphs, not attributes (no observer loop).
          const applyParagraphSpacing = () => {
            for (const paragraph of document.querySelectorAll('main p')) {
              paragraph.style.setProperty('margin-bottom', '2em', 'important');
            }
          };
          new MutationObserver(applyParagraphSpacing).observe(document.body, { childList: true, subtree: true });
          applyParagraphSpacing();
        });
      });
    }
    try { await use(page); }
    finally {
      await testInfo.attach('console-and-network', { body: JSON.stringify({ console, unexpected: problems }, null, 2), contentType: 'application/json' });
      await page.close();
      expect(problems, 'No runtime warning/error or unmocked business request').toEqual([]);
    }
  },
});

export { expect };

export function deferred() {
  let release;
  const promise = new Promise((resolveGate) => { release = resolveGate; });
  return { promise, release };
}

export async function responses(page, origin, path, queue) {
  const calls = [];
  await page.route(`${origin}${path}`, async (route) => {
    const request = route.request();
    expect(request.method()).toBe('POST');
    calls.push(request.postDataJSON());
    const response = queue.shift();
    expect(response, `Unexpected additional ${path} call`).toBeTruthy();
    if (response.gate) await response.gate.promise;
    const expected = expectedResourceErrors.get(page);
    if (response.abort || response.status >= 400) {
      const errors = expected.get(request.url()) ?? [];
      errors.push(response.abort ? /^Failed to load resource: net::ERR_FAILED$/ : new RegExp(`^Failed to load resource: the server responded with a status of ${response.status} \\([^)]*\\)$`));
      expected.set(request.url(), errors);
    }
    if (response.abort) return route.abort('failed');
    await route.fulfill({ status: response.status ?? 200, json: response.json ?? { success: true } });
  });
  return calls;
}

export async function enterCredentials(page) {
  await page.getByLabel('Email professionnel', { exact: true }).fill(credentials.email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(credentials.password);
}

export async function inspect(page, mode, testInfo, state) {
  // A URL/heading after location.replace can precede its new stylesheet load.
  await page.waitForLoadState('load');
  await expect(page).toHaveTitle('Connexion | Mairie360');
  await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('header, aside, nav, footer, nextjs-portal')).toHaveCount(0);
  const metrics = await page.evaluate(() => ({
    width: innerWidth, documentWidth: document.documentElement.scrollWidth,
    dpr: devicePixelRatio, cssZoom: getComputedStyle(document.documentElement).zoom,
  }));
  // Detect ignored native zoom preferences; CSS zoom/DPI/pinch are not substitutes.
  expect(metrics.dpr).toBeCloseTo(mode.zoom, 1);
  expect(metrics.width).toBeCloseTo(mode.width / mode.zoom, 0);
  expect(Number(metrics.cssZoom)).toBe(1);
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.width);
  const boxes = await page.locator('input, button, h1, label, p, img').evaluateAll((elements) => elements.filter((element) => element.getClientRects().length).map((element) => {
    const rect = element.getBoundingClientRect();
    return { tag: element.tagName, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
  }));
  for (const box of boxes) {
    expect(box.left, `${box.tag} left edge`).toBeGreaterThanOrEqual(-1);
    expect(box.right, `${box.tag} right edge`).toBeLessThanOrEqual(metrics.width + 1);
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  }
  if (mode.spacing) {
    const spacing = await page.locator('h1').evaluate((element) => {
      const style = getComputedStyle(element);
      const font = parseFloat(style.fontSize);
      return [parseFloat(style.lineHeight) / font, parseFloat(style.letterSpacing) / font, parseFloat(style.wordSpacing) / font];
    });
    expect(spacing[0]).toBeCloseTo(1.5);
    expect(spacing[1]).toBeCloseTo(.12);
    expect(spacing[2]).toBeCloseTo(.16);
    for (const paragraph of await page.locator('main p').all()) {
      expect(await paragraph.evaluate((element) => parseFloat(getComputedStyle(element).marginBottom) / parseFloat(getComputedStyle(element).fontSize))).toBeCloseTo(2);
    }
  }
  await testInfo.attach(`${state}-layout`, { body: JSON.stringify({ metrics, boxes }, null, 2), contentType: 'application/json' });
  const scan = await new AxeBuilder({ page }).analyze();
  // All default rules/all impacts, including incomplete results in the attachment.
  await testInfo.attach(`${state}-axe`, { body: JSON.stringify(scan, null, 2), contentType: 'application/json' });
  expect(scan.violations, `${state}: full-page axe violations`).toEqual([]);
  const screenshotPath = testInfo.outputPath(`${state}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach(`${state}-screenshot`, { path: screenshotPath, contentType: 'image/png' });
}
