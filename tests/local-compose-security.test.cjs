'use strict';

const assert = require('node:assert/strict');
const { createHmac, timingSafeEqual } = require('node:crypto');
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
    const key = lab.services['core-api'].environment.JWT_SECRET;
    assert.ok(typeof key === 'string' && key.length > 0 && !key.includes('${')
      && key === lab.services['bff-user'].environment.JWT_SECRET,
    `${name} must retain a consistent lab-only signing fixture`);
    if (lab.services['k6-perf-test']) {
      assert.ok(key === lab.services['k6-perf-test'].environment.JWT_SECRET,
        'The performance driver must sign with its isolated stack fixture');
    }
    if (lab.services['security-scan']) {
      const command = lab.services['security-scan'].command.join(' ');
      const token = command.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
      assert.ok(token, 'The isolated ZAP driver must retain its authentication fixture');
      const [header, payload, signature] = token[0].split('.');
      const expected = createHmac('sha256', key).update(`${header}.${payload}`).digest();
      const actual = Buffer.from(signature, 'base64url');
      assert.ok(expected.length === actual.length && timingSafeEqual(expected, actual),
        'The ZAP fixture must remain signed by the isolated stack key');
    }
  }
});
