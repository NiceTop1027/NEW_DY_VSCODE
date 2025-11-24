// public/js/formatter.js
// Code formatter using Prettier

import prettier from 'prettier/standalone';
import parserBabel from 'prettier/parser-babel';
import parserHtml from 'prettier/parser-html';
import parserCss from 'prettier/parser-postcss';
import parserMarkdown from 'prettier/parser-markdown';
import parserTypescript from 'prettier/parser-typescript';
import { showNotification } from './utils.js';

class CodeFormatter {
  constructor() {
    this.parsers = {
      javascript: parserBabel,
      typescript: parserTypescript,
      html: parserHtml,
      css: parserCss,
      markdown: parserMarkdown
    };
        
    this.defaultOptions = {
      semi: true,
      singleQuote: true,
      tabWidth: 4,
      trailingComma: 'es5',
      printWidth: 100,
      arrowParens: 'always'
    };
  }

  // Format code
  async format(code, language) {
    try {
      const parser = this.getParser(language);
            
      if (!parser) {
        showNotification(`${language}는 포맷팅을 지원하지 않습니다`, 'warning');
        return code;
      }

      const formatted = prettier.format(code, {
        parser: parser,
        plugins: [
          parserBabel,
          parserHtml,
          parserCss,
          parserMarkdown,
          parserTypescript
        ],
        ...this.defaultOptions
      });

      showNotification('✨ 코드 포맷팅 완료', 'success');
      return formatted;
    } catch (error) {
      console.error('Format error:', error);
      showNotification(`포맷팅 실패: ${error.message}`, 'error');
      return code;
    }
  }

  // Get parser for language
  getParser(language) {
    const parserMap = {
      'javascript': 'babel',
      'js': 'babel',
      'jsx': 'babel',
      'typescript': 'typescript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'markdown': 'markdown',
      'md': 'markdown',
      'json': 'json'
    };

    return parserMap[language.toLowerCase()];
  }

  // Check if language is supported
  isSupported(language) {
    return this.getParser(language) !== undefined;
  }

  // Format on save
  async formatOnSave(code, language) {
    if (this.isSupported(language)) {
      return await this.format(code, language);
    }
    return code;
  }
}

export const formatter = new CodeFormatter();
export default formatter;
