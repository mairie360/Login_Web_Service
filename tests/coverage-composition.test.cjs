const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const hash = bytes => require('node:crypto').createHash('sha256').update(bytes).digest('hex');
const { test } = require('node:test');
const { captureSources, composeCoverage } = require('../scripts/compose-source-coverage.cjs');
const { runComponentCoverage } = require('../scripts/test-components-coverage.cjs');

// Small LCOV fixtures model conflicting instrumenter inventories. Counts are inputs,
// never synthesized by the composer or used as application coverage evidence.
const record = (file, covered = 1, line = 1) => `SF:${file}\nFN:${line},fixture\nFNDA:${covered},fixture\nFNF:1\nFNH:${covered}\nDA:${line},${covered}\nLF:1\nLH:${covered}\nBRDA:${line},0,0,${covered}\nBRF:1\nBRH:${covered}\nend_of_record\n`;
async function fixture(t, { reactSources = [] } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'frontend-report-composition-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'src'), { recursive: true });
  await fs.mkdir(path.join(root, 'scripts'));
  await fs.mkdir(path.join(root, 'coverage/components'), { recursive: true });
  await fs.mkdir(path.join(root, 'coverage/source-mapped'));
  const declarations = { reactSources, serverTsxSources: [] };
  await fs.writeFile(path.join(root, 'scripts/coverage-scope.cjs'), `module.exports=${JSON.stringify(declarations)};`);
  await fs.writeFile(path.join(root, 'src/server.ts'), 'export const server = 1;\n');
  await fs.writeFile(path.join(root, 'src/view.tsx'), 'export function View() { return <main>Fixture</main>; }\n');
  for (const file of reactSources) await fs.writeFile(path.join(root, file), 'export function hook() { return true; }\n');
  const sources = await captureSources(root);
  const node = record('src/server.ts') + record('src/view.tsx', 0) + reactSources.map(file => record(file, 0)).join('');
  const components = record('src/view.tsx') + reactSources.map(file => record(file)).join('');
  await fs.writeFile(path.join(root, 'coverage/lcov.info'), node);
  await fs.writeFile(path.join(root, 'coverage/components/lcov.info'), components);
  await fs.writeFile(path.join(root, 'coverage/source-mapped/lcov.info'), node);
  await fs.writeFile(path.join(root, 'coverage/source-mapped/provenance.json'), JSON.stringify({ sources, environmentOwnership: declarations, failures: [], primaryLcov: { sha256: hash(node) }, captureRun: { result: { exitCode: 0, signal: null } } }));
  return { root, sources, node, components };
}

test('composition preserves each environment record and archives incompatible Node evidence unchanged', async t => {
  const value = await fixture(t);
  const result = await composeCoverage(value);
  const combined = await fs.readFile(path.join(value.root, 'coverage/lcov.info'), 'utf8');
  assert.equal(combined, record('src/server.ts') + record('src/view.tsx'));
  assert.equal(await fs.readFile(path.join(value.root, 'coverage/source-inputs/node.lcov.info'), 'utf8'), value.node);
  assert.equal(await fs.readFile(path.join(value.root, 'coverage/source-inputs/components.lcov.info'), 'utf8'), value.components);
  assert.equal(result.files['src/server.ts'].authority, 'node-c8');
  assert.equal(result.files['src/view.tsx'].authority, 'vitest-v8');
  assert.equal(result.total.lines.total, 2, 'the import-only record must not enlarge the React line inventory');
  assert.deepEqual(result.failures, []);
});

test('React hook ownership is explicit and accepts a measured TS source without comparing scores', async t => {
  const value = await fixture(t, { reactSources: ['src/hook.ts'] });
  await assert.rejects(composeCoverage(value), /outside its declared ownership/);
  await fs.writeFile(path.join(value.root, 'coverage/lcov.info'), value.node);
  const result = await composeCoverage({ ...value, componentSources: ['src/view.tsx', 'src/hook.ts'] });
  assert.equal(result.files['src/hook.ts'].authority, 'vitest-v8');
});

