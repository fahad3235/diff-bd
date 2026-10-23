/* diff-bd -- EN/Bangla strings. Non-ASCII is emitted as \uXXXX escapes by build step. */
'use strict';

var STRINGS = {
  en: {
    subtitle: 'Text diff checker',
    original: 'Original',
    modified: 'Modified',
    lines: 'lines',
    swap: 'Swap',
    clear: 'Clear',
    sample: 'Load sample',
    viewInline: 'Inline',
    viewSide: 'Side by side',
    copySummary: 'Copy summary',
    download: 'Download .diff',
    added: 'Added',
    removed: 'Removed',
    changed: 'Changed',
    unchanged: 'Unchanged',
    similarity: 'Similarity',
    emptyHint: 'Paste text on both sides to see the difference.',
    tooLarge: 'Too large \u2014 keep each side under 200,000 characters.',
    copied: 'Copied!',
    copyFail: 'Copy failed \u2014 select and copy manually.',
    summaryFmt: 'Diff BD summary',
    footer: '100% offline \u2014 your text never leaves this device.',
    noDiff: 'The two texts are identical.',
    langName: '\u09ac\u09be\u0982\u09b2\u09be'
  },
  bn: {
    subtitle: '\u099f\u09c7\u0995\u09cd\u09b8\u099f \u09aa\u09be\u09b0\u09cd\u09a5\u0995\u09cd\u09af \u09aa\u09b0\u09c0\u0995\u09cd\u09b7\u0995',
    original: '\u09ae\u09c2\u09b2',
    modified: '\u09aa\u09b0\u09bf\u09ac\u09b0\u09cd\u09a4\u09bf\u09a4',
    lines: '\u09b2\u09be\u0987\u09a8',
    swap: '\u0985\u09a6\u09b2\u09ac\u09a6\u09b2',
    clear: '\u09ae\u09c1\u099b\u09c1\u09a8',
    sample: '\u09a8\u09ae\u09c1\u09a8\u09be \u09b2\u09cb\u09a1',
    viewInline: '\u098f\u0995-\u09b8\u09be\u09b0\u09bf\u09a4\u09c7',
    viewSide: '\u09aa\u09be\u09b6\u09be\u09aa\u09be\u09b6\u09bf',
    copySummary: '\u09b8\u09be\u09b0\u09be\u0982\u09b6 \u0995\u09aa\u09bf',
    download: '.diff \u09a1\u09be\u0989\u09a8\u09b2\u09cb\u09a1',
    added: '\u09af\u09cb\u0997',
    removed: '\u09ac\u09be\u09a6',
    changed: '\u09aa\u09b0\u09bf\u09ac\u09b0\u09cd\u09a4\u09a8',
    unchanged: '\u0985\u09aa\u09b0\u09bf\u09ac\u09b0\u09cd\u09a4\u09bf\u09a4',
    similarity: '\u09ae\u09bf\u09b2',
    emptyHint: '\u09aa\u09be\u09b0\u09cd\u09a5\u0995\u09cd\u09af \u09a6\u09c7\u0996\u09a4\u09c7 \u09a6\u09c1\u0987 \u09aa\u09be\u09b6\u09c7 \u099f\u09c7\u0995\u09cd\u09b8\u099f \u09ac\u09b8\u09be\u09a8\u0964',
    tooLarge: '\u0996\u09c1\u09ac \u09ac\u09a1\u09bc \u2014 \u09aa\u09cd\u09b0\u09a4\u09bf\u099f\u09bf \u09aa\u09be\u09b6 \u09e8\u09e6\u09e6,\u09e6\u09e6\u09e6 \u0985\u0995\u09cd\u09b7\u09b0\u09c7\u09b0 \u09a8\u09bf\u099a\u09c7 \u09b0\u09be\u0996\u09c1\u09a8\u0964',
    copied: '\u0995\u09aa\u09bf \u09b9\u09af\u09bc\u09c7\u099b\u09c7!',
    copyFail: '\u0995\u09aa\u09bf \u09ac\u09cd\u09af\u09b0\u09cd\u09a5 \u2014 \u09a8\u09bf\u099c\u09c7 \u09b8\u09bf\u09b2\u09c7\u0995\u09cd\u099f \u0995\u09b0\u09c7 \u0995\u09aa\u09bf \u0995\u09b0\u09c1\u09a8\u0964',
    summaryFmt: 'Diff BD \u09b8\u09be\u09b0\u09be\u0982\u09b6',
    footer: '\u09e7\u09e6\u09e6% \u0985\u09ab\u09b2\u09be\u0987\u09a8 \u2014 \u0986\u09aa\u09a8\u09be\u09b0 \u099f\u09c7\u0995\u09cd\u09b8\u099f \u098f\u0987 \u09a1\u09bf\u09ad\u09be\u0987\u09b8 \u099b\u09be\u09a1\u09bc\u09c7 \u09a8\u09be\u0964',
    noDiff: '\u09a6\u09c1\u099f\u09bf \u099f\u09c7\u0995\u09cd\u09b8\u099f \u098f\u0995\u0987\u0964',
    langName: 'EN'
  }
};

if (typeof window !== 'undefined') window.DIFF_STRINGS = STRINGS;
