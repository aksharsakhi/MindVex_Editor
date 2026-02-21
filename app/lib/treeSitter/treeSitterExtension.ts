/**
 * treeSitterExtension.ts
 *
 * A CodeMirror 6 ViewPlugin that integrates tree-sitter syntax highlighting.
 * On every document change, it re-parses the source and applies highlight
 * decorations using the capture-based highlight queries.
 *
 * Usage:
 *   import { treeSitterHighlight } from '~/lib/treeSitter/treeSitterExtension';
 *   // In your CodeMirror extensions array:
 *   extensions={[treeSitterHighlight('java')]}
 */

import { Decoration, type DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { detectLanguage, initParser } from './treeSitterParser';
import type { SupportedLanguage } from './treeSitterParser';
import { getHighlightRanges } from './treeSitterHighlighter';

// ─── Highlight CSS classes ────────────────────────────────────────────────────

const decorationCache = new Map<string, Decoration>();

function getDecoration(className: string): Decoration {
    if (!decorationCache.has(className)) {
        decorationCache.set(className, Decoration.mark({ class: className }));
    }
    return decorationCache.get(className)!;
}

// ─── Plugin factory ───────────────────────────────────────────────────────────

/**
 * Create a CodeMirror 6 extension that applies tree-sitter syntax highlighting.
 *
 * @param lang - The language to highlight.
 */
export function treeSitterHighlight(lang: SupportedLanguage) {
    return ViewPlugin.fromClass(
        class {
            decorations: DecorationSet = Decoration.none;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            private parser: any = null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            private tsLanguage: any = null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            private tree: any = null;

            constructor(view: EditorView) {
                this.init(view, lang);
            }

            private async init(view: EditorView, language: SupportedLanguage) {
                await initParser();

                const tsLang = await loadTsLanguage(language);
                if (!tsLang) return;

                // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
                const ParserCtor = require('web-tree-sitter') as any;
                const parser = new ParserCtor();
                parser.setLanguage(tsLang);

                this.parser = parser;
                this.tsLanguage = tsLang;

                const source = view.state.doc.toString();
                this.tree = parser.parse(source);
                this.decorations = buildDecorations(this.tree, language, tsLang);
                view.update([]);
            }

            update(update: ViewUpdate) {
                if (!update.docChanged || !this.parser || !this.tsLanguage) return;

                const source = update.state.doc.toString();
                this.tree = this.parser.parse(source, this.tree);
                this.decorations = buildDecorations(this.tree, lang, this.tsLanguage);
            }
        },
        { decorations: (v) => v.decorations },
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDecorations(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tree: any,
    language: SupportedLanguage,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tsLanguage: any,
): DecorationSet {
    const ranges = getHighlightRanges(tree, language, tsLanguage);
    const builder = new RangeSetBuilder<Decoration>();

    ranges.sort((a, b) => a.from - b.from || a.to - b.to);

    for (const r of ranges) {
        builder.add(r.from, r.to, getDecoration(r.className));
    }

    return builder.finish();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadTsLanguage(lang: SupportedLanguage): Promise<any | null> {
    const grammarUrls: Record<SupportedLanguage, string> = {
        java: '/tree-sitter-java.wasm',
        python: '/tree-sitter-python.wasm',
        typescript: '/tree-sitter-typescript.wasm',
        javascript: '/tree-sitter-javascript.wasm',
    };
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
        const Parser = require('web-tree-sitter') as any;
        return await Parser.Language.load(grammarUrls[lang]);
    } catch {
        console.warn(`[tree-sitter] Failed to load grammar for ${lang}`);
        return null;
    }
}