for (const scenario of ['source changed', 'missing source', 'missing React source', 'unknown component source', 'duplicate component source']) {
  test(`composition fails closed and retains inputs: ${scenario}`, async t => {
    const value = await fixture(t);
    if (scenario === 'source changed') await fs.appendFile(path.join(value.root, 'src/view.tsx'), '// changed during tests\n');
    if (scenario === 'missing source') {
      await fs.writeFile(path.join(value.root, 'src/unmeasured.ts'), 'export const missing = true;\n');
      value.sources = await captureSources(value.root);
    }
    if (scenario === 'missing React source') await fs.writeFile(path.join(value.root, 'coverage/components/lcov.info'), record('src/server.ts'));
    if (scenario === 'unknown component source') await fs.writeFile(path.join(value.root, 'coverage/components/lcov.info'), value.components + record('../outside.tsx'));
    if (scenario === 'duplicate component source') await fs.appendFile(path.join(value.root, 'coverage/components/lcov.info'), value.components);
    await assert.rejects(composeCoverage(value));
    await assert.rejects(fs.access(path.join(value.root, 'coverage/lcov.info')), { code: 'ENOENT' });
    assert.equal(await fs.readFile(path.join(value.root, 'coverage/source-inputs/node.lcov.info'), 'utf8'), value.node);
  });
}

test('an actual uncovered input remains uncovered and fails the unchanged gate', async t => {
  const value = await fixture(t);
  await fs.writeFile(path.join(value.root, 'coverage/components/lcov.info'), record('src/view.tsx', 0));
  const result = await composeCoverage(value);
  assert.equal(result.files['src/view.tsx'].lines.pct, 0);
  assert.ok(result.failures.some(item => item.file === 'src/view.tsx' && item.required === 60));
  assert.equal(result.total.lines.pct, 50);
  assert.ok(result.failures.some(item => item.file === 'all source'));
});

test('the component driver calls the real declared command, archives its inputs, and publishes only after success', async t => {
  const value = await fixture(t);
  let invoked;
  const result = await runComponentCoverage({ root: value.root, capture: async (command, args, root) => {
    invoked = { command, args, root };
    await fs.mkdir(path.join(root, 'coverage/components'));
    await fs.writeFile(path.join(root, 'coverage/components/lcov.info'), value.components);
    return { exitCode: 0, signal: null };
  } });
  assert.equal(result.exitCode, 0);
  assert.equal(result.published, true);
  assert.equal(invoked.command, process.platform === 'win32' ? 'npm.cmd' : 'npm');
  assert.deepEqual(invoked.args, ['run', 'test:components', '--', '--maxWorkers=1']);
  const manifest = JSON.parse(await fs.readFile(path.join(value.root, 'coverage/component-run/run.json')));
  assert.deepEqual(manifest.sources, value.sources);
  assert.equal(manifest.exitCode, 0);
});

for (const native of [{ exitCode: 1 }, { exitCode: null, signal: 'SIGTERM' }, { exitCode: null, error: 'spawn refused' }]) {
  test(`component failure cannot publish a primary report: ${JSON.stringify(native)}`, async t => {
    const value = await fixture(t);
    const result = await runComponentCoverage({ root: value.root, capture: async () => native });
    assert.equal(result.exitCode, 1);
    assert.equal(result.published, false);
    await assert.rejects(fs.access(path.join(value.root, 'coverage/lcov.info')), { code: 'ENOENT' });
  });
}

test('the driver refuses a stale Node source snapshot before starting the component runner', async t => {
  const value = await fixture(t);
  await fs.appendFile(path.join(value.root, 'src/server.ts'), '// changed since Node run\n');
  let calls = 0;
  const result = await runComponentCoverage({ root: value.root, capture: async () => { calls++; return { exitCode: 0 }; } });
  assert.equal(calls, 0);
  assert.equal(result.exitCode, 1);
  assert.match(result.error, /Source changed since Node/);
});

test('a declared server layout keeps its real Node record and remains present in the composed inventory', async t => {
  const value = await fixture(t);
  await fs.mkdir(path.join(value.root, 'src/app'));
  await fs.writeFile(path.join(value.root, 'src/app/layout.tsx'), 'export default function Layout() { return <html />; }\n');
  value.sources = await captureSources(value.root);
  await fs.writeFile(path.join(value.root, 'coverage/lcov.info'), value.node + record('src/app/layout.tsx', 0));
  const result = await composeCoverage({ ...value, componentSources: ['src/view.tsx'], lineThresholdExceptions: ['src/app/layout.tsx'] });
  assert.equal(result.files['src/app/layout.tsx'].authority, 'node-c8');
  assert.equal(result.files['src/app/layout.tsx'].lines.covered, 0);
  assert.equal(Object.keys(result.files).length, 3);
  assert.ok((await fs.readFile(path.join(value.root, 'coverage/lcov.info'), 'utf8')).includes(record('src/app/layout.tsx', 0)));
});

