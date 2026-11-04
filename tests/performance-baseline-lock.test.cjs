const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { prepareBaseline } = require('../scripts/prepare-performance-baseline.cjs');

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
function fixture(run, extraRepairFile = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mairie-baseline-lock-'));
  const repository = path.join(root, 'repo');
  const baselineRoot = path.join(root, 'baseline');
  fs.mkdirSync(repository);
  const git = (...args) => execFileSync('git', ['-C', repository, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_CONFIG_COUNT: '2', GIT_CONFIG_KEY_0: 'user.name', GIT_CONFIG_VALUE_0: 'Performance test fixture',
      GIT_CONFIG_KEY_1: 'user.email', GIT_CONFIG_VALUE_1: 'performance-fixture@example.invalid' },
  }).trim();
  try {
    git('init', '--initial-branch=main');
    const manifest = { name: 'baseline-fixture', version: '1.0.0', dependencies: { sample: '1.0.0' } };
    fs.writeFileSync(path.join(repository, 'package.json'), JSON.stringify(manifest));
    const original = JSON.stringify({ lockfileVersion: 3, packages: { '': { dependencies: { sample: '0.9.0' } } } });
    fs.writeFileSync(path.join(repository, 'package-lock.json'), original);
    fs.writeFileSync(path.join(repository, 'app.js'), 'console.log("unchanged application");');
    git('add', '.'); git('commit', '-m', 'test: create baseline fixture');
    const baseRef = git('rev-parse', 'HEAD');
    const repaired = JSON.stringify({ lockfileVersion: 3, packages: { '': manifest, 'node_modules/sample': { version: '1.0.0' } } });
    fs.writeFileSync(path.join(repository, 'package-lock.json'), repaired);
    if (extraRepairFile) fs.writeFileSync(path.join(repository, 'app.js'), 'console.log("changed application");');
    git('add', '.'); git('commit', '-m', 'test: repair baseline fixture lock');
    const repairedLockCommit = git('rev-parse', 'HEAD');
    const repair = { sourceBaseSha: baseRef, repairedLockCommit,
      packageJsonBlob: git('rev-parse', `${baseRef}:package.json`), lockBlob: git('rev-parse', `${repairedLockCommit}:package-lock.json`),
      originalLockSha256: sha256(original), lockSha256: sha256(repaired) };
    git('worktree', 'add', '--detach', baselineRoot, baseRef);
    run({ repository, baselineRoot, baseRef, repair, original, repaired });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('copies only an immutable reviewed repair lock and records the reconstructed graph', () => fixture(input => {
  const application = fs.readFileSync(path.join(input.baselineRoot, 'app.js'), 'utf8');
  const report = prepareBaseline(input);
  assert.equal(report.lockOverlayApplied, true);
  assert.equal(report.mode, 'reviewed-lock-only-repair');
  assert.equal(report.sourceBaseSha, input.baseRef);
  assert.equal(report.repairedLockCommit, input.repair.repairedLockCommit);
  assert.equal(report.originalLockSha256, sha256(input.original));
  assert.equal(fs.readFileSync(path.join(input.baselineRoot, 'package-lock.json'), 'utf8'), input.repaired);
  assert.equal(fs.readFileSync(path.join(input.baselineRoot, 'app.js'), 'utf8'), application);
}));
test('a different base never reuses the reviewed overlay', () => fixture(input => {
  input.repair.sourceBaseSha = '0'.repeat(40);
  const report = prepareBaseline(input);
  assert.equal(report.lockOverlayApplied, false);
  assert.equal(report.mode, 'unchanged-base-lock');
  assert.equal(fs.readFileSync(path.join(input.baselineRoot, 'package-lock.json'), 'utf8'), input.original);
}));
for (const field of ['packageJsonBlob', 'lockBlob', 'originalLockSha256', 'lockSha256']) {
  test(`rejects a modified reviewed ${field} before changing the checkout`, () => fixture(input => {
    input.repair[field] = '0'.repeat(field.includes('Sha256') ? 64 : 40);
    assert.throws(() => prepareBaseline(input));
    assert.equal(fs.readFileSync(path.join(input.baselineRoot, 'package-lock.json'), 'utf8'), input.original);
  }));
}
test('rejects a repair with the wrong parent', () => fixture(input => {
  input.repair.repairedLockCommit = input.baseRef;
  assert.throws(() => prepareBaseline(input), /exact baseline as parent/);
}));
test('rejects any application source change in the proposed repair', () => fixture(input => {
  assert.throws(() => prepareBaseline(input), /change only the lock/);
  assert.equal(fs.readFileSync(path.join(input.baselineRoot, 'package-lock.json'), 'utf8'), input.original);
}, true));
test('rejects a dirty baseline before overlaying its lock', () => fixture(input => {
  fs.writeFileSync(path.join(input.baselineRoot, 'app.js'), 'unreviewed change');
  assert.throws(() => prepareBaseline(input), /source is dirty/);
}));
test('rejects symbolic refs and an unrelated checkout', () => fixture(input => {
  assert.throws(() => prepareBaseline({ ...input, baseRef: 'main' }), /exact commit/);
  assert.throws(() => prepareBaseline({ ...input, baseRef: input.repair.repairedLockCommit }), /Wrong baseline checkout/);
}));
