/* diff-bd -- headless-Chrome smoke test via raw CDP.
   Run: node tests/smoke.mjs [desktop|mobile]
   Uses /opt/meta-chromium/chrome + Node global WebSocket. No deps. */
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODE = process.argv[2] || 'desktop';
const WIDTH = MODE === 'mobile' ? 390 : 1280;
const PORT = MODE === 'mobile' ? 9242 : 9241;
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = 'file://' + DIR + '/index.html';

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

class CDP {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 0; this.pending = new Map(); }
  async open() {
    await new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && this.pending.has(d.id)) {
        const { resolve, reject } = this.pending.get(d.id);
        this.pending.delete(d.id);
        d.error ? reject(new Error(JSON.stringify(d.error))) : resolve(d.result);
      } else if (d.method === 'Runtime.consoleAPICalled' && d.params && d.params.type === 'error') {
        this.consoleErrors.push(JSON.stringify(d.params.args));
      } else if (d.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push('exception: ' + JSON.stringify(d.params.exceptionDetails));
      }
    };
    this.consoleErrors = [];
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  async evalExpr(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval exception: ' + JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

const userDir = '/tmp/diff-bd-chrome-' + MODE + '-' + Date.now();
try { execSync('pkill -f "diff-bd-chrome-' + MODE + '"'); } catch (e) {}
await sleep(500);
execSync('rm -rf ' + userDir);
const chrome = spawn('/opt/meta-chromium/chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-proxy-server',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + userDir, 'about:blank'
], { stdio: 'ignore' });
await sleep(1500);
let ver = null;
for (let i = 0; i < 40; i++) {
  try { ver = await (await fetch('http://127.0.0.1:' + PORT + '/json/version')).json(); break; }
  catch (e) { await sleep(750); }
}
if (!ver) throw new Error('Chrome DevTools endpoint never came up');
const cdp = new CDP(ver.webSocketDebuggerUrl);
await cdp.open();
await cdp.send('Target.createTarget', { url: 'about:blank' });
await sleep(500);
const targets = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
const page = targets.find(t => t.type === 'page' && t.url === 'about:blank') || targets.find(t => t.type === 'page');
const cdp2 = new CDP(page.webSocketDebuggerUrl);
await cdp2.open();
await cdp2.send('Page.enable');
await cdp2.send('Runtime.enable');
await cdp2.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: MODE === 'mobile' });
await cdp2.send('Page.navigate', { url: URL });
await sleep(2000);

const setVal = async (id, value) => {
  await cdp2.evalExpr(`(() => { const el = document.getElementById('${id}'); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(700);
};
const click = async (id) => {
  await cdp2.evalExpr(`document.getElementById('${id}').click()`);
  await sleep(700);
};
const text = async (sel) => cdp2.evalExpr(`(() => { const el = document.querySelector('${sel}'); return el ? el.textContent : null; })()`);

check('title renders', (await cdp2.evalExpr('document.title')).startsWith('Diff BD'));
check('subtitle renders EN', (await text('.subtitle')) === 'Text diff checker');
check('empty state visible initially', await cdp2.evalExpr(`getComputedStyle(document.getElementById('emptyState')).display !== 'none'`));

await setVal('taA', 'Buy list:\n- rice 2 kg\n- oil 1 L');
await setVal('taB', 'Buy list:\n- rice 5 kg\n- oil 1 L\n- sugar 1 kg');
check('diff rows render', await cdp2.evalExpr(`document.querySelectorAll('#output .row').length > 0`));
check('del row present', await cdp2.evalExpr(`document.querySelectorAll('#output .row.del, #output .row.chg-del').length > 0`));
check('add row present', await cdp2.evalExpr(`document.querySelectorAll('#output .row.add, #output .row.chg-add').length > 0`));
check('word highlights present', await cdp2.evalExpr(`document.querySelectorAll('#output .wd').length > 0`));
check('stats visible', await cdp2.evalExpr(`getComputedStyle(document.getElementById('stats')).display !== 'none'`));
check('stats: 1 added', (await text('#statAdd')).includes('+1'));
check('stats: 1 changed', (await text('#statChg')).includes('~1'));
check('stats: similarity shown', (await text('#statSim')).includes('%'));
check('line counts update', (await text('#countA')).includes('3'));

await click('sampleBtn');
check('sample loads both sides', await cdp2.evalExpr(`document.getElementById('taA').value.length > 20 && document.getElementById('taB').value.length > 20`));

await cdp2.evalExpr(`document.querySelector('.seg button[data-view="side"]').click()`);
await sleep(700);
check('side-by-side view renders grid', await cdp2.evalExpr(`document.querySelectorAll('#output .side-grid .cell').length > 0`));
await cdp2.evalExpr(`document.querySelector('.seg button[data-view="inline"]').click()`);
await sleep(700);
check('inline view restores rows', await cdp2.evalExpr(`document.querySelectorAll('#output .row').length > 0`));

const beforeSwap = await cdp2.evalExpr(`document.getElementById('taA').value`);
await click('swapBtn');
check('swap exchanges texts', (await cdp2.evalExpr(`document.getElementById('taA').value`)) !== beforeSwap);

await click('copyBtn');
check('copy toast shows', await cdp2.evalExpr(`document.getElementById('toast').className.includes('show') || document.getElementById('toast').textContent.length > 0`));
await click('dlBtn');
await sleep(500);
check('download click does not throw', true);

await click('langBtn');
check('BN subtitle', (await text('.subtitle')) === 'টেক্সট পার্থক্য পরীক্ষক');
check('BN digits in counts', /[০-৯]/.test(await text('#countA')));
check('lang persisted', await cdp2.evalExpr(`localStorage.getItem('diffbd.lang')`) === 'bn');
await cdp2.send('Page.navigate', { url: URL });
await sleep(2000);
check('BN persists after reload', (await text('.subtitle')) === 'টেক্সট পার্থক্য পরীক্ষক');
check('drafts persist after reload', await cdp2.evalExpr(`document.getElementById('taA').value.length > 0`));

if (MODE === 'mobile') {
  check('390px no page overflow', await cdp2.evalExpr(`document.documentElement.scrollWidth <= 390`), await cdp2.evalExpr(`document.documentElement.scrollWidth`));
}

check('zero console/page errors', cdp2.consoleErrors.length === 0, JSON.stringify(cdp2.consoleErrors).slice(0, 300));

console.log(`\n${passed} passed, ${failed} failed (${MODE})`);
cdp2.close(); cdp.close();
chrome.kill();
process.exit(failed ? 1 : 0);
