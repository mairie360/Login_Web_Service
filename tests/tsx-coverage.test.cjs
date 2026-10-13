const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { requireTs } = require('./support/load-ts.cjs');

test('the actual TSX loader emits source mappings to the unchanged original component', () => {
  const filename = path.resolve(__dirname, '../src/components/Login.tsx');
  const originalCompile = Module.prototype._compile;
  let compiled;
  Module.prototype._compile = function (source, file) {
    if (file === filename) compiled = source;
    return originalCompile.call(this, source, file);
  };
  try {
    assert.equal(typeof requireTs('src/components/Login.tsx').default, 'function');
    const match = compiled.match(/sourceMappingURL=data:application\/json;base64,([^\s]+)/);
    assert.ok(match, 'coverage must map the emitted JavaScript back to TSX');
    const map = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
    assert.equal(map.version, 3);
    assert.deepEqual(map.sources, ['Login.tsx']);
    assert.deepEqual(map.sourcesContent, [fs.readFileSync(filename, 'utf8')]);
    assert.ok(map.mappings.length > 0);
    assert.match(compiled, /react\/jsx-runtime/);
  } finally {
    Module.prototype._compile = originalCompile;
  }
});

test('the Node coverage command uses source maps and one worker without relaxing the gates', () => {
  const { scripts } = require('../package.json');
  assert.match(scripts['test:node'], /node --enable-source-maps --test --test-concurrency=1 /);
  for (const metric of ['branches', 'functions', 'lines']) {
    assert.ok(scripts['test:node'].includes(`--test-coverage-${metric}=60`));
  }
  assert.ok(scripts['test:node'].includes("--test-coverage-include='src/**'"));
  assert.ok(scripts['test:node'].includes('--test-reporter-destination=coverage/node-lcov.info'));
  assert.ok(scripts['test:node'].includes('c8 --include=\'src/**\' --reporter=text --reporter=lcov --check-coverage'));
  for (const metric of ['branches', 'functions', 'lines']) {
    assert.ok(scripts['test:node'].includes(`--${metric}=60`));
  }
  assert.ok(scripts['test:node'].endsWith('tests/*.test.cjs'));
  assert.doesNotMatch(scripts['test:node'], /test-coverage-exclude|test-name-pattern|test-skip-pattern|test-only/);
});

test('JSX coverage maps executed module setup to source and still reports an uncalled function', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'login-jsx-coverage-'));
  const fixture = path.join(temp, 'fixture.tsx');
  const loader = path.resolve(__dirname, 'support/load-ts.cjs');
  try {
    fs.symlinkSync(path.resolve(__dirname, '../node_modules'), path.join(temp, 'node_modules'), 'dir');
    fs.writeFileSync(path.join(temp, 'theme.css'), '');
    fs.writeFileSync(fixture, [
      'import "./theme.css";',
      'export const font = { variable: "fixture-font" };',
      'export function render(primary: boolean) {',
      '  if (primary) return <main className={font.variable}>Hello</main>;',
      '  return <aside>Fallback</aside>;',
      '}',
      'export function unused() { return <footer>Unused</footer>; }',
    ].join('\n'));
    fs.writeFileSync(path.join(temp, 'runner.cjs'), [
      'require.extensions[".css"] = () => {};',
      `const { requireTs } = require(${JSON.stringify(loader)});`,
      `const fixture = requireTs(${JSON.stringify(fixture)});`,
      'const assert = require("node:assert/strict");',
      'const { renderToStaticMarkup } = require("react-dom/server");',
      'assert.equal(renderToStaticMarkup(fixture.render(true)), \'<main class="fixture-font">Hello</main>\');',
    ].join('\n'));
    const result = spawnSync(process.execPath, [
      path.resolve(__dirname, '../node_modules/c8/bin/c8.js'),
      '--include=**/fixture.tsx', '--reporter=json', '--reports-dir=reports',
      process.execPath, 'runner.cjs',
    ], { cwd: temp, encoding: 'utf8', env: { ...process.env, NODE_V8_COVERAGE: '' } });
    assert.equal(result.status, 0, result.stderr);
    const coverage = JSON.parse(fs.readFileSync(path.join(temp, 'reports/coverage-final.json'), 'utf8'))[fixture];
    assert.ok(coverage, 'the original TSX file must remain in the report');
    const setup = Object.entries(coverage.statementMap).find(([, span]) => span.start.line === 2);
    assert.ok(setup && coverage.s[setup[0]] > 0, 'executed module initialization must be attributed to its source line');
    const unused = Object.entries(coverage.fnMap).find(([, fn]) => fn.name === 'unused');
    assert.ok(unused && coverage.f[unused[0]] === 0, 'an uncalled function must not be turned into covered code');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
