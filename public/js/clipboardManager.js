// public/js/clipboardManager.js
// Clipboard operations with clipboard.js

import ClipboardJS from 'clipboard';
import { showNotification } from './utils.js';

class ClipboardManager {
  constructor() {
    this.instances = [];
  }

  // Initialize clipboard for elements
  init(selector = '.copy-btn') {
    const clipboard = new ClipboardJS(selector);

    clipboard.on('success', (e) => {
      showNotification('📋 클립보드에 복사됨', 'success');
      e.clearSelection();
    });

    clipboard.on('error', (e) => {
      showNotification('복사 실패', 'error');
      console.error('Clipboard error:', e);
    });

    this.instances.push(clipboard);
    return clipboard;
  }

  // Copy text to clipboard
  async copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('📋 텍스트 복사됨', 'success');
      return true;
    } catch (error) {
      console.error('Copy error:', error);
      showNotification('복사 실패', 'error');
      return false;
    }
  }

  // Copy code to clipboard
  async copyCode(code, language = '') {
    const success = await this.copyText(code);
    if (success && language) {
      console.log(`Copied ${language} code (${code.length} chars)`);
    }
    return success;
  }

  // Copy file path
  async copyFilePath(path) {
    const success = await this.copyText(path);
    if (success) {
      console.log(`Copied path: ${path}`);
    }
    return success;
  }

  // Copy file content
  async copyFileContent(fileName, content) {
    const success = await this.copyText(content);
    if (success) {
      showNotification(`📄 "${fileName}" 내용 복사됨`, 'success');
    }
    return success;
  }

  // Read from clipboard
  async readText() {
    try {
      const text = await navigator.clipboard.readText();
      return text;
    } catch (error) {
      console.error('Read clipboard error:', error);
      showNotification('클립보드 읽기 실패', 'error');
      return null;
    }
  }

  // Paste from clipboard
  async paste() {
    const text = await this.readText();
    if (text) {
      showNotification('📋 붙여넣기 완료', 'success');
    }
    return text;
  }

  // Add copy button to code blocks
  addCopyButtonsToCodeBlocks() {
    document.querySelectorAll('pre code').forEach((block) => {
      if (block.parentElement.querySelector('.copy-code-btn')) {
        return; // Already has button
      }

      const button = document.createElement('button');
      button.className = 'copy-code-btn';
      button.innerHTML = '📋 복사';
      button.style.cssText = `
                position: absolute;
                top: 8px;
                right: 8px;
                padding: 4px 8px;
                background: rgba(102, 126, 234, 0.8);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                z-index: 10;
            `;

      button.addEventListener('click', async () => {
        const code = block.textContent;
        const success = await this.copyText(code);
        if (success) {
          button.innerHTML = '✅ 복사됨';
          setTimeout(() => {
            button.innerHTML = '📋 복사';
          }, 2000);
        }
      });

      block.parentElement.style.position = 'relative';
      block.parentElement.appendChild(button);
    });
  }

  // Create copy button element
  createCopyButton(text, label = '복사') {
    const button = document.createElement('button');
    button.className = 'copy-btn';
    button.textContent = label;
    button.dataset.clipboardText = text;
        
    button.style.cssText = `
            padding: 6px 12px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        `;

    button.addEventListener('mouseenter', () => {
      button.style.background = '#5568d3';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = '#667eea';
    });

    return button;
  }

  // Copy with formatting
  async copyWithFormatting(html, plainText) {
    try {
      const blob = new Blob([html], { type: 'text/html' });
      const data = [
        new ClipboardItem({
          'text/html': blob,
          'text/plain': new Blob([plainText], { type: 'text/plain' })
        })
      ];
      await navigator.clipboard.write(data);
      showNotification('📋 서식과 함께 복사됨', 'success');
      return true;
    } catch (error) {
      console.error('Copy with formatting error:', error);
      // Fallback to plain text
      return await this.copyText(plainText);
    }
  }

  // Destroy all clipboard instances
  destroy() {
    this.instances.forEach(clipboard => clipboard.destroy());
    this.instances = [];
  }
}

export const clipboard = new ClipboardManager();
export default clipboard;
