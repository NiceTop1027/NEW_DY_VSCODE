// public/js/utils.js
import Toastify from 'toastify-js';
import 'toastify-js/src/toastify.css';

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
    // Type mapping for colors
    const typeConfig = {
        'success': {
            background: 'linear-gradient(to right, #00b09b, #96c93d)',
            icon: '✅'
        },
        'error': {
            background: 'linear-gradient(to right, #ff5f6d, #ffc371)',
            icon: '❌'
        },
        'warning': {
            background: 'linear-gradient(to right, #f093fb, #f5576c)',
            icon: '⚠️'
        },
        'info': {
            background: 'linear-gradient(to right, #4facfe, #00f2fe)',
            icon: 'ℹ️'
        }
    };

    const config = typeConfig[type] || typeConfig['info'];
    
    Toastify({
        text: `${config.icon} ${message}`,
        duration: 3000,
        close: true,
        gravity: 'top',
        position: 'right',
        stopOnFocus: true,
        style: {
            background: config.background,
            borderRadius: '8px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        },
        onClick: function() {
            // Close on click
        }
    }).showToast();
}