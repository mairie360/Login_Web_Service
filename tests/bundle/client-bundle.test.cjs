const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

// MAIR-126: the browser only receives the parts of @mairie360/lib-components this front imports.
// Run after `npm run build` (the frontend performance workflow does). Each lib entry the front does
// not import, and every server entry of the lib, is identified by the text literals that only its
// own bundle files contain; none of them may appear in the client JavaScript of the build.
// Identical file in every front.
const root = path.resolve(__dirname, '../..');
const lib = path.join(root, 'node_modules/@mairie360/lib-components');
const dist = path.join(lib, 'dist');
const clientDir = path.join(root, '.next/static');
const SERVER_ENTRIES = ['next', 'guard'];
const MIN_MARKER_LENGTH = 16;

function filesBelow(directory, filter) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(file, filter) : filter(file) ? [file] : [];
  });
}

function libEntries() {
  const exportsMap = JSON.parse(fs.readFileSync(path.join(lib, 'package.json'), 'utf8')).exports;
  return Object.keys(exportsMap).filter(key => /^\.\/[a-z-]+$/.test(key)).map(key => key.slice(2));
}

// The ESM file of an entry and what it imports, transitively: shared chunks and other lib entries
// (the react entry imports the published shared and theme entries).
function reachableFiles(entry) {
  const seen = new Set();
  const visit = file => {
    if (seen.has(file) || !fs.existsSync(file)) return;
    seen.add(file);
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:from|import)\s*["'](\.\/[^"']+\.js)["']/g)) visit(path.join(path.dirname(file), match[1]));
    for (const match of source.matchAll(/(?:from|import)\s*["']@mairie360\/lib-components\/([a-z-]+)["']/g)) visit(path.join(dist, `${match[1]}.js`));
  };
  visit(path.join(dist, `${entry}.js`));
  return seen;
}

// Human-readable sentences (messages, labels), which survive minification unchanged. Class lists
// ("text-sm text-[var(--mairie-muted)]") are shared by many entries and the front itself, so a literal
// only counts when most of its words are plain words.
const WORD = /^[A-Za-zÀ-ÿ'’]{3,}$/;
function isSentence(text) {
  if (text.length < MIN_MARKER_LENGTH || /[\\$`[\]{}<>=]/.test(text)) return false;
  const words = text.split(/\s+/).map(word => word.replace(/[.,;:!?…()«»"]+/g, '')).filter(Boolean);
  const plain = words.filter(word => WORD.test(word)).length;
  return plain >= 3 && plain / words.length >= 0.6;
}

function textLiterals(files) {
  const literals = new Set();
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/"((?:[^"\\\n]|\\.){16,200})"|'((?:[^'\\\n]|\\.){16,200})'/g)) {
      const text = match[1] ?? match[2];
      if (isSentence(text)) literals.add(text);
    }
  }
  return literals;
}

function importedEntries() {
  const sources = filesBelow(path.join(root, 'src'), file => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file));
  const used = new Set(), rootImports = [];
  for (const file of sources) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/["']@mairie360\/lib-components(\/[a-z-]+)?["']/g)) {
      if (match[1]) used.add(match[1].slice(1));
      else rootImports.push(path.relative(root, file));
    }
  }
  return { used, rootImports, sourceText: sources.map(file => fs.readFileSync(file, 'utf8')).join('\n') };
}

test('MAIR-126: the front imports lib subpaths only, never the root entry', () => {
  assert.deepEqual(importedEntries().rootImports, []);
});

test('MAIR-126: the client build ships no unused lib entry and no lib server code', t => {
  const clientFiles = filesBelow(clientDir, file => file.endsWith('.js'));
  assert.ok(clientFiles.length > 0, 'Run `npm run build` first: no client JavaScript in .next/static');
  const client = clientFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
  const { used, sourceText } = importedEntries();
  const usedClient = [...used].filter(entry => !SERVER_ENTRIES.includes(entry));
  const usedFiles = new Set(usedClient.flatMap(entry => [...reachableFiles(entry)]));
  const usedLiterals = textLiterals(usedFiles);
  // An entry an imported client entry loads itself is used too.
  const forbidden = libEntries().filter(entry => SERVER_ENTRIES.includes(entry) || (!used.has(entry) && !usedFiles.has(path.join(dist, `${entry}.js`))));
  const leaks = [];
  for (const entry of forbidden) {
    // Text also present in an imported client entry, or in this front's own code, proves nothing.
    const markers = [...textLiterals(reachableFiles(entry))].filter(text => !usedLiterals.has(text) && !sourceText.includes(text));
    t.diagnostic(`${entry}: ${markers.length} distinctive sentences`);
    if (markers.length === 0) continue;
    const found = markers.filter(text => client.includes(text));
    if (found.length) leaks.push(`${entry}: ${found.slice(0, 3).map(text => JSON.stringify(text)).join(', ')}`);
  }
  assert.deepEqual(leaks, [], 'lib code this front does not import (or lib server code) reached the browser bundle');
});
