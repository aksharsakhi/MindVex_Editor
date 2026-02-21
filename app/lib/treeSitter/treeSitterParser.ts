/**
 * treeSitterParser.ts
 *
 * Singleton module that initialises web-tree-sitter once and exposes
 * a synchronous-feeling parse() API for use on the main thread.
 *
 * Supported languages: Java, Python, TypeScript, JavaScript
 *
 * Usage:
 *   import { initParser, parse } from '~/lib/treeSitter/treeSitterParser';
 *
 *   await initParser();                          // call once at app start
 *   const tree = await parse(code, 'java');      // subsequent calls are fast
 */

// web-tree-sitter ships a UMD/CJS build. We use a dynamic require() cast so
// TypeScript sees the correct static types while still being able to call
// Parser.init() and `new Parser()` at runtime.
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const ParserModule: any = require('web-tree-sitter');

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupportedLanguage = 'java' | 'python' | 'typescript' | 'javascript';

// Grammar WASM paths — served from /public/ at runtime
const GRAMMAR_URLS: Record<SupportedLanguage, string> = {
    java: '/tree-sitter-java.wasm',
    python: '/tree-sitter-python.wasm',
    typescript: '/tree-sitter-typescript.wasm',
    javascript: '/tree-sitter-javascript.wasm',
};

// ─── Singleton State ──────────────────────────────────────────────────────────

let parserReady = false;
let initPromise: Promise<void> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const languageCache = new Map<SupportedLanguage, any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parserInstances = new Map<SupportedLanguage, any>();

// ─── Init ─────────────────────────────────────────────────────────────────────

/**
 * Initialise the tree-sitter WASM runtime.
 * Safe to call multiple times — subsequent calls return the cached promise.
 */
export async function initParser(): Promise<void> {
    if (parserReady) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        await ParserModule.init({
            locateFile(scriptName: string) {
                if (scriptName === 'tree-sitter.wasm') {
                    return '/tree-sitter.wasm';
                }
                return scriptName;
            },
        });
        parserReady = true;
    })();

    return initPromise;
}

// ─── Language Loading ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadLanguage(lang: SupportedLanguage): Promise<any> {
    if (languageCache.has(lang)) {
        return languageCache.get(lang)!;
    }

    const url = GRAMMAR_URLS[lang];
    if (!url) throw new Error(`Unsupported language: ${lang}`);

    const language = await ParserModule.Language.load(url);
    languageCache.set(lang, language);
    return language;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getParser(lang: SupportedLanguage): Promise<any> {
    if (parserInstances.has(lang)) {
        return parserInstances.get(lang)!;
    }

    const language = await loadLanguage(lang);
    const parser = new ParserModule();
    parser.setLanguage(language);
    parserInstances.set(lang, parser);
    return parser;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse source code and return the Tree-sitter syntax tree.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parse(code: string, language: SupportedLanguage): Promise<any> {
    if (!parserReady) await initParser();

    const parser = await getParser(language);
    const tree = parser.parse(code);

    if (!tree) throw new Error(`Failed to parse code for language: ${language}`);

    return tree;
}

/**
 * Detect the language from a file extension.
 * Returns null if the extension is not supported.
 */
export function detectLanguage(filePath: string): SupportedLanguage | null {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'java': return 'java';
        case 'py': return 'python';
        case 'ts':
        case 'tsx': return 'typescript';
        case 'js':
        case 'jsx': return 'javascript';
        default: return null;
    }
}

/**
 * Parse a file by auto-detecting its language from the file path.
 * Returns null if the language is not supported.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseFile(code: string, filePath: string): Promise<any | null> {
    const lang = detectLanguage(filePath);
    if (!lang) return null;
    return parse(code, lang);
}