test('a source change during the component run prevents publication despite runner success', async t => {
  const value = await fixture(t);
  const result = await runComponentCoverage({ root: value.root, capture: async (_, __, root) => {
    await fs.mkdir(path.join(root, 'coverage/components'));
    await fs.writeFile(path.join(root, 'coverage/components/lcov.info'), value.components);
    await fs.appendFile(path.join(root, 'src/view.tsx'), '// changed while rendering\n');
    return { exitCode: 0 };
  } });
  assert.equal(result.exitCode, 1);
  assert.equal(result.published, false);
  assert.match(result.error, /Source inventory changed/);
  await assert.rejects(fs.access(path.join(value.root, 'coverage/lcov.info')), { code: 'ENOENT' });
});

test('source-map validation matches encoded cache URLs to Node script paths without losing genuinely missing maps', () => {
  const { fileURLToPath } = require('node:url');
  const { indexCapturedSourceMaps } = require('../scripts/source-coverage.cjs');
  const data = { version: 3, sources: ['route.ts'], sourcesContent: ['export const fixture = 1;'], mappings: 'AAAA' };
  const maps = indexCapturedSourceMaps({ 'source-map-cache': {
    'file:///tmp/src/app/%5B...path%5D/route.ts': { data },
    'file:///tmp/src/a%20b/%C3%A9.ts': { data },
    'file:///tmp/src/no-map.ts': {},
    'node:internal': { data },
  } });
  assert.equal(maps.get(fileURLToPath('file:///tmp/src/app/[...path]/route.ts')).data, data);
  assert.equal(maps.get(fileURLToPath('file:///tmp/src/a%20b/é.ts')).data, data);
  assert.equal(maps.get('/tmp/src/no-map.ts').data, undefined);
  assert.equal(maps.has('/tmp/src/absent.ts'), false);
  assert.equal(maps.size, 3);
});

for (const duringRun of [false, true]) test(`Node LCOV tampering fails closed with unchanged sources, duringRun=${duringRun}`, async t => {
  const value = await fixture(t);
  const tamper = () => fs.writeFile(path.join(value.root, 'coverage/source-mapped/lcov.info'), value.node.replace('DA:1,1', 'DA:1,0').replace('LH:1', 'LH:0'));
  if (!duringRun) await tamper();
  let calls = 0;
  const result = await runComponentCoverage({ root: value.root, capture: async (_, __, root) => {
    calls++;
    await fs.mkdir(path.join(root, 'coverage/components'), { recursive: true });
    await fs.writeFile(path.join(root, 'coverage/components/lcov.info'), value.components);
    if (duringRun) await tamper();
    return { exitCode: 0 };
  } });
  assert.equal(result.exitCode, 1);
  assert.equal(result.published, false);
  assert.match(result.error, /Node.*integrity/);
  assert.equal(calls, duringRun ? 1 : 0);
  await assert.rejects(fs.access(path.join(value.root, 'coverage/lcov.info')), { code: 'ENOENT' });
});

test('a failed native run cannot be turned into a component-only success', async t => {
  const value = await fixture(t);
  const filename = path.join(value.root, 'coverage/source-mapped/provenance.json');
  const node = JSON.parse(await fs.readFile(filename));
  node.captureRun.result.exitCode = 1;
  await fs.writeFile(filename, JSON.stringify(node));
  let calls = 0;
  const result = await runComponentCoverage({ root: value.root, capture: async (_, __, root) => {
    calls++;
    await fs.mkdir(path.join(root, 'coverage/components'), { recursive: true });
    await fs.writeFile(path.join(root, 'coverage/components/lcov.info'), value.components);
    return { exitCode: 0 };
  } });
  assert.equal(calls, 0);
  assert.equal(result.exitCode, 1);
  assert.equal(result.published, false);
});
