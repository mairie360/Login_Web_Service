const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Charge un module TypeScript (.ts ou .tsx) de src/ en le transpilant à la volée (pas de vérification de types).
// Le hook `.ts` n'est installé que pendant le require : les imports d'exécution des modules chargés
// doivent être relatifs, l'alias `@/*` n'étant pas résolu (`import type` est effacé, donc toléré).
function requireTs(file) {
  const previous = { ts: require.extensions['.ts'], tsx: require.extensions['.tsx'] };
  const compile = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, resolveJsonModule: true, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  }).outputText, filename);
  require.extensions['.ts'] = compile;
  require.extensions['.tsx'] = compile;
  try {
    return require(path.resolve(__dirname, '..', '..', file));
  } finally {
    require.extensions['.ts'] = previous.ts;
    if (previous.tsx) require.extensions['.tsx'] = previous.tsx;
    else delete require.extensions['.tsx'];
  }
}

module.exports = { requireTs };
