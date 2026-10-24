const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const ts = require('typescript');
const { verifyClientSourceMaps } = require('../scripts/client-bundle-provenance.cjs');

function fixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mairie360-bundle-map-'));
  const libRoot = path.join(root, 'node_modules/@mairie360/lib-components');
  const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); };
  const map = sources => ({ version: 3, names: [], sources, mappings: 'AAAA' });
  const libFile = (entry, source) => {
    const file = path.join(libRoot, 'dist', entry + '.js');
    write(file, 'export const component = () => 1;'); write(file + '.map', map([source])); return file;
  };
  const used = libFile('primitives', '../src/components/Button.tsx');
  const forms = libFile('forms', '../src/forms/Form.tsx');
  const next = libFile('next', '../src/next.ts');
  const client = path.join(root, '.next/static/chunks/app.js');
  const usedSource = 'webpack://_N_E/./node_modules/@mairie360/lib-components/src/components/Button.tsx';
  write(client, '(()=>{const button=()=>1;self.button=button})();\n//# sourceMappingURL=app.js.map');
  write(client + '.map', map([usedSource]));
  const options = { clientFiles: [client], usedFiles: new Set([used]), forbidden: new Map([['forms', new Set([forms])], ['next', new Set([next])]]), libRoot };
  try { run({ root, libRoot, write, map, used, forms, next, client, usedSource, options }); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}

const officialDir = path.join(__dirname, 'fixtures/client-bundle-lib-components');
const provenance = JSON.parse(fs.readFileSync(path.join(officialDir, 'provenance.json'), 'utf8'));

// Emit the runtime JavaScript and its map together from the unchanged official
// Form, FormField and session implementations. No private dependency is executed.
function officialBuild({ root, libRoot, write, client: initialClient }) {
  const compile = (source, contents) => {
    const filename = path.join(libRoot, source);
    const output = path.join(libRoot, source.replace(/^src\//, 'dist/').replace(/\.tsx?$/, '.js'));
    const result = ts.transpileModule(contents, { fileName: filename, reportDiagnostics: true, compilerOptions: {
      module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2018, jsx: ts.JsxEmit.ReactJSX,
      sourceMap: true, inlineSources: true, removeComments: true,
      sourceRoot: pathToFileURL(path.dirname(filename)).href + '/',
    } });
    assert.deepEqual(result.diagnostics, []);
    assert.ok(result.sourceMapText);
    write(output, result.outputText); write(output + '.map', result.sourceMapText);
    return output;
  };
  const implementation = Object.fromEntries(Object.entries(provenance.files).map(([name, source]) =>
    [name, compile(source.path, fs.readFileSync(path.join(officialDir, name), 'utf8'))]));
  const used = compile('src/primitives.ts', 'export function Button() { return 1; }');
  const forms = compile('src/forms.ts', 'export {Form} from "./forms/Form.js"; export {FormField} from "./forms/FormField.js";');
  const next = compile('src/next.ts', 'export {readSessionCookies} from "./server/session.js";');
  fs.rmSync(initialClient); fs.rmSync(initialClient + '.map');
  const copyToClient = file => {
    const target = path.join(root, '.next/static/chunks', path.basename(file));
    write(target, fs.readFileSync(file, 'utf8')); write(target + '.map', fs.readFileSync(file + '.map', 'utf8'));
    return target;
  };
  const client = copyToClient(used);
  const options = { clientFiles: [client], usedFiles: new Set([used]), libRoot,
    forbidden: new Map([['forms', new Set([forms, implementation['Form.tsx'], implementation['FormField.tsx']])],
      ['next', new Set([next, implementation['session.ts']])]]) };
  return { compile, copyToClient, implementation, client, used, options };
}

test('official source fixtures retain their immutable Git blobs and SHA256 provenance', () => {
  for (const [name, expected] of Object.entries(provenance.files)) {
    const content = fs.readFileSync(path.join(officialDir, name));
    assert.equal(createHash('sha256').update(content).digest('hex'), expected.sha256, name);
    assert.equal(createHash('sha1').update(`blob ${content.length}\0`).update(content).digest('hex'), expected.gitBlob, name);
  }
  for (const [name, expected] of Object.entries(provenance.builtBarrels.files)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(path.join(officialDir, name))).digest('hex'), expected.sha256, name);
  }
});

