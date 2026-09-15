import process from 'node:process';
import console from 'node:console';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PACKAGE_NAME, buildOrvalOpenApi, resolveOrvalPackage } from './orval-contract.mjs';

// Le seul contrat utilisé par ce front est celui de BFF User publié dans @mairie360/bff-user-openapi,
// épinglé à une version exacte X.Y.Z. contracts/openapi.json en est la reconstruction versionnée
// (lue par le proxy au build et par les tests) ; il n'est jamais copié depuis un checkout du BFF.
//   --sync   (alias --generate) : régénère contracts/openapi.json depuis le paquet installé
//   --check  : échoue si la version n'est pas exacte, si le paquet installé diffère de package.json
//              ou si contracts/openapi.json n'est plus la reconstruction du paquet

const mode = process.argv[2] ?? '--check';
const spec = resolve('contracts/openapi.json');
const EXACT_VERSION = /^\d+\.\d+\.\d+$/;

function checkPinnedPackage() {
  const { dependencies = {}, devDependencies = {} } = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  const pinned = dependencies[PACKAGE_NAME] ?? devDependencies[PACKAGE_NAME];
  if (!pinned) throw new Error(`${PACKAGE_NAME} doit être une dépendance de package.json.`);
  if (!EXACT_VERSION.test(pinned)) throw new Error(`${PACKAGE_NAME} doit être épinglé à une version publiée exacte X.Y.Z (trouvé « ${pinned} »).`);
  const bffPackages = Object.keys({ ...dependencies, ...devDependencies }).filter((name) => /^@mairie360\/bff-.*-openapi$/.test(name));
  if (bffPackages.length !== 1) throw new Error(`Un seul contrat de BFF est autorisé (trouvé : ${bffPackages.join(', ')}).`);
  const installed = resolveOrvalPackage().version;
  if (installed !== pinned) throw new Error(`${PACKAGE_NAME}@${installed} est installé mais package.json épingle ${pinned} : lancer npm ci.`);
  return pinned;
}

const version = checkPinnedPackage();
const expected = `${JSON.stringify(buildOrvalOpenApi(), null, 2)}\n`;

if (mode === '--sync' || mode === '--generate') {
  mkdirSync(resolve('contracts'), { recursive: true });
  writeFileSync(spec, expected);
  console.log(`contracts/openapi.json régénéré depuis ${PACKAGE_NAME}@${version}.`);
} else if (mode === '--check') {
  if (!existsSync(spec) || readFileSync(spec, 'utf8') !== expected) {
    throw new Error(`contracts/openapi.json ne correspond pas à ${PACKAGE_NAME}@${version}. Lancer npm run contracts:sync.`);
  }
  console.log(`contracts/openapi.json correspond à ${PACKAGE_NAME}@${version}.`);
} else {
  throw new Error(`Mode inconnu : ${mode} (--sync, --generate ou --check).`);
}
