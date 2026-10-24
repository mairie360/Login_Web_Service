const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
test('Zod manifest scan exceptions identify only reviewed historical file digests', () => {
  const entries = readFileSync('.gitleaksignore', 'utf8').split('\n').filter(line => line.includes(':vendor/security-patches.json:'));
  const expected = new Set(['src/v4/core/api.ts', 'v4/core/api.cjs', 'v4/core/api.d.cts', 'v4/core/api.d.ts', 'v4/core/api.js']);
  assert.equal(entries.length, 5);
  for (const entry of entries) {
    const [revision, file, rule, line] = entry.split(':');
    assert.match(revision, /^[0-9a-f]{40}$/);
    assert.equal(file, 'vendor/security-patches.json');
    assert.equal(rule, 'generic-api-key');
    const source = readFileSync(file, 'utf8');
    const match = source.split('\n')[Number(line)-1].match(/^\s*"([^"]+)": "([0-9a-f]{64})",?$/);
    assert.ok(match, 'Exception must identify a SHA256 file-integrity entry');
    assert.ok(expected.delete(match[1]));
    assert.equal(JSON.parse(source).packages.zod.files[match[1]], match[2]);
    const bytes = readFileSync(`vendor/zod/${match[1]}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), match[2]);
  }
  assert.equal(expected.size, 0);
});
