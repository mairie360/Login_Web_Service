const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync, symlinkSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');

const root = resolve(__dirname, '..');
const guard = import(pathToFileURL(join(root, 'vendor/verify-security-backports.mjs')));
const reviewed = {
  id: 1243066,
  url: 'https://github.com/advisories/GHSA-mrhx-c7xc-m3w5',
  title: 'Zod can exhaust memory while validating oversized constrained collections',
  severity: 'high',
  vulnerable_versions: '<4.6.6',
  cwe: ['CWE-770'],
  cvss: { score: 7.5, vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H' },
};

const response = payload => async () => ({ ok: true, json: async () => payload });

test('the reviewed local package and locked resolutions pass the integrity gate', async () => {
  const { verifySecurityBackports } = await guard;
  assert.deepEqual(verifySecurityBackports(root), ['zod']);
});

test('the advisory gate checks the original version and accepts only its reviewed metadata', async () => {
  const { auditSecurityBackports } = await guard;
  const request = async (url, options) => {
    assert.equal(url, 'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { zod: ['3.25.76'] });
    return { ok: true, json: async () => ({ zod: [reviewed] }) };
  };
  assert.deepEqual(await auditSecurityBackports(root, request), ['zod']);
  assert.deepEqual(await auditSecurityBackports(root, response({})), ['zod']);
});

test('revisions of the same GHSA require a new review', async () => {
  const { auditSecurityBackports } = await guard;
  for (const change of [
    { id: 1243067 }, { severity: 'critical' }, { vulnerable_versions: '*' },
    { title: 'A changed vulnerability' }, { cwe: ['CWE-22'] },
    { cvss: { score: 10, vectorString: null } }, { extra: 'unreviewed metadata' },
  ]) {
    await assert.rejects(auditSecurityBackports(root, response({ zod: [{ ...reviewed, ...change }] })), /advisory.*review/i);
  }
});

test('new advisories, malformed data and network failures block the gate', async () => {
  const { auditSecurityBackports } = await guard;
  for (const payload of [null, [], { zod: null }, { other: [] }, { zod: [null] },
    { zod: [{ ...reviewed, url: 'https://github.com/advisories/GHSA-unreviewed' }] },
  ]) await assert.rejects(auditSecurityBackports(root, response(payload)));
  await assert.rejects(auditSecurityBackports(root, async () => ({ ok: false, status: 503 })), /HTTP 503/);
  await assert.rejects(auditSecurityBackports(root, async () => { throw new Error('Unavailable'); }), /Unavailable/);
  await assert.rejects(auditSecurityBackports(root, async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } })), /Invalid JSON/);
});

