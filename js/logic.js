/* diff-bd -- line/word diff engine. Pure ASCII.
   Works in browser (window.DIFF_LOGIC) and Node (module.exports). */
'use strict';

var MAX_PRODUCT = 250000; /* DP cell cap for LCS; larger inputs use the prefix/suffix fallback */

function normalizeText(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function splitLines(s) {
  var t = normalizeText(s);
  if (t === '') return [];
  return t.split('\n');
}

/* Fallback for huge inputs: common prefix + common suffix, middle is del+add. */
function diffLinesFallback(a, b) {
  var n = a.length, m = b.length, i = 0;
  while (i < n && i < m && a[i] === b[i]) i++;
  var j = 0;
  while (j < n - i && j < m - i && a[n - 1 - j] === b[m - 1 - j]) j++;
  var ops = [];
  for (var k = 0; k < i; k++) ops.push({ t: 'eq', a: a[k] });
  for (var d = i; d < n - j; d++) ops.push({ t: 'del', a: a[d] });
  for (var ad = i; ad < m - j; ad++) ops.push({ t: 'add', b: b[ad] });
  for (var e = n - j; e < n; e++) ops.push({ t: 'eq', a: a[e] });
  return { ops: ops, fallback: true };
}

/* LCS-based line diff. ops: [{t:'eq'|'del'|'add', a?, b?}] */
function diffLines(a, b) {
  var n = a.length, m = b.length;
  if (n * m > MAX_PRODUCT) return diffLinesFallback(a, b);
  var W = m + 1;
  var dp = new Uint32Array((n + 1) * W);
  var i, j;
  for (i = n - 1; i >= 0; i--) {
    for (j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i * W + j] = dp[(i + 1) * W + (j + 1)] + 1;
      else {
        var up = dp[(i + 1) * W + j], left = dp[i * W + (j + 1)];
        dp[i * W + j] = up >= left ? up : left;
      }
    }
  }
  var ops = [];
  i = 0; j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ t: 'eq', a: a[i] }); i++; j++; }
    else if (dp[(i + 1) * W + j] >= dp[i * W + (j + 1)]) { ops.push({ t: 'del', a: a[i] }); i++; }
    else { ops.push({ t: 'add', b: b[j] }); j++; }
  }
  while (i < n) { ops.push({ t: 'del', a: a[i] }); i++; }
  while (j < m) { ops.push({ t: 'add', b: b[j] }); j++; }
  return { ops: ops, fallback: false };
}

/* Tokenize keeping whitespace separators, for word-level diff. */
function tokenize(s) {
  return String(s).split(/(\s+)/).filter(function (x) { return x !== ''; });
}

/* Word diff between two changed lines: [{t:'eq'|'del'|'add', tok}] */
function diffWords(x, y) {
  var a = tokenize(x), b = tokenize(y);
  var n = a.length, m = b.length;
  if (n * m > MAX_PRODUCT) {
    return [{ t: 'del', tok: x }, { t: 'add', tok: y }];
  }
  var W = m + 1;
  var dp = new Uint32Array((n + 1) * W);
  var i, j;
  for (i = n - 1; i >= 0; i--) {
    for (j = m - 1; j >= 0; j--) {
      if (a[i] === b[j]) dp[i * W + j] = dp[(i + 1) * W + (j + 1)] + 1;
      else {
        var up = dp[(i + 1) * W + j], left = dp[i * W + (j + 1)];
        dp[i * W + j] = up >= left ? up : left;
      }
    }
  }
  var ops = [];
  i = 0; j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push({ t: 'eq', tok: a[i] }); i++; j++; }
    else if (dp[(i + 1) * W + j] >= dp[i * W + (j + 1)]) { ops.push({ t: 'del', tok: a[i] }); i++; }
    else { ops.push({ t: 'add', tok: b[j] }); j++; }
  }
  while (i < n) { ops.push({ t: 'del', tok: a[i] }); i++; }
  while (j < m) { ops.push({ t: 'add', tok: b[j] }); j++; }
  return ops;
}

/* Group line ops into render blocks with line numbers and word-diff pairs.
   Block: {t:'eq',lines:[...],a0,b0} | {t:'chg',dels:[],adds:[],pairs:[[wopsDel,wopsAdd]|...],a0,b0} | {t:'add',lines:[],b0} | {t:'del',lines:[],a0} */
