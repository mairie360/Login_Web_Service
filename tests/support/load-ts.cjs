const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Charge un module TypeScript de src/ en le transpilant à la volée (pas de vérification de types).
// Le hook `.ts` n'est installé que pendant le require : les imports d'exécution des modules chargés
// doivent être relatifs, l'alias `@/*` n'étant pas résolu (`import type` est effacé, donc toléré).
function requireTs(file) {
  const previous = require.extensions['.ts'];
  require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, resolveJsonModule: true },
    fileName: filename,
  }).outputText, filename);
  try {
    return require(path.resolve(__dirname, '..', '..', file));
  } finally {
    require.extensions['.ts'] = previous;
  }
}

module.exports = { requireTs };
