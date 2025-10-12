// public/js/fileIcons.js
// File icons system

class FileIconManager {
    constructor() {
        this.iconMap = {
            // Programming languages
            'js': '📜',
            'jsx': '⚛️',
            'ts': '📘',
            'tsx': '⚛️',
            'py': '🐍',
            'java': '☕',
            'cpp': '⚙️',
            'c': '⚙️',
            'cs': '#️⃣',
            'go': '🐹',
            'rs': '🦀',
            'rb': '💎',
            'php': '🐘',
            'swift': '🦅',
            'kt': '🎯',
            'scala': '📊',
            
            // Web
            'html': '🌐',
            'css': '🎨',
            'scss': '🎨',
            'sass': '🎨',
            'less': '🎨',
            
            // Data
            'json': '📋',
            'xml': '📄',
            'yaml': '📝',
            'yml': '📝',
            'toml': '⚙️',
            'ini': '⚙️',
            'csv': '📊',
            
            // Documents
            'md': '📝',
            'txt': '📄',
            'pdf': '📕',
            'doc': '📘',
            'docx': '📘',
            
            // Images
            'png': '🖼️',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'gif': '🎞️',
            'svg': '🎨',
            'ico': '🎯',
            'webp': '🖼️',
            
            // Config
            'env': '🔐',
            'config': '⚙️',
            'conf': '⚙️',
            'gitignore': '🚫',
            'dockerignore': '🐳',
            'editorconfig': '⚙️',
            
            // Build
            'dockerfile': '🐳',
            'makefile': '🔨',
            'webpack': '📦',
            'package': '📦',
            'lock': '🔒',
            
            // Shell
            'sh': '🐚',
            'bash': '🐚',
            'zsh': '🐚',
            'fish': '🐠',
            'ps1': '💻',
            
            // Database
            'sql': '🗄️',
            'db': '🗄️',
            'sqlite': '🗄️',
            
            // Archive
            'zip': '📦',
            'tar': '📦',
            'gz': '📦',
            'rar': '📦',
            '7z': '📦',
            
            // Other
            'log': '📋',
            'LICENSE': '📜',
            'README': '📖',
            'gitattributes': '🎯'
        };
        
        this.folderIcon = '📁';
        this.folderOpenIcon = '📂';
        this.defaultFileIcon = '📄';
    }

    // Get icon for file
    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const baseName = fileName.toLowerCase();
        
        // Check special file names
        if (this.iconMap[baseName]) {
            return this.iconMap[baseName];
        }
        
        // Check extension
        return this.iconMap[ext] || this.defaultFileIcon;
    }

    // Get folder icon
    getFolderIcon(isOpen = false) {
        return isOpen ? this.folderOpenIcon : this.folderIcon;
    }

    // Get icon with color
    getIconWithColor(fileName, isDirectory = false) {
        if (isDirectory) {
            return {
                icon: this.folderIcon,
                color: '#90caf9'
            };
        }
        
        const ext = fileName.split('.').pop().toLowerCase();
        const icon = this.getFileIcon(fileName);
        
        const colorMap = {
            'js': '#f7df1e',
            'jsx': '#61dafb',
            'ts': '#3178c6',
            'tsx': '#3178c6',
            'py': '#3776ab',
            'java': '#007396',
            'html': '#e34c26',
            'css': '#1572b6',
            'json': '#000000',
            'md': '#083fa1',
            'go': '#00add8',
            'rs': '#ce422b',
            'rb': '#cc342d',
            'php': '#777bb4'
        };
        
        return {
            icon: icon,
            color: colorMap[ext] || '#ffffff'
        };
    }

    // Add icon to element
    addIconToElement(element, fileName, isDirectory = false) {
        const iconData = this.getIconWithColor(fileName, isDirectory);
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'file-icon';
        iconSpan.textContent = iconData.icon;
        iconSpan.style.marginRight = '8px';
        iconSpan.style.fontSize = '16px';
        
        element.prepend(iconSpan);
    }

    // Get language from icon
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
