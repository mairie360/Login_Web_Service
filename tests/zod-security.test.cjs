const assert = require('node:assert/strict');
const { test } = require('node:test');

const variants = [
  ['root v3', require('zod'), false],
  ['v3', require('zod/v3'), false],
  ['v4', require('zod/v4'), false],
  ['v4 mini', require('zod/v4/mini'), true],
  ['v4-mini alias', require('zod/v4-mini'), true]
];

function collections(z, mini) {
  const array = element => z.array(element);
  const set = element => z.set(element);
  const cases = [
    ['array.max', element => mini ? array(element).check(z.maxLength(2)) : array(element).max(2), [0, 1, 2], ['a', 'b']],
    ['array.length', element => mini ? array(element).check(z.length(2)) : array(element).length(2), [0, 1, 2], ['a', 'b']],
    ['set.max', element => mini ? set(element).check(z.maxSize(2)) : set(element).max(2), new Set([0, 1, 2]), new Set(['a', 'b'])],
    ['set.size', element => mini ? set(element).check(z.size(2)) : set(element).size(2), new Set([0, 1, 2]), new Set(['a', 'b'])]
  ];
  if (z.maxSize) cases.push(['map.max', element => z.map(element, element).check(z.maxSize(2)), new Map([[0, 0], [1, 1], [2, 2]]), new Map([['a', 'a'], ['b', 'b']])]);
  return cases;
}

for (const [name, z, mini] of variants) {
  for (const [kind, build, oversized, valid] of collections(z, mini)) {
    for (const asynchronous of [false, true]) {
      test(`${name} ${kind} rejects an oversized collection before parsing elements (${asynchronous ? 'async' : 'sync'})`, async () => {
        let parsed = 0;
        const element = z.custom(value => { parsed++; return typeof value === 'string'; });
        const schema = build(element);
        const result = asynchronous ? await schema.safeParseAsync(oversized) : schema.safeParse(oversized);
        assert.equal(result.success, false);
        assert.equal(parsed, 0);
        assert.deepEqual(result.error.issues.map(issue => issue.code), ['too_big']);
        const accepted = asynchronous ? await schema.safeParseAsync(valid) : schema.safeParse(valid);
        assert.equal(accepted.success, true);
        assert.deepEqual(accepted.data, valid);
        assert.equal(parsed, valid instanceof Map ? valid.size * 2 : valid.size ?? valid.length);
      });
    }
  }
}

test('ESM entry points apply the same upper bounds', async () => {
  for (const entry of ['zod', 'zod/v3', 'zod/v4', 'zod/v4/mini', 'zod/v4-mini']) {
    const z = await import(entry);
    for (const [kind, build, oversized, valid] of collections(z, entry.includes('mini'))) {
      for (const asynchronous of [false, true]) {
        let parsed = 0;
        const element = z.custom(value => { parsed++; return typeof value === 'string'; });
        const schema = build(element);
        const result = asynchronous ? await schema.safeParseAsync(oversized) : schema.safeParse(oversized);
        assert.equal(parsed, 0, `${entry} ${kind}`);
        assert.deepEqual(result.error.issues.map(issue => issue.code), ['too_big'], `${entry} ${kind}`);
        const accepted = asynchronous ? await schema.safeParseAsync(valid) : schema.safeParse(valid);
        assert.equal(accepted.success, true);
        assert.deepEqual(accepted.data, valid);
      }
    }
  }
});

test('v4 upper bounds preserve preceding overwrites and conditional checks', () => {
  const z = require('zod/v4');
  assert.deepEqual(z.array(z.string()).overwrite(values => values.slice(0, 1)).max(1).parse(['a', 'b']), ['a']);
  assert.deepEqual(z.array(z.string()).check(z.maxLength(1, { when: () => false })).parse(['a', 'b']), ['a', 'b']);
  assert.deepEqual(z.array(z.string()).min(1).max(2).parse(['a', 'b']), ['a', 'b']);
  const invalidType = z.array(z.string()).max(1).safeParse({ length: 2 });
  assert.equal(invalidType.success, false);
  assert.deepEqual(invalidType.error.issues.map(issue => issue.code), ['invalid_type', 'too_big']);
});

