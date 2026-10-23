/* diff-bd -- node unit tests. Run: node tests/run-node-tests.js */
'use strict';
const assert = require('node:assert');
const L = require('../js/logic.js');

let passed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log('PASS ' + name); }
  catch (e) { console.log('FAIL ' + name + ' :: ' + e.message); process.exitCode = 1; }
}

/* normalize + split */
check('CRLF normalized to LF', () => {
  assert.deepEqual(L.splitLines('a\r\nb\rc'), ['a', 'b', 'c']);
});
check('empty string -> zero lines', () => {
  assert.deepEqual(L.splitLines(''), []);
});
check('single line no trailing newline', () => {
  assert.deepEqual(L.splitLines('hello'), ['hello']);
});

/* line diff core */
check('basic: eq/del/add/eq order', () => {
  const r = L.diffLines(['a', 'b', 'c'], ['a', 'x', 'c']);
  assert.equal(r.fallback, false);
  assert.deepEqual(r.ops.map(o => o.t), ['eq', 'del', 'add', 'eq']);
  assert.equal(r.ops[1].a, 'b'); assert.equal(r.ops[2].b, 'x');
});
check('identical -> all eq', () => {
  const r = L.diffLines(['a', 'b'], ['a', 'b']);
  assert.deepEqual(r.ops.map(o => o.t), ['eq', 'eq']);
});
check('empty a -> all add', () => {
  const r = L.diffLines([], ['x', 'y']);
  assert.deepEqual(r.ops.map(o => o.t), ['add', 'add']);
});
check('empty b -> all del', () => {
  const r = L.diffLines(['x', 'y'], []);
  assert.deepEqual(r.ops.map(o => o.t), ['del', 'del']);
});
check('pure append keeps eq prefix', () => {
  const r = L.diffLines(['a', 'b'], ['a', 'b', 'c']);
  assert.deepEqual(r.ops.map(o => o.t), ['eq', 'eq', 'add']);
});
check('fallback for huge inputs: prefix kept, middle del+add', () => {
  const a = ['same'].concat(Array(600).fill('A'));
  const b = ['same'].concat(Array(500).fill('B'));
  const r = L.diffLines(a, b);
  assert.equal(r.fallback, true);
  assert.equal(r.ops[0].t, 'eq');
  const dels = r.ops.filter(o => o.t === 'del').length;
  const adds = r.ops.filter(o => o.t === 'add').length;
  assert.equal(dels, 600); assert.equal(adds, 500);
});

/* word diff */
check('word diff: brown->red with spaces kept', () => {
  const w = L.diffWords('the quick brown', 'the quick red');
  assert.deepEqual(w.map(x => x.t), ['eq', 'eq', 'eq', 'eq', 'del', 'add']);
  assert.equal(w[4].tok, 'brown'); assert.equal(w[5].tok, 'red');
  assert.equal(w[1].tok, ' ');
});
check('word diff identical', () => {
  assert.deepEqual(L.diffWords('abc def', 'abc def').map(x => x.t), ['eq', 'eq', 'eq']);
});
check('word diff fallback returns whole-line del+add', () => {
  const x = Array(1000).fill('a').join(' ');
  const y = Array(400).fill('b').join(' ');
  const w = L.diffWords(x, y);
  assert.deepEqual(w.map(o => o.t), ['del', 'add']);
  assert.equal(w[0].tok, x); assert.equal(w[1].tok, y);
});

/* blocks */
check('buildBlocks groups del+add into chg with pairs', () => {
  const r = L.diffLines(['a', 'b', 'c'], ['a', 'x', 'c']);
  const bl = L.buildBlocks(r);
  assert.equal(bl.length, 3);
  assert.equal(bl[0].t, 'eq'); assert.equal(bl[1].t, 'chg'); assert.equal(bl[2].t, 'eq');
  assert.deepEqual(bl[1].dels, ['b']); assert.deepEqual(bl[1].adds, ['x']);
  assert.equal(bl[1].pairs.length, 1);
  assert.equal(bl[1].a0, 2); assert.equal(bl[1].b0, 2);
});
check('buildBlocks: add-only run stays add', () => {
  const r = L.diffLines(['a'], ['a', 'b']);
  const bl = L.buildBlocks(r);
  assert.equal(bl.length, 2);
  assert.equal(bl[1].t, 'add'); assert.deepEqual(bl[1].lines, ['b']);
});

