'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const consumerRequire = createRequire(require.resolve('micromatch'));
const bracesPath = consumerRequire.resolve('braces');

function probe(body) {
  // A regression must fail this test instead of exhausting the test runner.
  const source = `const assert = require('node:assert/strict');
    const braces = require(${JSON.stringify(bracesPath)});
    const micromatch = require('micromatch');
    ${body}
    console.log('brace regression passed');`;
  const child = spawnSync(process.execPath, ['--stack-size=512', '--max-old-space-size=128', '-e', source], {
    cwd: root, encoding: 'utf8', timeout: 3000, maxBuffer: 64 * 1024,
  });
  assert.equal(child.error, undefined, `Probe did not terminate: ${child.error?.message}`);
  assert.equal(child.signal, null, `Probe killed by ${child.signal}`);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout.trim(), 'brace regression passed');
}

test('micromatch resolves the actual tracked security backport', () => {
  assert.equal(fs.realpathSync(bracesPath), path.join(root, 'vendor/braces/index.js'));
});

for (const operation of ['compile', 'expand', 'stringify']) {
  test(`${operation} bounds hostile brace and parenthesis nesting`, () => probe(`
    for (const [left,right] of [['{','}'],['(',')'],['{(',')}']]) {
      const input=left.repeat(2000)+'x'+right.repeat(2000);
      assert.throws(() => braces[${JSON.stringify(operation)}](input), {name:'SyntaxError',code:'ERR_BRACES_COMPLEXITY'});
    }
  `));

  test(`${operation} bounds supplied AST depth and rejects child cycles`, () => probe(`
    let ast={type:'text',value:'x'};
    for(let i=0;i<12000;i++) ast={type:'root',nodes:[ast]};
    assert.throws(() => braces[${JSON.stringify(operation)}](ast), {name:'SyntaxError',code:'ERR_BRACES_COMPLEXITY'});
    const cycle={type:'root',nodes:[]}; cycle.nodes.push(cycle);
    assert.throws(() => braces[${JSON.stringify(operation)}](cycle), {name:'SyntaxError',code:'ERR_BRACES_COMPLEXITY'});
  `));
}

test('ordinary brace expansion, escaping and file matching remain compatible', () => probe(`
  assert.deepEqual(braces.expand('a/{1..3}/{x,y}'), ['a/1/x','a/1/y','a/2/x','a/2/y','a/3/x','a/3/y']);
  assert.equal(braces.compile('a/{b,c}/d'), 'a/(b|c)/d');
  assert.deepEqual(micromatch.braceExpand('src/{app,lib}'), ['src/app','src/lib']);
  assert.deepEqual(micromatch(['src/app/page.tsx','src/lib/colors.js','README.md'],'src/**/*.{js,tsx}'), ['src/app/page.tsx','src/lib/colors.js']);
  const literal='('.repeat(256);
  assert.equal(braces.stringify('"'+literal+'"'),literal);
  assert.equal(braces.stringify('['+literal+']'),'['+literal+']');
  assert.equal(braces.stringify('\\\\('.repeat(256)),literal);
`));

test('the parser and all walkers support the same nesting boundary', () => probe(`
  for(const [left,right] of [['{','}'],['(',')']]) {
    const input=left.repeat(128)+'x'+right.repeat(128);
    assert.equal(braces.compile(input),input);
    assert.equal(braces.stringify(input),input);
    assert.deepEqual(braces.expand(input),[input]);
    assert.throws(() => braces.parse(left.repeat(129)+'x'+right.repeat(129)), {code:'ERR_BRACES_COMPLEXITY'});
  }
`));

test('the real micromatch integration rejects hostile brace input', () => probe(`
  assert.throws(() => micromatch.braces('{'.repeat(2000)+'x'+'}'.repeat(2000)), {name:'SyntaxError',code:'ERR_BRACES_COMPLEXITY'});
`));
