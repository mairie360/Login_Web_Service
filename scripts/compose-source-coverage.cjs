const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { fileURLToPath } = require('node:url');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

async function captureSources(root) {
  const sources = {};
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(filename);
      else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') && !/\.test\.(tsx?|jsx)$/.test(entry.name)) {
        sources[path.relative(root, filename).split(path.sep).join('/')] = hash(await fs.readFile(filename));
      }
    }
  }
  await visit(path.join(root, 'src'));
  return Object.fromEntries(Object.entries(sources).sort(([a], [b]) => a.localeCompare(b)));
}

function records(text, root, sources) {
  const result = new Map();
  for (const raw of text.split('end_of_record')) {
    if (!raw.trim()) continue;
    const fields = raw.trim().split(/\r?\n/);
    const source = fields.find(line => line.startsWith('SF:'))?.slice(3);
    if (!source) throw new Error('Coverage record has no source path.');
    const filename = source.startsWith('file:') ? fileURLToPath(source) : path.resolve(root, source);
    const relative = path.relative(root, filename).split(path.sep).join('/');
    if (!(relative in sources)) throw new Error(`Coverage contains an unknown source: ${relative}`);
    if (result.has(relative)) throw new Error(`Duplicate coverage source: ${relative}`);
    const summary = {};
    for (const [metric, found, hit] of [['lines', 'LF', 'LH'], ['branches', 'BRF', 'BRH'], ['functions', 'FNF', 'FNH']]) {
      const read = key => {
        const values = fields.filter(line => line.startsWith(`${key}:`));
        if (values.length !== 1 || !/^\d+$/.test(values[0].slice(key.length + 1))) throw new Error(`Invalid ${key} for ${relative}`);
        return Number(values[0].slice(key.length + 1));
      };
      const total = read(found), covered = read(hit);
      if (covered > total) throw new Error(`Invalid coverage count for ${relative}`);
      summary[metric] = { total, covered, pct: total ? covered * 100 / total : 100 };
    }
    result.set(relative, { text: fields.map(line => line.startsWith('SF:') ? `SF:${relative}` : line).join('\n') + '\nend_of_record\n', summary });
  }
  if (!result.size) throw new Error('Coverage report is empty.');
  return result;
}

async function composeCoverage({ root = process.cwd(), sources, nodeReport = 'coverage/lcov.info', componentReport = 'coverage/components/lcov.info', output = 'coverage/lcov.info', archiveDirectory = 'coverage/source-inputs', componentSources, expectedNodeSha256, lineThresholdExceptions = [] } = {}) {
  root = path.resolve(root);
  const destination = path.resolve(root, output);
  const nodePath = path.resolve(root, nodeReport), componentPath = path.resolve(root, componentReport);
  const archive = path.resolve(root, archiveDirectory);
  const [nodeBytes, componentBytes] = await Promise.all([fs.readFile(nodePath), fs.readFile(componentPath)]);
  await fs.mkdir(archive, { recursive: true });
  await fs.writeFile(path.join(archive, 'node.lcov.info'), nodeBytes);
  await fs.writeFile(path.join(archive, 'components.lcov.info'), componentBytes);
  // A rejected composition must never leave an import-only report at the upload path.
  await fs.rm(destination, { force: true });
  if (expectedNodeSha256 && hash(nodeBytes) !== expectedNodeSha256) throw new Error('Node LCOV integrity changed before composition.');
  const current = await captureSources(root);
  if (!sources || JSON.stringify(current) !== JSON.stringify(sources)) throw new Error('Source inventory changed while coverage was collected.');
  const node = records(nodeBytes.toString(), root, sources);
  const components = records(componentBytes.toString(), root, sources);
  const owned = new Set(componentSources ?? Object.keys(sources).filter(file => file.endsWith('.tsx')));
  if (!owned.size) throw new Error('No component source ownership was declared.');
  for (const file of owned) if (!(file in sources) || !components.has(file)) throw new Error(`Component source has no measured coverage: ${file}`);
  for (const file of components.keys()) if (!owned.has(file)) throw new Error(`Component report contains a source outside its declared ownership: ${file}`);
  if (lineThresholdExceptions.some(file => file !== 'src/app/layout.tsx')) throw new Error('Only the documented server layout line threshold exception is supported.');
  const selected = [], files = {}, failures = [];
  const total = Object.fromEntries(['lines', 'branches', 'functions'].map(metric => [metric, { total: 0, covered: 0 }]));
  for (const relative of Object.keys(sources)) {
    const component = owned.has(relative);
    const record = component ? components.get(relative) : node.get(relative);
    if (!record) throw new Error(`Source has no measured coverage: ${relative}`);
    selected.push(record.text);
    files[relative] = { authority: component ? 'vitest-v8' : 'node-c8', sourceSha256: sources[relative], ...record.summary };
    for (const metric of Object.keys(total)) {
      total[metric].total += record.summary[metric].total;
      total[metric].covered += record.summary[metric].covered;
    }
    if (!lineThresholdExceptions.includes(relative) && record.summary.lines.pct < 60) failures.push({ file: relative, metric: 'lines', actual: record.summary.lines.pct, required: 60 });
  }
  for (const [metric, value] of Object.entries(total)) {
    value.pct = value.total ? value.covered * 100 / value.total : 100;
    if (value.pct < 60) failures.push({ file: 'all source', metric, actual: value.pct, required: 60 });
  }
  const combined = Buffer.from(selected.join(''));
  const provenance = {
    node: process.version, sources, files, total, failures, componentSources: [...owned].sort(), lineThresholdExceptions,
    inputs: { node: { path: 'node.lcov.info', sha256: hash(nodeBytes) }, components: { path: 'components.lcov.info', sha256: hash(componentBytes) } },
    output: { path: output, sha256: hash(combined) },
    policy: 'Use the unchanged Vitest V8 record for each source owned by the declared React test environment; preserve the unchanged Node/c8 record for every other source. Never sum incompatible line inventories.',
  };
  await fs.writeFile(path.join(archive, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination + '.pending', combined);
  await fs.rename(destination + '.pending', destination);
  return provenance;
}

module.exports = { captureSources, composeCoverage };
