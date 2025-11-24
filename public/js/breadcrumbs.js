// public/js/breadcrumbs.js
// Breadcrumbs navigation system

class BreadcrumbsManager {
  constructor() {
    this.container = null;
    this.currentPath = '';
    this.symbols = [];
  }

  // Initialize breadcrumbs
  init(containerId = 'breadcrumb') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.createContainer();
    }
        
    this.injectStyles();
    console.log('✅ Breadcrumbs initialized');
  }

  // Create breadcrumbs container
  createContainer() {
    const editorGroup = document.getElementById('editor-group');
    if (!editorGroup) return;
        
    const container = document.createElement('div');
    container.id = 'breadcrumb';
    container.className = 'breadcrumb-container';
        
    // Insert before editor
    const editor = editorGroup.querySelector('#editor');
    if (editor) {
      editorGroup.insertBefore(container, editor);
    } else {
      editorGroup.appendChild(container);
    }
        
    this.container = container;
  }

  // Update breadcrumbs for file
  updateForFile(filePath) {
    if (!this.container) return;
        
    this.currentPath = filePath;
    const parts = filePath.split('/').filter(p => p);
        
    this.container.innerHTML = `
            <div class="breadcrumb-items">
                <div class="breadcrumb-item root" data-path="">
                    <span class="codicon codicon-folder"></span>
                    <span>프로젝트</span>
                </div>
                ${parts.map((part, index) => {
    const path = parts.slice(0, index + 1).join('/');
    const isLast = index === parts.length - 1;
    const isFile = isLast && part.includes('.');
                    
    return `
                        <div class="breadcrumb-separator">
                            <span class="codicon codicon-chevron-right"></span>
                        </div>
                        <div class="breadcrumb-item ${isLast ? 'active' : ''}" data-path="${path}">
                            <span class="codicon codicon-${isFile ? 'file' : 'folder'}"></span>
                            <span>${part}</span>
                        </div>
                    `;
  }).join('')}
            </div>
            <div class="breadcrumb-symbols" id="breadcrumb-symbols"></div>
        `;
        
    // Add click handlers
    this.container.querySelectorAll('.breadcrumb-item').forEach(item => {
      item.addEventListener('click', () => {
        const path = item.dataset.path;
        this.navigateTo(path);
      });
    });
  }

  // Update symbols (functions, classes, etc.)
  updateSymbols(symbols) {
    this.symbols = symbols;
    const symbolsContainer = document.getElementById('breadcrumb-symbols');
    if (!symbolsContainer || symbols.length === 0) return;
        
    symbolsContainer.innerHTML = `
            <div class="breadcrumb-separator">
                <span class="codicon codicon-chevron-right"></span>
            </div>
            <div class="breadcrumb-symbols-dropdown">
                <button class="breadcrumb-symbols-btn">
                    <span class="codicon codicon-symbol-method"></span>
                    <span>${symbols[0].name}</span>
                    <span class="codicon codicon-chevron-down"></span>
                </button>
                <div class="breadcrumb-symbols-menu">
                    ${symbols.map(symbol => `
                        <div class="symbol-item" data-line="${symbol.line}">
                            <span class="codicon codicon-${this.getSymbolIcon(symbol.kind)}"></span>
                            <span>${symbol.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
    // Toggle dropdown
    const btn = symbolsContainer.querySelector('.breadcrumb-symbols-btn');
    const menu = symbolsContainer.querySelector('.breadcrumb-symbols-menu');
        
    btn?.addEventListener('click', () => {
      menu.classList.toggle('show');
    });
        
    // Symbol navigation
    symbolsContainer.querySelectorAll('.symbol-item').forEach(item => {
      item.addEventListener('click', () => {
        const line = parseInt(item.dataset.line);
        this.goToLine(line);
        menu.classList.remove('show');
      });
    });
        
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!symbolsContainer.contains(e.target)) {
        menu?.classList.remove('show');
      }
    });
  }

  // Get symbol icon
  getSymbolIcon(kind) {
    const icons = {
      'function': 'symbol-method',
      'method': 'symbol-method',
      'class': 'symbol-class',
      'interface': 'symbol-interface',
      'variable': 'symbol-variable',
      'constant': 'symbol-constant',
      'property': 'symbol-property',
      'enum': 'symbol-enum'
    };
    return icons[kind] || 'symbol-misc';
  }

  // Navigate to path
  navigateTo(path) {
    console.log('Navigate to:', path);
    // TODO: Implement navigation
  }

  // Go to line
  goToLine(line) {
    console.log('Go to line:', line);
    // TODO: Implement line navigation
  }

  // Clear breadcrumbs
  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.currentPath = '';
    this.symbols = [];
  }

  // Inject styles
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
            .breadcrumb-container {
                display: flex;
                align-items: center;
                height: 28px;
                padding: 0 10px;
                background: var(--editor-background);
                border-bottom: 1px solid var(--border-color);
                font-size: 12px;
                overflow-x: auto;
                overflow-y: hidden;
                white-space: nowrap;
            }
            
            .breadcrumb-items {
                display: flex;
                align-items: center;
                gap: 2px;
            }
            
            .breadcrumb-item {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 2px 6px;
                border-radius: 3px;
                cursor: pointer;
                color: var(--text-color-light);
                transition: background 0.2s;
            }
            
            .breadcrumb-item:hover {
                background: var(--hover-background);
                color: var(--text-color);
            }
            
            .breadcrumb-item.active {
                color: var(--text-color);
                font-weight: 500;
            }
            
            .breadcrumb-item .codicon {
                font-size: 14px;
            }
            
            .breadcrumb-separator {
                display: flex;
                align-items: center;
                color: var(--text-color-light);
                opacity: 0.5;
            }
            
            .breadcrumb-symbols {
                display: flex;
                align-items: center;
                margin-left: auto;
            }
            
            .breadcrumb-symbols-dropdown {
                position: relative;
            }
            
            .breadcrumb-symbols-btn {
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 2px 6px;
                background: transparent;
                border: none;
                border-radius: 3px;
                color: var(--text-color-light);
                cursor: pointer;
                font-size: 12px;
            }
            
            .breadcrumb-symbols-btn:hover {
                background: var(--hover-background);
                color: var(--text-color);
            }
            
            .breadcrumb-symbols-menu {
                display: none;
                position: absolute;
                top: 100%;
                right: 0;
                min-width: 200px;
                max-height: 300px;
                overflow-y: auto;
                background: var(--editor-background);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 1000;
                margin-top: 4px;
            }
            
            .breadcrumb-symbols-menu.show {
                display: block;
            }
            
            .symbol-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 10px;
                cursor: pointer;
                color: var(--text-color);
            }
            
            .symbol-item:hover {
                background: var(--hover-background);
            }
            
            .symbol-item .codicon {
                font-size: 14px;
                color: var(--primary-color);
            }
        `;
    document.head.appendChild(style);
  }
}

export const breadcrumbs = new BreadcrumbsManager();
export default breadcrumbs;
