// public/js/utils.js
export function getLanguageIdFromFilePath(filePath) {
    const extension = filePath.split('.').pop().toLowerCase();
    
    const languageMap = {
        // JavaScript & TypeScript
        'js': 'javascript',
        'jsx': 'javascript',
        'mjs': 'javascript',
        'cjs': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        
        // Web
        'html': 'html',
        'htm': 'html',
        'css': 'css',
        'scss': 'scss',
        'sass': 'sass',
        'less': 'less',
        
        // Data
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yaml',
        'yml': 'yaml',
        
        // Python
        'py': 'python',
        'pyw': 'python',
        'pyx': 'python',
        
        // Java & JVM
        'java': 'java',
        'kt': 'kotlin',
        'kts': 'kotlin',
        'scala': 'scala',
        
        // C/C++
        'c': 'c',
        'h': 'c',
        'cpp': 'cpp',
        'cc': 'cpp',
        'cxx': 'cpp',
        'hpp': 'cpp',
        'hh': 'cpp',
        'hxx': 'cpp',
        
        // C#
        'cs': 'csharp',
        
        // PHP
        'php': 'php',
        'phtml': 'php',
        
        // Ruby
        'rb': 'ruby',
        'erb': 'ruby',
        
        // Go
        'go': 'go',
        
        // Rust
        'rs': 'rust',
        
        // Swift
        'swift': 'swift',
        
        // R
        'r': 'r',
        
        // SQL
        'sql': 'sql',
        
        // Shell
        'sh': 'shell',
        'bash': 'shell',
        'zsh': 'shell',
        
        // PowerShell
        'ps1': 'powershell',
        'psm1': 'powershell',
        
        // Docker
        'dockerfile': 'dockerfile',
        
        // Markdown
        'md': 'markdown',
        'markdown': 'markdown',
        
        // Text
        'txt': 'plaintext',
        'log': 'plaintext'
    };
    
    return languageMap[extension] || 'plaintext';
}

export function showNotification(message, type = 'info') {
    const notificationArea = document.getElementById('notification-area');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notificationArea.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.addEventListener('transitionend', () => notification.remove());
    }, 3000);
}