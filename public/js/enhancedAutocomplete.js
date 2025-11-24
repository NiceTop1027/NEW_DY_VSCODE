// Enhanced Autocomplete using Monaco's built-in features
import * as monaco from 'monaco-editor';

/**
 * Enhanced Autocomplete Provider with symbol extraction
 */
export class EnhancedAutocompleteProvider {
  constructor() {
    this.enabled = true;
  }

  /**
     * Extract variables and functions from code
     */
  extractSymbols(model) {
    const code = model.getValue();
    const symbols = [];
        
    // Extract JavaScript/TypeScript symbols
    const patterns = {
      variable: /(?:const|let|var)\s+(\w+)/g,
      function: /function\s+(\w+)/g,
      arrowFunction: /(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=]+)\s*=>/g,
      class: /class\s+(\w+)/g
    };
        
    let match;
        
    // Variables
    while ((match = patterns.variable.exec(code)) !== null) {
      symbols.push({
        label: match[1],
        kind: monaco.languages.CompletionItemKind.Variable,
        insertText: match[1],
        documentation: 'Variable from current file'
      });
    }
        
    // Functions
    while ((match = patterns.function.exec(code)) !== null) {
      symbols.push({
        label: match[1],
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: match[1] + '(${1})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Function from current file'
      });
    }
        
    // Arrow functions
    while ((match = patterns.arrowFunction.exec(code)) !== null) {
      symbols.push({
        label: match[1],
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: match[1] + '(${1})',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Arrow function from current file'
      });
    }
        
    // Classes
    while ((match = patterns.class.exec(code)) !== null) {
      symbols.push({
        label: match[1],
        kind: monaco.languages.CompletionItemKind.Class,
        insertText: match[1],
        documentation: 'Class from current file'
      });
    }
        
    return symbols;
  }

  /**
     * Provide completions
     */
  provideCompletionItems(model, position, context, token) {
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn
    };

    // Extract symbols from current file
    const symbols = this.extractSymbols(model);

    // Add range to all suggestions
    const suggestions = symbols.map(s => ({
      ...s,
      range: range
    }));

    return { suggestions };
  }
}

/**
 * Register enhanced autocomplete
 */
export function registerEnhancedAutocomplete() {
  const provider = new EnhancedAutocompleteProvider();

  const languages = ['javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'php', 'ruby'];

  languages.forEach(language => {
    monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ['.', ':', '<', '"', '\'', '/', '@', ' '],
      provideCompletionItems: (model, position, context, token) => {
        return provider.provideCompletionItems(model, position, context, token);
      }
    });
  });

  console.log('✅ Enhanced Autocomplete registered');
  return provider;
}
