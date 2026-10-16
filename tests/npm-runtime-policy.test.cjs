const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { resolve } = require('node:path');
const { test } = require('node:test');

const root = resolve(__dirname, '..');
const npm = args => execFileSync('npm', args, { cwd: root, encoding: 'utf8' }).trim();

test('the actual npm runtime enforces the seven-day policy with only its configured UI exception', () => {
  const version = npm(['--version']);
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  assert.ok(match, 'npm must report a stable version');
  assert.ok(Number(match[1]) > 11 || (Number(match[1]) === 11 && Number(match[2]) >= 17),
    'npm >=11.17 is required for the named min-release-age exception');
  assert.equal(JSON.parse(npm(['config', 'get', 'min-release-age', '--json'])), 7);
  assert.equal(npm(['config', 'get', 'min-release-age-exclude']), '@mairie360/lib-components');
});