test('mapped source identities prove absence without relying on human-readable strings', () => fixture(({ options }) => {
  assert.deepEqual([...verifyClientSourceMaps(options).keys()], ['forms', 'next']);
}));

test('missing browser maps block the proof', () => fixture(({ client, options }) => {
  fs.unlinkSync(client + '.map'); assert.throws(() => verifyClientSourceMaps(options), /source map/i);
}));

test('malformed, empty and out-of-range mappings block the proof', () => fixture(({ client, map, usedSource, write, options }) => {
  for (const payload of ['not JSON', { ...map([usedSource]), version: 2 }, { ...map([usedSource]), mappings: '' },
    { ...map([usedSource]), mappings: '!invalid' }, { ...map([]) }, { ...map([usedSource]), mappings: 'ACAA' }]) {
    write(client + '.map', payload); assert.throws(() => verifyClientSourceMaps(options), /map|source/i);
  }
}));

test('lost ownership metadata cannot turn a corrupted proof green', () => fixture(({ client, map, write, options }) => {
  write(client + '.map', map(['webpack://_N_E/./src/app/client.tsx']));
  assert.throws(() => verifyClientSourceMaps(options), /used.*source|ownership/i);
}));

test('each forms implementation and server source is rejected even when minified without sentences', () => fixture(({ client, map, write, options }) => {
  for (const source of ['dist/forms.js', 'src/forms/Form.tsx', 'dist/next.js', 'src/next.ts']) {
    const owned = 'webpack://_N_E/./node_modules/@mairie360/lib-components/' + source;
    write(client + '.map', map([owned]));
    assert.throws(() => verifyClientSourceMaps(options), /forms|next|forbidden/i);
  }
}));

test('runtime JavaScript and compiler maps from each official forms/server implementation expose the injection', () => fixture(f => {
  const build = officialBuild(f);
  assert.equal(verifyClientSourceMaps(build.options).size, 2);
  for (const [name, file] of Object.entries(build.implementation)) {
    const injected = build.copyToClient(file);
    assert.ok(fs.readFileSync(injected, 'utf8').includes(name === 'session.ts' ? 'readSessionCookies' : name.replace('.tsx', '')));
    assert.throws(() => verifyClientSourceMaps({ ...build.options, clientFiles: [build.client, injected] }), /forbidden library source/);
    fs.unlinkSync(injected); fs.unlinkSync(injected + '.map');
  }
}));

test('encoded package paths and indexed maps retain their ownership', () => fixture(({ client, map, write, options }) => {
  const owned = 'webpack://_N_E/./node_modules/%40mairie360/lib-components/src/forms/Form.tsx';
  write(client + '.map', { version: 3, sections: [{ offset: { line: 0, column: 0 }, map: map([owned]) }] });
  assert.throws(() => verifyClientSourceMaps(options), /forms|forbidden/i);
}));

test('published source maps are required and cannot be corrupt', () => fixture(({ forms, write, options }) => {
  fs.unlinkSync(forms + '.map'); assert.throws(() => verifyClientSourceMaps(options), /map/i);
  write(forms + '.map', '{'); assert.throws(() => verifyClientSourceMaps(options), /map/i);
}));

test('an empty library map cannot hide injected forms behind the positive control', () => fixture(({ client, usedSource, forms, map, write, options }) => {
  const injected = 'webpack://_N_E/./node_modules/@mairie360/lib-components/src/forms/Form.tsx';
  write(client, 'self.button = () => 1; self.Form = () => 2;');
  write(client + '.map', { ...map([usedSource, injected]), mappings: 'AAAA,ACAA' });
  write(forms + '.map', { ...map(['../src/forms/Form.tsx']), mappings: '' });
  assert.throws(() => verifyClientSourceMaps(options), /no mapped sources/i);
}));