test('modified source, file lists, metadata and registry fallbacks block the integrity gate', async () => {
  const { verifySecurityBackports } = await guard;
  const temp = mkdtempSync(join(tmpdir(), 'mairie360-zod-guard-'));
  const changeJson = (file, change) => {
    const target = join(temp, file), original = readFileSync(target, 'utf8');
    const value = JSON.parse(original); change(value); writeFileSync(target, JSON.stringify(value));
    assert.throws(() => verifySecurityBackports(temp));
    writeFileSync(target, original);
  };
  try {
    cpSync(join(root, 'vendor'), join(temp, 'vendor'), { recursive: true });
    for (const file of ['package.json', 'package-lock.json']) cpSync(join(root, file), join(temp, file));
    verifySecurityBackports(temp);
    const source = join(temp, 'vendor/zod/v3/types.cjs'), original = readFileSync(source);
    writeFileSync(source, 'changed'); assert.throws(() => verifySecurityBackports(temp), /reviewed backport changed/); writeFileSync(source, original);
    const extra = join(temp, 'vendor/zod/extra.js'); writeFileSync(extra, 'extra');
    assert.throws(() => verifySecurityBackports(temp), /reviewed file list changed/); rmSync(extra);
    changeJson('package-lock.json', lock => { lock.packages['node_modules/zod'] = { version: '3.25.76', resolved: 'https://registry.npmjs.org/zod/-/zod-3.25.76.tgz' }; });
    changeJson('package-lock.json', lock => { lock.packages['node_modules/other/node_modules/zod'] = { version: '3.25.76' }; });
    changeJson('package.json', pkg => { pkg.overrides.zod = '^3.25.76'; });
    changeJson('vendor/security-patches.json', manifest => { manifest.packages.zod.upstreamVersion = 'unreviewed'; });
    mkdirSync(join(temp, 'node_modules'));
    symlinkSync(root, join(temp, 'node_modules/zod'));
    assert.throws(() => verifySecurityBackports(temp, { installed: true }));
    verifySecurityBackports(temp);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('an installed peer consumer cannot bypass the root backport with a nested package', async () => {
  const { verifySecurityBackports } = await guard;
  const temp = mkdtempSync(join(tmpdir(), 'mairie360-zod-consumer-'));
  try {
    cpSync(join(root, 'vendor'), join(temp, 'vendor'), { recursive: true });
    const pkg = { name: 'peer-probe', devDependencies: { zod: 'file:vendor/zod' }, overrides: { zod: '$zod' } };
    writeFileSync(join(temp, 'package.json'), JSON.stringify(pkg));
    const original = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
    const packages = Object.fromEntries(['', 'node_modules/zod', 'vendor/zod'].map(key => [key, original.packages[key]]));
    packages['node_modules/peer-consumer'] = { version: '1.0.0', peerDependencies: { zod: '^3.23.0' } };
    packages['node_modules/omitted-dev-consumer'] = { version: '1.0.0', dev: true, dependencies: { zod: '^3.25.0' } };
    writeFileSync(join(temp, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages }));
    mkdirSync(join(temp, 'node_modules/peer-consumer/node_modules'), { recursive: true });
    writeFileSync(join(temp, 'node_modules/peer-consumer/package.json'), JSON.stringify({ name: 'peer-consumer' }));
    symlinkSync(join(temp, 'vendor/zod'), join(temp, 'node_modules/zod'));
    verifySecurityBackports(temp, { installed: true });
    rmSync(join(temp, 'node_modules/peer-consumer/package.json'));
    assert.throws(() => verifySecurityBackports(temp, { installed: true }), /ENOENT/);
    writeFileSync(join(temp, 'node_modules/peer-consumer/package.json'), JSON.stringify({ name: 'peer-consumer' }));
    cpSync(join(temp, 'vendor/zod'), join(temp, 'other-zod'), { recursive: true });
    symlinkSync(join(temp, 'other-zod'), join(temp, 'node_modules/peer-consumer/node_modules/zod'));
    assert.throws(() => verifySecurityBackports(temp, { installed: true }), /consumer bypasses/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('the actual postinstall lifecycle blocks an unreviewed advisory', () => {
  const temp = mkdtempSync(join(tmpdir(), 'mairie360-zod-lifecycle-'));
  try {
    cpSync(join(root, 'vendor'), join(temp, 'vendor'), { recursive: true });
    const originalPackage = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const pkg = { name: 'lifecycle-probe', private: true, scripts: { postinstall: originalPackage.scripts.postinstall },
      devDependencies: { zod: 'file:vendor/zod' }, overrides: { zod: '$zod' } };
    writeFileSync(join(temp, 'package.json'), JSON.stringify(pkg));
    const original = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
    const packages = Object.fromEntries(['', 'node_modules/zod', 'vendor/zod'].map(key => [key, original.packages[key]]));
    writeFileSync(join(temp, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages }));
    mkdirSync(join(temp, 'node_modules'));
    symlinkSync(join(temp, 'vendor/zod'), join(temp, 'node_modules/zod'));
    const stub = join(temp, 'advisory-service.mjs');
    const run = advisory => {
      writeFileSync(stub, `globalThis.fetch = async () => ({ ok: true, json: async () => (${JSON.stringify({ zod: [advisory] })}) });`);
      const command = process.env.npm_execpath ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
      const args = process.env.npm_execpath ? [process.env.npm_execpath, 'run', 'postinstall'] : ['run', 'postinstall'];
      const child = spawnSync(command, args, { cwd: temp, encoding: 'utf8', timeout: 10000,
        env: { ...process.env, NODE_OPTIONS: `--import=${pathToFileURL(stub).href}` } });
      assert.equal(child.error, undefined, child.error?.message);
      assert.equal(child.signal, null);
      return child;
    };
    const accepted = run(reviewed);
    assert.equal(accepted.status, 0, accepted.stderr);
    const blocked = run({ ...reviewed, vulnerable_versions: '*' });
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /advisory.*review/i);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
