// public/js/emmetSupport.js
// Emmet support for HTML/CSS

import emmet from 'emmet';

class EmmetSupport {
  constructor() {
    this.enabled = true;
  }

  // Expand abbreviation
  expand(abbreviation, syntax = 'html') {
    try {
      return emmet.default(abbreviation, {
        syntax: syntax,
        options: {
          'output.indent': '    ',
          'output.baseIndent': '',
          'output.newline': '\n',
          'output.tagCase': 'lower',
          'output.attributeCase': 'lower',
          'output.selfClosingStyle': 'html'
        }
      });
    } catch (error) {
      console.error('Emmet expand error:', error);
      return null;
    }
  }

  // Check if text is Emmet abbreviation
  isAbbreviation(text, syntax = 'html') {
    if (!text || text.length === 0) return false;
        
    // Common Emmet patterns
    const patterns = {
      html: /^[a-z][\w\-]*(\.[a-z][\w\-]*)*(\#[a-z][\w\-]*)?(\[[^\]]+\])*(\{[^}]+\})?(\*\d+)?(\>|\+|\^)?/i,
      css: /^[a-z\-]+:\s*[^;]+$/i
    };
        
    return patterns[syntax]?.test(text) || false;
  }

  // Get completion items for Monaco Editor
  getCompletionItems(model, position) {
    const lineContent = model.getLineContent(position.lineNumber);
    const textUntilPosition = lineContent.substring(0, position.column - 1);
    const word = this.getWordAtPosition(textUntilPosition);
        
    if (!word || word.length < 2) return [];
        
    const syntax = this.getSyntaxFromModel(model);
    if (!this.isAbbreviation(word, syntax)) return [];
        
    const expanded = this.expand(word, syntax);
    if (!expanded) return [];
        
    return [{
      label: word,
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: expanded,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      detail: 'Emmet Abbreviation',
      documentation: {
        value: `\`\`\`${syntax}\n${expanded}\n\`\`\``
      },
      range: {
        startLineNumber: position.lineNumber,
        startColumn: position.column - word.length,
        endLineNumber: position.lineNumber,
        endColumn: position.column
      }
    }];
  }

  // Get word at position
  getWordAtPosition(text) {
    const match = text.match(/[\w\-\.\#\[\]\{\}\*\>\+\^:]+$/);
    return match ? match[0] : '';
  }

  // Get syntax from model
  getSyntaxFromModel(model) {
    const language = model.getLanguageId();
    const syntaxMap = {
      'html': 'html',
      'xml': 'xml',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'jsx': 'jsx',
      'tsx': 'jsx'
    };
    return syntaxMap[language] || 'html';
  }

  // Register Emmet for Monaco Editor
  registerForMonaco(monaco) {
    const languages = ['html', 'css', 'scss', 'sass', 'less', 'jsx', 'tsx'];
        
    languages.forEach(language => {
      monaco.languages.registerCompletionItemProvider(language, {
        triggerCharacters: ['.', '#', '>', '+', '^', '*', ':', '[', '{'],
        provideCompletionItems: (model, position) => {
          return {
            suggestions: this.getCompletionItems(model, position)
          };
        }
      });
    });
        
    console.log('✅ Emmet registered for Monaco Editor');
  }

  // Common Emmet snippets
  getCommonSnippets() {
    return {
      html: {
        '!': '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    $0\n</body>\n</html>',
        'html:5': '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    $0\n</body>\n</html>',
        'link:css': '<link rel="stylesheet" href="$1">',
        'script:src': '<script src="$1"></script>',
        'img': '<img src="$1" alt="$2">',
        'a': '<a href="$1">$2</a>'
      },
      css: {
        'df': 'display: flex;',
        'dg': 'display: grid;',
        'dn': 'display: none;',
        'db': 'display: block;',
        'jcc': 'justify-content: center;',
        'aic': 'align-items: center;',
        'fdc': 'flex-direction: column;',
        'fdr': 'flex-direction: row;',
        'tac': 'text-align: center;',
        'tal': 'text-align: left;',
        'tar': 'text-align: right;'
      }
    };
  }

  // Enable/disable Emmet
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

export const emmetSupport = new EmmetSupport();
export default emmetSupport;
