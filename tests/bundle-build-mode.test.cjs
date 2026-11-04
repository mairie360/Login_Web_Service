const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

test('browser source maps require the explicit measurement flag and the GitHub CI environment', () => {
  const file = path.join(__dirname, '../next.config.ts');
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  for (const [env, expected] of [
    [{}, false], [{ NODE_ENV: 'production' }, false], [{ GITHUB_ACTIONS: 'true' }, false],
    [{ MAIRIE360_BUNDLE_PROVENANCE: '1' }, false],
    [{ GITHUB_ACTIONS: 'true', MAIRIE360_BUNDLE_PROVENANCE: '0' }, false],
    [{ GITHUB_ACTIONS: 'true', MAIRIE360_BUNDLE_PROVENANCE: '1' }, true],
  ]) {
    const module = { exports: {} };
    vm.runInNewContext(compiled, { module, exports: module.exports, process: { env } }, { filename: file, timeout: 1000 });
    assert.equal(module.exports.default.productionBrowserSourceMaps === true, expected, JSON.stringify(env));
  }
});
