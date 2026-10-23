/* diff-bd -- app wiring. Pure ASCII. Depends on window.DIFF_LOGIC + window.DIFF_STRINGS. */
'use strict';

var L = window.DIFF_LOGIC;
var MAX_CHARS = 200000;
var LS = { lang: 'diffbd.lang', view: 'diffbd.view', a: 'diffbd.a', b: 'diffbd.b' };
var SAMPLE_A = 'Buy list:\n- rice 2 kg\n- oil 1 L\n- eggs 12\n\nNote: shop opens at 9 am.';
var SAMPLE_B = 'Buy list:\n- rice 5 kg\n- oil 2 L\n- eggs 12\n- sugar 1 kg\n\nNote: shop opens at 10 am.';

var state = {
  lang: localStorage.getItem(LS.lang) || 'en',
  view: localStorage.getItem(LS.view) || 'inline'
};

function t(key) { return window.DIFF_STRINGS[state.lang][key]; }

var BN_DIGITS = { '0': '\u09e6', '1': '\u09e7', '2': '\u09e8', '3': '\u09e9', '4': '\u09ea', '5': '\u09eb', '6': '\u09ec', '7': '\u09ed', '8': '\u09ee', '9': '\u09ef' };
function num(x) {
  var s = String(x);
  if (state.lang !== 'bn') return s;
  return s.replace(/[0-9]/g, function (d) { return BN_DIGITS[d]; });
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function $(id) { return document.getElementById(id); }

function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.title = 'Diff BD  -  ' + t('subtitle');
  $('langBtn').textContent = t('langName');
  updateLineCounts();
  render(true);
}

function updateLineCounts() {
  var a = $('taA').value, b = $('taB').value;
  var la = L.splitLines(a).length, lb = L.splitLines(b).length;
  $('countA').textContent = num(la) + ' ' + t('lines');
  $('countB').textContent = num(lb) + ' ' + t('lines');
}

function renderTokens(wops, cls) {
  var html = '';
  wops.forEach(function (w) {
    if (w.t === 'eq') html += esc(w.tok);
    else if (w.t === 'del') html += '<span class="wd ' + cls + '-del">' + esc(w.tok) + '</span>';
    else html += '<span class="wd ' + cls + '-add">' + esc(w.tok) + '</span>';
  });
  return html;
}

function inlineRow(no, cls, sign, content) {
  return '<div class="row ' + cls + '"><span class="gutter">' + num(no) + '</span>' +
    '<span class="sign">' + sign + '</span><span class="code">' + content + '</span></div>';
}

function renderInline(d) {
  var html = '', aNo = 1, bNo = 1;
  d.blocks.forEach(function (bl) {
    var i;
    if (bl.t === 'eq') {
      for (i = 0; i < bl.lines.length; i++) { html += inlineRow(aNo, 'eq', ' ', esc(bl.lines[i])); aNo++; bNo++; }
    } else if (bl.t === 'del') {
      for (i = 0; i < bl.lines.length; i++) { html += inlineRow(aNo, 'del', '-', esc(bl.lines[i])); aNo++; }
    } else if (bl.t === 'add') {
      for (i = 0; i < bl.lines.length; i++) { html += inlineRow(bNo, 'add', '+', esc(bl.lines[i])); bNo++; }
    } else if (bl.t === 'chg') {
      var p = Math.min(bl.dels.length, bl.adds.length), k;
      for (k = 0; k < p; k++) {
        html += inlineRow(aNo, 'chg-del', '-', renderTokens(bl.pairs[k].filter(function (w) { return w.t !== 'add'; }), 'in')); aNo++;
        html += inlineRow(bNo, 'chg-add', '+', renderTokens(bl.pairs[k].filter(function (w) { return w.t !== 'del'; }), 'in')); bNo++;
      }
      for (; k < bl.dels.length; k++) { html += inlineRow(aNo, 'del', '-', esc(bl.dels[k])); aNo++; }
      for (; k < bl.adds.length; k++) { html += inlineRow(bNo, 'add', '+', esc(bl.adds[k])); bNo++; }
    }
  });
  return html;
}

function renderSide(d) {
  var html = '<div class="side-grid">', i, k;
  d.blocks.forEach(function (bl) {
    if (bl.t === 'eq') {
      for (i = 0; i < bl.lines.length; i++) {
        html += '<div class="cell eq"><span class="gutter">' + num(bl.a0 + i) + '</span><span class="code">' + esc(bl.lines[i]) + '</span></div>' +
                '<div class="cell eq"><span class="gutter">' + num(bl.b0 + i) + '</span><span class="code">' + esc(bl.lines[i]) + '</span></div>';
      }
    } else if (bl.t === 'chg') {
      var p = Math.min(bl.dels.length, bl.adds.length);
      for (k = 0; k < p; k++) {
        html += '<div class="cell chg-del"><span class="gutter">' + num(bl.a0 + k) + '</span><span class="code">' +
          renderTokens(bl.pairs[k].filter(function (w) { return w.t !== 'add'; }), 'in') + '</span></div>';
        html += '<div class="cell chg-add"><span class="gutter">' + num(bl.b0 + k) + '</span><span class="code">' +
          renderTokens(bl.pairs[k].filter(function (w) { return w.t !== 'del'; }), 'in') + '</span></div>';
      }
      for (; k < bl.dels.length; k++) {
        html += '<div class="cell del"><span class="gutter">' + num(bl.a0 + k) + '</span><span class="code">' + esc(bl.dels[k]) + '</span></div><div class="cell empty"></div>';
      }
      for (; k < bl.adds.length; k++) {
        html += '<div class="cell empty"></div><div class="cell add"><span class="gutter">' + num(bl.b0 + k) + '</span><span class="code">' + esc(bl.adds[k]) + '</span></div>';
      }
    } else if (bl.t === 'del') {
      for (i = 0; i < bl.lines.length; i++) {
        html += '<div class="cell del"><span class="gutter">' + num(bl.a0 + i) + '</span><span class="code">' + esc(bl.lines[i]) + '</span></div><div class="cell empty"></div>';
      }
    } else if (bl.t === 'add') {
      for (i = 0; i < bl.lines.length; i++) {
        html += '<div class="cell empty"></div><div class="cell add"><span class="gutter">' + num(bl.b0 + i) + '</span><span class="code">' + esc(bl.lines[i]) + '</span></div>';
      }
    }
  });
  return html + '</div>';
}

