const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

// Le contrat du front est celui de BFF User publié dans @mairie360/bff-user-openapi, épinglé à une version
// exacte X.Y.Z : contracts/openapi.json doit en être la reconstruction exacte (scripts/orval-contract.mjs),
// et BFF User est le seul BFF, dans la même version, partout où ce dépôt le démarre.

const ROOT = path.join(__dirname, '..');
const PACKAGE_NAME = '@mairie360/bff-user-openapi';
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const manifest = readJson('package.json');
const pinned = manifest.dependencies[PACKAGE_NAME];

test('the BFF User contract package is pinned to an exact published X.Y.Z version, installed as locked', () => {
  assert.match(pinned ?? '', /^\d+\.\d+\.\d+$/, `${PACKAGE_NAME} doit être épinglé à une version exacte (pas de plage ni de pré-version)`);
  assert.equal(readJson(`node_modules/${PACKAGE_NAME}/package.json`).version, pinned);
  assert.equal(readJson('package-lock.json').packages[`node_modules/${PACKAGE_NAME}`].version, pinned);
});

test('only one BFF contract package is used', () => {
  const all = { ...manifest.dependencies, ...manifest.devDependencies };
  assert.deepEqual(Object.keys(all).filter((name) => /^@mairie360\/bff-.*-openapi$/.test(name)), [PACKAGE_NAME]);
});

test('contracts/openapi.json is exactly the contract rebuilt from the installed package', async () => {
  const { buildOrvalOpenApi } = await import('../scripts/orval-contract.mjs');
  const snapshot = readJson('contracts/openapi.json');
  assert.equal(snapshot.info['x-source-package'], `${PACKAGE_NAME}@${pinned}`);
  assert.equal(snapshot.info.title, 'bff_user');
  assert.deepEqual(snapshot, buildOrvalOpenApi(PACKAGE_NAME, ROOT));
});

test('every Docker stack starts BFF User only, in the version of the contract package', () => {
  for (const file of fs.readdirSync(ROOT).filter((name) => /^docker-compose.*\.ya?ml$/.test(name))) {
    const images = [...fs.readFileSync(path.join(ROOT, file), 'utf8').matchAll(/ghcr\.io\/mairie360\/(bff-[\w-]+):([\w.-]+)/g)];
    assert.deepEqual(images.map(([, name, tag]) => `${name}:${tag}`), [`bff-user:${pinned}`], file);
  }
});
