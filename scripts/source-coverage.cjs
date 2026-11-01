const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { fileURLToPath } = require('node:url');

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function sourcesIn(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourcesIn(filename));
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') && !/\.test\.(tsx?|jsx)$/.test(entry.name)) files.push(filename);
  }
  return files.sort();
}

function indexCapturedSourceMaps(captured) {
  return new Map(Object.entries(captured['source-map-cache'] ?? {})
    .filter(([url]) => url.startsWith('file:'))
    .map(([url, entry]) => [fileURLToPath(url), entry]));
}

async function sourceCoverage({ root = process.cwd(), rawDirectory, reportDirectory, c8Factory, c8Version, nativeReport = 'coverage/lcov.info' } = {}) {
  root = path.resolve(root);
  if (root !== process.cwd()) throw new Error('Run coverage from the application root so c8 resolves the source scope consistently.');
  rawDirectory = path.resolve(root, rawDirectory ?? 'coverage/native-v8/raw');
  reportDirectory = path.resolve(root, reportDirectory ?? 'coverage/source-mapped');
  if (rawDirectory === reportDirectory) throw new Error('Raw coverage and source reports must use distinct directories.');
  const rawFiles = (await fs.readdir(rawDirectory)).filter(name => /^coverage-.*\.json$/.test(name)).sort();
  if (!rawFiles.length) throw new Error('No captured V8 coverage files were found.');
  const sourcePaths = await sourcesIn(path.join(root, 'src'));
  const sourceHashes = Object.fromEntries(await Promise.all(sourcePaths.map(async filename => [path.relative(root, filename).split(path.sep).join('/'), sha256(await fs.readFile(filename))])));
  const inputs = [];
  const sourceMaps = [];
  const mismatches = [];
  const missingMaps = [];
  for (const name of rawFiles) {
    const bytes = await fs.readFile(path.join(rawDirectory, name));
    const captured = JSON.parse(bytes);
    if (!Array.isArray(captured.result)) throw new Error(`Invalid V8 capture: ${name}`);
    inputs.push({ name, sha256: sha256(bytes) });
    const capturedMaps = indexCapturedSourceMaps(captured);
    for (const script of captured.result) {
      if (!script.url?.startsWith('file:')) continue;
      const relative = path.relative(root, fileURLToPath(script.url)).split(path.sep).join('/');
      if (relative in sourceHashes && !capturedMaps.get(fileURLToPath(script.url))?.data) missingMaps.push({ capture: name, source: relative });
    }
    for (const [url, entry] of Object.entries(captured['source-map-cache'] ?? {})) {
      if (!url.startsWith('file:')) continue;
      const filename = fileURLToPath(url);
      const relative = path.relative(root, filename).split(path.sep).join('/');
      if (!(relative in sourceHashes) || !entry.data) continue;
      sourceMaps.push({ capture: name, url: relative, sha256: sha256(JSON.stringify(entry.data)), lineLengthsSha256: sha256(JSON.stringify(entry.lineLengths)) });
      for (let index = 0; index < (entry.data.sources ?? []).length; index++) {
        const sourceUrl = new URL(entry.data.sources[index], url);
        if (sourceUrl.protocol !== 'file:') continue;
        const sourceRelative = path.relative(root, fileURLToPath(sourceUrl)).split(path.sep).join('/');
        const embedded = entry.data.sourcesContent?.[index];
        if (sourceRelative in sourceHashes && (typeof embedded !== 'string' || sha256(embedded) !== sourceHashes[sourceRelative])) mismatches.push({ capture: name, source: sourceRelative });
      }
    }
  }
  let captureRun;
  try {
    const filename = path.join(path.dirname(rawDirectory), 'run.json');
    const bytes = await fs.readFile(filename);
    captureRun = { path: filename, sha256: sha256(bytes), result: JSON.parse(bytes) };
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const reportFactory = c8Factory ?? require('c8').Report;
  const version = c8Version ?? require('c8/package.json').version;
  const report = reportFactory({
    include: ['src/**/*.{ts,tsx}'], exclude: [], extension: ['.ts', '.tsx'], all: true, src: [path.join(root, 'src')],
    reporter: ['text', 'lcov', 'json', 'json-summary'], reportsDirectory: reportDirectory,
    tempDirectory: rawDirectory, excludeAfterRemap: true, excludeNodeModules: true,
    allowExternal: false, skipFull: false, mergeAsync: true,
  });
  await report.run();
  const map = await report.getCoverageMapFromAllCoverageFiles();
  const scope = require('./coverage-scope.cjs');
  const typeScriptMap = new map.constructor();
  for (const filename of map.files()) {
    const relative = path.relative(root, filename).split(path.sep).join('/');
    if (filename.endsWith('.ts') && !scope.reactSources.includes(relative)) typeScriptMap.addFileCoverage(map.fileCoverageFor(filename));
  }
  const total = typeScriptMap.getCoverageSummary().toJSON();
  const files = {};
  for (const filename of map.files()) files[path.relative(root, filename).split(path.sep).join('/')] = map.fileCoverageFor(filename).toSummary().toJSON();
  const failures = [];
  for (const metric of ['lines', 'branches', 'functions']) if (total[metric].pct < 60) failures.push({ file: 'all TypeScript source', metric, actual: total[metric].pct, required: 60 });
  for (const filename of sourcePaths) {
    const relative = path.relative(root, filename).split(path.sep).join('/');
    if (!files[relative]) failures.push({ file: relative, metric: 'presence', actual: 'missing', required: 'reported' });
    else if (relative.endsWith('.ts') && !scope.reactSources.includes(relative) && files[relative].lines.pct < 60) failures.push({ file: relative, metric: 'lines', actual: files[relative].lines.pct, required: 60 });
  }
  for (const missing of missingMaps) failures.push({ file: missing.source, metric: 'source map', actual: 'missing from capture', required: 'captured inline source map' });
  for (const mismatch of mismatches) failures.push({ file: mismatch.source, metric: 'source integrity', actual: 'capture differs from current source', required: 'identical source' });
  const provenance = { node: process.version, tool: 'c8', version, root, rawDirectory, reportDirectory, scope: 'all src/**/*.{ts,tsx} runtime modules are preserved; TypeScript helpers retain their separate 60% gate, and measured TSX records are composed with the independent Vitest V8 report', nativeReport: { path: nativeReport, sha256: sha256(await fs.readFile(path.resolve(root, nativeReport))) }, captureRun, environmentOwnership: scope, inputs, sources: sourceHashes, sourceMaps, total, files, failures };
  await fs.writeFile(path.join(reportDirectory, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  return provenance;
}

module.exports = { sourceCoverage, indexCapturedSourceMaps };
if (require.main === module) {
  sourceCoverage({ rawDirectory: process.argv[2], reportDirectory: process.argv[3] }).then(result => {
    for (const failure of result.failures) console.error(`${failure.file}: ${failure.metric} ${failure.actual}; required ${failure.required}`);
    if (result.failures.length) process.exitCode = 1;
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
