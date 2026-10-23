# diff-bd — TEST RESULTS

Run: 2026-10-23, factory run #111 (09:00 slot). All commands run from `builds/diff-bd/`.

## Unit tests — 23/23 PASS (`node tests/run-node-tests.js`)

Engine: `js/logic.js` (LCS line diff, token word diff, blocks, stats, unified diff).

- normalize/split: CRLF/CR normalized; `''` -> 0 lines; single line OK
- line diff: exact op order eq/del/add/eq; identical -> all eq; empty-a -> all add; empty-b -> all del; pure append keeps eq prefix
- fallback: 601x501 input uses prefix/suffix fallback (600 del + 500 add), no DP blowup
- word diff: `the quick brown` -> `the quick red` yields eq*4, del(brown), add(red), spaces kept as tokens; identical; fallback returns whole-line del+add
- blocks: del+add grouped into `chg` with 1 word-diff pair, line numbers a0=2/b0=2; add-only run stays `add`
- stats: {added:0, removed:0, changed:1, unchanged:2}; leftover del counted as removed
- similarity: 1/2 eq -> 50.0; empty/empty -> 100
- unified diff: exact expected hunk `@@ -1,3 +1,3 @@` with ` a / -b / +x /  c`; no-change -> headers only
- shipped sample pair (Buy list): {added:1, removed:0, changed:3, unchanged:3}, similarity 46.2, unified diff contains grouped `-`/`+` hunks

Repairs: 1 test-expectation fix (unified diff groups dels before adds — the app output was correct, expectation updated). 0 app-logic bugs in unit.

## Headless-Chrome smoke — 24/24 desktop PASS, 25/25 mobile PASS (`node tests/smoke.mjs [desktop|mobile]`)

Raw CDP against /opt/meta-chromium/chrome, file:// page, fresh profile per run. 0 console/page errors.

- title/subtitle render; empty-state hint shown initially
- paste A/B -> diff rows render; del/add rows; word-highlight `.wd` spans; stats bar visible with +1 added / ~1 changed / similarity %
- line counts update live
- Load sample fills both sides; swap exchanges texts; side-by-side grid renders; inline restores rows
- copy-summary toast shows; download click throws nothing
- BN toggle: subtitle becomes Bengali, Bengali digits in counts, lang + drafts persist across reload
- mobile 390px: no page horizontal overflow; all desktop checks also pass

Repairs: 3 test-side expectation fixes (changed-count expectation on my own test pair; swap compared identical 8-char prefixes; BN-digit check after swap changed the line count). 1 harness fix: Chrome needs a polled startup wait (fixed 1.5 s sleep raced). 1 real flake root-caused: consecutive runs reused `/tmp/diff-bd-chrome-<mode>` and a lingering chrome process resurrected the old profile's localStorage after `rm -rf`, poisoning the next run's assertions — fixed with a timestamped user-data-dir per run. After the fix: 24/24 desktop on two consecutive runs, 25/25 mobile. 0 app-logic bugs in smoke.

## ASCII hygiene

`grep -P '[^\x00-\x7F]'` over js/*.js, index.html, css/style.css: zero matches. Bengali lives as `\uXXXX` escapes in JS and numeric entities in HTML; README.md is intentionally UTF-8.
