// public/js/editorSplit.js
// Editor split functionality with Split.js

import Split from 'split.js';
import { showNotification } from './utils.js';

class EditorSplitManager {
  constructor() {
    this.splits = new Map(); // id -> split instance
    this.editors = new Map(); // id -> monaco editor instance
    this.activeEditor = null;
    this.splitLayout = 'single'; // single, vertical, horizontal, grid
  }

  // Initialize split system
  init() {
    this.injectStyles();
    console.log('✅ Editor split system initialized');
  }

  // Split editor vertically
  splitVertical() {
    const editorGroup = document.getElementById('editor-group');
    if (!editorGroup) return;

    // Create split containers
    const container = document.createElement('div');
    container.className = 'split-container';
    container.style.cssText = 'display: flex; height: 100%; width: 100%;';

    const left = document.createElement('div');
    left.id = 'editor-split-left';
    left.className = 'split-pane';

    const right = document.createElement('div');
    right.id = 'editor-split-right';
    right.className = 'split-pane';

    // Move current editor to left
    const currentEditor = editorGroup.querySelector('#editor');
    if (currentEditor) {
      left.appendChild(currentEditor);
    }

    // Create right editor
    const rightEditor = document.createElement('div');
    rightEditor.id = 'editor-right';
    rightEditor.className = 'editor-instance';
    rightEditor.style.cssText = 'width: 100%; height: 100%;';
    right.appendChild(rightEditor);

    container.appendChild(left);
    container.appendChild(right);
    editorGroup.appendChild(container);

    // Initialize Split.js
    const split = Split(['#editor-split-left', '#editor-split-right'], {
      sizes: [50, 50],
      minSize: 200,
      gutterSize: 5,
      cursor: 'col-resize',
      direction: 'horizontal',
      onDragEnd: () => {
        this.resizeEditors();
      }
    });

    this.splits.set('vertical', split);
    this.splitLayout = 'vertical';

    // Create Monaco editor for right pane
    this.createEditorInstance('editor-right');

    showNotification('세로 분할 완료', 'success');
    console.log('✅ Editor split vertically');
  }

  // Split editor horizontally
  splitHorizontal() {
    const editorGroup = document.getElementById('editor-group');
    if (!editorGroup) return;

    const container = document.createElement('div');
    container.className = 'split-container';
    container.style.cssText = 'display: flex; flex-direction: column; height: 100%; width: 100%;';

    const top = document.createElement('div');
    top.id = 'editor-split-top';
    top.className = 'split-pane';

    const bottom = document.createElement('div');
    bottom.id = 'editor-split-bottom';
    bottom.className = 'split-pane';

    const currentEditor = editorGroup.querySelector('#editor');
    if (currentEditor) {
      top.appendChild(currentEditor);
    }

    const bottomEditor = document.createElement('div');
    bottomEditor.id = 'editor-bottom';
    bottomEditor.className = 'editor-instance';
    bottomEditor.style.cssText = 'width: 100%; height: 100%;';
    bottom.appendChild(bottomEditor);

    container.appendChild(top);
    container.appendChild(bottom);
    editorGroup.appendChild(container);

    const split = Split(['#editor-split-top', '#editor-split-bottom'], {
      sizes: [50, 50],
      minSize: 100,
      gutterSize: 5,
      cursor: 'row-resize',
      direction: 'vertical',
      onDragEnd: () => {
        this.resizeEditors();
      }
    });

    this.splits.set('horizontal', split);
    this.splitLayout = 'horizontal';

    this.createEditorInstance('editor-bottom');

    showNotification('가로 분할 완료', 'success');
    console.log('✅ Editor split horizontally');
  }

  // Split into grid (4 panes)
  splitGrid() {
    const editorGroup = document.getElementById('editor-group');
    if (!editorGroup) return;

    const container = document.createElement('div');
    container.className = 'split-container grid';
    container.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; height: 100%; width: 100%; gap: 5px;';

    const panes = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        
    panes.forEach((pane, index) => {
      const paneDiv = document.createElement('div');
      paneDiv.id = `editor-split-${pane}`;
      paneDiv.className = 'split-pane';
            
      const editor = document.createElement('div');
      editor.id = `editor-${pane}`;
      editor.className = 'editor-instance';
      editor.style.cssText = 'width: 100%; height: 100%;';
            
      paneDiv.appendChild(editor);
      container.appendChild(paneDiv);
            
      if (index > 0) {
        this.createEditorInstance(`editor-${pane}`);
      }
    });

    const currentEditor = editorGroup.querySelector('#editor');
    if (currentEditor) {
      const firstPane = container.querySelector('#editor-top-left');
      if (firstPane) {
        firstPane.innerHTML = '';
        firstPane.appendChild(currentEditor);
      }
    }

    editorGroup.appendChild(container);
    this.splitLayout = 'grid';

    showNotification('그리드 분할 완료 (4개)', 'success');
    console.log('✅ Editor split into grid');
  }

