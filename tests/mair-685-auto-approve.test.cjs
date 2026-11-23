const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

// The Renovate auto-approval is the reusable workflow of mairie360/CICD, which approves a Renovate
// pull request only while Renovate alone wrote and pushed its branch: this repository only calls
// it, with the same release on both pins and no permission beyond `pull-requests: write`.
const text = readFileSync(join(__dirname, '..', '.github/workflows/auto-approve.yml'), 'utf8');
const live = text.split('\n').map((line) => line.split(' #')[0].trimEnd());

test('MAIR-685 the auto-approval calls the reusable workflow of mairie360/CICD with the same cicd_version', () => {
  const uses = live.flatMap((line) => /^\s*uses:\s*(\S+)$/.exec(line)?.[1] ?? []);
  assert.equal(uses.length, 1, 'one call and no local step');
  const tag = /^mairie360\/CICD\/\.github\/workflows\/auto-approve\.yml@(v\d+\.\d+\.\d+)$/.exec(uses[0])?.[1];
  assert.ok(tag, uses[0]);
  assert.ok(live.map((line) => line.trim()).includes(`cicd_version: ${tag}`), `cicd_version is ${tag} too`);
  assert.ok(!live.some((line) => /^\s*steps:/.test(line)), 'no local step');
});

test('MAIR-685 the auto-approval only grants pull-requests: write', () => {
  assert.ok(live.includes('permissions: {}'));
  const scopes = live.map((line) => line.trim()).filter((line) => /^[a-z-]+: (read|write)$/.test(line));
  assert.deepEqual(scopes, ['pull-requests: write']);
});

test('MAIR-685 the auto-approval runs on every push to the branch', () => {
  assert.ok(live.map((line) => line.trim()).includes('types: [opened, reopened, synchronize]'));
});