function render(skipSave) {
  var a = $('taA').value, b = $('taB').value;
  if (!skipSave) {
    try { localStorage.setItem(LS.a, a); localStorage.setItem(LS.b, b); } catch (e) {}
  }
  updateLineCounts();
  var out = $('output'), stats = $('stats'), empty = $('emptyState');
  if (a === '' && b === '') {
    out.innerHTML = ''; stats.style.display = 'none'; empty.style.display = 'block';
    empty.querySelector('p').textContent = t('emptyHint');
    return;
  }
  empty.style.display = 'none';
  if (a.length > MAX_CHARS || b.length > MAX_CHARS) {
    out.innerHTML = ''; stats.style.display = 'none'; empty.style.display = 'block';
    empty.querySelector('p').textContent = t('tooLarge');
    return;
  }
  var d = L.diffText(a, b);
  var sum = L.changeSummary(d.blocks);
  var sim = L.similarity(d.result, d.linesA.length, d.linesB.length);
  stats.style.display = 'flex';
  $('statAdd').textContent = '+' + num(sum.added) + ' ' + t('added');
  $('statDel').textContent = '-' + num(sum.removed) + ' ' + t('removed');
  $('statChg').textContent = '~' + num(sum.changed) + ' ' + t('changed');
  $('statEq').textContent = num(sum.unchanged) + ' ' + t('unchanged');
  $('statSim').textContent = t('similarity') + ': ' + num(sim) + '%';
  if (!d.result.ops.length || (sum.added === 0 && sum.removed === 0 && sum.changed === 0)) {
    out.innerHTML = '<div class="identical">' + esc(t('noDiff')) + '</div>';
    return;
  }
  out.innerHTML = state.view === 'inline' ? renderInline(d) : renderSide(d);
  state._last = d;
}

var timer = null;
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(function () { render(); }, 250);
}

function swap() {
  var a = $('taA').value;
  $('taA').value = $('taB').value;
  $('taB').value = a;
  render();
}

function copySummary() {
  var d = state._last, msg = $('toast');
  if (!d) return;
  var sum = L.changeSummary(d.blocks);
  var sim = L.similarity(d.result, d.linesA.length, d.linesB.length);
  var text = t('summaryFmt') + ': +' + sum.added + ' ' + t('added') + ', -' + sum.removed + ' ' + t('removed') +
    ', ~' + sum.changed + ' ' + t('changed') + ', ' + t('similarity') + ' ' + sim + '%';
  function done(ok) {
    msg.textContent = ok ? t('copied') : t('copyFail');
    msg.className = 'show';
    setTimeout(function () { msg.className = ''; }, 1600);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
  } else done(false);
}

function downloadDiff() {
  var d = state._last;
  if (!d) return;
  var text = L.toUnifiedDiff(d.result, 'a/original', 'b/modified');
  var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  var aEl = document.createElement('a');
  aEl.href = URL.createObjectURL(blob);
  aEl.download = 'diff-bd.patch';
  document.body.appendChild(aEl);
  aEl.click();
  setTimeout(function () { URL.revokeObjectURL(aEl.href); aEl.remove(); }, 500);
}

function init() {
  $('taA').value = localStorage.getItem(LS.a) || '';
  $('taB').value = localStorage.getItem(LS.b) || '';
  $('taA').addEventListener('input', schedule);
  $('taB').addEventListener('input', schedule);
  $('swapBtn').addEventListener('click', swap);
  $('clearBtn').addEventListener('click', function () { $('taA').value = ''; $('taB').value = ''; render(); });
  $('sampleBtn').addEventListener('click', function () { $('taA').value = SAMPLE_A; $('taB').value = SAMPLE_B; render(); });
  $('copyBtn').addEventListener('click', copySummary);
  $('dlBtn').addEventListener('click', downloadDiff);
  $('langBtn').addEventListener('click', function () {
    state.lang = state.lang === 'en' ? 'bn' : 'en';
    try { localStorage.setItem(LS.lang, state.lang); } catch (e) {}
    applyLang();
  });
  var seg = document.querySelectorAll('.seg button');
  seg.forEach(function (btn) {
    if (btn.getAttribute('data-view') === state.view) btn.classList.add('active');
    btn.addEventListener('click', function () {
      state.view = btn.getAttribute('data-view');
      try { localStorage.setItem(LS.view, state.view); } catch (e) {}
      seg.forEach(function (x) { x.classList.remove('active'); });
      btn.classList.add('active');
      render(true);
    });
  });
  applyLang();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
