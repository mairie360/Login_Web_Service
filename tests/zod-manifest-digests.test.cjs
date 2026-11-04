const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { existsSync, readFileSync } = require('node:fs');
const { test } = require('node:test');

test('MAIR-743 / MAIR-770: Gitleaks skips only the reviewed Zod integrity manifest, by path', () => {
  const config = readFileSync('.gitleaks.toml', 'utf8');
  assert.match(config, /^\[extend\]\s*\nuseDefault = true$/m, 'the default rules must stay enabled');
  const paths = [...config.matchAll(/^paths = \[(.*)\]$/gm)].map(match => match[1]);
  assert.deepEqual(paths, ["'^vendor/security-patches\\.json$'"]);
  assert.doesNotMatch(config, /^(regexes|commits|stopwords) =/m, 'no other allowlist may hide findings');
  const ignored = (existsSync('.gitleaksignore') ? readFileSync('.gitleaksignore', 'utf8') : '').split('\n').filter(line => line.includes('vendor/security-patches.json'));
  assert.deepEqual(ignored, [], 'branch commit fingerprints do not survive a squash merge');
});

test('MAIR-770: the allowlisted manifest only holds SHA256 digests of the vendored files', () => {
  const source = readFileSync('vendor/security-patches.json', 'utf8');
  const manifest = JSON.parse(source);
  const files = manifest.packages.zod.files;
  for (const [file, digest] of Object.entries(files)) {
    assert.match(digest, /^[0-9a-f]{64}$/, file);
    assert.equal(createHash('sha256').update(readFileSync(`vendor/zod/${file}`)).digest('hex'), digest, file);
  }
  // The allowlist hides the whole file: it may only hold reviewed metadata next to the digests.
  assert.deepEqual(Object.keys(manifest).sort(), ['packages', 'version']);
  assert.deepEqual(Object.keys(manifest.packages), ['zod']);
  assert.deepEqual(Object.keys(manifest.packages.zod).sort(),
    ['advisory', 'files', 'upstreamIntegrity', 'upstreamVersion', 'v3Reference', 'v4Reference', 'version']);
  const zod = manifest.packages.zod;
  assert.equal(zod.advisory, 'GHSA-mrhx-c7xc-m3w5');
  assert.equal(zod.upstreamIntegrity, 'sha512-gzUt/qt81nXsFGKIFcC3YnfEAx5NkunCfnDlvuBSSFS02bcXu4Lmea0AFIUwbLWxWPx3d9p8S5QoaujKcNQxcQ==');
  for (const key of ['v3Reference', 'v4Reference']) assert.match(zod[key], /^https:\/\/github\.com\/[\w.-]+\/zod\/commit\/[0-9a-f]{8,40}$/, key);
});
