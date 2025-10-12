// public/js/extensionSystem.js
// VS Code Extension System with SystemJS

import { System } from 'systemjs';
import { persistentStorage } from './persistentStorage.js';
import { showNotification } from './utils.js';

class ExtensionSystem {
    constructor() {
        this.extensions = new Map(); // id -> extension
        this.installedExtensions = new Map();
        this.activeExtensions = new Set();
        this.extensionAPI = this.createExtensionAPI();
        
        // VS Code Marketplace API
        this.marketplaceAPI = 'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery';
        this.marketplaceCache = [];
        this.lastFetch = 0;
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
        
        // Fallback popular extensions
        this.fallbackExtensions = [
            {
                id: 'prettier-vscode',
                name: 'Prettier',
                description: '코드 포맷터',
                version: '1.0.0',
                author: 'Prettier',
                icon: '🎨',
                category: 'Formatters',
                downloads: 1000000,
                rating: 5.0,
                url: 'https://cdn.jsdelivr.net/npm/prettier@2.8.8/standalone.js',
                activate: async (api) => {
                    console.log('Prettier activated');
                }
            },
            {
                id: 'eslint',
                name: 'ESLint',
                description: 'JavaScript 린터',
                version: '1.0.0',
                author: 'ESLint',
                icon: '🔍',
                category: 'Linters',
                downloads: 900000,
                rating: 4.8,
                url: 'https://cdn.jsdelivr.net/npm/eslint@8.0.0/lib/api.js',
                activate: async (api) => {
                    console.log('ESLint activated');
                }
            },
            {
                id: 'live-server',
                name: 'Live Server',
                description: '라이브 서버',
                version: '1.0.0',
                author: 'Ritwick Dey',
                icon: '🌐',
                category: 'Other',
                downloads: 800000,
                rating: 4.9,
                activate: async (api) => {
                    console.log('Live Server activated');
                }
            },
            {
                id: 'material-theme',
                name: 'Material Theme',
                description: '머티리얼 테마',
                version: '1.0.0',
                author: 'Mattia Astorino',
                icon: '🎨',
                category: 'Themes',
                downloads: 700000,
                rating: 4.7,
                activate: async (api) => {
                    api.setTheme('material-dark');
                }
            },
            {
                id: 'bracket-pair',
                name: 'Bracket Pair Colorizer',
                description: '괄호 색상',
                version: '1.0.0',
                author: 'CoenraadS',
                icon: '🌈',
                category: 'Other',
                downloads: 600000,
                rating: 4.6,
                activate: async (api) => {
                    console.log('Bracket Pair activated');
                }
            },
            {
                id: 'auto-rename-tag',
                name: 'Auto Rename Tag',
                description: 'HTML 태그 자동 이름 변경',
                version: '1.0.0',
                author: 'Jun Han',
                icon: '🏷️',
                category: 'Other',
                downloads: 500000,
                rating: 4.8,
                activate: async (api) => {
                    console.log('Auto Rename Tag activated');
                }
            },
            {
                id: 'path-intellisense',
                name: 'Path Intellisense',
                description: '경로 자동완성',
                version: '1.0.0',
                author: 'Christian Kohler',
                icon: '📁',
                category: 'Other',
                downloads: 450000,
                rating: 4.7,
                activate: async (api) => {
                    console.log('Path Intellisense activated');
                }
            },
            {
                id: 'indent-rainbow',
                name: 'Indent Rainbow',
                description: '들여쓰기 색상',
                version: '1.0.0',
                author: 'oderwat',
                icon: '🌈',
                category: 'Other',
                downloads: 400000,
                rating: 4.5,
                activate: async (api) => {
                    console.log('Indent Rainbow activated');
                }
            }
        ];
    }

    // Create Extension API
    createExtensionAPI() {
        return {
            // Editor API
            getEditor: () => window.editor,
            getActiveFile: () => window.activeFile,
            
            // Commands
            registerCommand: (id, callback) => {
                console.log(`Command registered: ${id}`);
            },
            
            // UI
            showNotification: (message, type) => {
                showNotification(message, type);
            },
            
            // Theme
            setTheme: (theme) => {
                console.log(`Theme set: ${theme}`);
            },
            
            // File System
            readFile: async (path) => {
                // TODO: Implement
            },
            
            writeFile: async (path, content) => {
                // TODO: Implement
            }
        };
    }

