// public/js/downloadManager.js
// Advanced Download Manager with JSZip & FileSaver

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import download from 'downloadjs';
import { showNotification } from './utils.js';
import { clientFS as clientFileSystem } from './fileSystem.js';

class DownloadManager {
    constructor() {
        this.selectedFiles = new Set();
        this.selectedFolders = new Set();
    }

    // Initialize download manager
    init() {
        this.addDownloadButtons();
        this.addContextMenuItems();
        this.addKeyboardShortcuts();
        console.log('✅ Download manager initialized');
    }

    // Add download buttons to file explorer
    addDownloadButtons() {
        // Add download button to file explorer header
        const fileExplorer = document.getElementById('file-explorer');
        if (!fileExplorer) return;

        const header = document.createElement('div');
        header.style.cssText = `
            padding: 12px 10px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            gap: 8px;
        `;

        header.innerHTML = `
            <button id="download-selected-btn" class="btn-secondary" style="flex: 1; padding: 12px 16px; font-size: 13px; cursor: pointer; min-height: 40px; display: flex; align-items: center; justify-content: center; gap: 6px;" title="Download selected files">
                <i class="codicon codicon-cloud-download" style="font-size: 16px;"></i>
                <span>Download Selected</span>
            </button>
            <button id="download-all-btn" class="btn-secondary" style="flex: 1; padding: 12px 16px; font-size: 13px; cursor: pointer; min-height: 40px; display: flex; align-items: center; justify-content: center; gap: 6px;" title="Download all files">
                <i class="codicon codicon-archive" style="font-size: 16px;"></i>
                <span>Download All</span>
            </button>
        `;

        fileExplorer.insertBefore(header, fileExplorer.firstChild);

        // Event listeners
        document.getElementById('download-selected-btn')?.addEventListener('click', () => {
            this.downloadSelected();
        });

        document.getElementById('download-all-btn')?.addEventListener('click', () => {
            this.downloadAll();
        });
    }

    // Add context menu items
    addContextMenuItems() {
        document.addEventListener('contextmenu', (e) => {
            const treeItem = e.target.closest('.tree-item');
            if (!treeItem) return;

            e.preventDefault();
            this.showContextMenu(e, treeItem);
        });
    }

