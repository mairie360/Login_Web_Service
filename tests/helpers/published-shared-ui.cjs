const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

function assertPublishedSharedUi(root, provenance) {
  const readJson = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));
  const name = provenance.package;
  assert.equal(name, '@mairie360/lib-components');
  const manifest = readJson('package.json');
  const lock = readJson('package-lock.json');
  const pin = manifest.dependencies[name];
  assert.match(pin, /^\d+\.\d+\.\d+$/, 'the shared UI requires an exact stable pin');
  const release = provenance.releases[pin];
  assert.ok(release, 'record verified registry metadata and artifact hashes for the selected release');
  assert.equal(lock.packages[''].dependencies[name], pin);
  const entry = lock.packages[`node_modules/${name}`];
  assert.ok(entry, 'the locked shared UI package must exist');
  assert.equal(entry.version, pin);
  assert.equal(entry.resolved, release.tarball);
  assert.equal(entry.integrity, release.integrity);
  const tarball = new URL(release.tarball);
  assert.equal(tarball.origin, release.registry);
  assert.equal(tarball.protocol, 'https:');
  assert.match(release.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
  assert.match(release.gitHead, /^[a-f0-9]{40}$/);
  assert.ok(Number.isFinite(Date.parse(release.publishedAt)), 'the release must have a publication date');
  const packageDir = join('node_modules', name);
  const installed = readJson(join(packageDir, 'package.json'));
  assert.equal(installed.name, name);
  assert.equal(installed.version, pin);
  if (Object.hasOwn(release, 'packageGitHead')) {
    assert.equal(installed.gitHead ?? null, release.packageGitHead, 'the packed manifest must retain its actual source metadata');
    assert.match(release.packageJsonSha256, /^[a-f0-9]{64}$/);
    const manifestHash = createHash('sha256').update(readFileSync(join(root, packageDir, 'package.json'))).digest('hex');
    assert.equal(manifestHash, release.packageJsonSha256, 'the complete package manifest must match the registry tarball');
  } else {
    assert.equal(installed.gitHead, release.gitHead);
  }
  if (release.exports) {
    assert.deepEqual(installed.exports, release.exports, 'public modular exports must match the verified release');
    const targets = (value) => typeof value === 'string' ? [value] : Object.values(value).flatMap(targets);
    for (const target of targets(release.exports)) {
      if (!target.startsWith('./dist/') || target.includes('*')) continue;
      assert.ok(Object.hasOwn(release.sha256, target.slice(2)), `${target} must belong to the verified modular artifact`);
    }
  }
  assert.ok(Object.keys(release.sha256).length > 0, 'the published artifact files must be recorded');
  for (const [field, file] of Object.entries(release.entryPoints)) {
    assert.equal(installed[field], file);
    assert.ok(Object.hasOwn(release.sha256, file), `${field} must belong to the verified artifact`);
  }
  for (const [file, expected] of Object.entries(release.sha256)) {
    assert.match(file, /^dist\/[A-Za-z0-9._-]+$/, 'artifact paths stay within the published dist directory');
    assert.match(expected, /^[a-f0-9]{64}$/);
    const actual = createHash('sha256').update(readFileSync(join(root, packageDir, file))).digest('hex');
    assert.equal(actual, expected, `${file} must match the reviewed published artifact`);
  }
}

module.exports = { assertPublishedSharedUi };
