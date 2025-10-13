// public/js/snippets.js
// Advanced code snippets and auto-completion with Emmet

import * as monaco from 'monaco-editor';
import emmet from 'emmet-monaco-es';

// C/C++ Snippets
const cSnippets = [
    {
        label: 'fr',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'For loop',
        detail: 'for (int i = 0; i < n; i++)'
    },
    {
        label: 'fori',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'For loop with index',
        detail: 'for (int i = 0; i < n; i++)'
    },
    {
        label: 'forr',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'for (int ${1:i} = ${2:n} - 1; ${1:i} >= 0; ${1:i}--) {\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Reverse for loop',
        detail: 'for (int i = n - 1; i >= 0; i--)'
    },
    {
        label: 'wh',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'while (${1:condition}) {\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'While loop',
        detail: 'while (condition)'
    },
    {
        label: 'if',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'if (${1:condition}) {\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'If statement',
        detail: 'if (condition)'
    },
    {
        label: 'ife',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'if (${1:condition}) {\n\t${2}\n} else {\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'If-else statement',
        detail: 'if-else'
    },
    {
        label: 'main',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'int main() {\n\t$0\n\treturn 0;\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Main function',
        detail: 'int main()'
    },
    {
        label: 'inc',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: '#include <${1:stdio}.h>',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Include header',
        detail: '#include <header.h>'
    },
    {
        label: 'def',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: '#define ${1:NAME} ${2:value}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Define macro',
        detail: '#define NAME value'
    },
    {
        label: 'pr',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'printf("${1:%d}\\n", ${2:var});',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Printf statement',
        detail: 'printf()'
    },
    {
        label: 'sc',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'scanf("%${1:d}", &${2:var});',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Scanf statement',
        detail: 'scanf()'
    },
    {
        label: 'struct',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'struct ${1:Name} {\n\t${2:int data;}\n};',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Struct definition',
        detail: 'struct Name'
    }
];

// Python Snippets
const pythonSnippets = [
    {
        label: 'fr',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'for ${1:i} in range(${2:n}):\n\t$0',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'For loop',
        detail: 'for i in range(n)'
    },
    {
        label: 'fori',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'for ${1:i}, ${2:item} in enumerate(${3:items}):\n\t$0',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'For loop with enumerate',
        detail: 'for i, item in enumerate(items)'
    },
    {
        label: 'wh',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'while ${1:condition}:\n\t$0',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'While loop',
        detail: 'while condition'
    },
    {
        label: 'if',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'if ${1:condition}:\n\t$0',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'If statement',
        detail: 'if condition'
    },
    {
        label: 'ife',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'if ${1:condition}:\n\t${2:pass}\nelse:\n\t$0',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'If-else statement',
        detail: 'if-else'
    },
    {
        label: 'def',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'def ${1:function_name}(${2:params}):\n\t$0',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Function definition',
        detail: 'def function_name(params)'
    },
    {
        label: 'class',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'class ${1:ClassName}:\n\tdef __init__(self${2:, params}):\n\t\t$0',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Class definition',
        detail: 'class ClassName'
    },
    {
        label: 'try',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t$0',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Try-except block',
        detail: 'try-except'
    },
    {
        label: 'with',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'with ${1:open(file)} as ${2:f}:\n\t$0',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'With statement',
        detail: 'with ... as'
    },
    {
        label: 'main',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'if __name__ == "__main__":\n\t$0',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Main guard',
        detail: 'if __name__ == "__main__"'
    }
];

