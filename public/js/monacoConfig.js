// Monaco Editor Language Server Configuration
// This configures Monaco to work exactly like VS Code
import * as monaco from 'monaco-editor';

/**
 * Configure Monaco Editor with VS Code's exact settings
 * Based on: https://microsoft.github.io/monaco-editor/
 */
export function configureMonacoLanguages() {
    console.log('🚀 Configuring Monaco Language Services (VS Code mode)...');

    // JavaScript/TypeScript Configuration (VS Code defaults)
    configureJavaScriptTypeScript();
    
    // HTML Configuration (VS Code defaults)
    configureHTML();
    
    // CSS Configuration (VS Code defaults)
    configureCSS();
    
    // JSON Configuration (VS Code defaults)
    configureJSON();

    // Python Configuration
    configurePython();

    // C/C++ Configuration
    configureCCpp();

    // R Configuration
    configureR();

    console.log('✅ Monaco configured with VS Code language services');
}

/**
 * JavaScript/TypeScript - VS Code Configuration
 * Source: https://github.com/microsoft/monaco-editor/blob/main/docs/integrate-esm.md
 */
function configureJavaScriptTypeScript() {
    // JavaScript Defaults (same as VS Code)
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: false,
        diagnosticCodesToIgnore: []
    });

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        checkJs: false, // VS Code default: false (enable with // @ts-check)
        typeRoots: ['node_modules/@types'],
        lib: ['ES2020', 'DOM', 'DOM.Iterable']
    });

    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

    // TypeScript Defaults (same as VS Code)
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: false,
        diagnosticCodesToIgnore: []
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types'],
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        strict: true
    });

    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

    // Add common type definitions
    addCommonTypeDefinitions();

    console.log('  ✓ JavaScript/TypeScript configured');
}

/**
 * HTML - VS Code Configuration
 */
function configureHTML() {
    monaco.languages.html.htmlDefaults.setOptions({
        format: {
            tabSize: 2,
            insertSpaces: true,
            wrapLineLength: 120,
            unformatted: 'wbr',
            contentUnformatted: 'pre,code,textarea',
            indentInnerHtml: false,
            preserveNewLines: true,
            maxPreserveNewLines: null,
            indentHandlebars: false,
            endWithNewline: false,
            extraLiners: 'head, body, /html',
            wrapAttributes: 'auto'
        },
        suggest: {
            html5: true,
            angular1: true,
            ionic: true
        }
    });

    console.log('  ✓ HTML configured');
}

/**
 * CSS - VS Code Configuration
 */
function configureCSS() {
    const cssLintOptions = {
        validate: true,
        lint: {
            compatibleVendorPrefixes: 'warning',
            vendorPrefix: 'warning',
            duplicateProperties: 'warning',
            emptyRules: 'warning',
            importStatement: 'ignore',
            boxModel: 'ignore',
            universalSelector: 'ignore',
            zeroUnits: 'ignore',
            fontFaceProperties: 'warning',
            hexColorLength: 'error',
            argumentsInColorFunction: 'error',
            unknownProperties: 'warning',
            ieHack: 'ignore',
            unknownVendorSpecificProperties: 'ignore',
            propertyIgnoredDueToDisplay: 'warning',
            important: 'ignore',
            float: 'ignore',
            idSelector: 'ignore'
        }
    };

    // CSS
    if (monaco.languages.css && monaco.languages.css.cssDefaults) {
        monaco.languages.css.cssDefaults.setOptions(cssLintOptions);
    }

    // SCSS (optional)
    if (monaco.languages.scss && monaco.languages.scss.scssDefaults) {
        monaco.languages.scss.scssDefaults.setOptions(cssLintOptions);
    }

    // LESS (optional)
    if (monaco.languages.less && monaco.languages.less.lessDefaults) {
        monaco.languages.less.lessDefaults.setOptions(cssLintOptions);
    }

    console.log('  ✓ CSS configured');
}

/**
 * JSON - VS Code Configuration
 */
function configureJSON() {
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: true,
        schemas: [
            {
                uri: 'http://json-schema.org/draft-07/schema#',
                fileMatch: ['*.json']
            },
            {
                uri: 'https://json.schemastore.org/package.json',
                fileMatch: ['package.json'],
                schema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        version: { type: 'string' },
                        description: { type: 'string' },
                        main: { type: 'string' },
                        scripts: { type: 'object' },
                        dependencies: { type: 'object' },
                        devDependencies: { type: 'object' }
                    }
                }
            },
            {
                uri: 'https://json.schemastore.org/tsconfig.json',
                fileMatch: ['tsconfig.json'],
                schema: {
                    type: 'object',
                    properties: {
                        compilerOptions: { type: 'object' },
                        include: { type: 'array' },
                        exclude: { type: 'array' }
                    }
                }
            }
        ]
    });

    console.log('  ✓ JSON configured');
}

/**
 * Add common type definitions (like VS Code)
 */
