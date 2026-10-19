const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// MAIR-126: the shared front runtime is part of the published lib-components release. Identical file in every front.
const root = path.resolve(__dirname, '..');
const RUNTIME_ENTRIES = ['next', 'guard', 'browser', 'shared', 'react', 'theme'];

test('MAIR-126: the shared runtime comes from the pinned lib-components release, not a vendored front-kit', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  assert.equal({ ...manifest.dependencies, ...manifest.devDependencies }['@mairie360/front-kit'], undefined);
  assert.equal(lock.packages['node_modules/@mairie360/front-kit'], undefined);
  assert.deepEqual(fs.readdirSync(path.join(root, 'vendor')).filter(name => name.includes('front-kit')), []);
  const version = manifest.dependencies['@mairie360/lib-components'];
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(lock.packages['node_modules/@mairie360/lib-components'].version, version);
  const installed = JSON.parse(fs.readFileSync(path.join(root, 'node_modules/@mairie360/lib-components/package.json'), 'utf8'));
  assert.equal(installed.version, version, 'run npm ci: the installed lib-components is not the pinned release');
  for (const entry of RUNTIME_ENTRIES) assert.ok(installed.exports[`./${entry}`], `lib-components ${version} has no ./${entry} entry`);
});