  // Create Monaco editor instance
  createEditorInstance(containerId) {
    const container = document.getElementById(containerId);
    if (!container || !window.monaco) return;

    try {
      const editor = monaco.editor.create(container, {
        value: '// New editor pane\n',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: true }
      });

      this.editors.set(containerId, editor);
            
      // Focus handler
      editor.onDidFocusEditorText(() => {
        this.activeEditor = containerId;
      });

      console.log(`✅ Created editor instance: ${containerId}`);
      return editor;
    } catch (error) {
      console.error('Create editor instance error:', error);
      return null;
    }
  }

  // Resize all editors
  resizeEditors() {
    this.editors.forEach((editor, id) => {
      if (editor && editor.layout) {
        editor.layout();
      }
    });
  }

  // Close split (return to single editor)
  closeSplit() {
    // Destroy all split instances
    this.splits.forEach((split, id) => {
      split.destroy();
    });
    this.splits.clear();

    // Dispose extra editors
    this.editors.forEach((editor, id) => {
      if (id !== 'editor') {
        editor.dispose();
      }
    });
    this.editors.clear();

    // Reset layout
    const editorGroup = document.getElementById('editor-group');
    if (editorGroup) {
      const splitContainer = editorGroup.querySelector('.split-container');
      if (splitContainer) {
        splitContainer.remove();
      }
    }

    this.splitLayout = 'single';
    showNotification('분할 닫기 완료', 'success');
    console.log('✅ Split closed');
  }

  // Get active editor
  getActiveEditor() {
    if (this.activeEditor && this.editors.has(this.activeEditor)) {
      return this.editors.get(this.activeEditor);
    }
    return window.editor; // Fallback to main editor
  }

  // Set content in active editor
  setActiveEditorContent(content) {
    const editor = this.getActiveEditor();
    if (editor) {
      editor.setValue(content);
    }
  }

  // Get content from active editor
  getActiveEditorContent() {
    const editor = this.getActiveEditor();
    return editor ? editor.getValue() : '';
  }

  // Show split menu
  showSplitMenu() {
    const menu = document.createElement('div');
    menu.className = 'split-menu';
    menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--editor-background);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
        `;

    menu.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: var(--text-color);">에디터 분할</h3>
            <div style="display: grid; gap: 10px;">
                <button id="split-vertical-btn" class="btn-primary" style="width: 100%;">
                    <span>⬌</span> 세로 분할
                </button>
                <button id="split-horizontal-btn" class="btn-primary" style="width: 100%;">
                    <span>⬍</span> 가로 분할
                </button>
                <button id="split-grid-btn" class="btn-primary" style="width: 100%;">
                    <span>⊞</span> 그리드 (4개)
                </button>
                ${this.splitLayout !== 'single' ? `
                    <button id="split-close-btn" class="btn-secondary" style="width: 100%;">
                        <span>✕</span> 분할 닫기
                    </button>
                ` : ''}
            </div>
        `;

    document.body.appendChild(menu);

    // Event listeners
    document.getElementById('split-vertical-btn')?.addEventListener('click', () => {
      this.closeSplit();
      this.splitVertical();
      menu.remove();
    });

    document.getElementById('split-horizontal-btn')?.addEventListener('click', () => {
      this.closeSplit();
      this.splitHorizontal();
      menu.remove();
    });

    document.getElementById('split-grid-btn')?.addEventListener('click', () => {
      this.closeSplit();
      this.splitGrid();
      menu.remove();
    });

    document.getElementById('split-close-btn')?.addEventListener('click', () => {
      this.closeSplit();
      menu.remove();
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 100);
  }

  // Inject styles
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
            .split-container {
                position: relative;
            }
            
            .split-pane {
                overflow: hidden;
                position: relative;
            }
            
            .gutter {
                background-color: var(--border-color);
                background-repeat: no-repeat;
                background-position: 50%;
            }
            
            .gutter.gutter-horizontal {
                background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==');
                cursor: col-resize;
            }
            
            .gutter.gutter-vertical {
                background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII=');
                cursor: row-resize;
            }
            
            .editor-instance {
                border: 1px solid var(--border-color);
            }
        `;
    document.head.appendChild(style);
  }
}

export const editorSplit = new EditorSplitManager();
export default editorSplit;
