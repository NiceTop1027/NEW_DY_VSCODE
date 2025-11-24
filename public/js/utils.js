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

/**
 * Event Manager - Prevents memory leaks by tracking and cleaning up event listeners
 */
export class EventManager {
  constructor() {
    this.listeners = [];
    this.timers = new Set();
    this.intervals = new Set();
  }

  /**
     * Add event listener with automatic tracking
     */
  on(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);
    this.listeners.push({ element, event, handler, options });
    return handler; // Return handler for manual removal if needed
  }

  /**
     * Remove specific event listener
     */
  off(element, event, handler) {
    element.removeEventListener(event, handler);
    this.listeners = this.listeners.filter(
      l => !(l.element === element && l.event === event && l.handler === handler)
    );
  }

  /**
     * Add timeout with automatic tracking
     */
  setTimeout(fn, delay) {
    const id = setTimeout(() => {
      this.timers.delete(id);
      fn();
    }, delay);
    this.timers.add(id);
    return id;
  }

  /**
     * Add interval with automatic tracking
     */
  setInterval(fn, delay) {
    const id = setInterval(fn, delay);
    this.intervals.add(id);
    return id;
  }

  /**
     * Clear specific timeout
     */
  clearTimeout(id) {
    clearTimeout(id);
    this.timers.delete(id);
  }

  /**
     * Clear specific interval
     */
  clearInterval(id) {
    clearInterval(id);
    this.intervals.delete(id);
  }

  /**
     * Clean up all tracked resources
     */
  cleanup() {
    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler, options }) => {
      try {
        element.removeEventListener(event, handler, options);
      } catch (e) {
        console.warn('Error removing event listener:', e);
      }
    });
    this.listeners = [];

    // Clear all timeouts
    this.timers.forEach(id => clearTimeout(id));
    this.timers.clear();

    // Clear all intervals
    this.intervals.forEach(id => clearInterval(id));
    this.intervals.clear();
  }
}

/**
 * Global event manager for cleanup on page unload
 */
export const globalEventManager = new EventManager();

// Auto cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalEventManager.cleanup();
  });
}

/**
 * Escape HTML to prevent XSS attacks
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Safely create an element with text content (XSS safe)
 */
export function createSafeElement(tag, options = {}) {
  const element = document.createElement(tag);

  if (options.text) {
    element.textContent = options.text;
  }

  if (options.className) {
    element.className = options.className;
  }

  if (options.style) {
    Object.assign(element.style, options.style);
  }

  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }

  return element;
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

  // Escape message to prevent XSS
  const safeMessage = escapeHtml(message);

  Toastify({
    text: `${config.icon} ${safeMessage}`,
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