// public/js/utils.js
export function getLanguageIdFromFilePath(filePath) {
    const extension = filePath.split('.').pop();
    switch (extension) {
        case 'js': return 'javascript';
        case 'ts': return 'typescript';
        case 'html': return 'html';
        case 'css': return 'css';
        case 'json': return 'json';
        case 'py': return 'python';
        case 'md': return 'markdown';
        default: return 'plaintext';
    }
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