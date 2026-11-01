// MAIR-436: the CI workflows run with a read-only token by default, grant write scopes to
// the release job only, and run on push for main only (pull_request covers PR branches).
// Identical copy in the eight fronts: keep them in sync.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const yaml = require('js-yaml');

const load = (file) => yaml.load(readFileSync(join(__dirname, '..', '.github/workflows', file), 'utf8'));

test('MAIR-436: cicd.yml runs on push for main only, plus every pull request', () => {
  const ci = load('cicd.yml');
  assert.deepEqual(ci.on, { push: { branches: ['main'] }, pull_request: null, workflow_dispatch: null });
});

test('MAIR-436: contracts.yml runs on push for main only, plus every pull request', () => {
  const contracts = load('contracts.yml');
  assert.deepEqual(contracts.on.push, { branches: ['main'] });
  assert.ok('pull_request' in contracts.on && contracts.on.pull_request === null,
    'contract checks must keep running on every pull request');
  assert.deepEqual(contracts.permissions, { contents: 'read', packages: 'read' });
});

test('MAIR-436: cicd.yml defaults to a read-only token', () => {
  assert.deepEqual(load('cicd.yml').permissions, { contents: 'read' });
});

test('MAIR-436: only the job calling the release pipeline receives write scopes', () => {
  const { jobs } = load('cicd.yml');
  const writers = Object.entries(jobs)
    .filter(([, job]) => Object.values(job.permissions ?? {}).includes('write'))
    .map(([name]) => name);
  assert.deepEqual(writers, ['CICD']);
  assert.match(jobs.CICD.uses, /^mairie360\/CICD\/\.github\/workflows\/frontend-cicd\.yml@[a-f0-9]{40}$/);
  assert.deepEqual(jobs.CICD.permissions, { contents: 'write', packages: 'write', 'id-token': 'write' });
  for (const [name, job] of Object.entries(jobs)) {
    if (name !== 'CICD') assert.ok(job.permissions, `${name} must declare its own read-only scopes`);
  }
});