    // Fetch extensions from VS Code Marketplace
    async fetchMarketplaceExtensions(pageSize = 50) {
        try {
            // Check cache
            const now = Date.now();
            if (this.marketplaceCache.length > 0 && (now - this.lastFetch) < this.cacheDuration) {
                console.log('📦 Using cached marketplace data');
                return this.marketplaceCache;
            }
            
            console.log('🌐 Fetching from VS Code Marketplace...');
            
            const response = await fetch(this.marketplaceAPI, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json;api-version=3.0-preview.1'
                },
                body: JSON.stringify({
                    filters: [{
                        criteria: [
                            { filterType: 8, value: 'Microsoft.VisualStudio.Code' },
                            { filterType: 10, value: 'target:"Microsoft.VisualStudio.Code"' },
                            { filterType: 12, value: '4096' } // Verified publishers
                        ],
                        pageNumber: 1,
                        pageSize: pageSize,
                        sortBy: 4, // Most downloaded
                        sortOrder: 2
                    }],
                    assetTypes: [],
                    flags: 914
                })
            });
            
            if (!response.ok) {
                throw new Error(`Marketplace API error: ${response.status}`);
            }
            
            const data = await response.json();
            const extensions = this.parseMarketplaceResponse(data);
            
            this.marketplaceCache = extensions;
            this.lastFetch = now;
            
            console.log(`✅ Fetched ${extensions.length} extensions from marketplace`);
            showNotification(`${extensions.length}개 확장 프로그램 로드됨`, 'success');
            
