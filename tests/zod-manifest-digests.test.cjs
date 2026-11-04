const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { existsSync, readFileSync } = require('node:fs');
const { test } = require('node:test');

// The whole policy is pinned: any other key (disabledRules, an indented regex, another allowlist) changes what
// Gitleaks reports, so it must fail here and be reviewed.
const EXPECTED_POLICY = `title = "Mairie 360 front Gitleaks configuration"

[extend]
useDefault = true

# The SHA-256 digests of the Zod integrity manifest read as generic-api-key. Only that rule, in that file, for a bare
# 64-character hex digest is skipped: any other rule or value, in any revision of the file, is still reported.
[[allowlists]]
description = "Reviewed SHA-256 digests of the vendored Zod backport manifest (MAIR-743, MAIR-770)"
targetRules = ["generic-api-key"]
condition = "AND"
paths = ['''^vendor/security-patches\\.json$''']
regexTarget = "secret"
regexes = ['''^[0-9a-f]{64}$''']
`;

test('MAIR-743: Gitleaks skips only generic-api-key SHA-256 digests of the Zod integrity manifest', () => {
  assert.equal(readFileSync('.gitleaks.toml', 'utf8'), EXPECTED_POLICY);
  const ignored = (existsSync('.gitleaksignore') ? readFileSync('.gitleaksignore', 'utf8') : '')
    .split('\n').filter(line => line.includes('vendor/security-patches.json'));
  assert.deepEqual(ignored, [], 'branch commit fingerprints do not survive a squash merge');
});

test('MAIR-743 / MAIR-770: the manifest only holds SHA-256 digests of the vendored files', () => {
  const source = readFileSync('vendor/security-patches.json', 'utf8');
  const manifest = JSON.parse(source);
  // Canonical form: a duplicate property (JSON.parse keeps the last one) or any extra text changes the bytes.
  assert.equal(source, `${JSON.stringify(manifest, null, 2)}\n`, 'the manifest must be canonical JSON, without duplicate properties');
  assert.deepEqual(Object.keys(manifest).sort(), ['packages', 'version']);
  assert.deepEqual(Object.keys(manifest.packages), ['zod']);
  const zod = manifest.packages.zod;
  assert.deepEqual(Object.keys(zod).sort(),
    ['advisory', 'files', 'upstreamIntegrity', 'upstreamVersion', 'v3Reference', 'v4Reference', 'version']);
  for (const [file, digest] of Object.entries(zod.files)) {
    assert.match(digest, /^[0-9a-f]{64}$/, file);
    assert.equal(createHash('sha256').update(readFileSync(`vendor/zod/${file}`)).digest('hex'), digest, file);
  }
  assert.equal(zod.advisory, 'GHSA-mrhx-c7xc-m3w5');
  assert.equal(zod.upstreamIntegrity, 'sha512-gzUt/qt81nXsFGKIFcC3YnfEAx5NkunCfnDlvuBSSFS02bcXu4Lmea0AFIUwbLWxWPx3d9p8S5QoaujKcNQxcQ==');
  for (const key of ['v3Reference', 'v4Reference']) assert.match(zod[key], /^https:\/\/github\.com\/[\w.-]+\/zod\/commit\/[0-9a-f]{8,40}$/, key);
});
