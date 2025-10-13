// public/js/snippets.js
// Use Monaco Editor's built-in IntelliSense

import * as monaco from 'monaco-editor';

/**
 * Initialize Monaco Editor's built-in language features
 * Monaco already includes excellent IntelliSense for:
 * - JavaScript/TypeScript (TypeScript Language Service)
 * - HTML (with built-in Emmet support)
 * - CSS/SCSS/Less (property suggestions)
 * - JSON (schema validation)
 * - Python, C/C++, Java, etc. (basic syntax)
 */
export function registerSnippets() {
    console.log('✅ Monaco Editor IntelliSense enabled');
    console.log('   Built-in support: JS/TS, HTML, CSS, JSON, Python, C/C++, Java');
    
    // Monaco Editor's IntelliSense is already active by default
    // No custom registration needed - it just works!
    
    // Configure editor suggestions
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
    });
    
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types']
    });
    
    // TypeScript
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false
    });
    
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        typeRoots: ['node_modules/@types']
    });
    
    // HTML - Emmet is built-in, just works!
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
            angular1: false,
            ionic: false
        }
    });
    
    // CSS
    monaco.languages.css.cssDefaults.setOptions({
        validate: true,
        lint: {
            compatibleVendorPrefixes: 'warning',
            vendorPrefix: 'warning',
            duplicateProperties: 'warning',
            emptyRules: 'warning',
            importStatement: 'warning',
            boxModel: 'warning',
            universalSelector: 'warning',
            zeroUnits: 'warning',
            fontFaceProperties: 'warning',
            hexColorLength: 'warning',
            argumentsInColorFunction: 'warning',
            unknownProperties: 'warning',
            ieHack: 'warning',
            unknownVendorSpecificProperties: 'warning',
            propertyIgnoredDueToDisplay: 'warning',
            important: 'warning',
            float: 'warning',
            idSelector: 'warning'
        }
    });
    
    // JSON
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: true,
        schemas: [],
        enableSchemaRequest: true
    });
}