            return extensions;
        } catch (error) {
            console.error('Fetch marketplace error:', error);
            showNotification('마켓플레이스 연결 실패, 기본 목록 사용', 'warning');
            return this.fallbackExtensions;
        }
    }

    // Parse marketplace API response
    parseMarketplaceResponse(data) {
        try {
            const results = data.results[0];
            if (!results || !results.extensions) {
                return this.fallbackExtensions;
            }
            
            return results.extensions.map(ext => {
                const publisher = ext.publisher.publisherName;
                const name = ext.extensionName;
                const displayName = ext.displayName;
                const description = ext.shortDescription || '';
                const version = ext.versions[0]?.version || '1.0.0';
                const installs = ext.statistics?.find(s => s.statisticName === 'install')?.value || 0;
                const rating = ext.statistics?.find(s => s.statisticName === 'averagerating')?.value || 0;
                const icon = ext.versions[0]?.files?.find(f => f.assetType === 'Microsoft.VisualStudio.Services.Icons.Default')?.source || '';
                
                // Get category
                const categories = ext.categories || [];
                const category = categories[0] || 'Other';
                
                return {
                    id: `${publisher}.${name}`,
                    name: displayName,
                    description: description,
                    version: version,
                    author: publisher,
                    icon: icon || this.getDefaultIcon(category),
                    category: category,
                    downloads: installs,
                    rating: rating,
                    url: `https://marketplace.visualstudio.com/items?itemName=${publisher}.${name}`,
                    vsixUrl: ext.versions[0]?.files?.find(f => f.assetType === 'Microsoft.VisualStudio.Services.VSIXPackage')?.source,
                    activate: async (api) => {
                        console.log(`${displayName} activated`);
                    }
                };
            });
        } catch (error) {
            console.error('Parse marketplace response error:', error);
            return this.fallbackExtensions;
        }
    }

    // Get default icon for category
    getDefaultIcon(category) {
        const icons = {
            'Programming Languages': '💻',
            'Snippets': '📝',
            'Linters': '🔍',
            'Themes': '🎨',
            'Debuggers': '🐛',
            'Formatters': '✨',
            'Keymaps': '⌨️',
            'SCM Providers': '🔀',
            'Other': '🔧',
            'Extension Packs': '📦',
            'Language Packs': '🌍',
            'Data Science': '📊',
            'Machine Learning': '🤖',
            'Notebooks': '📓',
            'Testing': '🧪',
            'Visualization': '📈'
        };
        return icons[category] || '🔧';
    }

    // Initialize extension system
    async init() {
        try {
            // Load installed extensions from storage
            const installed = await persistentStorage.loadSetting('installed_extensions');
            if (installed) {
                this.installedExtensions = new Map(Object.entries(installed));
            }
            
            // Fetch marketplace extensions
            await this.fetchMarketplaceExtensions();
            
            console.log('✅ Extension system initialized');
            return true;
        } catch (error) {
            console.error('Extension system init error:', error);
            return false;
        }
    }

    // Install extension
    async installExtension(extensionId) {
        try {
            const extension = this.marketplaceCache.find(ext => ext.id === extensionId) ||
                             this.fallbackExtensions.find(ext => ext.id === extensionId);
            if (!extension) {
                throw new Error('Extension not found');
            }
            
            showNotification(`"${extension.name}" 설치 중...`, 'info');
            
            // Download and load extension if it has a URL
            if (extension.vsixUrl || extension.url) {
                try {
                    await this.downloadAndLoadExtension(extension);
                } catch (err) {
                    console.warn('Failed to download extension, using stub:', err);
                }
            }
            
            // Save to installed list
            this.installedExtensions.set(extensionId, {
                ...extension,
                installedAt: Date.now(),
                enabled: true
            });
            
            // Save to storage
            await this.saveInstalledExtensions();
            
            // Activate extension
            await this.activateExtension(extensionId);
            
            showNotification(`✅ "${extension.name}" 설치 및 활성화 완료`, 'success');
            return true;
        } catch (error) {
            console.error('Install extension error:', error);
            showNotification(`설치 실패: ${error.message}`, 'error');
            return false;
        }
    }

    // Download and load extension
    async downloadAndLoadExtension(extension) {
        try {
            console.log(`📥 Loading extension: ${extension.name}`);
            
            // For browser-compatible extensions, load from CDN
            const cdnMappings = {
                'esbenp.prettier-vscode': 'https://cdn.jsdelivr.net/npm/prettier@2.8.8/standalone.js',
                'dbaeumer.vscode-eslint': 'https://cdn.jsdelivr.net/npm/eslint@8.0.0/lib/api.js',
                'ritwickdey.LiveServer': null, // Browser-based, no external lib needed
                'PKief.material-icon-theme': null, // Theme, no external lib
                'CoenraadS.bracket-pair-colorizer': null, // Editor feature
                'formulahendry.auto-rename-tag': null, // Editor feature
                'christian-kohler.path-intellisense': null, // Editor feature
                'oderwat.indent-rainbow': null // Editor feature
            };
            
            const cdnUrl = cdnMappings[extension.id];
            
            if (cdnUrl) {
                // Load from CDN using SystemJS
                await System.import(cdnUrl);
                console.log(`✅ Loaded ${extension.name} from CDN`);
            } else {
                console.log(`ℹ️ ${extension.name} uses built-in functionality`);
            }
            
            return true;
        } catch (error) {
            console.error('Download extension error:', error);
            throw error;
        }
    }

    // Uninstall extension
    async uninstallExtension(extensionId) {
        try {
            const extension = this.installedExtensions.get(extensionId);
            if (!extension) {
                throw new Error('Extension not installed');
            }
            
            // Deactivate
            this.deactivateExtension(extensionId);
            
            // Remove from installed
            this.installedExtensions.delete(extensionId);
            
            // Save to storage
            await this.saveInstalledExtensions();
            
            showNotification(`"${extension.name}" 제거됨`, 'success');
            return true;
        } catch (error) {
            console.error('Uninstall extension error:', error);
            showNotification(`제거 실패: ${error.message}`, 'error');
            return false;
        }
    }

    // Activate extension
    async activateExtension(extensionId) {
        try {
            const extension = this.installedExtensions.get(extensionId) || 
                             this.marketplaceCache.find(ext => ext.id === extensionId) ||
                             this.fallbackExtensions.find(ext => ext.id === extensionId);
            
            if (!extension) {
                throw new Error('Extension not found');
            }
            
            if (this.activeExtensions.has(extensionId)) {
                return; // Already active
            }
            
            // Call activate function
            if (extension.activate) {
                await extension.activate(this.extensionAPI);
            }
            
            this.activeExtensions.add(extensionId);
            console.log(`✅ Extension activated: ${extension.name}`);
            
            return true;
        } catch (error) {
            console.error('Activate extension error:', error);
            return false;
        }
    }

    // Deactivate extension
    deactivateExtension(extensionId) {
        this.activeExtensions.delete(extensionId);
        console.log(`Extension deactivated: ${extensionId}`);
    }

    // Save installed extensions
    async saveInstalledExtensions() {
        const installed = Object.fromEntries(this.installedExtensions);
        await persistentStorage.saveSetting('installed_extensions', installed);
    }

    // Get marketplace extensions
    getMarketplaceExtensions(category = null, search = null) {
        let extensions = this.marketplaceCache.length > 0 ? [...this.marketplaceCache] : [...this.fallbackExtensions];
        
        if (category && category !== 'All') {
            extensions = extensions.filter(ext => ext.category === category);
        }
        
        if (search) {
            const query = search.toLowerCase();
            extensions = extensions.filter(ext => 
                ext.name.toLowerCase().includes(query) ||
                ext.description.toLowerCase().includes(query) ||
                ext.author.toLowerCase().includes(query)
            );
        }
        
        return extensions;
    }
    
    // Refresh marketplace
    async refreshMarketplace() {
        this.marketplaceCache = [];
        this.lastFetch = 0;
        await this.fetchMarketplaceExtensions();
        showNotification('마켓플레이스 새로고침 완료', 'success');
    }

    // Show marketplace modal
    showMarketplace() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh;">
                <div class="modal-header">
                    <h2>🛒 확장 프로그램 마켓플레이스</h2>
                    <button class="modal-close" id="marketplace-modal-close">&times;</button>
                </div>
                <div class="modal-body" style="display: flex; flex-direction: column; gap: 15px;">
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="extension-search" placeholder="확장 프로그램 검색..." 
                            style="flex: 1; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--editor-background); color: var(--text-color);">
                        <select id="extension-category" style="padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--editor-background); color: var(--text-color);">
                            <option value="All">모든 카테고리</option>
                            <option value="Formatters">포맷터</option>
                            <option value="Linters">린터</option>
                            <option value="Themes">테마</option>
                            <option value="Other">기타</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                        <button class="tab-btn active" data-tab="marketplace">마켓플레이스</button>
                        <button class="tab-btn" data-tab="installed">설치됨 (${this.installedExtensions.size})</button>
                    </div>
                    
                    <div id="extensions-list" style="overflow-y: auto; max-height: 500px;"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Render extensions
        this.renderExtensionsList('marketplace');
        
        // Event listeners
        document.getElementById('marketplace-modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        document.getElementById('extension-search').addEventListener('input', (e) => {
            const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
            this.renderExtensionsList(activeTab, e.target.value);
        });
        
        document.getElementById('extension-category').addEventListener('change', (e) => {
            const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
            const search = document.getElementById('extension-search').value;
            this.renderExtensionsList(activeTab, search, e.target.value);
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderExtensionsList(e.target.dataset.tab);
            });
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        this.injectStyles();
    }

    // Render extensions list
    renderExtensionsList(tab, search = null, category = null) {
        const container = document.getElementById('extensions-list');
        if (!container) return;
        
        let extensions = [];
        
        if (tab === 'marketplace') {
            extensions = this.getMarketplaceExtensions(category, search);
        } else {
            extensions = Array.from(this.installedExtensions.values());
            if (search) {
                const query = search.toLowerCase();
                extensions = extensions.filter(ext => 
                    ext.name.toLowerCase().includes(query)
                );
            }
        }
        
        if (extensions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-color-light);">
                    <p>확장 프로그램이 없습니다</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = extensions.map(ext => {
            const isInstalled = this.installedExtensions.has(ext.id);
            const isActive = this.activeExtensions.has(ext.id);
            
            return `
                <div class="extension-item" data-id="${ext.id}">
                    <div class="extension-icon">${ext.icon}</div>
                    <div class="extension-info">
                        <div class="extension-header">
                            <h3>${ext.name}</h3>
                            <span class="extension-version">v${ext.version}</span>
                        </div>
                        <p class="extension-description">${ext.description}</p>
                        <div class="extension-meta">
                            <span>👤 ${ext.author}</span>
                            <span>⭐ ${ext.rating}</span>
                            <span>⬇️ ${this.formatDownloads(ext.downloads)}</span>
                            ${isActive ? '<span class="badge-active">활성</span>' : ''}
                        </div>
                    </div>
                    <div class="extension-actions">
                        ${isInstalled ? `
                            <button class="btn-secondary uninstall-btn" data-id="${ext.id}">제거</button>
                        ` : `
                            <button class="btn-primary install-btn" data-id="${ext.id}">설치</button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners
        container.querySelectorAll('.install-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                await this.installExtension(id);
                this.renderExtensionsList(tab, search, category);
            });
        });
        
        container.querySelectorAll('.uninstall-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                await this.uninstallExtension(id);
                this.renderExtensionsList(tab, search, category);
            });
        });
    }

    // Format downloads
    formatDownloads(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // Inject styles
    injectStyles() {
        if (document.getElementById('extension-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'extension-styles';
        style.textContent = `
            .tab-btn {
                padding: 8px 16px;
                background: transparent;
                border: none;
                border-bottom: 2px solid transparent;
                color: var(--text-color-light);
                cursor: pointer;
                font-size: 14px;
            }
            
            .tab-btn.active {
                color: var(--text-color);
                border-bottom-color: var(--primary-color);
            }
            
            .extension-item {
                display: flex;
                gap: 15px;
                padding: 15px;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                margin-bottom: 10px;
                background: var(--editor-background);
            }
            
            .extension-icon {
                font-size: 48px;
                width: 64px;
                height: 64px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--hover-background);
                border-radius: 8px;
            }
            
            .extension-info {
                flex: 1;
            }
            
            .extension-header {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 5px;
            }
            
            .extension-header h3 {
                margin: 0;
                font-size: 16px;
                color: var(--text-color);
            }
            
            .extension-version {
                font-size: 12px;
                color: var(--text-color-light);
            }
            
            .extension-description {
                margin: 5px 0;
                font-size: 13px;
                color: var(--text-color-light);
            }
            
            .extension-meta {
                display: flex;
                gap: 15px;
                font-size: 12px;
                color: var(--text-color-light);
            }
            
            .badge-active {
                background: #4ec9b0;
                color: white;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 11px;
            }
            
            .extension-actions {
                display: flex;
                align-items: center;
            }
        `;
        document.head.appendChild(style);
    }
}

export const extensionSystem = new ExtensionSystem();
export default extensionSystem;
