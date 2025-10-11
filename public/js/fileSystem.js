// public/js/fileSystem.js
// Client-side file system management

class ClientFileSystem {
    constructor() {
        this.files = new Map(); // path -> { name, content, type, children, fileHandle }
        this.root = {
            name: 'workspace',
            type: 'directory',
            path: '',
            children: []
        };
        this.directoryHandle = null; // Root directory handle for File System Access API
        this.fileHandles = new Map(); // path -> FileSystemFileHandle
    }

    // Add a file to the file system
    addFile(path, content) {
        const parts = path.split('/').filter(p => p);
        const fileName = parts[parts.length - 1];
        const dirPath = parts.slice(0, -1);

        // Create directory structure if needed
        let current = this.root;
        let currentPath = '';

        for (const part of dirPath) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            let child = current.children.find(c => c.name === part && c.type === 'directory');
            
            if (!child) {
                child = {
                    name: part,
                    type: 'directory',
                    path: currentPath,
                    children: []
                };
                current.children.push(child);
            }
            current = child;
        }

        // Add the file
        const filePath = parts.join('/');
        const file = {
            name: fileName,
            type: 'file',
            path: filePath,
            content: content
        };
        
        // IndexedDB에 저장
        this.saveToIndexedDB();

        // Remove existing file if any
        const existingIndex = current.children.findIndex(c => c.name === fileName && c.type === 'file');
        if (existingIndex !== -1) {
            current.children[existingIndex] = file;
        } else {
            current.children.push(file);
        }

