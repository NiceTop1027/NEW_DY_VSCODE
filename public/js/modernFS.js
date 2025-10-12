// public/js/modernFS.js
// Modern file system using BrowserFS

import * as BrowserFS from 'browserfs';

class ModernFileSystem {
    constructor() {
        this.fs = null;
        this.initialized = false;
        this.root = {
            name: 'workspace',
            type: 'directory',
            path: '',
            children: []
        };
    }

    // Initialize BrowserFS
    async initialize() {
        return new Promise((resolve, reject) => {
            BrowserFS.configure({
                fs: "MountableFileSystem",
                options: {
                    "/tmp": { fs: "InMemory" },
                    "/home": { 
                        fs: "IndexedDB",
                        options: {
                            storeName: "dy-vscode-files"
                        }
                    }
                }
            }, (err) => {
                if (err) {
                    console.error('BrowserFS initialization error:', err);
                    reject(err);
                    return;
                }
                
                this.fs = BrowserFS.BFSRequire('fs');
                this.initialized = true;
                console.log('✅ BrowserFS initialized');
                resolve();
            });
        });
    }

    // Ensure initialized
    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }

    // Add/Write file
    async addFile(path, content) {
        await this.ensureInitialized();
        
        const fullPath = `/home/${path}`;
        const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
        
        // Create directory structure
        await this.mkdirp(dirPath);
        
        // Write file
        return new Promise((resolve, reject) => {
            this.fs.writeFile(fullPath, content, 'utf8', (err) => {
                if (err) {
                    console.error('Write file error:', err);
                    reject(err);
                } else {
                    console.log(`✓ Written: ${path}`);
                    resolve();
                }
            });
        });
    }

    // Read file
    async readFile(path) {
        await this.ensureInitialized();
        
        const fullPath = `/home/${path}`;
        
        return new Promise((resolve, reject) => {
            this.fs.readFile(fullPath, 'utf8', (err, data) => {
                if (err) {
                    console.error('Read file error:', err);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    // Get file
    async getFile(path) {
        try {
            const content = await this.readFile(path);
            return {
                name: path.split('/').pop(),
                type: 'file',
                path: path,
                content: content
            };
        } catch (err) {
            return null;
        }
    }

    // Delete file
    async deleteFile(path) {
        await this.ensureInitialized();
        
        const fullPath = `/home/${path}`;
        
        return new Promise((resolve, reject) => {
            this.fs.unlink(fullPath, (err) => {
                if (err) {
                    console.error('Delete file error:', err);
                    reject(err);
                } else {
                    console.log(`✓ Deleted: ${path}`);
                    resolve();
                }
            });
        });
    }

    // Create directory
    async mkdir(path) {
        await this.ensureInitialized();
        
        const fullPath = `/home/${path}`;
        
        return new Promise((resolve, reject) => {
            this.fs.mkdir(fullPath, (err) => {
                if (err && err.code !== 'EEXIST') {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    // Create directory recursively
    async mkdirp(path) {
        await this.ensureInitialized();
        
        if (!path || path === '/home') return;
        
        const parts = path.split('/').filter(p => p);
        let current = '';
        
        for (const part of parts) {
            current += '/' + part;
            try {
                await new Promise((resolve, reject) => {
                    this.fs.mkdir(current, (err) => {
                        if (err && err.code !== 'EEXIST') {
                            reject(err);
                        } else {
                            resolve();
                        }
                    });
                });
            } catch (err) {
                // Ignore EEXIST errors
            }
        }
    }

    // List directory
    async readdir(path = '') {
        await this.ensureInitialized();
        
        const fullPath = path ? `/home/${path}` : '/home';
        
        return new Promise((resolve, reject) => {
            this.fs.readdir(fullPath, (err, files) => {
                if (err) {
                    console.error('Read directory error:', err);
                    reject(err);
                } else {
                    resolve(files || []);
                }
            });
        });
    }

    // Get file stats
    async stat(path) {
        await this.ensureInitialized();
        
        const fullPath = `/home/${path}`;
        
        return new Promise((resolve, reject) => {
            this.fs.stat(fullPath, (err, stats) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(stats);
                }
            });
        });
    }

    // Check if path exists
    async exists(path) {
        try {
            await this.stat(path);
            return true;
        } catch (err) {
            return false;
        }
    }

    // Get tree structure
    async getTree() {
        await this.ensureInitialized();
        
        const buildTree = async (dirPath = '') => {
            const files = await this.readdir(dirPath);
            const children = [];
            
            for (const file of files) {
                const filePath = dirPath ? `${dirPath}/${file}` : file;
                
                try {
                    const stats = await this.stat(filePath);
                    
                    if (stats.isDirectory()) {
                        const subTree = await buildTree(filePath);
                        children.push({
                            name: file,
                            type: 'directory',
                            path: filePath,
                            children: subTree
                        });
                    } else {
                        children.push({
                            name: file,
                            type: 'file',
                            path: filePath
                        });
                    }
                } catch (err) {
                    console.error(`Error processing ${filePath}:`, err);
                }
            }
            
            return children;
        };
        
        const children = await buildTree();
        
        return {
            name: 'workspace',
            type: 'directory',
            path: '',
            children: children
        };
    }

    // Rename/Move file
    async rename(oldPath, newPath) {
        await this.ensureInitialized();
        
        const fullOldPath = `/home/${oldPath}`;
        const fullNewPath = `/home/${newPath}`;
        
        // Create parent directory for new path
        const newDir = fullNewPath.substring(0, fullNewPath.lastIndexOf('/'));
        await this.mkdirp(newDir);
        
        return new Promise((resolve, reject) => {
            this.fs.rename(fullOldPath, fullNewPath, (err) => {
                if (err) {
                    console.error('Rename error:', err);
                    reject(err);
                } else {
                    console.log(`✓ Renamed: ${oldPath} → ${newPath}`);
                    resolve();
                }
            });
        });
    }

    // Delete directory recursively
    async rmdir(path) {
        await this.ensureInitialized();
        
        const fullPath = `/home/${path}`;
        
        const deleteRecursive = async (dirPath) => {
            const files = await new Promise((resolve, reject) => {
                this.fs.readdir(dirPath, (err, files) => {
                    if (err) reject(err);
                    else resolve(files || []);
                });
            });
            
            for (const file of files) {
                const filePath = `${dirPath}/${file}`;
                const stats = await new Promise((resolve, reject) => {
                    this.fs.stat(filePath, (err, stats) => {
                        if (err) reject(err);
                        else resolve(stats);
                    });
                });
                
                if (stats.isDirectory()) {
                    await deleteRecursive(filePath);
                } else {
                    await new Promise((resolve, reject) => {
                        this.fs.unlink(filePath, (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                }
            }
            
            await new Promise((resolve, reject) => {
                this.fs.rmdir(dirPath, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        };
        
        await deleteRecursive(fullPath);
        console.log(`✓ Deleted directory: ${path}`);
    }

    // Get all files (flat list)
    async getAllFiles() {
        const files = new Map();
        
        const traverse = async (dirPath = '') => {
            const items = await this.readdir(dirPath);
            
            for (const item of items) {
                const itemPath = dirPath ? `${dirPath}/${item}` : item;
                
                try {
                    const stats = await this.stat(itemPath);
                    
                    if (stats.isDirectory()) {
                        await traverse(itemPath);
                    } else {
                        const content = await this.readFile(itemPath);
                        files.set(itemPath, {
                            name: item,
                            type: 'file',
                            path: itemPath,
                            content: content
                        });
                    }
                } catch (err) {
                    console.error(`Error processing ${itemPath}:`, err);
                }
            }
        };
        
        await traverse();
        return files;
    }

    // Clear all files
    async clear() {
        await this.ensureInitialized();
        
        const files = await this.readdir();
        
        for (const file of files) {
            try {
                const stats = await this.stat(file);
                if (stats.isDirectory()) {
                    await this.rmdir(file);
                } else {
                    await this.deleteFile(file);
                }
            } catch (err) {
                console.error(`Error clearing ${file}:`, err);
            }
        }
        
        console.log('✓ All files cleared');
    }
}

// Export singleton instance
export const modernFS = new ModernFileSystem();
export default modernFS;
