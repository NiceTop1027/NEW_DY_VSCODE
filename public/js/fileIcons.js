// public/js/fileIcons.js
// File icons system using VSCode Codicons

class FileIconManager {
    constructor() {
        // Map file extensions to Codicon classes
        this.iconMap = {
            // Programming languages
            'js': 'symbol-method',
            'jsx': 'symbol-method',
            'ts': 'symbol-method',
            'tsx': 'symbol-method',
            'py': 'snake',
            'java': 'coffee',
            'cpp': 'file-code',
            'c': 'file-code',
            'cs': 'file-code',
            'go': 'file-code',
            'rs': 'file-code',
            'rb': 'ruby',
            'php': 'file-code',
            'swift': 'file-code',
            'kt': 'file-code',
            'scala': 'file-code',

            // Web
            'html': 'file-code',
            'css': 'symbol-color',
            'scss': 'symbol-color',
            'sass': 'symbol-color',
            'less': 'symbol-color',

            // Data
            'json': 'json',
            'xml': 'code',
            'yaml': 'file-code',
            'yml': 'file-code',
            'toml': 'file-code',
            'ini': 'settings-gear',
            'csv': 'graph',

            // Documents
            'md': 'markdown',
            'txt': 'file-text',
            'pdf': 'file-pdf',
            'doc': 'file-text',
            'docx': 'file-text',

            // Images
            'png': 'file-media',
            'jpg': 'file-media',
            'jpeg': 'file-media',
            'gif': 'file-media',
            'svg': 'file-media',
            'ico': 'symbol-color',
            'webp': 'file-media',

            // Config
            'env': 'lock',
            'config': 'settings-gear',
            'conf': 'settings-gear',
            'gitignore': 'github-action',
            'dockerignore': 'vm',
            'editorconfig': 'settings-gear',

            // Build
            'dockerfile': 'vm',
            'makefile': 'tools',
            'webpack': 'package',
            'package': 'package',
            'lock': 'lock',

            // Shell
            'sh': 'terminal',
            'bash': 'terminal',
            'zsh': 'terminal',
            'fish': 'terminal',
            'ps1': 'terminal-powershell',

            // Database
            'sql': 'database',
            'db': 'database',
            'sqlite': 'database',

            // Archive
            'zip': 'file-zip',
            'tar': 'file-zip',
            'gz': 'file-zip',
            'rar': 'file-zip',
            '7z': 'file-zip',

            // Other
            'log': 'output',
            'LICENSE': 'law',
            'README': 'book',
            'gitattributes': 'github-action'
        };

        // Color map for file types
        this.colorMap = {
            'js': '#f0db4f',
            'jsx': '#61dafb',
            'ts': '#3178c6',
            'tsx': '#3178c6',
            'py': '#3776ab',
            'java': '#b07219',
            'cpp': '#a8b9cc',
            'c': '#a8b9cc',
            'html': '#e34c26',
            'css': '#563d7c',
            'scss': '#c6538c',
            'sass': '#c6538c',
            'json': '#89d185',
            'md': '#519aba',
            'go': '#00add8',
            'rs': '#ce422b',
            'rb': '#cc342d',
            'php': '#777bb4',
            'xml': '#e37933',
            'svg': '#a074c4',
            'sql': '#e38c00'
        };
    }

    // Get Codicon class for file
    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const baseName = fileName.toLowerCase();

        // Check special file names
        if (this.iconMap[baseName]) {
            return this.iconMap[baseName];
        }

        // Check extension
        return this.iconMap[ext] || 'file';
    }

    // Get folder Codicon class
    getFolderIcon(isOpen = false) {
        return isOpen ? 'folder-opened' : 'folder';
    }

    // Get color for file
    getFileColor(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        return this.colorMap[ext] || '#c5c5c5';
    }

    // Create icon element
    createIconElement(fileName, isDirectory = false) {
        const icon = document.createElement('i');
        icon.className = 'codicon';

        if (isDirectory) {
            icon.classList.add(`codicon-${this.getFolderIcon(false)}`);
            icon.style.color = '#dcb67a';
        } else {
            const iconClass = this.getFileIcon(fileName);
            icon.classList.add(`codicon-${iconClass}`);
            icon.style.color = this.getFileColor(fileName);
        }

        return icon;
    }

    // Get icon HTML string
    getIconHTML(fileName, isDirectory = false) {
        if (isDirectory) {
            return `<i class="codicon codicon-${this.getFolderIcon(false)}" style="color: #dcb67a;"></i>`;
        } else {
            const iconClass = this.getFileIcon(fileName);
            const color = this.getFileColor(fileName);
            return `<i class="codicon codicon-${iconClass}" style="color: ${color};"></i>`;
        }
    }

    // Get language from extension
    getLanguageFromExtension(ext) {
        const langMap = {
            'js': 'JavaScript',
            'jsx': 'React',
            'ts': 'TypeScript',
            'tsx': 'TypeScript React',
            'py': 'Python',
            'java': 'Java',
            'cpp': 'C++',
            'c': 'C',
            'cs': 'C#',
            'go': 'Go',
            'rs': 'Rust',
            'rb': 'Ruby',
            'php': 'PHP',
            'html': 'HTML',
            'css': 'CSS',
            'scss': 'SCSS',
            'md': 'Markdown',
            'json': 'JSON',
            'xml': 'XML',
            'sql': 'SQL',
            'sh': 'Shell'
        };

        return langMap[ext] || ext.toUpperCase();
    }
}

export const fileIcons = new FileIconManager();
export default fileIcons;