        this.files.set(filePath, file);
        return file;
    }

    // Get file content
    getFile(path) {
        return this.files.get(path);
    }

    updateFileContent(path, content) {
        const file = this.files.get(path);
        if (file) {
            file.content = content;
        } else {
            // If file doesn't exist in the map, add it.
            // This can happen if the tree was populated before content was loaded.
            this.addFile(path, content);
        }
    }

    // Update file content
    async updateFile(path, content) {
        const file = this.files.get(path);
        if (file) {
            file.content = content;
            
            // Try to write to actual file system if handle exists
            const fileHandle = this.fileHandles.get(path);
            if (fileHandle) {
                try {
                    const writable = await fileHandle.createWritable();
                    await writable.write(content);
                    await writable.close();
                    return { success: true, savedToDisk: true };
                } catch (err) {
                    console.error(`Failed to save to disk: ${path}`, err);
                    return { success: true, savedToDisk: false, error: err.message };
                }
            }
            return { success: true, savedToDisk: false };
        }
        return { success: false };
    }

    // Delete file
    deleteFile(path) {
        const file = this.files.get(path);
        if (!file) return false;

        const parts = path.split('/').filter(p => p);
        const fileName = parts[parts.length - 1];
        const dirPath = parts.slice(0, -1);

        // Find parent directory
        let current = this.root;
        for (const part of dirPath) {
            current = current.children.find(c => c.name === part && c.type === 'directory');
            if (!current) return false;
        }

        // Remove from parent's children
        const index = current.children.findIndex(c => c.name === fileName);
        if (index !== -1) {
            current.children.splice(index, 1);
        }

        this.files.delete(path);
        return true;
    }

    // Get the file tree structure
    getTree() {
        return this.root;
    }

    // Create a new file
    createFile(path, content = '') {
        return this.addFile(path, content);
    }

    // Create a new directory
    createDirectory(path) {
        const parts = path.split('/').filter(p => p);
        let current = this.root;
        let currentPath = '';

        for (const part of parts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            let child = current.children.find(c => c.name === part && c.type === 'directory');
            
            if (!child) {
                child = {
                    name: part,
                    type: 'directory',
                    path: currentPath,
                    children: []
                };
                current.children.push(child);
            }
            current = child;
        }

        return current;
    }

    // Sort children (directories first, then files, alphabetically)
    sortChildren(node) {
        if (node.children) {
            node.children.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'directory' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });

            node.children.forEach(child => {
                if (child.type === 'directory') {
                    this.sortChildren(child);
                }
            });
        }
    }

    // Get all files as a flat list
    getAllFiles() {
        return Array.from(this.files.values());
    }

    // Set file handle for a file (for File System Access API)
    setFileHandle(path, fileHandle) {
        this.fileHandles.set(path, fileHandle);
    }

    // Set directory handle (root)
    setDirectoryHandle(dirHandle) {
        this.directoryHandle = dirHandle;
    }

    // Get directory handle
    getDirectoryHandle() {
        return this.directoryHandle;
    }

    // Delete file or directory from file system
    async deleteFileFromDisk(path) {
        if (!this.directoryHandle) {
            return { success: false, error: 'No directory handle' };
        }

        try {
            // Get parent directory
            const parts = path.split('/').filter(p => p);
            const entryName = parts[parts.length - 1];
            
            let currentDir = this.directoryHandle;
            
            // Navigate to parent directory
            for (let i = 0; i < parts.length - 1; i++) {
                currentDir = await currentDir.getDirectoryHandle(parts[i]);
            }
            
            // Try to determine if it's a file or directory
            let isDirectory = false;
            try {
                await currentDir.getFileHandle(entryName);
            } catch {
                // If getFileHandle fails, it might be a directory
                try {
                    await currentDir.getDirectoryHandle(entryName);
                    isDirectory = true;
                } catch {
                    return { success: false, error: 'Entry not found' };
                }
            }
            
            // Remove the entry (works for both files and directories)
            await currentDir.removeEntry(entryName, { recursive: true });
            
            // Remove from internal tracking
            this.fileHandles.delete(path);
            this.files.delete(path);
            
            return { success: true, deletedFromDisk: true };
        } catch (err) {
            console.error(`Failed to delete from disk: ${path}`, err);
            return { success: false, error: err.message };
        }
    }

    // Clear all data
    clear() {
        this.files.clear();
        this.fileHandles.clear();
        this.root.children = [];
        this.directoryHandle = null;
    }

    // Create new file using File System Access API
    async createNewFile(parentPath, fileName) {
        if (!this.directoryHandle) {
            return { success: false, error: 'No directory handle available' };
        }

        try {
            const pathParts = parentPath ? parentPath.split('/').filter(p => p) : [];
            let currentDir = this.directoryHandle;

            // Navigate to parent directory
            for (const part of pathParts) {
                currentDir = await currentDir.getDirectoryHandle(part);
            }

            // Create new file
            const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(''); // Create empty file
            await writable.close();

            return { success: true, createdFile: true };
        } catch (err) {
            console.error('Failed to create file:', err);
            return { success: false, error: err.message };
        }
    }

    // Create new directory using File System Access API
    async createNewDirectory(parentPath, dirName) {
        if (!this.directoryHandle) {
            return { success: false, error: 'No directory handle available' };
        }

        try {
            const pathParts = parentPath ? parentPath.split('/').filter(p => p) : [];
            let currentDir = this.directoryHandle;

            // Navigate to parent directory
            for (const part of pathParts) {
                currentDir = await currentDir.getDirectoryHandle(part);
            }

            // Create new directory
            await currentDir.getDirectoryHandle(dirName, { create: true });

            return { success: true, createdDirectory: true };
        } catch (err) {
            console.error('Failed to create directory:', err);
            return { success: false, error: err.message };
        }
    }

    // Rename file or directory using File System Access API
    async renameEntry(oldPath, newName) {
        if (!this.directoryHandle) {
            return { success: false, error: 'No directory handle available' };
        }

        try {
            const pathParts = oldPath.split('/').filter(p => p);
            const oldName = pathParts[pathParts.length - 1];
            const parentParts = pathParts.slice(0, -1);
            
            let parentDir = this.directoryHandle;
            for (const part of parentParts) {
                parentDir = await parentDir.getDirectoryHandle(part);
            }

            // Get the old entry
            let oldHandle;
            let isDirectory = false;
            try {
                oldHandle = await parentDir.getFileHandle(oldName);
            } catch {
                try {
                    oldHandle = await parentDir.getDirectoryHandle(oldName);
                    isDirectory = true;
                } catch {
                    return { success: false, error: 'Entry not found' };
                }
            }

            if (isDirectory) {
                // For directories, we need to recursively copy and delete
                const newDirHandle = await parentDir.getDirectoryHandle(newName, { create: true });
                await this.copyDirectory(oldHandle, newDirHandle);
                await parentDir.removeEntry(oldName, { recursive: true });
                return { success: true, renamed: true };
            } else {
                // For files, read content, create new file, delete old file
                const file = await oldHandle.getFile();
                const content = await file.text();

                // Create new file
                const newHandle = await parentDir.getFileHandle(newName, { create: true });
                const writable = await newHandle.createWritable();
                await writable.write(content);
                await writable.close();

                // Delete old file
                await parentDir.removeEntry(oldName);

                return { success: true, renamed: true };
            }
        } catch (err) {
            console.error('Failed to rename:', err);
            return { success: false, error: err.message };
        }
    }

    // Helper function to recursively copy directory
    async copyDirectory(sourceDir, targetDir) {
        for await (const entry of sourceDir.values()) {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                const newFileHandle = await targetDir.getFileHandle(entry.name, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(await file.arrayBuffer());
                await writable.close();
            } else if (entry.kind === 'directory') {
                const newDirHandle = await targetDir.getDirectoryHandle(entry.name, { create: true });
                await this.copyDirectory(entry, newDirHandle);
            }
        }
    }
    
    // IndexedDB에 파일 시스템 저장
    async saveToIndexedDB() {
        try {
            const db = await this.openDB();
            const tx = db.transaction('files', 'readwrite');
            const store = tx.objectStore('files');
            
            // root 구조를 직렬화하여 저장
            await store.put({
                id: 'fileSystem',
                root: this.root,
                timestamp: Date.now()
            });
            
            await tx.done;
        } catch (err) {
            console.error('Failed to save to IndexedDB:', err);
        }
    }
    
    // IndexedDB에서 파일 시스템 로드
    async loadFromIndexedDB() {
        try {
            const db = await this.openDB();
            const tx = db.transaction('files', 'readonly');
            const store = tx.objectStore('files');
            
            const data = await store.get('fileSystem');
            
            if (data && data.root) {
                this.root = data.root;
                // files Map 재구성
                this.rebuildFilesMap(this.root);
                console.log('✅ Loaded files from IndexedDB');
                return true;
            }
            return false;
        } catch (err) {
            console.error('Failed to load from IndexedDB:', err);
            return false;
        }
    }
    
    // files Map 재구성
    rebuildFilesMap(node) {
        if (node.type === 'file') {
            this.files.set(node.path, node);
        } else if (node.type === 'directory' && node.children) {
            node.children.forEach(child => this.rebuildFilesMap(child));
        }
    }
    
    // IndexedDB 열기
    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('VSCodeCloneDB', 3);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('files')) {
                    db.createObjectStore('files', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('handles')) {
                    db.createObjectStore('handles');
                }
                if (!db.objectStoreNames.contains('fileData')) {
                    db.createObjectStore('fileData');
                }
            };
        });
    }
}

export const clientFS = new ClientFileSystem();
