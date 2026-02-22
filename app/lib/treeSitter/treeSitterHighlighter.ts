/**
 * treeSitterHighlighter.ts
 *
 * Runs Tree-sitter highlight queries against a parsed syntax tree and
 * returns an array of HighlightRange objects — one per capture.
 *
 * Each HighlightRange maps to a CSS class: `.ts-<captureName>`
 * e.g. @keyword → .ts-keyword, @function → .ts-function
 */

import type { SupportedLanguage } from './treeSitterParser';
import { HIGHLIGHT_QUERIES } from './highlightQueries';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HighlightRange {
  from: number; // byte offset in the source string
  to: number;
  className: string; // e.g. 'ts-keyword'
}

// ─── Query Cache ──────────────────────────────────────────────────────────────

const queryCache = new Map<SupportedLanguage, any>();

function getQuery(language: SupportedLanguage, tsLanguage: any): any {
  if (queryCache.has(language)) {
    return queryCache.get(language)!;
  }

  const q = tsLanguage.query(HIGHLIGHT_QUERIES[language]);
  queryCache.set(language, q);

  return q;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Extract highlight ranges from a Tree-sitter syntax tree.
 *
 * @param tree       - The parsed syntax tree (from treeSitterParser.parse)
 * @param language   - The language used to select the correct query
 * @param tsLanguage - The Parser.Language instance (needed to compile the query)
 */
export function getHighlightRanges(
  tree: any,
  language: SupportedLanguage,

  tsLanguage: any,
): HighlightRange[] {
  const query = getQuery(language, tsLanguage);

  const matches: any[] = query.matches(tree.rootNode);
  const ranges: HighlightRange[] = [];

  for (const match of matches) {
    for (const capture of match.captures as any[]) {
      const node = capture.node;
      const captureName: string = capture.name;

      ranges.push({
        from: node.startIndex,
        to: node.endIndex,
        className: `ts-${captureName}`,
      });
    }
  }

  return ranges;
}
