// public/js/persistentStorage.js
// Persistent file storage with Dexie (IndexedDB)

import Dexie from 'dexie';
import { showNotification } from './utils.js';

class PersistentStorage {
    constructor() {
        // Initialize Dexie database
        this.db = new Dexie('DY_VSCode_Storage');
        
        // Define schema
        this.db.version(1).stores({
            files: 'path, name, content, type, size, modified, parent',
            folders: 'path, name, parent, created',
            settings: 'key, value',
            sessions: 'id, timestamp, data'
        });
        
        this.autoSaveInterval = null;
        this.isInitialized = false;
    }

    // Initialize storage
    async init() {
        try {
            await this.db.open();
            this.isInitialized = true;
            console.log('✅ Persistent storage initialized');
            
            // Start auto-save
            this.startAutoSave();
            
            return true;
        } catch (error) {
            console.error('❌ Storage init failed:', error);
            showNotification('저장소 초기화 실패', 'error');
            return false;
        }
    }

    // Save file
    async saveFile(path, content, metadata = {}) {
        try {
            const file = {
                path: path,
                name: path.split('/').pop(),
                content: content,
                type: metadata.type || 'file',
                size: new Blob([content]).size,
                modified: Date.now(),
                parent: path.split('/').slice(0, -1).join('/') || '/'
            };
            
            await this.db.files.put(file);
            console.log(`💾 Saved: ${path}`);
            return true;
        } catch (error) {
            console.error('Save file error:', error);
            return false;
        }
    }

    // Save multiple files
    async saveFiles(files) {
        try {
            const fileObjects = Object.entries(files).map(([path, content]) => ({
                path: path,
                name: path.split('/').pop(),
                content: content,
                type: 'file',
                size: new Blob([content]).size,
                modified: Date.now(),
                parent: path.split('/').slice(0, -1).join('/') || '/'
            }));
            
            await this.db.files.bulkPut(fileObjects);
            console.log(`💾 Saved ${fileObjects.length} files`);
            showNotification(`${fileObjects.length}개 파일 저장됨`, 'success');
            return true;
        } catch (error) {
            console.error('Save files error:', error);
            showNotification('파일 저장 실패', 'error');
            return false;
        }
    }

    // Load file
    async loadFile(path) {
        try {
            const file = await this.db.files.get(path);
            return file ? file.content : null;
        } catch (error) {
            console.error('Load file error:', error);
            return null;
        }
    }

    // Load all files
    async loadAllFiles() {
        try {
            const files = await this.db.files.toArray();
            const fileMap = new Map();
            
            files.forEach(file => {
                fileMap.set(file.path, {
                    name: file.name,
                    content: file.content,
                    type: file.type,
                    size: file.size,
                    modified: file.modified
                });
            });
            
            console.log(`📂 Loaded ${files.length} files from storage`);
            if (files.length > 0) {
                showNotification(`${files.length}개 파일 복원됨`, 'success');
            }
            
            return fileMap;
        } catch (error) {
            console.error('Load all files error:', error);
            return new Map();
        }
    }

    // Delete file
    async deleteFile(path) {
        try {
            await this.db.files.delete(path);
            console.log(`🗑️ Deleted: ${path}`);
            return true;
        } catch (error) {
            console.error('Delete file error:', error);
            return false;
        }
    }

    // Save folder
    async saveFolder(path) {
        try {
            const folder = {
                path: path,
                name: path.split('/').pop(),
                parent: path.split('/').slice(0, -1).join('/') || '/',
                created: Date.now()
            };
            
            await this.db.folders.put(folder);
            return true;
        } catch (error) {
            console.error('Save folder error:', error);
            return false;
        }
    }

    // Load all folders
    async loadAllFolders() {
        try {
            const folders = await this.db.folders.toArray();
            return folders;
        } catch (error) {
            console.error('Load folders error:', error);
            return [];
        }
    }

    // Get file tree
    async getFileTree() {
        try {
            const files = await this.db.files.toArray();
            const folders = await this.db.folders.toArray();
            
            // Build tree structure
            const tree = {
                name: 'workspace',
                type: 'directory',
                path: '',
                children: []
            };
            
            // Add folders
            folders.forEach(folder => {
                this.addToTree(tree, folder.path, 'directory');
            });
            
            // Add files
            files.forEach(file => {
                this.addToTree(tree, file.path, 'file', file);
            });
            
            return tree;
        } catch (error) {
            console.error('Get file tree error:', error);
            return null;
        }
    }

