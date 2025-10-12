// public/js/shortcuts.js
// Keyboard shortcuts system with hotkeys-js

import hotkeys from 'hotkeys-js';
import { showNotification } from './utils.js';

class ShortcutManager {
    constructor() {
        this.shortcuts = new Map();
        this.enabled = true;
        
        // Configure hotkeys
        hotkeys.filter = (event) => {
            return true; // Allow all shortcuts
        };
    }

    // Register shortcut
    register(keys, description, callback, scope = 'all') {
        hotkeys(keys, scope, (event, handler) => {
            event.preventDefault();
            if (this.enabled) {
                callback(event, handler);
            }
        });
        
        this.shortcuts.set(keys, { description, callback, scope });
        console.log(`✓ Shortcut registered: ${keys} - ${description}`);
    }

    // Unregister shortcut
    unregister(keys, scope = 'all') {
        hotkeys.unbind(keys, scope);
        this.shortcuts.delete(keys);
    }

    // Enable/disable shortcuts
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    // Get all shortcuts
    getAllShortcuts() {
        return Array.from(this.shortcuts.entries()).map(([keys, data]) => ({
            keys,
            ...data
        }));
    }

    // Show shortcuts modal
    showShortcutsModal() {
        const shortcuts = this.getAllShortcuts();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2>⌨️ 키보드 단축키</h2>
                    <button class="modal-close" id="shortcuts-modal-close">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                    <div style="display: grid; gap: 10px;">
                        ${shortcuts.map(s => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--hover-background); border-radius: 4px;">
                                <span style="color: var(--text-color);">${s.description}</span>
                                <kbd style="background: var(--editor-background); padding: 4px 8px; border-radius: 3px; font-family: monospace; border: 1px solid var(--border-color);">${s.keys}</kbd>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('shortcuts-modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Initialize default shortcuts
    initDefaultShortcuts() {
        // File operations
        this.register('ctrl+s, command+s', '파일 저장', () => {
            const saveBtn = document.querySelector('[title="Save File"]');
            if (saveBtn) saveBtn.click();
            showNotification('파일 저장됨', 'success');
        });

        this.register('ctrl+o, command+o', '파일 열기', () => {
            showNotification('파일 열기', 'info');
        });

        this.register('ctrl+w, command+w', '탭 닫기', () => {
            const activeTab = document.querySelector('.tab.active');
            if (activeTab) {
                const closeBtn = activeTab.querySelector('.tab-close');
                if (closeBtn) closeBtn.click();
            }
        });

        // Editor operations
        this.register('ctrl+f, command+f', '찾기', () => {
            showNotification('찾기 열림', 'info');
        });

        this.register('ctrl+h, command+h', '바꾸기', () => {
            showNotification('바꾸기 열림', 'info');
        });

        this.register('ctrl+shift+f, command+shift+f', '전체 검색', () => {
            const searchInput = document.getElementById('file-search');
            if (searchInput) searchInput.focus();
        });

        // Code operations
        this.register('ctrl+/, command+/', '주석 토글', () => {
            showNotification('주석 토글', 'info');
        });

        this.register('ctrl+shift+k, command+shift+k', '줄 삭제', () => {
            showNotification('줄 삭제', 'info');
        });

        this.register('alt+up, option+up', '줄 위로 이동', () => {
            showNotification('줄 위로 이동', 'info');
        });

        this.register('alt+down, option+down', '줄 아래로 이동', () => {
            showNotification('줄 아래로 이동', 'info');
        });

        // View operations
        this.register('ctrl+b, command+b', '사이드바 토글', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
            }
        });

        this.register('ctrl+j, command+j', '패널 토글', () => {
            const panel = document.getElementById('panel');
            if (panel) {
                panel.classList.toggle('panel-visible');
            }
        });

        this.register('ctrl+`, command+`', '터미널 토글', () => {
            const terminalTab = document.querySelector('[data-panel="terminal"]');
            if (terminalTab) terminalTab.click();
        });

        // Run operations
        this.register('f5', '코드 실행', () => {
            const runBtn = document.getElementById('run-code-btn');
            if (runBtn) runBtn.click();
        });

        this.register('ctrl+shift+b, command+shift+b', '빌드', () => {
            showNotification('빌드 시작', 'info');
        });

        // Help
        this.register('f1', '명령 팔레트', () => {
            this.showShortcutsModal();
        });

        this.register('ctrl+k ctrl+s, command+k command+s', '단축키 보기', () => {
            this.showShortcutsModal();
        });

        console.log('✅ Default shortcuts initialized');
    }
}

export const shortcuts = new ShortcutManager();
export default shortcuts;
