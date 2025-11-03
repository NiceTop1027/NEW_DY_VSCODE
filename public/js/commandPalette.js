// public/js/commandPalette.js
// Command Palette System - Ctrl+Shift+P

import Fuse from 'fuse.js';
import { showNotification } from './utils.js';

class CommandPalette {
    constructor() {
        this.commands = [];
        this.isOpen = false;
        this.selectedIndex = 0;
        this.fuse = null;
        this.recentCommands = [];
    }

    // Initialize command palette
    init() {
        this.registerDefaultCommands();
        this.setupKeyboardShortcuts();
        this.createPaletteUI();
        console.log('✅ Command Palette initialized');
    }

    // Register default commands
    registerDefaultCommands() {
        this.commands = [
            // File commands
            {
                id: 'file.new',
                label: 'File: New File',
                category: 'File',
                icon: '📄',
                shortcut: 'Ctrl+N',
                action: () => this.executeCommand('newFile')
            },
            {
                id: 'file.save',
                label: 'File: Save',
                category: 'File',
                icon: '💾',
                shortcut: 'Ctrl+S',
                action: () => this.executeCommand('saveFile')
            },
            {
                id: 'file.saveAll',
                label: 'File: Save All',
                category: 'File',
                icon: '💾',
                shortcut: 'Ctrl+K S',
                action: () => this.executeCommand('saveAll')
            },
            {
                id: 'file.open',
                label: 'File: Open File...',
                category: 'File',
                icon: '📂',
                shortcut: 'Ctrl+O',
                action: () => this.executeCommand('openFile')
            },
            {
                id: 'file.close',
                label: 'File: Close Editor',
                category: 'File',
                icon: '✖️',
                shortcut: 'Ctrl+W',
                action: () => this.executeCommand('closeEditor')
            },

            // Edit commands
            {
                id: 'edit.find',
                label: 'Edit: Find',
                category: 'Edit',
                icon: '🔍',
                shortcut: 'Ctrl+F',
                action: () => this.executeCommand('find')
            },
            {
                id: 'edit.replace',
                label: 'Edit: Replace',
                category: 'Edit',
                icon: '🔄',
                shortcut: 'Ctrl+H',
                action: () => this.executeCommand('replace')
            },
            {
                id: 'edit.format',
                label: 'Edit: Format Document',
                category: 'Edit',
                icon: '✨',
                shortcut: 'Shift+Alt+F',
                action: () => this.executeCommand('formatDocument')
            },

            // View commands
            {
                id: 'view.toggleSidebar',
                label: 'View: Toggle Sidebar',
                category: 'View',
                icon: '📊',
                shortcut: 'Ctrl+B',
                action: () => this.executeCommand('toggleSidebar')
            },
            {
                id: 'view.toggleTerminal',
                label: 'View: Toggle Terminal',
                category: 'View',
                icon: '💻',
                shortcut: 'Ctrl+`',
                action: () => this.executeCommand('toggleTerminal')
            },
            {
                id: 'view.splitEditor',
                label: 'View: Split Editor',
                category: 'View',
                icon: '⬌',
                shortcut: 'Ctrl+\\',
                action: () => this.executeCommand('splitEditor')
            },

            // Git commands
            {
                id: 'git.commit',
                label: 'Git: Commit',
                category: 'Git',
                icon: '📝',
                action: () => this.executeCommand('gitCommit')
            },
            {
                id: 'git.push',
                label: 'Git: Push',
                category: 'Git',
                icon: '⬆️',
                action: () => this.executeCommand('gitPush')
            },
            {
                id: 'git.pull',
                label: 'Git: Pull',
                category: 'Git',
                icon: '⬇️',
                action: () => this.executeCommand('gitPull')
            },

            // Terminal commands
            {
                id: 'terminal.new',
                label: 'Terminal: Create New Terminal',
                category: 'Terminal',
                icon: '➕',
                shortcut: 'Ctrl+Shift+`',
                action: () => this.executeCommand('newTerminal')
            },

            // Download commands
            {
                id: 'download.selected',
                label: 'Download: Download Selected Files',
                category: 'Download',
                icon: '📥',
                action: () => this.executeCommand('downloadSelected')
            },
            {
                id: 'download.all',
                label: 'Download: Download All Files',
                category: 'Download',
                icon: '📦',
                action: () => this.executeCommand('downloadAll')
            },

            // Settings
            {
                id: 'settings.open',
                label: 'Preferences: Open Settings',
                category: 'Settings',
                icon: '⚙️',
                shortcut: 'Ctrl+,',
                action: () => this.executeCommand('openSettings')
            }
        ];

        // Setup Fuse.js for fuzzy search
        this.fuse = new Fuse(this.commands, {
            keys: ['label', 'category'],
            threshold: 0.3,
            includeScore: true
        });
    }

