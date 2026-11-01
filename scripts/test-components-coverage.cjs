const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createWriteStream } = require('node:fs');
const { finished } = require('node:stream/promises');
const hash = bytes => require('node:crypto').createHash('sha256').update(bytes).digest('hex');
const { captureSources, composeCoverage } = require('./compose-source-coverage.cjs');

async function runComponents(command, args, root, archive) {
  const stdout = createWriteStream(path.join(archive, 'stdout.log'));
  const stderr = createWriteStream(path.join(archive, 'stderr.log'));
  const child = spawn(command, args, { cwd: root, env: process.env, stdio: ['inherit', 'pipe', 'pipe'] });
  child.stdout.pipe(process.stdout, { end: false }); child.stdout.pipe(stdout);
  child.stderr.pipe(process.stderr, { end: false }); child.stderr.pipe(stderr);
  let error;
  child.on('error', failure => { error = failure.message; });
  const result = await new Promise(resolve => child.on('close', (exitCode, signal) => resolve({ exitCode, signal, error })));
  await Promise.all([finished(stdout), finished(stderr)]);
  return result;
}

async function runComponentCoverage({ root = process.cwd(), capture = runComponents } = {}) {
  root = path.resolve(root);
  const archive = path.join(root, 'coverage/component-run');
  let component;
  try {
    await fs.mkdir(archive, { recursive: true });
    const sources = await captureSources(root);
    const scope = require(path.join(root, 'scripts/coverage-scope.cjs'));
    const componentSources = Object.keys(sources).filter(file => file.endsWith('.tsx') && !scope.serverTsxSources.includes(file) || scope.reactSources.includes(file));
    const node = JSON.parse(await fs.readFile(path.join(root, 'coverage/source-mapped/provenance.json')));
    if (JSON.stringify(node.environmentOwnership) !== JSON.stringify(scope)) throw new Error('Test environment ownership changed since Node coverage was collected.');
    const native = node.captureRun?.result;
    if (!native || native.exitCode !== 0 || native.signal || native.error) throw new Error('Native coverage did not complete successfully.');
    const nodeReport = 'coverage/source-mapped/lcov.info';
    const expectedNodeSha256 = node.primaryLcov?.sha256;
    if (!expectedNodeSha256 || hash(await fs.readFile(path.join(root, nodeReport))) !== expectedNodeSha256) throw new Error('Node LCOV integrity differs from its provenance.');
    if (node.failures?.length) throw new Error('Node source coverage failed its validation.');
    if (Object.keys(node.sources).length !== Object.keys(sources).length || Object.entries(sources).some(([file, hash]) => node.sources[file] !== hash)) throw new Error('Source changed since Node coverage was collected.');
    // Preserve each previous component run so its input and diagnostics stay auditable.
    const previous = path.join(root, 'coverage/components');
    try {
      await fs.access(previous);
      await fs.mkdir(path.join(archive, 'history'), { recursive: true });
      await fs.rename(previous, path.join(archive, 'history', `${Date.now()}-${require('node:crypto').randomUUID()}`));
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const args = ['run', 'test:components', '--', '--maxWorkers=1'];
    const startedAt = new Date().toISOString();
    component = await capture(command, args, root, archive);
    await fs.writeFile(path.join(archive, 'run.json'), JSON.stringify({ node: process.version, command, args, cwd: root, startedAt, finishedAt: new Date().toISOString(), sources, ...component }, null, 2) + '\n');
    if (component.error || component.signal || component.exitCode !== 0) throw new Error('Component coverage did not complete successfully.');
    const report = await composeCoverage({ root, sources, componentSources, nodeReport, expectedNodeSha256, lineThresholdExceptions: scope.serverTsxSources });
    return { exitCode: report.failures.length ? 1 : 0, published: true, component, failures: report.failures };
  } catch (error) {
    await fs.rm(path.join(root, 'coverage/lcov.info'), { force: true });
    return { exitCode: 1, published: false, component, error: error.message };
  }
}
module.exports = { runComponentCoverage };
if (require.main === module) runComponentCoverage().then(result => {
  if (result.error) console.error(result.error);
  for (const failure of result.failures ?? []) console.error(`${failure.file}: ${failure.metric} ${failure.actual}; required ${failure.required}`);
  process.exitCode = result.exitCode;
});
