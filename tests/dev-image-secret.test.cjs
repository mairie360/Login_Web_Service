// MAIR-436: the local development image and stack never write or expose the GitHub Packages
// token: same pinned Node LTS as the production image, required BuildKit secret, no build arg.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const yaml = require('js-yaml');

const read = (file) => readFileSync(join(__dirname, '..', file), 'utf8');
const digest = '0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6';

test('MAIR-436: development.Dockerfile uses the production Node LTS pinned by digest', () => {
  const dockerfile = read('development.Dockerfile');
  assert.equal(dockerfile.match(/^ARG NODE_VERSION=(.+)$/m)?.[1], read('Dockerfile').match(/^ARG NODE_VERSION=(.+)$/m)?.[1]);
  assert.match(dockerfile, /^ARG NODE_VERSION=24\.21\.0$/m);
  const bases = [...dockerfile.matchAll(/^FROM (\S+)/gm)].map(([, image]) => image);
  assert.deepEqual(bases, ['node:${NODE_VERSION}-bookworm-slim@sha256:' + digest]);
});

test('MAIR-436: development.Dockerfile installs with a required ephemeral secret, never a stored token', () => {
  const dockerfile = read('development.Dockerfile');
  assert.match(dockerfile, /^# syntax=docker\/dockerfile:1$/m);
  assert.doesNotMatch(dockerfile, /^(?:ARG|ENV)\s+NODE_AUTH_TOKEN\b/m);
  assert.doesNotMatch(dockerfile, /npm config set|_authToken|\/run\/secrets|\bnpm install\b/);
  assert.match(dockerfile, /RUN --mount=type=secret,id=node_auth_token,env=NODE_AUTH_TOKEN,required=true \\\n\s+--mount=type=bind,source=\.npmrc,target=\S+\/\.npmrc \\\n\s+npm ci\s*\n/);
  assert.equal([...dockerfile.matchAll(/\bnpm ci\b/g)].length, 1);
});

test('MAIR-436: docker-compose.yml passes the token to the front build as a secret only', () => {
  const compose = yaml.load(read('docker-compose.yml'));
  assert.deepEqual(compose.secrets, { node_auth_token: { environment: 'NODE_AUTH_TOKEN' } });
  const front = compose.services['login-front'];
  assert.equal(front.build.dockerfile, 'development.Dockerfile');
  assert.deepEqual(front.build.secrets, ['node_auth_token']);
  assert.ok(!('args' in front.build), 'a build arg would leave the token in the image history');
  assert.ok(!('secrets' in front), 'the running container never needs the token');
  assert.ok(!JSON.stringify(front.environment ?? {}).includes('NODE_AUTH_TOKEN'));
});
