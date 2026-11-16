'use strict';
// MAIR-998: the compose stacks run the upstream images (database, APIs, BFFs) of the stage under
// test instead of pinned versions: `ghcr.io/mairie360/<name>:${UPSTREAM_TAG:-dev}`, which
// mairie360/CICD sets to `dev` (PRs, main), `staging` (promote-staging gates) or `latest`
// (promote-prod gates). Nothing has to be re-pinned when an upstream releases, and the contract
// package is only bumped when the code needs it. The front's own image is left out.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OWN_IMAGE = 'login-front';
const STAGE_TAG = '${UPSTREAM_TAG:-dev}';

const upstreamImages = (content) => content.split('\n')
  .filter((line) => !line.trimStart().startsWith('#'))
  .flatMap((line) => [...line.matchAll(/ghcr\.io\/mairie360\/([a-z0-9][a-z0-9._-]*)(?::(\$\{[^}]*\}|[^\s"'}@]+))?/g)])
  .map(([, name, tag]) => ({ name, tag: tag ?? '' }))
  .filter(({ name }) => name !== OWN_IMAGE);

test('MAIR-998 every compose file runs its upstreams on ${UPSTREAM_TAG:-dev}', () => {
  const files = fs.readdirSync(ROOT).filter((name) => /^docker-compose.*\.ya?ml$/.test(name));
  assert.ok(files.length > 0);
  for (const file of files) {
    const images = upstreamImages(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    assert.ok(images.length > 0, `${file} runs no upstream image`);
    assert.deepEqual(images.filter(({ tag }) => tag !== STAGE_TAG).map(({ name, tag }) => `${name}:${tag}`), [], file);
  }
});

test('MAIR-998 a pinned, untagged or nested image is seen, a comment or the own image is not', () => {
  const compose = [
    'image: ${DB_IMAGE:-ghcr.io/mairie360/database:${UPSTREAM_TAG:-dev}}',
    'image: ghcr.io/mairie360/core-api:2.3.0',
    'image: ghcr.io/mairie360/bff-user',
    '# image: ghcr.io/mairie360/calendar-api:1.0.0',
    `image: ghcr.io/mairie360/${OWN_IMAGE}:dev-abc1234`,
  ].join('\n');
  assert.deepEqual(upstreamImages(compose), [
    { name: 'database', tag: STAGE_TAG },
    { name: 'core-api', tag: '2.3.0' },
    { name: 'bff-user', tag: '' },
  ]);
});
