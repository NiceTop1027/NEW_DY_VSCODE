// public/js/fileSystem.js
// Client-side file system management with persistent storage

import { persistentStorage } from './persistentStorage.js';

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
    this.initialized = false;
  }

  // Initialize and load from persistent storage
  async init() {
    if (this.initialized) return;
        
    try {
      await persistentStorage.init();
      await this.loadFromStorage();
      this.initialized = true;
      console.log('✅ File system initialized with persistent storage');
    } catch (error) {
      console.error('File system init error:', error);
    }
  }

  // Load files from persistent storage
  async loadFromStorage() {
    try {
      const savedFiles = await persistentStorage.loadAllFiles();

      if (savedFiles.size > 0) {
        savedFiles.forEach((fileData, path) => {
          this.addFile(path, fileData.content, false); // false = don't save back
        });
        console.log(`📂 Restored ${savedFiles.size} files from storage`);

        // Dispatch event to refresh UI
        window.dispatchEvent(new CustomEvent('files-restored', {
          detail: { count: savedFiles.size }
        }));
      }
    } catch (error) {
      console.error('Load from storage error:', error);
    }
  }

  // Save to persistent storage
  async saveToStorage() {
    try {
      const filesToSave = {};
      this.files.forEach((file, path) => {
        filesToSave[path] = file.content;
      });
            
      await persistentStorage.saveFiles(filesToSave);
    } catch (error) {
      console.error('Save to storage error:', error);
    }
  }

  // Add a file to the file system
  addFile(path, content, saveToStorage = true, hasFileHandle = false) {
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

    // Only save to persistent storage if it's NOT from real disk (no fileHandle)
    if (saveToStorage && this.initialized && !hasFileHandle) {
      persistentStorage.saveFile(filePath, content).catch(err => {
        console.error('Failed to save to storage:', err);
      });
    }

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
          // Don't save to persistent storage - real disk files disappear on refresh
          return { success: true, savedToDisk: true };
        } catch (err) {
          console.error(`Failed to save to disk: ${path}`, err);
          return { success: true, savedToDisk: false, error: err.message };
        }
      }

      // Only save to persistent storage if it's NOT a real disk file
      if (this.initialized) {
        persistentStorage.saveFile(path, content).catch(err => {
          console.error('Failed to save to persistent storage:', err);
        });
      }

      return { success: true, savedToDisk: false };
    }
    return { success: false };
  }

  // Delete file or folder
  deleteFile(path) {
    const parts = path.split('/').filter(p => p);
    const itemName = parts[parts.length - 1];
    const dirPath = parts.slice(0, -1);

    // Find parent directory
    let current = this.root;
    for (const part of dirPath) {
      current = current.children.find(c => c.name === part && c.type === 'directory');
      if (!current) return false;
    }

    // Find the item to delete
    const itemIndex = current.children.findIndex(c => c.name === itemName);
    if (itemIndex === -1) return false;

    const item = current.children[itemIndex];

    // If it's a directory, delete all children recursively
    if (item.type === 'directory') {
      this.deleteFolderRecursive(path);
    } else {
      // It's a file
      this.files.delete(path);

      // Delete from persistent storage
      if (this.initialized) {
        persistentStorage.deleteFile(path).catch(err => {
          console.error('Failed to delete from persistent storage:', err);
        });
      }
    }

    // Remove from parent's children
    current.children.splice(itemIndex, 1);

    return true;
  }

  // Delete folder and all its contents recursively
  deleteFolderRecursive(folderPath) {
    // Get all files that start with this folder path
    const filesToDelete = [];
    this.files.forEach((file, path) => {
      if (path === folderPath || path.startsWith(folderPath + '/')) {
        filesToDelete.push(path);
      }
    });

    // Delete all files in the folder
    filesToDelete.forEach(path => {
      this.files.delete(path);

      // Delete from persistent storage
      if (this.initialized) {
        persistentStorage.deleteFile(path).catch(err => {
          console.error('Failed to delete from persistent storage:', err);
        });
      }
    });

    console.log(`🗑️ Deleted folder "${folderPath}" with ${filesToDelete.length} files`);
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

        // Create a placeholder file to persist the directory
        const placeholderPath = `${currentPath}/.gitkeep`;
        this.addFile(placeholderPath, '# This file keeps the directory in storage\n');
        console.log(`📁 Created directory "${currentPath}" with placeholder`);
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
    // 메모리에 파일 추가 (directoryHandle 없어도 작동)
    const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
    this.addFile(filePath, '');
    await this.saveToIndexedDB();
        
    // File System Access API가 있으면 실제 파일도 생성
    if (this.directoryHandle) {
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
      } catch (err) {
        console.warn('Failed to create real file (memory only):', err);
      }
    }

    return { success: true, createdFile: true };
  }

  // Create new directory using File System Access API
  async createNewDirectory(parentPath, dirName) {
    // 메모리에 디렉토리 추가 (directoryHandle 없어도 작동)
    const dirPath = parentPath ? `${parentPath}/${dirName}` : dirName;
    this.createDirectory(dirPath);
    await this.saveToIndexedDB();
        
    // File System Access API가 있으면 실제 디렉토리도 생성
    if (this.directoryHandle) {
      try {
        const pathParts = parentPath ? parentPath.split('/').filter(p => p) : [];
        let currentDir = this.directoryHandle;

        // Navigate to parent directory
        for (const part of pathParts) {
          currentDir = await currentDir.getDirectoryHandle(part);
        }

        // Create new directory
        await currentDir.getDirectoryHandle(dirName, { create: true });
      } catch (err) {
        console.warn('Failed to create real directory (memory only):', err);
      }
    }

    return { success: true, createdDirectory: true };
  }

  // Rename file or directory using File System Access API
  async renameEntry(oldPath, newName) {
    // Memory mode - rename in memory
    if (!this.directoryHandle) {
      try {
        const fileData = this.files.get(oldPath);
        if (!fileData) {
          return { success: false, error: 'File not found' };
        }

        // Calculate new path
        const pathParts = oldPath.split('/').filter(p => p);
        pathParts[pathParts.length - 1] = newName;
        const newPath = pathParts.join('/');

        // Update in memory
        this.files.delete(oldPath);
        this.files.set(newPath, {
          ...fileData,
          name: newName,
          path: newPath
        });

        // Update parent's children
        const parentPath = pathParts.slice(0, -1).join('/');
        let parent = parentPath ? this.files.get(parentPath) : this.root;

        // If not found in files map, traverse root tree
        if (!parent && parentPath) {
          const parts = parentPath.split('/').filter(p => p);
          parent = this.root;
          for (const part of parts) {
            const found = parent.children?.find(c => c.name === part && c.type === 'directory');
            if (found) {
              parent = found;
            } else {
              break;
            }
          }
        }

        if (parent && parent.children) {
          const childIndex = parent.children.findIndex(c => c.path === oldPath);
          if (childIndex !== -1) {
            parent.children[childIndex] = {
              ...parent.children[childIndex],
              name: newName,
              path: newPath
            };
          }
        }

        // Save to persistent storage
        await persistentStorage.saveFile(newPath, fileData.content);
        await persistentStorage.deleteFile(oldPath);

        return { success: true, renamed: true };
      } catch (err) {
        console.error('Memory mode rename failed:', err);
        return { success: false, error: err.message };
      }
    }

    // Disk mode - use File System Access API
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

  // Move file (memory mode only)
  async moveFile(sourcePath, targetPath) {
    try {
      const fileData = this.files.get(sourcePath);
      if (!fileData) {
        return { success: false, error: 'Source file not found' };
      }

      if (fileData.type === 'directory') {
        return { success: false, error: 'Cannot move directories' };
      }

      // Extract file name from target path
      const targetFileName = targetPath.split('/').filter(p => p).pop() || fileData.name;

      // Remove from old location
      this.files.delete(sourcePath);

      // Update parent's children
      const sourceParentPath = sourcePath.split('/').slice(0, -1).join('/');
      const sourceParent = sourceParentPath ? this.files.get(sourceParentPath) : this.root;
      if (sourceParent && sourceParent.children) {
        sourceParent.children = sourceParent.children.filter(c => c.path !== sourcePath);
      }

      // Add to new location with updated info
      this.files.set(targetPath, {
        ...fileData,
        name: targetFileName,
        path: targetPath
      });

      // Update target parent's children
      const targetParentPath = targetPath.split('/').slice(0, -1).join('/');
      let targetParent = targetParentPath ? this.files.get(targetParentPath) : this.root;

      // If not found in files map, traverse root tree
      if (!targetParent && targetParentPath) {
        const parts = targetParentPath.split('/').filter(p => p);
        targetParent = this.root;
        for (const part of parts) {
          const found = targetParent.children?.find(c => c.name === part && c.type === 'directory');
          if (found) {
            targetParent = found;
          } else {
            console.error('Could not find parent folder:', part);
            break;
          }
        }
      }

      if (targetParent) {
        if (!targetParent.children) {
          targetParent.children = [];
        }
        // Check if already exists (avoid duplicates)
        const existingIndex = targetParent.children.findIndex(c => c.path === targetPath);
        if (existingIndex === -1) {
          targetParent.children.push({
            name: targetFileName,
            type: 'file',
            path: targetPath
          });
        }
      }

      // Update persistent storage
      await persistentStorage.saveFile(targetPath, fileData.content);
      await persistentStorage.deleteFile(sourcePath);

      return { success: true };
    } catch (err) {
      console.error('Move file failed:', err);
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
