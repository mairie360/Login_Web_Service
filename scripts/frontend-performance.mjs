import { chromium } from 'playwright-core';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { cpus, platform, release } from 'node:os';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fixture, fixtureFile, startPerformancePreview } from './performance-server.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const source = path.resolve(option('--source', '.'));
const output = path.resolve(option('--output', 'performance/report.json'));
const repetitions = Number(option('--runs', '3'));
if (!Number.isSafeInteger(repetitions) || repetitions < 1 || repetitions > 10) throw new Error('Use one to ten repetitions.');
const hash = value => createHash('sha256').update(value).digest('hex');
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]);
const bundles = walk(path.join(source, '.next/static')).filter(file => file.endsWith('.js')).sort().map(file => {
  const bytes = readFileSync(file);
  return { file: path.relative(source, file), rawBytes: bytes.length, gzipBytes: gzipSync(bytes, { level: 9 }).length, sha256: hash(bytes) };
});
const compiledVitals = readFileSync(path.join(source, 'node_modules/next/dist/compiled/web-vitals/web-vitals.js'), 'utf8');
const nextVersion = JSON.parse(readFileSync(path.join(source, 'node_modules/next/package.json'))).version;
mkdirSync(path.dirname(output), { recursive: true });
const preview = await startPerformancePreview(source, { log: path.join(path.dirname(output), 'server.log') });
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const samples = [];
  for (let run = 0; run < repetitions; run++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const metrics = { LCP: null, INP: null, CLS: null };
    const layoutShifts = [];
    await page.exposeBinding("reportFrontShift", (_source, shift) => layoutShifts.push(shift));
    await page.addInitScript(() => new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.reportFrontShift({ value: entry.value, sources: (entry.sources ?? []).map(source => ({ node: source.node ? `${source.node.tagName}.${source.node.className}` : "unknown", previous: {x:source.previousRect.x,y:source.previousRect.y,width:source.previousRect.width,height:source.previousRect.height}, current:{x:source.currentRect.x,y:source.currentRect.y,width:source.currentRect.width,height:source.currentRect.height} })) }); }).observe({type:"layout-shift",buffered:true}));
    const errors = [], requestedJs = new Map(), pending = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.exposeBinding('reportFrontVital', (_source, metric) => {
      if (Object.hasOwn(metrics, metric.name) && Number.isFinite(metric.value) && metric.value >= 0) metrics[metric.name] = metric.value;
    });
    await page.addInitScript({ content: `(function(){ const module={exports:{}}; const __dirname=''; ${compiledVitals}\n for (const name of ['onLCP','onINP','onCLS']) module.exports[name](metric => window.reportFrontVital({name:metric.name,value:metric.value}), {reportAllChanges:true,durationThreshold:16}); })();` });
    await page.addInitScript(() => {
      const RealDate = Date;
      const fixed = new RealDate('2026-10-15T12:00:00Z').getTime();
      window.Date = class extends RealDate { constructor(...values) { super(...(values.length ? values : [fixed])); } static now() { return fixed; } };
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 200000, uploadThroughput: 93750 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    page.on('response', response => {
      if (/\/_next\/static\/.*\.js(?:\?|$)/.test(response.url())) pending.push(response.body().then(bytes => requestedJs.set(response.url(), { rawBytes: bytes.length, gzipBytes: gzipSync(bytes, { level: 9 }).length })).catch(error => errors.push(error.message)));
    });
    await page.goto(`${preview.origin}/qa/session`, { waitUntil: 'load' });
    if (fixture.readyText) await page.getByText(fixture.readyText, { exact: true }).first().waitFor({ timeout: 30000 });
    else await page.locator(fixture.readySelector).first().waitFor({ timeout: 30000 });
    const visibleErrors = [];
    for (const alert of await page.getByRole('alert').all()) if (await alert.isVisible()) { const text = (await alert.innerText()).trim(); if (text) visibleErrors.push(text); }
    if (visibleErrors.length) throw new Error(`The successful-load scenario contains an application error: ${visibleErrors.join('; ')}`);
    if (fixture.module === 'Login') await page.locator('input[type="email"]').pressSequentially('recette@example.invalid', { delay: 25 });
    else {
      await page.getByRole('button', { name: 'Ouvrir la navigation', exact: true }).click();
      await page.getByRole('dialog', { name: 'Navigation mobile' }).waitFor();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await page.getByRole('button', { name: 'Fermer la navigation', exact: true }).click();
      await page.getByRole('dialog', { name: 'Navigation mobile' }).waitFor({ state: 'hidden' });
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(path.dirname(output), `mobile-${run + 1}.png`) });
    await Promise.all(pending);
    await page.goto('about:blank');
    await new Promise(resolve => setTimeout(resolve, 200));
    if (errors.length) throw new Error(`Runtime errors: ${errors.join('; ')}`);
    if (Object.values(metrics).some(value => value === null)) throw new Error(`Missing observed Web Vital: ${JSON.stringify(metrics)}`);
    samples.push({ run: run + 1, ...metrics, layoutShifts, initialJsRawBytes: [...requestedJs.values()].reduce((sum, value) => sum + value.rawBytes, 0), initialJsGzipBytes: [...requestedJs.values()].reduce((sum, value) => sum + value.gzipBytes, 0) });
    await context.close();
  }
  const median = key => samples.map(sample => sample[key]).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
  let commit = option('--commit', null);
  if (!commit) { try { commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { commit = 'uncommitted'; } }
  const report = { module: fixture.module, commit, buildId: readFileSync(path.join(source, '.next/BUILD_ID'), 'utf8').trim(), createdAt: new Date().toISOString(), environment: { node: process.versions.node, next: nextVersion, browser: browser.version(), os: `${platform()} ${release()}`, cpu: cpus()[0]?.model, cpuCount: cpus().length, viewport: '390x844', cpuThrottle: 4, network: { latencyMs: 100, downloadBytesPerSecond: 200000, uploadBytesPerSecond: 93750 }, fixtureSha256: hash(readFileSync(fixtureFile)), collectorSha256: hash(compiledVitals) }, scenario: fixture.module === 'Login' ? 'Public login loaded, then type a fictitious email without submitting' : 'Fixture-backed initial page loaded, then open and close the mobile drawer', totalJsRawBytes: bundles.reduce((sum, item) => sum + item.rawBytes, 0), totalJsGzipBytes: bundles.reduce((sum, item) => sum + item.gzipBytes, 0), median: Object.fromEntries(['LCP', 'INP', 'CLS', 'initialJsRawBytes', 'initialJsGzipBytes'].map(key => [key, median(key)])), samples, bundles };
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(`${fixture.module}: performance report saved to ${output}`);
} finally { await browser?.close(); await preview.close(); }
