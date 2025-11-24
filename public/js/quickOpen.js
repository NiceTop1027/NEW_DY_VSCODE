// public/js/quickOpen.js
// Quick Open - Ctrl+P for fast file navigation

import Fuse from 'fuse.js';
import { showNotification } from './utils.js';
import { clientFS } from './fileSystem.js';

class QuickOpen {
  constructor() {
    this.isOpen = false;
    this.selectedIndex = 0;
    this.files = [];
    this.fuse = null;
    this.recentFiles = [];
  }

  // Initialize quick open
  init() {
    this.setupKeyboardShortcuts();
    this.createQuickOpenUI();
    this.loadRecentFiles();
    console.log('✅ Quick Open initialized');
  }

  // Create UI
  createQuickOpenUI() {
    const quickOpen = document.createElement('div');
    quickOpen.id = 'quick-open';
    quickOpen.className = 'quick-open hidden';
    quickOpen.innerHTML = `
            <div class="quick-open-overlay"></div>
            <div class="quick-open-container">
                <div class="quick-open-header">
                    <i class="codicon codicon-file"></i>
                    <input 
                        type="text" 
                        id="quick-open-input" 
                        placeholder="Search files by name..."
                        autocomplete="off"
                    />
                    <span class="quick-open-hint">Ctrl+P</span>
                </div>
                <div class="quick-open-results" id="quick-open-results"></div>
            </div>
        `;

    document.body.appendChild(quickOpen);

    // Event listeners
    const input = document.getElementById('quick-open-input');
    const overlay = quickOpen.querySelector('.quick-open-overlay');

    input.addEventListener('input', (e) => this.handleSearch(e.target.value));
    input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    overlay.addEventListener('click', () => this.close());
  }

  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+P: Open quick open
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        this.toggle();
      }

      // Escape: Close
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.close();
      }
    });
  }

  // Toggle quick open
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  // Open quick open
  open() {
    const quickOpen = document.getElementById('quick-open');
    const input = document.getElementById('quick-open-input');

    // Get all files
    this.updateFileList();

    quickOpen.classList.remove('hidden');
    this.isOpen = true;
    this.selectedIndex = 0;

    // Focus input
    setTimeout(() => {
      input.focus();
      input.value = '';
      this.renderResults(this.getRecentFiles());
    }, 50);
  }

  // Close quick open
  close() {
    const quickOpen = document.getElementById('quick-open');
    quickOpen.classList.add('hidden');
    this.isOpen = false;
  }

  // Update file list
  updateFileList() {
    this.files = [];
    this.collectFiles(clientFS.root);

    // Setup Fuse.js
    this.fuse = new Fuse(this.files, {
      keys: ['name', 'path'],
      threshold: 0.3,
      includeScore: true
    });
  }

  // Collect files recursively
  collectFiles(node, path = '') {
    if (!node) return;

    if (node.type === 'file') {
      const filePath = path ? `${path}/${node.name}` : node.name;
      this.files.push({
        name: node.name,
        path: filePath,
        fullPath: node.path || filePath,
        type: this.getFileType(node.name)
      });
    } else if (node.type === 'directory' && node.children) {
      const dirPath = path ? `${path}/${node.name}` : node.name;
      node.children.forEach(child => this.collectFiles(child, dirPath));
    }
  }

  // Get file type
  getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const types = {
      js: 'JavaScript',
      jsx: 'React',
      ts: 'TypeScript',
      tsx: 'React TypeScript',
      css: 'CSS',
      scss: 'SCSS',
      html: 'HTML',
      json: 'JSON',
      md: 'Markdown',
      py: 'Python',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      go: 'Go',
      rs: 'Rust',
      php: 'PHP',
      rb: 'Ruby',
      vue: 'Vue',
      xml: 'XML',
      yaml: 'YAML',
      yml: 'YAML'
    };
    return types[ext] || ext.toUpperCase();
  }

  // Handle search
  handleSearch(query) {
    if (!query.trim()) {
      this.renderResults(this.getRecentFiles());
      return;
    }

    const results = this.fuse.search(query);
    const files = results.map(r => r.item);
    this.renderResults(files);
    this.selectedIndex = 0;
  }

  // Get recent files
  getRecentFiles() {
    if (this.recentFiles.length === 0) {
      return this.files.slice(0, 10);
    }
    return this.recentFiles.slice(0, 10);
  }

  // Render results
  renderResults(files) {
    const resultsContainer = document.getElementById('quick-open-results');

    if (files.length === 0) {
      resultsContainer.innerHTML = `
                <div class="quick-open-empty">
                    <i class="codicon codicon-search"></i>
                    <p>No files found</p>
                </div>
            `;
      return;
    }

    resultsContainer.innerHTML = files.map((file, index) => `
            <div class="quick-open-item ${index === this.selectedIndex ? 'selected' : ''}" 
                 data-index="${index}"
                 data-file-path="${file.fullPath}">
                <div class="file-icon">
                    ${this.getFileIcon(file.name)}
                </div>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-path">${file.path}</div>
                </div>
                <div class="file-type">${file.type}</div>
            </div>
        `).join('');

    // Add click listeners
    resultsContainer.querySelectorAll('.quick-open-item').forEach(item => {
      item.addEventListener('click', () => {
        const filePath = item.dataset.filePath;
        this.openFile(filePath);
      });
    });
  }

  // Get file icon
  getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
      js: '📜',
      jsx: '⚛️',
      ts: '📘',
      tsx: '⚛️',
      css: '🎨',
      scss: '🎨',
      html: '🌐',
      json: '📋',
      md: '📝',
      py: '🐍',
      java: '☕',
      cpp: '⚙️',
      c: '⚙️',
      go: '🐹',
      rs: '🦀',
      php: '🐘',
      rb: '💎',
      vue: '💚',
      xml: '📄',
      yaml: '⚙️',
      yml: '⚙️',
      png: '🖼️',
      jpg: '🖼️',
      gif: '🖼️',
      svg: '🎨'
    };
    return icons[ext] || '📄';
  }

  // Handle keyboard navigation
  handleKeyDown(e) {
    const results = document.querySelectorAll('.quick-open-item');

    switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, results.length - 1);
      this.updateSelection();
      break;

    case 'ArrowUp':
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.updateSelection();
      break;

    case 'Enter': {
      e.preventDefault();
      const selected = results[this.selectedIndex];
      if (selected) {
        const filePath = selected.dataset.filePath;
        this.openFile(filePath);
      }
      break;
    }
    }
  }

  // Update selection
  updateSelection() {
    const results = document.querySelectorAll('.quick-open-item');
    results.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  // Open file
  openFile(filePath) {
    console.log(`Opening file: ${filePath}`);

    // Add to recent files
    this.addToRecent(filePath);

    // Trigger file open event
    window.dispatchEvent(new CustomEvent('quick-open-file', {
      detail: { path: filePath }
    }));

    this.close();
    showNotification(`Opening ${filePath}`, 'info');
  }

  // Add to recent files
  addToRecent(filePath) {
    const file = this.files.find(f => f.fullPath === filePath);
    if (!file) return;

    this.recentFiles = this.recentFiles.filter(f => f.fullPath !== filePath);
    this.recentFiles.unshift(file);

    if (this.recentFiles.length > 10) {
      this.recentFiles.pop();
    }

    this.saveRecentFiles();
  }

  // Save recent files to localStorage
  saveRecentFiles() {
    try {
      const paths = this.recentFiles.map(f => f.fullPath);
      localStorage.setItem('quickOpenRecent', JSON.stringify(paths));
    } catch (e) {
      console.error('Failed to save recent files:', e);
    }
  }

  // Load recent files from localStorage
  loadRecentFiles() {
    try {
      const paths = JSON.parse(localStorage.getItem('quickOpenRecent') || '[]');
      // Will be populated when files are loaded
      this.recentFilePaths = paths;
    } catch (e) {
      console.error('Failed to load recent files:', e);
    }
  }
}

export const quickOpen = new QuickOpen();
export default quickOpen;