    // Create palette UI
    createPaletteUI() {
        const palette = document.createElement('div');
        palette.id = 'command-palette';
        palette.className = 'command-palette hidden';
        palette.innerHTML = `
            <div class="command-palette-overlay"></div>
            <div class="command-palette-container">
                <div class="command-palette-header">
                    <i class="codicon codicon-search"></i>
                    <input 
                        type="text" 
                        id="command-palette-input" 
                        placeholder="Type a command or search..."
                        autocomplete="off"
                    />
                    <span class="command-palette-hint">Esc to close</span>
                </div>
                <div class="command-palette-results" id="command-palette-results"></div>
            </div>
        `;

        document.body.appendChild(palette);

        // Event listeners
        const input = document.getElementById('command-palette-input');
        const overlay = palette.querySelector('.command-palette-overlay');

        input.addEventListener('input', (e) => this.handleSearch(e.target.value));
        input.addEventListener('keydown', (e) => this.handleKeyDown(e));
        overlay.addEventListener('click', () => this.close());
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+P: Open command palette
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                this.toggle();
            }

            // Escape: Close palette
            if (e.key === 'Escape' && this.isOpen) {
                e.preventDefault();
                this.close();
            }
        });
    }

    // Toggle palette
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    // Open palette
    open() {
        const palette = document.getElementById('command-palette');
        const input = document.getElementById('command-palette-input');

        palette.classList.remove('hidden');
        this.isOpen = true;
        this.selectedIndex = 0;

        // Focus input
        setTimeout(() => {
            input.focus();
            input.value = '';
            this.renderResults(this.getRecentCommands());
        }, 50);
    }

    // Close palette
    close() {
        const palette = document.getElementById('command-palette');
        palette.classList.add('hidden');
        this.isOpen = false;
    }

    // Handle search
    handleSearch(query) {
        if (!query.trim()) {
            this.renderResults(this.getRecentCommands());
            return;
        }

        const results = this.fuse.search(query);
        const commands = results.map(r => r.item);
        this.renderResults(commands);
        this.selectedIndex = 0;
    }

    // Get recent commands
    getRecentCommands() {
        if (this.recentCommands.length === 0) {
            return this.commands.slice(0, 10);
        }
        return this.recentCommands.slice(0, 10);
    }

    // Render results
    renderResults(commands) {
        const resultsContainer = document.getElementById('command-palette-results');
        
        if (commands.length === 0) {
            resultsContainer.innerHTML = `
                <div class="command-palette-empty">
                    <p>No commands found</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = commands.map((cmd, index) => `
            <div class="command-palette-item ${index === this.selectedIndex ? 'selected' : ''}" 
                 data-index="${index}"
                 data-command-id="${cmd.id}">
                <span class="command-icon">${cmd.icon}</span>
                <div class="command-info">
                    <div class="command-label">${cmd.label}</div>
                    <div class="command-category">${cmd.category}</div>
                </div>
                ${cmd.shortcut ? `<div class="command-shortcut">${cmd.shortcut}</div>` : ''}
            </div>
        `).join('');

        // Add click listeners
        resultsContainer.querySelectorAll('.command-palette-item').forEach(item => {
            item.addEventListener('click', () => {
                const commandId = item.dataset.commandId;
                this.executeCommandById(commandId);
            });
        });
    }

    // Handle keyboard navigation
    handleKeyDown(e) {
        const results = document.querySelectorAll('.command-palette-item');
        
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

            case 'Enter':
                e.preventDefault();
                const selected = results[this.selectedIndex];
                if (selected) {
                    const commandId = selected.dataset.commandId;
                    this.executeCommandById(commandId);
                }
                break;
        }
    }

    // Update selection
    updateSelection() {
        const results = document.querySelectorAll('.command-palette-item');
        results.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    // Execute command by ID
    executeCommandById(commandId) {
        const command = this.commands.find(cmd => cmd.id === commandId);
        if (command) {
            this.addToRecent(command);
            command.action();
            this.close();
        }
    }

    // Add to recent commands
    addToRecent(command) {
        this.recentCommands = this.recentCommands.filter(cmd => cmd.id !== command.id);
        this.recentCommands.unshift(command);
        if (this.recentCommands.length > 10) {
            this.recentCommands.pop();
        }
    }

    // Execute command
    executeCommand(action) {
        console.log(`Executing command: ${action}`);
        showNotification(`Command: ${action}`, 'info');

        // Trigger custom event
        window.dispatchEvent(new CustomEvent('command-executed', {
            detail: { action }
        }));
    }

    // Register custom command
    registerCommand(command) {
        this.commands.push(command);
        this.fuse = new Fuse(this.commands, {
            keys: ['label', 'category'],
            threshold: 0.3
        });
    }
}

export const commandPalette = new CommandPalette();
export default commandPalette;