test('lost library ownership cannot hide injected forms behind the positive control', () => fixture(({ client, usedSource, forms, map, write, options }) => {
  const injected = 'webpack://_N_E/./node_modules/@mairie360/lib-components/src/forms/Form.tsx';
  write(client, 'self.button = () => 1; self.Form = () => 2;');
  write(client + '.map', { ...map([usedSource, injected]), mappings: 'AAAA,ACAA' });
  write(forms + '.map', map(['webpack://anonymous/src/forms/Form.tsx']));
  assert.throws(() => verifyClientSourceMaps(options), /library.*ownership|owned library source/i);
}));

test('partially lost library ownership also blocks the proof', () => fixture(({ forms, map, write, options }) => {
  write(forms + '.map', { ...map(['../src/forms/Form.tsx', 'webpack://anonymous/src/forms/FormField.tsx']), mappings: 'AAAA,ACAA' });
  assert.throws(() => verifyClientSourceMaps(options), /library.*ownership|owned library source/i);
}));

test('real TSUP re-export barrels require complete transitive map coverage', () => fixture(({ libRoot, used, write, map, options }) => {
  for (const name of ['primitives', 'shell']) {
    const barrel = fs.readFileSync(path.join(officialDir, 'tsup', name + '.js'), 'utf8');
    write(used, barrel); write(used + '.map', fs.readFileSync(path.join(officialDir, 'tsup', name + '.js.map'), 'utf8'));
    const parsed = ts.createSourceFile(used, barrel, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const dependencies = parsed.statements.filter(ts.isImportDeclaration).map(statement => path.resolve(path.dirname(used), statement.moduleSpecifier.text));
    for (const dependency of dependencies) {
      write(dependency, 'export const Button = () => 1;'); write(dependency + '.map', map(['../src/components/Button.tsx']));
    }
    assert.equal(verifyClientSourceMaps(options).size, 2);
    for (const payload of [undefined, '{', { ...map(['../src/components/Button.tsx']), mappings: '' }, map(['webpack://anonymous/Button.tsx'])]) {
      if (payload === undefined) fs.unlinkSync(dependencies[0] + '.map'); else write(dependencies[0] + '.map', payload);
      assert.throws(() => verifyClientSourceMaps(options), /map|ownership/i);
    }
    write(dependencies[0] + '.map', map(['../src/components/Button.tsx']));
    write(used, barrel + '\nexport function Form() { return 2; }');
    assert.throws(() => verifyClientSourceMaps(options), /no mapped sources/i);
    write(used, barrel);
    fs.unlinkSync(dependencies[0]); assert.throws(() => verifyClientSourceMaps(options), /barrel|reference|file/i);
  }
}));

test('an empty map cannot exempt executable, external, unresolved or cyclic barrel references', () => fixture(({ libRoot, used, write, map, options }) => {
  write(used + '.map', { ...map([]), mappings: '' });
  for (const source of [
    'import {Button} from "foreign-package"; export {Button};',
    'import {Button} from "./chunk-ONE.js"; export {Button}; globalThis.Form = () => 2;',
    'import {Button} from "./chunk-ONE.js"; export {Missing};',
    'import {Button} from "../outside/chunk-ONE.js"; export {Button};',
  ]) { write(used, source); assert.throws(() => verifyClientSourceMaps(options), /no mapped sources/i); }
  const other = path.join(libRoot, 'dist/chunk-ONE.js');
  write(used, 'import {Button} from "./chunk-ONE.js"; export {Button};');
  write(other, 'import {Button} from "./chunk-ONE.js"; export {Button};'); write(other + '.map', { ...map([]), mappings: '' });
  assert.throws(() => verifyClientSourceMaps(options), /cyclic library barrel/i);
}));

test('shared sources used by the client do not falsely identify a forbidden entry', () => fixture(({ next, map, write, options }) => {
  write(next + '.map', map(['../src/components/Button.tsx']));
  assert.deepEqual([...verifyClientSourceMaps(options).keys()], ['forms', 'next']);
}));

test('generated manifests may only contain their expected data and completion callback', () => fixture(({ root, write, options }) => {
  const file = path.join(root, '.next/static/build-id/_buildManifest.js');
  write(file, 'self.__BUILD_MANIFEST=function(a){return {sortedPages:["/"],"/":[a]}}("static/chunks/app.js");self.__BUILD_MANIFEST_CB&&self.__BUILD_MANIFEST_CB();');
  options.clientFiles.push(file); assert.equal(verifyClientSourceMaps(options).size, 2);
  const ssg = path.join(root, '.next/static/build-id/_ssgManifest.js');
  write(ssg, 'self.__SSG_MANIFEST=new Set(["/"]);self.__SSG_MANIFEST_CB&&self.__SSG_MANIFEST_CB();');
  options.clientFiles.push(ssg); assert.equal(verifyClientSourceMaps(options).size, 2);
  write(file, 'self.__BUILD_MANIFEST={};function Form(){return createElement(FormProvider)}');
  assert.throws(() => verifyClientSourceMaps(options), /source map/i);
}));

test('the actual bundle gate accepts the mapped build and rejects missing/corrupt maps and official forms/server runtime injections', () => fixture(f => {
  const { root, libRoot, write } = f;
  const build = officialBuild(f);
  const { client } = build;
  write(path.join(libRoot, 'package.json'), { exports: { './primitives': './dist/primitives.js', './forms': './dist/forms.js', './next': './dist/next.js' } });
  write(path.join(root, 'src/client.tsx'), '"use client"; import {component} from "@mairie360/lib-components/primitives"; export const Client=component;');
  const target = path.join(root, 'tests/bundle/client-bundle.test.cjs');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'bundle/client-bundle.test.cjs'), target);
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.copyFileSync(path.join(__dirname, '../scripts/client-bundle-provenance.cjs'), path.join(root, 'scripts/client-bundle-provenance.cjs'));
  const env = { ...process.env, NODE_PATH: [process.env.NODE_PATH, path.resolve(__dirname, '../node_modules')].filter(Boolean).join(path.delimiter) };
  delete env.NODE_TEST_CONTEXT;
  const run = () => {
    const child = spawnSync(process.execPath, ['--test', target], { cwd: root, encoding: 'utf8', timeout: 10000, env });
    assert.equal(child.error, undefined, child.error?.message); assert.equal(child.signal, null);
    return child;
  };
  const accepted = run(); assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
  for (const [name, file] of Object.entries(build.implementation)) {
    const injectedFile = build.copyToClient(file);
    const injected = run(); assert.notEqual(injected.status, 0, name + injected.stdout + injected.stderr); assert.match(injected.stdout + injected.stderr, /forbidden library source/);
    fs.unlinkSync(injectedFile); fs.unlinkSync(injectedFile + '.map');
  }
  const form = build.implementation['Form.tsx'];
  const original = fs.readFileSync(form + '.map', 'utf8');
  const injectedFile = build.copyToClient(form);
  write(form + '.map', { ...JSON.parse(original), mappings: '' });
  const emptyReference = run(); assert.notEqual(emptyReference.status, 0); assert.match(emptyReference.stdout + emptyReference.stderr, /Library source map has no mapped sources/);
  write(form + '.map', { ...JSON.parse(original), sourceRoot: 'webpack://anonymous/src/forms/' });
  const lostReference = run(); assert.notEqual(lostReference.status, 0); assert.match(lostReference.stdout + lostReference.stderr, /Library source map lost ownership/);
  write(form + '.map', original); fs.unlinkSync(injectedFile); fs.unlinkSync(injectedFile + '.map');
  const browserMap = fs.readFileSync(client + '.map', 'utf8');
  fs.unlinkSync(client + '.map'); const missing = run(); assert.notEqual(missing.status, 0); assert.match(missing.stdout + missing.stderr, /Source map required/);
  write(client + '.map', '{'); const corrupt = run(); assert.notEqual(corrupt.status, 0); assert.match(corrupt.stdout + corrupt.stderr, /Invalid source map/);
  write(client + '.map', browserMap); assert.equal(run().status, 0);
  const stringLeak = build.compile('src/front-sentinel.ts', 'globalThis.leaked = "Invalid session cookie pair";');
  const leaked = build.copyToClient(stringLeak);
  const sentences = run(); assert.notEqual(sentences.status, 0); assert.match(sentences.stdout + sentences.stderr, /lib code this front does not use/);
  fs.unlinkSync(leaked); fs.unlinkSync(leaked + '.map'); assert.equal(run().status, 0);
}));