    // Show context menu
    showContextMenu(e, treeItem) {
        // Remove existing menu
        document.querySelectorAll('.download-context-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'download-context-menu glass-effect';
        menu.style.cssText = `
            position: fixed;
            left: ${e.clientX}px;
            top: ${e.clientY}px;
            background: var(--editor-background);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 5px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        const path = treeItem.dataset.path;
        const isFolder = treeItem.classList.contains('folder');

        menu.innerHTML = `
            <div class="context-menu-item" data-action="download" style="padding: 12px 16px; cursor: pointer; border-radius: 6px; display: flex; align-items: center; gap: 10px; min-height: 42px; font-size: 14px;">
                <i class="codicon codicon-cloud-download" style="font-size: 18px;"></i>
                <span>Download ${isFolder ? 'Folder' : 'File'}</span>
            </div>
            <div class="context-menu-item" data-action="select" style="padding: 12px 16px; cursor: pointer; border-radius: 6px; display: flex; align-items: center; gap: 10px; min-height: 42px; font-size: 14px;">
                <i class="codicon codicon-check" style="font-size: 18px;"></i>
                <span>Select for Download</span>
            </div>
            ${this.selectedFiles.size > 0 || this.selectedFolders.size > 0 ? `
                <div class="context-menu-item" data-action="download-selected" style="padding: 12px 16px; cursor: pointer; border-radius: 6px; display: flex; align-items: center; gap: 10px; min-height: 42px; font-size: 14px;">
                    <i class="codicon codicon-archive" style="font-size: 18px;"></i>
                    <span>Download Selected (${this.selectedFiles.size + this.selectedFolders.size})</span>
                </div>
            ` : ''}
        `;

        document.body.appendChild(menu);

        // Hover effect
        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                item.style.background = 'var(--hover-background)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
        });

        // Actions
        menu.querySelector('[data-action="download"]')?.addEventListener('click', () => {
            if (isFolder) {
                this.downloadFolder(path);
            } else {
                this.downloadFile(path);
            }
            menu.remove();
        });

        menu.querySelector('[data-action="select"]')?.addEventListener('click', () => {
            this.toggleSelection(path, isFolder, treeItem);
            menu.remove();
        });

        menu.querySelector('[data-action="download-selected"]')?.addEventListener('click', () => {
            this.downloadSelected();
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

    // Toggle selection
    toggleSelection(path, isFolder, treeItem) {
        if (isFolder) {
            if (this.selectedFolders.has(path)) {
                this.selectedFolders.delete(path);
                treeItem.style.background = '';
            } else {
                this.selectedFolders.add(path);
                treeItem.style.background = 'rgba(102, 126, 234, 0.2)';
            }
        } else {
            if (this.selectedFiles.has(path)) {
                this.selectedFiles.delete(path);
                treeItem.style.background = '';
            } else {
                this.selectedFiles.add(path);
                treeItem.style.background = 'rgba(102, 126, 234, 0.2)';
            }
        }

        showNotification(
            `${isFolder ? 'Folder' : 'File'} ${this.selectedFiles.has(path) || this.selectedFolders.has(path) ? 'selected' : 'deselected'}`,
            'info'
        );
    }

    // Download single file
    async downloadFile(path) {
        try {
            showNotification(`Downloading ${path}...`, 'info');

            const file = clientFileSystem.getFile(path);
            if (!file) {
                // Try to get from files map
                const allFiles = Array.from(clientFileSystem.files.values());
                const foundFile = allFiles.find(f => f.path === path || f.name === path);
                
                if (!foundFile) {
                    throw new Error('File not found');
                }
                
                const blob = new Blob([foundFile.content || ''], { type: 'text/plain' });
                saveAs(blob, foundFile.name);
                showNotification(`✅ Downloaded ${foundFile.name}`, 'success');
                return;
            }

            const blob = new Blob([file.content || ''], { type: 'text/plain' });
            saveAs(blob, file.name);

            showNotification(`✅ Downloaded ${file.name}`, 'success');
        } catch (error) {
            console.error('Download file error:', error);
            showNotification(`Download failed: ${error.message}`, 'error');
        }
    }

    // Download folder as ZIP
    async downloadFolder(path) {
        try {
            showNotification(`Creating ZIP for ${path}...`, 'info');

            const zip = new JSZip();
            const folder = clientFileSystem.getFile(path);
            
            if (!folder) {
                throw new Error('Folder not found');
            }

            // Add files to zip recursively
            await this.addToZip(zip, folder, '');

            // Generate ZIP
            const content = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 9 }
            });

            // Download
            const folderName = folder.name || 'download';
            saveAs(content, `${folderName}.zip`);

            showNotification(`✅ Downloaded ${folderName}.zip`, 'success');
        } catch (error) {
            console.error('Download folder error:', error);
            showNotification(`Download failed: ${error.message}`, 'error');
        }
    }

    // Add files to ZIP recursively
    async addToZip(zip, item, basePath) {
        if (item.type === 'file') {
            const filePath = basePath ? `${basePath}/${item.name}` : item.name;
            zip.file(filePath, item.content);
        } else if (item.type === 'directory' && item.children) {
            const folderPath = basePath ? `${basePath}/${item.name}` : item.name;
            const folder = zip.folder(folderPath);
            
            for (const child of item.children) {
                await this.addToZip(zip, child, folderPath);
            }
        }
    }

    // Download selected files/folders
    async downloadSelected() {
        try {
            if (this.selectedFiles.size === 0 && this.selectedFolders.size === 0) {
                showNotification('No files selected', 'warning');
                return;
            }

            showNotification('Creating ZIP...', 'info');

            const zip = new JSZip();

            // Add selected files
            for (const path of this.selectedFiles) {
                const file = clientFileSystem.getFile(path);
                if (file) {
                    zip.file(file.name, file.content);
                }
            }

            // Add selected folders
            for (const path of this.selectedFolders) {
                const folder = clientFileSystem.getFile(path);
                if (folder) {
                    await this.addToZip(zip, folder, '');
                }
            }

            // Generate ZIP
            const content = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 9 }
            });

            // Download
            const timestamp = new Date().toISOString().slice(0, 10);
            saveAs(content, `selected-files-${timestamp}.zip`);

            showNotification(`✅ Downloaded ${this.selectedFiles.size + this.selectedFolders.size} items`, 'success');

            // Clear selection
            this.clearSelection();
        } catch (error) {
            console.error('Download selected error:', error);
            showNotification(`Download failed: ${error.message}`, 'error');
        }
    }

    // Download all files
    async downloadAll() {
        try {
            showNotification('Creating ZIP of all files...', 'info');

            const zip = new JSZip();
            const root = clientFileSystem.root;

            // Add all files
            if (root.children) {
                for (const child of root.children) {
                    await this.addToZip(zip, child, '');
                }
            }

            // Generate ZIP
            const content = await zip.generateAsync({ 
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 9 }
            });

            // Download
            const timestamp = new Date().toISOString().slice(0, 10);
            saveAs(content, `workspace-${timestamp}.zip`);

            showNotification('✅ Downloaded all files', 'success');
        } catch (error) {
            console.error('Download all error:', error);
            showNotification(`Download failed: ${error.message}`, 'error');
        }
    }

    // Clear selection
    clearSelection() {
        this.selectedFiles.clear();
        this.selectedFolders.clear();
        
        // Remove visual selection
        document.querySelectorAll('.tree-item').forEach(item => {
            item.style.background = '';
        });
    }

    // Add keyboard shortcuts
    addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+D - Download selected
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.downloadSelected();
            }

            // Ctrl+Shift+A - Download all
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
                e.preventDefault();
                this.downloadAll();
            }

            // Escape - Clear selection
            if (e.key === 'Escape') {
                this.clearSelection();
            }
        });
    }

    // Show download info
    showInfo() {
        const info = `
            <h3>📥 Download Manager</h3>
            <div style="font-family: monospace; font-size: 12px;">
                <h4>Features:</h4>
                <ul>
                    <li>✅ Download single files</li>
                    <li>✅ Download folders as ZIP</li>
                    <li>✅ Multi-select download</li>
                    <li>✅ Download all files</li>
                    <li>✅ Right-click context menu</li>
                    <li>✅ Keyboard shortcuts</li>
                </ul>
                
                <h4>Shortcuts:</h4>
                <div style="display: grid; gap: 5px;">
                    <div><strong>Ctrl+Shift+D</strong> - Download selected</div>
                    <div><strong>Ctrl+Shift+A</strong> - Download all</div>
                    <div><strong>Escape</strong> - Clear selection</div>
                </div>
                
                <h4>Usage:</h4>
                <ol>
                    <li>Right-click on file/folder</li>
                    <li>Select "Download" or "Select for Download"</li>
                    <li>Use buttons or shortcuts to download</li>
                </ol>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>📥 Download Manager</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${info}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

export const downloadManager = new DownloadManager();
export default downloadManager;