// JavaScript/TypeScript Snippets
const jsSnippets = [
    {
        label: 'fr',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'For loop',
        detail: 'for (let i = 0; i < array.length; i++)'
    },
    {
        label: 'fore',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: '${1:array}.forEach(${2:item} => {\n\t$0\n});',
        insertTextRules: monaco.languages.CompletionItemInsertAsSnippet,
        documentation: 'ForEach loop',
        detail: 'array.forEach(item => {})'
    },
    {
        label: 'fof',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'for (const ${1:item} of ${2:array}) {\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'For-of loop',
        detail: 'for (const item of array)'
    },
    {
        label: 'fun',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'function ${1:name}(${2:params}) {\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Function declaration',
        detail: 'function name(params)'
    },
    {
        label: 'af',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: '(${1:params}) => {\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Arrow function',
        detail: '(params) => {}'
    },
    {
        label: 'afn',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'const ${1:name} = (${2:params}) => {\n\t$0\n};',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Named arrow function',
        detail: 'const name = (params) => {}'
    },
    {
        label: 'cl',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'console.log($0);',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Console log',
        detail: 'console.log()'
    },
    {
        label: 'clg',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'console.log(${1:variable});',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Console log variable',
        detail: 'console.log(variable)'
    },
    {
        label: 'if',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'if (${1:condition}) {\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'If statement',
        detail: 'if (condition)'
    },
    {
        label: 'ife',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'if (${1:condition}) {\n\t${2}\n} else {\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'If-else statement',
        detail: 'if-else'
    },
    {
        label: 'try',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'try {\n\t${1}\n} catch (${2:error}) {\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Try-catch block',
        detail: 'try-catch'
    },
    {
        label: 'async',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'async function ${1:name}(${2:params}) {\n\t$0\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Async function',
        detail: 'async function name(params)'
    },
    {
        label: 'await',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'await ${1:promise}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Await expression',
        detail: 'await promise'
    },
    {
        label: 'class',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'class ${1:ClassName} {\n\tconstructor(${2:params}) {\n\t\t$0\n\t}\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Class definition',
        detail: 'class ClassName'
    },
    {
        label: 'imp',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'import ${1:module} from \'${2:path}\';',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Import statement',
        detail: 'import module from path'
    },
    {
        label: 'exp',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'export ${1:default} ${2:name};',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Export statement',
        detail: 'export default name'
    }
];

// HTML Snippets (Emmet-like)
const htmlSnippets = [
    {
        label: 'html5',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t$0\n</body>\n</html>',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'HTML5 boilerplate',
        detail: 'HTML5 template'
    },
    {
        label: 'div',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: '<div${1: class="${2:}"}>\n\t$0\n</div>',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Div element',
        detail: '<div></div>'
    },
    {
        label: 'a',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: '<a href="${1:#}">${2:Link}</a>',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Anchor tag',
        detail: '<a href=""></a>'
    },
    {
        label: 'img',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: '<img src="${1:}" alt="${2:}">',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Image tag',
        detail: '<img src="" alt="">'
    },
    {
        label: 'script',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: '<script src="${1:}"></script>',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Script tag',
        detail: '<script src=""></script>'
    },
    {
        label: 'link',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: '<link rel="${1:stylesheet}" href="${2:}">',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Link tag',
        detail: '<link rel="stylesheet" href="">'
    }
];

// CSS Snippets
const cssSnippets = [
    {
        label: 'flex',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Flexbox layout',
        detail: 'display: flex'
    },
    {
        label: 'grid',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'display: grid;\ngrid-template-columns: ${1:repeat(3, 1fr)};\ngap: ${2:10px};',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Grid layout',
        detail: 'display: grid'
    },
    {
        label: 'center',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'position: absolute;\ntop: 50%;\nleft: 50%;\ntransform: translate(-50%, -50%);',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Center element',
        detail: 'Center with position'
    }
];

// Register completion providers
export function registerSnippets() {
    // Enable Emmet for HTML, CSS, JSX, etc.
    emmet(monaco, ['html', 'css', 'php', 'jsx', 'tsx', 'vue', 'svelte']);
    
    // C/C++
    monaco.languages.registerCompletionItemProvider('c', {
        provideCompletionItems: (model, position) => {
            return { suggestions: cSnippets };
        }
    });
    
    monaco.languages.registerCompletionItemProvider('cpp', {
        provideCompletionItems: (model, position) => {
            return { suggestions: cSnippets };
        }
    });

    // Python
    monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: (model, position) => {
            return { suggestions: pythonSnippets };
        }
    });

    // JavaScript/TypeScript
    monaco.languages.registerCompletionItemProvider('javascript', {
        provideCompletionItems: (model, position) => {
            return { suggestions: jsSnippets };
        }
    });

    monaco.languages.registerCompletionItemProvider('typescript', {
        provideCompletionItems: (model, position) => {
            return { suggestions: jsSnippets };
        }
    });

    // HTML (with Emmet + custom snippets)
    monaco.languages.registerCompletionItemProvider('html', {
        provideCompletionItems: (model, position) => {
            return { suggestions: htmlSnippets };
        }
    });

    // CSS (with Emmet + custom snippets)
    monaco.languages.registerCompletionItemProvider('css', {
        provideCompletionItems: (model, position) => {
            return { suggestions: cssSnippets };
        }
    });

    console.log('✅ Emmet and advanced snippets registered for all languages');
}
