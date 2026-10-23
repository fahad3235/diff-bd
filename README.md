# Diff BD — Text Diff Checker

Offline, bilingual (EN/বাংলা) text comparison tool. Paste an original and a modified text and see exactly what changed — line by line, word by word — right in your browser. Nothing is uploaded; everything runs locally.

Live demo: https://fahad3235.github.io/diff-bd/

## Problem

Students and developers constantly compare two versions of a text: an assignment draft before and after edits, two config files, two lists. Desktop diff tools exist, but a lightweight, phone-friendly, Bangla-capable diff that works fully offline did not exist in this collection.

## Features

1. **Live line-level diff** — LCS-based diff engine recomputes as you type (250 ms debounce); equal / added / removed / changed lines are colour-coded with line numbers.
2. **Word-level highlights** — inside changed lines, the exact changed words are highlighted on both sides (token-level LCS).
3. **Inline and side-by-side views** — switch layouts with one tap; side-by-side scrolls horizontally on phones so the page never overflows.
4. **Stats bar** — added / removed / changed / unchanged line counts plus a difflib-style similarity percentage.
5. **Export** — download a standard unified diff (`.diff`/`.patch` file) or copy a one-line summary to the clipboard.
6. **Bilingual UI** — full EN/বাংলা toggle, persisted; Bengali digits in BN mode.
7. **Drafts persist** — both texts and your view choice are saved in localStorage and restored on reload; empty/loading/error states; 200,000-character per-side cap with a clear inline error.

## Stack

- Vanilla HTML/CSS/JS — no frameworks, no build step, no dependencies, zero network requests.
- `js/logic.js` — pure diff engine (also loadable in Node for tests).
- `js/i18n.js` — EN/BN strings (Bengali stored as `\uXXXX` escapes; sources are pure ASCII).
- `js/app.js` — rendering, persistence, i18n wiring.

## Prerequisites

Any modern browser (Chrome, Firefox, Edge, Safari). For tests: Node.js 18+.

## Install

No install needed — open `index.html` directly, or serve the folder:

```bash
cd diff-bd
python3 -m http.server 8000
# open http://127.0.0.1:8000
```

## Dev commands

```bash
node tests/run-node-tests.js   # 23 unit checks on the diff engine
node tests/smoke.mjs desktop   # 24 headless-Chrome checks (raw CDP, /opt/meta-chromium/chrome)
node tests/smoke.mjs mobile    # 25 headless-Chrome checks at 390px
```

## How the diff works

- Lines are compared with a longest-common-subsequence (LCS) dynamic program; runs of deleted+added lines are paired as "changed" and word-diffed with a token-level LCS (whitespace kept as tokens).
- Inputs larger than ~250,000 line-pairs fall back to a common-prefix/common-suffix scan (correct, but coarse in the middle).
- Similarity = `2 × equal-lines / (linesA + linesB) × 100`, rounded to one decimal — the same formula Python's `difflib` uses.
- The downloaded unified diff uses 3 context lines and `@@ -a,b +c,d @@` hunk headers.

## Testing

See [TEST_RESULTS.md](TEST_RESULTS.md): 23/23 unit + 24/24 desktop + 25/25 mobile headless-Chrome checks, 0 console/page errors. Includes a hand-verified sample pair (3 changed / 1 added / 3 unchanged, 46.2% similarity) and the exact expected unified-diff output.

## Deployment

Static site — copy the folder to any host, or enable GitHub Pages on `main` (root). No server, no environment variables, no build.

## Limitations

- Line-based first: it compares lines, then words inside changed lines — it does not do character-level alignment across lines.
- Very large inputs (>200k characters per side) are rejected with an inline message; the DP engine falls back to prefix/suffix matching past ~250k line-pairs.
- Diff output is a visual/engineering aid, not a merge tool — there is no three-way merge and no conflict resolution.
- Word diff is whitespace-token based; it works for Bangla text but has no language-specific tokenization.

## Status

Complete and verified. Built 2026-10-23 (factory run #111).