test('unbounded arrays still validate every element and lower bounds remain recoverable', async () => {
  for (const z of [require('zod'), require('zod/v4')]) {
    let parsed = 0;
    const element = z.preprocess(value => { parsed++; return value; }, z.string());
    const result = await z.array(element).safeParseAsync([0, 1, 2]);
    assert.equal(parsed, 3);
    assert.deepEqual(result.error.issues.map(issue => issue.code), ['invalid_type', 'invalid_type', 'invalid_type']);
    const small = z.array(z.string()).length(2).safeParse(['a']);
    assert.deepEqual(small.error.issues.map(issue => issue.code), ['too_small']);
  }
});

test('v4 follows the official fix by bounding raw input before coercion and deduplication', () => {
  const z = require('zod/v4');
  const conditional = z.array(z.coerce.number()).check(z.maxLength(1, { when: payload => typeof payload.value[0] === 'string' }));
  assert.deepEqual(conditional.safeParse(['1', '2']).error.issues.map(issue => issue.code), ['too_big']);
  const deduplicated = z.set(z.coerce.number()).max(1).safeParse(new Set(['1', 1]));
  assert.deepEqual(deduplicated.error.issues.map(issue => issue.code), ['too_big']);
  let calls = 0;
  const skipped = z.array(z.string()).check(z.maxLength(1, { when: () => { calls++; return false; } }));
  assert.deepEqual(skipped.parse(['a', 'b']), ['a', 'b']);
  // As in upstream 4.6.6, a skipped early check is considered again after parsing.
  assert.equal(calls, 2);
});


test('the shared UI Zod 3 peer keeps the React Hook Form resolver contract', async () => {
  const { zodResolver } = require('@hookform/resolvers/zod');
  const z = require('zod');
  const schema = z.object({ name: z.string().min(2), tags: z.array(z.string()).max(2) });
  const resolver = zodResolver(schema);
  const options = { criteriaMode: 'all', shouldUseNativeValidation: false, fields: {} };
  const input = { name: 'La Réunion', tags: ['a', 'b'] };
  assert.deepEqual(await resolver(input, {}, options), { errors: {}, values: input });
  const invalid = await resolver({ name: 'X', tags: ['a', 'b', 'c'] }, {}, options);
  assert.deepEqual(invalid.values, {});
  assert.equal(invalid.errors.name.type, 'too_small');
  assert.equal(invalid.errors.tags.type, 'too_big');
});

test('v4 early abort replaces readonly issues without changing their metadata or parsing elements', async () => {
  for (const z of [require('zod/v4'), require('zod/v4/mini'), await import('zod/v4'), await import('zod/v4/mini')]) {
    for (const kind of ['array', 'set', 'map']) {
      for (const asynchronous of [false, true]) {
        let elements = 0, followingChecks = 0, originalIssue, checkedPayload;
        const element = z.custom(() => { elements++; return true; });
        const bound = kind === 'array' ? z.maxLength(1) : z.maxSize(1);
        const check = bound._zod.check;
        bound._zod.check = payload => {
          check(payload);
          checkedPayload = payload;
          originalIssue = payload.issues.at(-1);
          Object.freeze(originalIssue);
        };
        const container = kind === 'array' ? z.array(element) : kind === 'set' ? z.set(element) : z.map(element, element);
        const schema = container.check(bound, z.check(() => { followingChecks++; }));
        const input = kind === 'array' ? ['a', 'b'] : kind === 'set' ? new Set(['a', 'b']) : new Map([['a', 'a'], ['b', 'b']]);
        const result = asynchronous ? await schema.safeParseAsync(input) : schema.safeParse(input);
        assert.equal(result.success, false);
        assert.equal(elements, 0);
        assert.equal(followingChecks, 0);
        assert.equal(originalIssue.continue, true);
        assert.notEqual(checkedPayload.issues[0], originalIssue);
        assert.deepEqual(checkedPayload.issues[0], { ...originalIssue, continue: false });
        assert.deepEqual(result.error.issues.map(issue => issue.code), ['too_big']);
      }
    }
  }
});