function addCommonTypeDefinitions() {
    // Node.js core modules
    const nodeTypes = `
declare module 'fs' {
    export function readFile(path: string, encoding: string, callback: (err: Error | null, data: string) => void): void;
    export function readFileSync(path: string, encoding?: string): string | Buffer;
    export function writeFile(path: string, data: string | Buffer, callback: (err: Error | null) => void): void;
    export function writeFileSync(path: string, data: string | Buffer): void;
    export function existsSync(path: string): boolean;
    export function mkdirSync(path: string, options?: any): void;
    export function readdirSync(path: string): string[];
}

declare module 'path' {
    export function join(...paths: string[]): string;
    export function resolve(...paths: string[]): string;
    export function dirname(path: string): string;
    export function basename(path: string, ext?: string): string;
    export function extname(path: string): string;
    export const sep: string;
}

declare module 'http' {
    export interface IncomingMessage {
        url?: string;
        method?: string;
        headers: any;
    }
    export interface ServerResponse {
        writeHead(statusCode: number, headers?: any): void;
        end(data?: string): void;
    }
    export function createServer(requestListener: (req: IncomingMessage, res: ServerResponse) => void): any;
}

declare module 'express' {
    export interface Request {
        body: any;
        params: any;
        query: any;
        headers: any;
    }
    export interface Response {
        send(data: any): void;
        json(data: any): void;
        status(code: number): Response;
    }
    export function Router(): any;
    export default function express(): any;
}
`;

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
        nodeTypes,
        'file:///node_modules/@types/node/index.d.ts'
    );

    // React types
    const reactTypes = `
declare module 'react' {
    export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prev: T) => T)) => void];
    export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
    export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
    export function useMemo<T>(factory: () => T, deps: any[]): T;
    export function useRef<T>(initialValue: T): { current: T };
    export function useContext<T>(context: any): T;
    export function useReducer<S, A>(reducer: (state: S, action: A) => S, initialState: S): [S, (action: A) => void];
    
    export interface FC<P = {}> {
        (props: P): JSX.Element | null;
    }
    
    export class Component<P = {}, S = {}> {
        constructor(props: P);
        setState(state: Partial<S>): void;
        render(): JSX.Element | null;
    }
}

declare namespace JSX {
    interface Element {}
    interface IntrinsicElements {
        [elemName: string]: any;
    }
}
`;

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
        reactTypes,
        'file:///node_modules/@types/react/index.d.ts'
    );

    // Browser DOM extensions
    const domTypes = `
interface Console {
    log(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
    info(...args: any[]): void;
    debug(...args: any[]): void;
    table(data: any): void;
    time(label: string): void;
    timeEnd(label: string): void;
}

interface Window {
    console: Console;
    localStorage: Storage;
    sessionStorage: Storage;
    fetch(url: string, options?: any): Promise<Response>;
    [key: string]: any;
}

interface Storage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
}

declare const console: Console;
declare const window: Window;
declare const document: Document;
declare const localStorage: Storage;
declare const sessionStorage: Storage;
declare function fetch(url: string, options?: any): Promise<Response>;
declare function setTimeout(callback: () => void, ms: number): number;
declare function setInterval(callback: () => void, ms: number): number;
declare function clearTimeout(id: number): void;
declare function clearInterval(id: number): void;
`;

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
        domTypes,
        'file:///dom.d.ts'
    );

    console.log('  ✓ Type definitions added (Node.js, React, DOM)');
}

/**
 * Python Configuration
 */
function configurePython() {
    // Register Python completion provider
    monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: (model, position) => {
            const suggestions = [
                // Built-in functions
                ...['print', 'input', 'len', 'range', 'str', 'int', 'float', 'bool', 'list', 'dict', 'set', 'tuple',
                    'open', 'type', 'isinstance', 'hasattr', 'getattr', 'setattr', 'dir', 'help',
                    'abs', 'all', 'any', 'ascii', 'bin', 'chr', 'ord', 'hex', 'oct', 'max', 'min', 'sum',
                    'sorted', 'reversed', 'enumerate', 'zip', 'map', 'filter', 'lambda'].map(func => ({
                    label: func,
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: func,
                    documentation: `Python built-in function: ${func}`
                })),
                // Keywords
                ...['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally',
                    'with', 'as', 'import', 'from', 'return', 'yield', 'pass', 'break', 'continue',
                    'raise', 'assert', 'del', 'global', 'nonlocal', 'lambda', 'and', 'or', 'not', 'in', 'is'].map(kw => ({
                    label: kw,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: kw,
                    documentation: `Python keyword: ${kw}`
                })),
                // Common libraries
                {
                    label: 'import numpy as np',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'import numpy as np',
                    documentation: 'Import NumPy library'
                },
                {
                    label: 'import pandas as pd',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'import pandas as pd',
                    documentation: 'Import Pandas library'
                },
                {
                    label: 'import matplotlib.pyplot as plt',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'import matplotlib.pyplot as plt',
                    documentation: 'Import Matplotlib library'
                },
                // Snippets
                {
                    label: 'def function',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'def ${1:function_name}(${2:params}):\n    ${3:pass}$0',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Function definition'
                },
                {
                    label: 'class',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'class ${1:ClassName}:\n    def __init__(self${2:, params}):\n        ${3:pass}$0',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Class definition'
                },
                {
                    label: 'if __name__ == "__main__"',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'if __name__ == "__main__":\n    ${1:pass}$0',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Main guard'
                }
            ];

            return { suggestions };
        }
    });

    console.log('  ✓ Python configured with IntelliSense');
}

