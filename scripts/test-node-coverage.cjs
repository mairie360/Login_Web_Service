const fs = require('node:fs/promises');
const { createWriteStream } = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { finished } = require('node:stream/promises');
const { sourceCoverage } = require('./source-coverage.cjs');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function runNative(command, args, root, rawDirectory, archiveDirectory) {
  const stdout = createWriteStream(path.join(archiveDirectory, 'stdout.log'));
  const stderr = createWriteStream(path.join(archiveDirectory, 'stderr.log'));
  const child = spawn(command, args, { cwd: root, env: { ...process.env, NODE_V8_COVERAGE: rawDirectory }, stdio: ['inherit', 'pipe', 'pipe'] });
  child.stdout.pipe(process.stdout, { end: false }); child.stdout.pipe(stdout);
  child.stderr.pipe(process.stderr, { end: false }); child.stderr.pipe(stderr);
  let error;
  child.on('error', failure => { error = failure.message; });
  const result = await new Promise(resolve => child.on('close', (exitCode, signal) => resolve({ exitCode, signal, error })));
  await Promise.all([finished(stdout), finished(stderr)]);
  return result;
}

async function archivePrevious(coverageDirectory) {
  const history = path.join(coverageDirectory, 'history', `${Date.now()}-${crypto.randomUUID()}`);
  for (const name of ['lcov.info', 'native', 'source-mapped', 'source-inputs', 'component-run', 'components', 'node-lcov.info', 'tmp']) {
    const source = path.join(coverageDirectory, name);
    try { await fs.access(source); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    await fs.mkdir(history, { recursive: true });
    await fs.rename(source, path.join(history, name));
  }
}

async function runCoverage({ root = process.cwd(), runNative: capture = runNative, reporter = sourceCoverage, args: extraArgs = [] } = {}) {
  root = path.resolve(root);
  const coverageDirectory = path.join(root, 'coverage');
  const archiveDirectory = path.join(coverageDirectory, 'native');
  const rawDirectory = path.join(archiveDirectory, 'raw');
  let native;
  try {
    await archivePrevious(coverageDirectory);
    await fs.mkdir(rawDirectory, { recursive: true });
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    // Concurrency belongs before the test paths in test:node:native's Node flags.
    const args = ['run', 'test:node:native', '--', ...extraArgs];
    const startedAt = new Date().toISOString();
    native = await capture(command, args, root, rawDirectory, archiveDirectory);
    await fs.writeFile(path.join(archiveDirectory, 'run.json'), JSON.stringify({ node: process.version, command, args, cwd: root, startedAt, finishedAt: new Date().toISOString(), ...native }, null, 2) + '\n');
    const primary = path.join(coverageDirectory, 'lcov.info');
    const nativeBytes = await fs.readFile(primary);
    await fs.writeFile(path.join(archiveDirectory, 'lcov.info'), nativeBytes);
    // A failed remap must leave CI's primary path absent, never the known-wrong native map.
    await fs.unlink(primary);
    const source = await reporter({ root, rawDirectory, nativeReport: 'coverage/native/lcov.info' });
    const failures = source.failures;
    if (!Array.isArray(failures)) throw new Error('Source report did not provide its gate results.');
    const integrityFailure = failures.some(failure => ['presence', 'source map', 'source integrity'].includes(failure.metric));
    if (integrityFailure) return { exitCode: 1, failures, native, published: false };
    const corrected = await fs.readFile(path.join(coverageDirectory, 'source-mapped/lcov.info'));
    if (!corrected.length) throw new Error('Corrected source LCOV is empty.');
    const archived = await fs.readFile(path.join(archiveDirectory, 'lcov.info'));
    if (hash(archived) !== hash(nativeBytes) || source.nativeReport?.sha256 !== hash(nativeBytes)) throw new Error('Native archive integrity changed during remapping.');
    source.primaryLcov = { path: 'coverage/lcov.info', sha256: hash(corrected), generatedBy: 'c8', identicalTo: 'coverage/source-mapped/lcov.info', nativeArchivedBeforePublication: true };
    await fs.writeFile(path.join(coverageDirectory, 'source-mapped/provenance.json'), JSON.stringify(source, null, 2) + '\n');
    await fs.writeFile(primary + '.pending', corrected);
    await fs.rename(primary + '.pending', primary);
    return { exitCode: native.error || native.signal || native.exitCode !== 0 || failures.length > 0 ? 1 : 0, failures, native, published: true };
  } catch (error) {
    return { exitCode: 1, error: error.message, native, published: false };
  }
}

module.exports = { runCoverage };
if (require.main === module) runCoverage({ args: process.argv.slice(2) }).then(result => {
  if (result.error) console.error(result.error);
  if (result.native?.error) console.error(result.native.error);
  for (const failure of result.failures ?? []) console.error(`${failure.file}: ${failure.metric} ${failure.actual}; required ${failure.required}`);
  process.exitCode = result.exitCode;
});