    // Helper: Add item to tree
    addToTree(tree, path, type, data = null) {
        const parts = path.split('/').filter(p => p);
        let current = tree;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;
            
            let child = current.children.find(c => c.name === part);
            
            if (!child) {
                child = {
                    name: part,
                    type: isLast ? type : 'directory',
                    path: parts.slice(0, i + 1).join('/'),
                    children: []
                };
                
                if (isLast && type === 'file' && data) {
                    child.content = data.content;
                    child.size = data.size;
                    child.modified = data.modified;
                }
                
                current.children.push(child);
            }
            
            current = child;
        }
    }

    // Save session
    async saveSession(sessionData) {
        try {
            const session = {
                id: 'current',
                timestamp: Date.now(),
                data: sessionData
            };
            
            await this.db.sessions.put(session);
            console.log('💾 Session saved');
            return true;
        } catch (error) {
            console.error('Save session error:', error);
            return false;
        }
    }

    // Load session
    async loadSession() {
        try {
            const session = await this.db.sessions.get('current');
            return session ? session.data : null;
        } catch (error) {
            console.error('Load session error:', error);
            return null;
        }
    }

    // Save setting
    async saveSetting(key, value) {
        try {
            await this.db.settings.put({ key, value });
            return true;
        } catch (error) {
            console.error('Save setting error:', error);
            return false;
        }
    }

    // Load setting
    async loadSetting(key) {
        try {
            const setting = await this.db.settings.get(key);
            return setting ? setting.value : null;
        } catch (error) {
            console.error('Load setting error:', error);
            return null;
        }
    }

    // Get storage stats
    async getStats() {
        try {
            const fileCount = await this.db.files.count();
            const folderCount = await this.db.folders.count();
            
            const files = await this.db.files.toArray();
            const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
            
            return {
                files: fileCount,
                folders: folderCount,
                totalSize: totalSize,
                formattedSize: this.formatBytes(totalSize)
            };
        } catch (error) {
            console.error('Get stats error:', error);
            return null;
        }
    }

    // Format bytes
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Clear all data
    async clearAll() {
        try {
            await this.db.files.clear();
            await this.db.folders.clear();
            await this.db.sessions.clear();
            console.log('🗑️ All data cleared');
            showNotification('모든 데이터 삭제됨', 'success');
            return true;
        } catch (error) {
            console.error('Clear all error:', error);
            showNotification('데이터 삭제 실패', 'error');
            return false;
        }
    }

    // Export all data
    async exportData() {
        try {
            const files = await this.db.files.toArray();
            const folders = await this.db.folders.toArray();
            const settings = await this.db.settings.toArray();
            
            const data = {
                version: 1,
                timestamp: Date.now(),
                files: files,
                folders: folders,
                settings: settings
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dy-vscode-backup-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            
            showNotification('데이터 내보내기 완료', 'success');
            return true;
        } catch (error) {
            console.error('Export error:', error);
            showNotification('내보내기 실패', 'error');
            return false;
        }
    }

    // Import data
    async importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            await this.db.files.bulkPut(data.files);
            await this.db.folders.bulkPut(data.folders);
            await this.db.settings.bulkPut(data.settings);
            
            showNotification('데이터 가져오기 완료', 'success');
            return true;
        } catch (error) {
            console.error('Import error:', error);
            showNotification('가져오기 실패', 'error');
            return false;
        }
    }

    // Start auto-save
    startAutoSave(intervalMs = 10000) {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        this.autoSaveInterval = setInterval(async () => {
            // Auto-save will be triggered by fileSystem changes
            console.log('⏰ Auto-save tick');
        }, intervalMs);
        
        console.log(`✅ Auto-save started (every ${intervalMs / 1000}s)`);
    }

    // Stop auto-save
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            console.log('⏹️ Auto-save stopped');
        }
    }

    // Show storage info modal
    async showStorageInfo() {
        const stats = await this.getStats();
        if (!stats) return;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>💾 저장소 정보</h2>
                    <button class="modal-close" id="storage-modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; gap: 15px;">
                        <div style="background: var(--hover-background); padding: 15px; border-radius: 8px;">
                            <div style="font-size: 12px; color: var(--text-color-light); margin-bottom: 5px;">파일 수</div>
                            <div style="font-size: 24px; font-weight: bold;">${stats.files}</div>
                        </div>
                        <div style="background: var(--hover-background); padding: 15px; border-radius: 8px;">
                            <div style="font-size: 12px; color: var(--text-color-light); margin-bottom: 5px;">폴더 수</div>
                            <div style="font-size: 24px; font-weight: bold;">${stats.folders}</div>
                        </div>
                        <div style="background: var(--hover-background); padding: 15px; border-radius: 8px;">
                            <div style="font-size: 12px; color: var(--text-color-light); margin-bottom: 5px;">총 크기</div>
                            <div style="font-size: 24px; font-weight: bold;">${stats.formattedSize}</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; display: flex; gap: 10px;">
                        <button id="export-data-btn" class="btn-secondary" style="flex: 1;">내보내기</button>
                        <button id="clear-data-btn" class="btn-secondary" style="flex: 1;">모두 삭제</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('storage-modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        document.getElementById('export-data-btn').addEventListener('click', async () => {
            await this.exportData();
        });
        
        document.getElementById('clear-data-btn').addEventListener('click', async () => {
            if (confirm('정말 모든 데이터를 삭제하시겠습니까?')) {
                await this.clearAll();
                modal.remove();
            }
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

export const persistentStorage = new PersistentStorage();
export default persistentStorage;