/**
 * C/C++ Configuration
 */
function configureCCpp() {
    const cppCompletions = {
        provideCompletionItems: (model, position) => {
            const suggestions = [
                // Standard library functions
                ...['printf', 'scanf', 'malloc', 'free', 'sizeof', 'strlen', 'strcpy', 'strcmp', 'strcat',
                    'memcpy', 'memset', 'fopen', 'fclose', 'fread', 'fwrite', 'fprintf', 'fscanf'].map(func => ({
                    label: func,
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: func,
                    documentation: `C standard library function: ${func}`
                })),
                // C++ STL
                ...['std::cout', 'std::cin', 'std::endl', 'std::vector', 'std::string', 'std::map', 'std::set',
                    'std::pair', 'std::make_pair', 'std::sort', 'std::find', 'std::max', 'std::min'].map(func => ({
                    label: func,
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: func,
                    documentation: `C++ STL: ${func}`
                })),
                // Keywords
                ...['int', 'char', 'float', 'double', 'void', 'long', 'short', 'unsigned', 'signed',
                    'struct', 'union', 'enum', 'typedef', 'const', 'static', 'extern', 'volatile',
                    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
                    'return', 'goto', 'sizeof', 'auto', 'register'].map(kw => ({
                    label: kw,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: kw,
                    documentation: `C/C++ keyword: ${kw}`
                })),
                // Snippets
                {
                    label: 'include',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'include <${1:stdio.h}>$0',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Include header file',
                    filterText: '#include'
                },
                {
                    label: 'main',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'int main() {\n    ${1}\n    return 0;\n}$0',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Main function'
                },
                {
                    label: 'for loop',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n    ${3}\n}$0',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'For loop'
                },
                {
                    label: 'struct',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'struct ${1:Name} {\n    ${2}\n};$0',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Struct definition'
                }
            ];

            return { suggestions };
        }
    };

    monaco.languages.registerCompletionItemProvider('c', cppCompletions);
    monaco.languages.registerCompletionItemProvider('cpp', cppCompletions);

    console.log('  ✓ C/C++ configured with IntelliSense');
}

/**
 * R Configuration
 */
function configureR() {
    monaco.languages.registerCompletionItemProvider('r', {
        provideCompletionItems: (model, position) => {
            const suggestions = [
                // Base R functions
                ...['print', 'cat', 'paste', 'length', 'sum', 'mean', 'median', 'sd', 'var', 'min', 'max',
                    'range', 'quantile', 'summary', 'str', 'head', 'tail', 'names', 'dim', 'nrow', 'ncol',
                    'c', 'seq', 'rep', 'matrix', 'array', 'data.frame', 'list', 'factor',
                    'read.csv', 'write.csv', 'read.table', 'write.table'].map(func => ({
                    label: func,
                    kind: monaco.languages.CompletionItemKind.Function,
                    insertText: func,
                    documentation: `R base function: ${func}`
                })),
                // Keywords
                ...['function', 'if', 'else', 'for', 'while', 'repeat', 'break', 'next', 'return',
                    'TRUE', 'FALSE', 'NULL', 'NA', 'NaN', 'Inf', 'in'].map(kw => ({
                    label: kw,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: kw,
                    documentation: `R keyword: ${kw}`
                })),
                // Common libraries
                {
                    label: 'library(ggplot2)',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'library(ggplot2)',
                    documentation: 'Load ggplot2 library'
                },
                {
                    label: 'library(dplyr)',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'library(dplyr)',
                    documentation: 'Load dplyr library'
                },
                {
                    label: 'library(tidyr)',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'library(tidyr)',
                    documentation: 'Load tidyr library'
                },
                // Snippets
                {
                    label: 'function',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: '${1:name} <- function(${2:params}) {\n    ${3}\n}$0',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'Function definition'
                },
                {
                    label: 'for loop',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'for (${1:i} in ${2:1:10}) {\n    ${3}\n}$0',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'For loop'
                },
                {
                    label: 'ggplot',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'ggplot(${1:data}, aes(x = ${2:x}, y = ${3:y})) +\n    geom_${4:point}()$0',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: 'ggplot2 plot'
                }
            ];

            return { suggestions };
        }
    });

    console.log('  ✓ R configured with IntelliSense');
}

