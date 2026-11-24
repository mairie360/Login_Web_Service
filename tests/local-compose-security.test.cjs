'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const yaml = require('js-yaml');

const readCompose = name => yaml.load(readFileSync(join(__dirname, '..', name), 'utf8'));
const standard = readCompose('docker-compose.yml');

// Assert booleans rather than credential strings: a failing configuration test
// must not print signing material in its diagnostic output.
test('the development stack requires the same nonempty environment signing key for Core and BFF', () => {
  const environments = [standard.services.core.environment, standard.services['bff-user'].environment];
  assert.ok(environments.every(environment => typeof environment.JWT_SECRET === 'string'
    && /^\$\{JWT_SECRET:\?[^}]+\}$/.test(environment.JWT_SECRET)),
  'Core and BFF must require JWT_SECRET from the environment without a fallback');
});

test('the development stack keeps Core weak-signing-key validation enabled', () => {
  const override = standard.services.core.environment.JWT_ALLOW_WEAK_SECRET;
  assert.ok(override === undefined || String(override).toLowerCase() === 'false',
    'The standard development stack must not bypass Core signing-key validation');
});

test('all development host publications bind only to loopback', () => {
  for (const [name, service] of Object.entries(standard.services)) {
    for (const port of service.ports ?? []) {
      const loopback = typeof port === 'object'
        ? ['127.0.0.1', '::1'].includes(port.host_ip)
        : /^(?:127\.0\.0\.1|\[::1\]):/.test(String(port));
      assert.ok(loopback, `${name} publishes a port beyond loopback`);
    }
  }
});

test('the isolated laboratories retain coherent authentication fixtures without publishing host ports', () => {
  for (const name of ['docker-compose-security.yml', 'docker-compose-performance.yml']) {
    const lab = readCompose(name);
    assert.ok(Object.values(lab.services).every(service => (service.ports ?? []).length === 0),
      `${name} must keep the test services off published host ports`);
    // MAIR-680: no key or token is committed. Core gets the run's Ed25519 pair, BFF User the public key
    // alone, and the drivers the token stack_secrets.sh signs: every value is a required reference.
    const required = (value, name) => typeof value === 'string' && value.startsWith(`\${${name}:?`);
    const core = lab.services['core-api'].environment;
    assert.ok(required(core.JWT_PRIVATE_KEY, 'JWT_PRIVATE_KEY') && required(core.JWT_PUBLIC_KEY, 'JWT_PUBLIC_KEY')
      && core.JWT_PUBLIC_KEY === lab.services['bff-user'].environment.JWT_PUBLIC_KEY,
    `${name} must take the run's signing keys from stack_secrets.sh`);
    assert.ok(Object.values(lab.services).every(service => !('JWT_SECRET' in (service.environment ?? {}))
      && !('JWT_PRIVATE_KEY' in (service === lab.services['core-api'] ? {} : service.environment ?? {}))),
    `${name} must give no HS256 secret, and the private key to Core API only`);
    if (lab.services['k6-perf-test']) {
      assert.ok(required(lab.services['k6-perf-test'].environment.ACCESS_TOKEN, 'ACCESS_TOKEN'),
        'The performance driver must take the token signed for the run');
    }
    if (lab.services['security-scan']) {
      const command = lab.services['security-scan'].command.join(' ');
      assert.ok(command.includes('replacement=accessToken=${ACCESS_TOKEN:?'),
        'The isolated ZAP driver must take the token signed for the run');
      assert.ok(!/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(command),
        'The isolated ZAP driver must not carry a committed token');
    }
  }
});
