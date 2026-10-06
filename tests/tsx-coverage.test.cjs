const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
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
  assert.ok(scripts['test:node'].includes('--test-reporter-destination=coverage/lcov.info'));
  assert.ok(scripts['test:node'].endsWith('tests/*.test.cjs'));
  assert.doesNotMatch(scripts['test:node'], /test-coverage-exclude|test-name-pattern|test-skip-pattern|test-only/);
});
