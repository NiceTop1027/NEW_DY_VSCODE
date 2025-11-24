// public/js/screenshot.js
// Code screenshot generator with html2canvas

import html2canvas from 'html2canvas';
import { showNotification } from './utils.js';

class ScreenshotManager {
  constructor() {
    this.themes = {
      'github': {
        background: '#ffffff',
        foreground: '#24292e',
        accent: '#0366d6'
      },
      'dracula': {
        background: '#282a36',
        foreground: '#f8f8f2',
        accent: '#ff79c6'
      },
      'monokai': {
        background: '#272822',
        foreground: '#f8f8f2',
        accent: '#a6e22e'
      },
      'nord': {
        background: '#2e3440',
        foreground: '#d8dee9',
        accent: '#88c0d0'
      }
    };
  }

  // Capture code screenshot
  async captureCode(code, language, theme = 'dracula') {
    try {
      showNotification('📸 스크린샷 생성 중...', 'info');
            
      // Create temporary container
      const container = this.createCodeContainer(code, language, theme);
      document.body.appendChild(container);
            
      // Capture with html2canvas
      const canvas = await html2canvas(container, {
        backgroundColor: null,
        scale: 2, // High quality
        logging: false
      });
            
      // Remove container
      document.body.removeChild(container);
            
      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve));
            
      showNotification('✅ 스크린샷 생성 완료', 'success');
      return { canvas, blob };
    } catch (error) {
      console.error('Screenshot error:', error);
      showNotification('스크린샷 생성 실패', 'error');
      throw error;
    }
  }

  // Create styled code container
  createCodeContainer(code, language, themeName) {
    const theme = this.themes[themeName] || this.themes['dracula'];
        
    const container = document.createElement('div');
    container.style.cssText = `
            position: fixed;
            left: -9999px;
            top: -9999px;
            padding: 40px;
            background: ${theme.background};
            border-radius: 10px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            font-family: 'Fira Code', 'Monaco', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.6;
            max-width: 800px;
        `;
        
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            gap: 8px;
        `;
    header.innerHTML = `
            <div style="width: 12px; height: 12px; border-radius: 50%; background: #ff5f56;"></div>
            <div style="width: 12px; height: 12px; border-radius: 50%; background: #ffbd2e;"></div>
            <div style="width: 12px; height: 12px; border-radius: 50%; background: #27c93f;"></div>
            <span style="margin-left: 10px; color: ${theme.foreground}; opacity: 0.6; font-size: 12px;">${language}</span>
        `;
        
    // Code block
    const pre = document.createElement('pre');
    pre.style.cssText = `
            margin: 0;
            color: ${theme.foreground};
            white-space: pre-wrap;
            word-wrap: break-word;
        `;
    pre.textContent = code;
        
    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
            margin-top: 20px;
            text-align: right;
            color: ${theme.foreground};
            opacity: 0.4;
            font-size: 10px;
        `;
    footer.textContent = 'DY VSCode';
        
    container.appendChild(header);
    container.appendChild(pre);
    container.appendChild(footer);
        
    return container;
  }

  // Download screenshot
  downloadScreenshot(blob, filename = 'code-screenshot.png') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('💾 스크린샷 다운로드됨', 'success');
  }

  // Copy to clipboard
  async copyToClipboard(blob) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      showNotification('📋 클립보드에 복사됨', 'success');
    } catch (error) {
      console.error('Copy error:', error);
      showNotification('클립보드 복사 실패', 'error');
    }
  }

  // Show screenshot modal
  async showScreenshotModal(code, language) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>📸 코드 스크린샷</h2>
                    <button class="modal-close" id="screenshot-modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: var(--text-color);">테마 선택</label>
                        <select id="screenshot-theme" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--editor-background); color: var(--text-color);">
                            <option value="dracula">Dracula</option>
                            <option value="github">GitHub</option>
                            <option value="monokai">Monokai</option>
                            <option value="nord">Nord</option>
                        </select>
                    </div>
                    
                    <div id="screenshot-preview" style="text-align: center; margin: 20px 0;">
                        <p style="color: var(--text-color-light);">미리보기가 여기에 표시됩니다</p>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="generate-screenshot-btn" class="btn-primary">생성</button>
                        <button id="download-screenshot-btn" class="btn-secondary" disabled>다운로드</button>
                        <button id="copy-screenshot-btn" class="btn-secondary" disabled>복사</button>
                    </div>
                </div>
            </div>
        `;
        
    document.body.appendChild(modal);
        
    let currentBlob = null;
        
    // Event listeners
    document.getElementById('screenshot-modal-close').addEventListener('click', () => {
      modal.remove();
    });
        
    document.getElementById('generate-screenshot-btn').addEventListener('click', async () => {
      const theme = document.getElementById('screenshot-theme').value;
      const { canvas, blob } = await this.captureCode(code, language, theme);
      currentBlob = blob;
            
      // Show preview
      const preview = document.getElementById('screenshot-preview');
      preview.innerHTML = '';
      const img = document.createElement('img');
      img.src = canvas.toDataURL();
      img.style.maxWidth = '100%';
      img.style.border = '1px solid var(--border-color)';
      img.style.borderRadius = '4px';
      preview.appendChild(img);
            
      // Enable buttons
      document.getElementById('download-screenshot-btn').disabled = false;
      document.getElementById('copy-screenshot-btn').disabled = false;
    });
        
    document.getElementById('download-screenshot-btn').addEventListener('click', () => {
      if (currentBlob) {
        this.downloadScreenshot(currentBlob, `code-${Date.now()}.png`);
      }
    });
        
    document.getElementById('copy-screenshot-btn').addEventListener('click', () => {
      if (currentBlob) {
        this.copyToClipboard(currentBlob);
      }
    });
        
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

export const screenshot = new ScreenshotManager();
export default screenshot;
