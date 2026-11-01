const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const root = join(__dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const files = [
  '.github/workflows/cicd.yml',
  '.github/workflows/dev-dependency-exception.yml',
  '.github/workflows/promote-staging.yml',
  '.github/workflows/promote-prod.yml',
];
// The SHA has to be the ref itself (right after `@` or the input's colon), not one quoted in the comment.
const pin = /^\s*(?:uses:\s+mairie360\/CICD\/\S+@|cicd_(?:version|ref):\s*"?)([a-f0-9]{40})"?\s+#\s+(v\d+\.\d+\.\d+)\s*$/;

// Renovate only bumps a SHA pin that carries its tag as a comment, and the regex manager has to
// see cicd_version / cicd_ref: otherwise a bump leaves the eight CICD references out of step.
test('every mairie360/CICD reference is one commit with its tag, tracked by Renovate', () => {
  const lines = files
    .flatMap((file) => read(file).split('\n'))
    .filter((line) => /^\s*uses:\s+mairie360\/CICD\/|^\s*cicd_(version|ref):/.test(line));
  assert.equal(lines.length, 8, 'four reusable workflow refs and their cicd_version / cicd_ref inputs');
  const pins = lines.map((line) => pin.exec(line));
  assert.ok(pins.every(Boolean), 'each reference must read `<sha> # vX.Y.Z`');
  assert.equal(new Set(pins.map(([, sha, tag]) => `${sha} ${tag}`)).size, 1, 'all references use the same commit and tag');

  const [manager] = JSON.parse(read('renovate.json')).customManagers;
  for (const file of files) {
    assert.ok(manager.managerFilePatterns.some((pattern) => new RegExp(pattern.slice(1, -1)).test(file)), file);
  }
  for (const line of lines.filter((candidate) => /cicd_(version|ref):/.test(candidate))) {
    const match = manager.matchStrings.map((source) => new RegExp(source).exec(line)).find(Boolean);
    assert.ok(match, `Renovate must track ${line.trim()}`);
    assert.deepEqual([match.groups.currentDigest, match.groups.currentValue], pins[0].slice(1, 3));
  }
});
