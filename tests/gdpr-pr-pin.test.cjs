const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');

const root = join(__dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const workflow = '.github/workflows/gdpr-pr.yml';

// MAIR-295: the GDPR PR checklist calls mairie360/CICD by release tag on two lines, the reusable
// workflow ref (bumped by Renovate's github-actions manager) and its cicd_version input, which
// checks out the CICD actions. The SHA-only manager of cicd.yml does not see it, so a second
// regex manager has to, or a bump moves the workflow and leaves the actions on the old tag.
test('the GDPR PR checklist pins one mairie360/CICD tag and Renovate bumps both of its refs (MAIR-295)', () => {
  const text = read(workflow);
  const uses = /^\s*uses:\s+mairie360\/CICD\/\.github\/workflows\/gdpr-pr-cicd\.yml@(v\d+\.\d+\.\d+)\s*$/m.exec(text);
  const input = /^\s*cicd_version:\s*["']?(v\d+\.\d+\.\d+)["']?\s*$/m.exec(text);
  assert.ok(uses, 'the reusable workflow is pinned to a release tag');
  assert.ok(input, 'cicd_version is a release tag');
  assert.equal(input[1], uses[1], 'both refs use the same tag');

  const managers = JSON.parse(read('renovate.json')).customManagers ?? [];
  const tracking = managers.filter((manager) =>
    (manager.managerFilePatterns ?? []).some((pattern) => new RegExp(pattern.slice(1, -1)).test(workflow)));
  const match = tracking
    .flatMap((manager) => manager.matchStrings)
    .map((source) => new RegExp(source).exec(input[0]))
    .find(Boolean);
  assert.ok(match, `Renovate must track ${input[0].trim()}`);
  assert.equal(match.groups.currentValue, uses[1]);
});

// An `edited` event starts a new run for the same head SHA with the new description: the runs of a
// pull request are queued, never run side by side nor cancelled, so the last finished one is the
// one of the last description.
test('the GDPR PR checklist runs of a pull request are queued in order (MAIR-295)', () => {
  const text = read(workflow);
  assert.match(text, /^concurrency:\n\s+group:\s*gdpr-pr-\$\{\{\s*github\.event\.pull_request\.number\s*\}\}\n\s+cancel-in-progress:\s*false\s*$/m);
});
