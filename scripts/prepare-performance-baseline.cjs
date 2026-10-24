#!/usr/bin/env node
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const commitPattern = /^[a-f0-9]{40}$/;
function git(repository, args, binary = false) {
  return execFileSync('git', ['-C', repository, ...args], {
    encoding: binary ? undefined : 'utf8', maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
function prepareBaseline({ repository, baselineRoot, baseRef, repair }) {
  assert.match(baseRef, commitPattern, 'Baseline must be an exact commit');
  assert.equal(git(baselineRoot, ['rev-parse', 'HEAD']).trim(), baseRef, 'Wrong baseline checkout');
  assert.equal(git(baselineRoot, ['status', '--porcelain', '--untracked-files=no']).trim(), '', 'Baseline tracked source is dirty');
  const original = git(repository, ['show', `${baseRef}:package-lock.json`], true);
  const lockPath = path.join(baselineRoot, 'package-lock.json');
  assert.ok(fs.lstatSync(lockPath).isFile(), 'Baseline lock must be a regular file');
  assert.equal(sha256(fs.readFileSync(lockPath)), sha256(original), 'Baseline lock differs from source');
  const packageJsonBlob = git(repository, ['rev-parse', `${baseRef}:package.json`]).trim();
  const provenance = {
    sourceBaseSha: baseRef, packageJsonBlob,
    originalLockSha256: sha256(original), lockSha256: sha256(original),
    lockOverlayApplied: false, mode: 'unchanged-base-lock',
  };
  // Every other base uses its own untouched lock and the normal blocking npm ci.
  if (baseRef !== repair.sourceBaseSha) return provenance;
  assert.match(repair.repairedLockCommit, commitPattern, 'Repair must be an exact commit');
  assert.deepEqual(git(repository, ['rev-list', '--parents', '-n', '1', repair.repairedLockCommit]).trim().split(/\s+/),
    [repair.repairedLockCommit, baseRef], 'Repair must have only the exact baseline as parent');
  assert.deepEqual(git(repository, ['diff', '--name-only', '-z', baseRef, repair.repairedLockCommit]).split('\0').filter(Boolean),
    ['package-lock.json'], 'Repair must change only the lock; application source must be identical');
  assert.equal(packageJsonBlob, repair.packageJsonBlob, 'Baseline manifest does not match review');
  assert.equal(git(repository, ['rev-parse', `${repair.repairedLockCommit}:package.json`]).trim(), packageJsonBlob,
    'Repair changed package declarations');
  assert.equal(provenance.originalLockSha256, repair.originalLockSha256, 'Original lock does not match review');
  const lockBlob = git(repository, ['rev-parse', `${repair.repairedLockCommit}:package-lock.json`]).trim();
  assert.equal(lockBlob, repair.lockBlob, 'Repair lock blob does not match review');
  const repaired = git(repository, ['show', `${repair.repairedLockCommit}:package-lock.json`], true);
  assert.equal(sha256(repaired), repair.lockSha256, 'Repair lock content does not match review');
  const originalManifest = JSON.parse(git(repository, ['show', `${baseRef}:package.json`]));
  const repairedLock = JSON.parse(repaired);
  assert.deepEqual(repairedLock.packages[''].dependencies || {}, originalManifest.dependencies || {}, 'Root dependencies differ');
  assert.deepEqual(repairedLock.packages[''].devDependencies || {}, originalManifest.devDependencies || {}, 'Root development dependencies differ');
  fs.writeFileSync(lockPath, repaired);
  assert.equal(sha256(fs.readFileSync(lockPath)), repair.lockSha256, 'Copied lock failed integrity check');
  return {
    ...provenance, mode: 'reviewed-lock-only-repair', lockOverlayApplied: true,
    repairedLockCommit: repair.repairedLockCommit, lockBlob, lockSha256: repair.lockSha256,
    note: 'Unchanged baseline application and declarations with the reviewed repaired install graph; not the original incompatible lock graph.',
  };
}
if (require.main === module) {
  const args = process.argv.slice(2);
  assert.equal(args.length, 6, 'Expected --base SHA --worktree PATH --output PATH');
  assert.deepEqual([args[0], args[2], args[4]], ['--base', '--worktree', '--output']);
  const repository = path.resolve(__dirname, '..');
  const repair = JSON.parse(fs.readFileSync(path.join(__dirname, 'performance-baseline-lock-repair.json'), 'utf8'));
  const result = prepareBaseline({ repository, baselineRoot: path.resolve(args[3]), baseRef: args[1], repair });
  const output = path.resolve(args[5]);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
}
module.exports = { prepareBaseline };
