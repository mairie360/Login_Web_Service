const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { test } = require('node:test');
const { runCoverage } = require('../scripts/test-node-coverage.cjs');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
// Instrumenter outputs below are explicit driver fixtures, not application coverage.
const nativeLcov = 'TN:\nSF:src/example.ts\nDA:1,0\nLF:1\nLH:0\nend_of_record\n';
const sourceLcov = 'TN:\nSF:src/example.ts\nDA:1,1\nLF:1\nLH:1\nend_of_record\n';

async function fixture(t, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mairie-coverage-driver-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const observed = {};
  const runNative = async (command, args, cwd, rawDirectory, archiveDirectory) => {
    observed.args = args; observed.cwd = cwd;
    await fs.writeFile(path.join(archiveDirectory, 'stdout.log'), 'native output\n');
    await fs.writeFile(path.join(archiveDirectory, 'stderr.log'), 'native diagnostics\n');
    await fs.writeFile(path.join(rawDirectory, 'coverage-fixture.json'), '{"result":[]}');
    if (!options.missingNative) await fs.writeFile(path.join(root, 'coverage/lcov.info'), nativeLcov);
    return { exitCode: options.nativeExit ?? 0, signal: null };
  };
  const reporter = async args => {
    observed.archivedBeforeRemap = await fs.readFile(path.join(root, 'coverage/native/lcov.info'), 'utf8');
    if (options.reportError) throw new Error('Real remapping failed');
    await fs.mkdir(path.join(root, 'coverage/source-mapped'), { recursive: true });
    if (!options.missingSourceReport) await fs.writeFile(path.join(root, 'coverage/source-mapped/lcov.info'), sourceLcov);
    return { tool: 'c8', version: '12.0.0', inputs: [], sources: {}, sourceMaps: [], nativeReport: { path: args.nativeReport, sha256: hash(nativeLcov) }, failures: options.failures ?? [] };
  };
  return { root, runNative, reporter, observed };
}

test('archives native evidence before publishing corrected primary LCOV and records identical hashes', async t => {
  const f = await fixture(t); const result = await runCoverage(f);
  assert.equal(result.exitCode, 0); assert.equal(f.observed.archivedBeforeRemap, nativeLcov);
  assert.equal(await fs.readFile(path.join(f.root, 'coverage/native/lcov.info'), 'utf8'), nativeLcov);
  assert.equal(await fs.readFile(path.join(f.root, 'coverage/lcov.info'), 'utf8'), sourceLcov);
  const provenance = JSON.parse(await fs.readFile(path.join(f.root, 'coverage/source-mapped/provenance.json')));
  assert.equal(provenance.primaryLcov.sha256, hash(sourceLcov));
  assert.equal(provenance.nativeReport.sha256, hash(nativeLcov));
  assert.deepEqual(f.observed.args, ['run', 'test:node:native', '--']);
});

test('keeps a failing native test or native gate exit even if corrected source coverage passes', async t => {
  const f = await fixture(t, { nativeExit: 1 }); const result = await runCoverage(f);
  assert.equal(result.exitCode, 1);
  assert.equal(JSON.parse(await fs.readFile(path.join(f.root, 'coverage/native/run.json'))).exitCode, 1);
  assert.equal(await fs.readFile(path.join(f.root, 'coverage/lcov.info'), 'utf8'), sourceLcov);
});

test('publishes an accurate low-coverage source report while keeping the strict source gate failure', async t => {
  const f = await fixture(t, { failures: [{ metric: 'lines', actual: 42, required: 60 }] });
  const result = await runCoverage(f); assert.equal(result.exitCode, 1);
  assert.equal(await fs.readFile(path.join(f.root, 'coverage/lcov.info'), 'utf8'), sourceLcov);
});

for (const options of [{ reportError: true }, { missingSourceReport: true }, { failures: [{ metric: 'source map', actual: 'missing' }] }, { failures: [{ metric: 'source integrity', actual: 'mismatch' }] }, { failures: [{ metric: 'presence', actual: 'missing' }] }]) {
  test(`does not publish corrected primary LCOV for an untrustworthy report ${JSON.stringify(options)}`, async t => {
    const f = await fixture(t, options); const result = await runCoverage(f);
    assert.equal(result.exitCode, 1);
    await assert.rejects(fs.access(path.join(f.root, 'coverage/lcov.info')));
    assert.equal(await fs.readFile(path.join(f.root, 'coverage/native/lcov.info'), 'utf8'), nativeLcov);
  });
}

test('fails for a missing fresh native report without mistaking previous primary LCOV for native evidence', async t => {
  const f = await fixture(t, { missingNative: true });
  await fs.mkdir(path.join(f.root, 'coverage'), { recursive: true });
  await fs.writeFile(path.join(f.root, 'coverage/lcov.info'), 'previous primary');
  const result = await runCoverage(f); assert.equal(result.exitCode, 1);
  await assert.rejects(fs.access(path.join(f.root, 'coverage/lcov.info')));
  const history = await fs.readdir(path.join(f.root, 'coverage/history'));
  assert.equal(await fs.readFile(path.join(f.root, 'coverage/history', history[0], 'lcov.info'), 'utf8'), 'previous primary');
});
