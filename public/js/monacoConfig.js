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

    monaco.languages.css.cssDefaults.setOptions(cssLintOptions);
    monaco.languages.scss.scssDefaults.setOptions(cssLintOptions);
    monaco.languages.less.lessDefaults.setOptions(cssLintOptions);

    console.log('  ✓ CSS/SCSS/LESS configured');
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