function buildBlocks(diffResult) {
  var ops = diffResult.ops, blocks = [];
  var aNo = 1, bNo = 1, i = 0;
  function pushRun(dels, adds, sa, sb) {
    if (dels.length && adds.length) {
      var pairs = [], k, lim = Math.min(dels.length, adds.length);
      for (k = 0; k < lim; k++) pairs.push(diffWords(dels[k], adds[k]));
      blocks.push({ t: 'chg', dels: dels, adds: adds, pairs: pairs, a0: sa, b0: sb });
    } else if (dels.length) {
      blocks.push({ t: 'del', lines: dels, a0: sa, b0: sb });
    } else if (adds.length) {
      blocks.push({ t: 'add', lines: adds, a0: sa, b0: sb });
    }
  }
  while (i < ops.length) {
    var op = ops[i];
    if (op.t === 'eq') {
      var lines = [], sa = aNo, sb = bNo;
      while (i < ops.length && ops[i].t === 'eq') { lines.push(ops[i].a); i++; aNo++; bNo++; }
      blocks.push({ t: 'eq', lines: lines, a0: sa, b0: sb });
    } else {
      var dels = [], adds = [], sa2 = aNo, sb2 = bNo;
      while (i < ops.length && ops[i].t !== 'eq') {
        if (ops[i].t === 'del') { dels.push(ops[i].a); aNo++; }
        else { adds.push(ops[i].b); bNo++; }
        i++;
      }
      pushRun(dels, adds, sa2, sb2);
    }
  }
  return blocks;
}

function lineStats(diffResult) {
  var eq = 0, del = 0, add = 0;
  diffResult.ops.forEach(function (op) {
    if (op.t === 'eq') eq++;
    else if (op.t === 'del') del++;
    else add++;
  });
  return { eq: eq, del: del, add: add };
}

/* difflib-style ratio from line ops: 2*M / T, M = eq count. */
function similarity(diffResult, n, m) {
  var s = lineStats(diffResult);
  if (n + m === 0) return 100;
  return Math.round((200 * s.eq) / (n + m) * 10) / 10;
}

/* Changed/added/removed split: paired del+add = changed, leftovers = removed/added. */
function changeSummary(blocks) {
  var added = 0, removed = 0, changed = 0, unchanged = 0;
  blocks.forEach(function (bl) {
    if (bl.t === 'eq') unchanged += bl.lines.length;
    else if (bl.t === 'add') added += bl.lines.length;
    else if (bl.t === 'del') removed += bl.lines.length;
    else if (bl.t === 'chg') {
      var p = Math.min(bl.dels.length, bl.adds.length);
      changed += p;
      removed += bl.dels.length - p;
      added += bl.adds.length - p;
    }
  });
  return { added: added, removed: removed, changed: changed, unchanged: unchanged };
}

/* Unified diff with 3 context lines. Returns plain text. */
function toUnifiedDiff(diffResult, aName, bName, ctx) {
  if (ctx === undefined) ctx = 3;
  var ops = diffResult.ops;
  var out = ['--- ' + (aName || 'a/original'), '+++ ' + (bName || 'b/modified')];
  /* find hunk ranges */
  var changeIdx = [];
  ops.forEach(function (op, idx) { if (op.t !== 'eq') changeIdx.push(idx); });
  if (!changeIdx.length) return out.join('\n') + '\n';
  var hunks = [], start = Math.max(0, changeIdx[0] - ctx), prev = changeIdx[0];
  var k;
  for (k = 1; k < changeIdx.length; k++) {
    if (changeIdx[k] - prev > ctx * 2) {
      hunks.push([start, Math.min(ops.length, prev + ctx + 1)]);
      start = Math.max(0, changeIdx[k] - ctx);
    }
    prev = changeIdx[k];
  }
  hunks.push([start, Math.min(ops.length, prev + ctx + 1)]);
  hunks.forEach(function (h) {
    var s = h[0], e = h[1], aCount = 0, bCount = 0, body = [];
    /* a/b line numbers of hunk start */
    var aNo = 1, bNo = 1, t;
    for (t = 0; t < s; t++) {
      if (ops[t].t !== 'add') aNo++;
      if (ops[t].t !== 'del') bNo++;
    }
    for (t = s; t < e; t++) {
      var op = ops[t];
      if (op.t === 'eq') { body.push(' ' + op.a); aCount++; bCount++; }
      else if (op.t === 'del') { body.push('-' + op.a); aCount++; }
      else { body.push('+' + op.b); bCount++; }
    }
    out.push('@@ -' + aNo + ',' + aCount + ' +' + bNo + ',' + bCount + ' @@');
    out.push.apply(out, body);
  });
  return out.join('\n') + '\n';
}

var DIFF_LOGIC = {
  normalizeText: normalizeText,
  splitLines: splitLines,
  diffLines: diffLines,
  diffWords: diffWords,
  buildBlocks: buildBlocks,
  lineStats: lineStats,
  similarity: similarity,
  changeSummary: changeSummary,
  toUnifiedDiff: toUnifiedDiff,
  MAX_PRODUCT: MAX_PRODUCT,
  diffText: function (a, b) {
    var la = splitLines(a), lb = splitLines(b);
    var r = diffLines(la, lb);
    return { linesA: la, linesB: lb, result: r, blocks: buildBlocks(r) };
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = DIFF_LOGIC;
if (typeof window !== 'undefined') window.DIFF_LOGIC = DIFF_LOGIC;