/* stats */
check('changeSummary: 1 changed, 2 unchanged', () => {
  const r = L.diffLines(['a', 'b', 'c'], ['a', 'x', 'c']);
  const s = L.changeSummary(L.buildBlocks(r));
  assert.deepEqual(s, { added: 0, removed: 0, changed: 1, unchanged: 2 });
});
check('changeSummary: leftover del counts as removed', () => {
  const r = L.diffLines(['a', 'b1', 'b2', 'c'], ['a', 'x', 'c']);
  const s = L.changeSummary(L.buildBlocks(r));
  assert.deepEqual(s, { added: 0, removed: 1, changed: 1, unchanged: 2 });
});
check('similarity 1/2 lines eq -> 50.0', () => {
  const r = L.diffLines(['a', 'b'], ['a', 'c']);
  assert.equal(L.similarity(r, 2, 2), 50.0);
});
check('similarity empty/empty -> 100', () => {
  const r = L.diffLines([], []);
  assert.equal(L.similarity(r, 0, 0), 100);
});

/* unified diff */
check('toUnifiedDiff exact hunk', () => {
  const r = L.diffLines(['a', 'b', 'c'], ['a', 'x', 'c']);
  const u = L.toUnifiedDiff(r, 'a/original', 'b/modified');
  assert.equal(u, '--- a/original\n+++ b/modified\n@@ -1,3 +1,3 @@\n a\n-b\n+x\n c\n');
});
check('toUnifiedDiff no changes -> headers only', () => {
  const r = L.diffLines(['a'], ['a']);
  assert.equal(L.toUnifiedDiff(r), '--- a/original\n+++ b/modified\n');
});

/* end-to-end on the shipped sample */
check('sample pair: 3 changed / 1 added / 3 unchanged / 46.2% sim', () => {
  const A = 'Buy list:\n- rice 2 kg\n- oil 1 L\n- eggs 12\n\nNote: shop opens at 9 am.';
  const B = 'Buy list:\n- rice 5 kg\n- oil 2 L\n- eggs 12\n- sugar 1 kg\n\nNote: shop opens at 10 am.';
  const d = L.diffText(A, B);
  const s = L.changeSummary(d.blocks);
  assert.deepEqual(s, { added: 1, removed: 0, changed: 3, unchanged: 3 });
  assert.equal(L.similarity(d.result, d.linesA.length, d.linesB.length), 46.2);
  const u = L.toUnifiedDiff(d.result);
  assert.ok(u.includes('-- rice 2 kg\n-- oil 1 L\n+- rice 5 kg\n+- oil 2 L'));
  assert.ok(u.includes('-Note: shop opens at 9 am.\n+Note: shop opens at 10 am.'));
});
check('identical texts -> zero changes, 100% sim', () => {
  const d = L.diffText('one\ntwo', 'one\ntwo');
  const s = L.changeSummary(d.blocks);
  assert.deepEqual(s, { added: 0, removed: 0, changed: 0, unchanged: 2 });
  assert.equal(L.similarity(d.result, 2, 2), 100);
});
check('both empty -> zero ops', () => {
  const d = L.diffText('', '');
  assert.deepEqual(d.blocks, []);
  assert.deepEqual(L.changeSummary(d.blocks), { added: 0, removed: 0, changed: 0, unchanged: 0 });
});

console.log('\n' + passed + ' unit checks passed' + (process.exitCode ? ' (WITH FAILURES)' : ''));
