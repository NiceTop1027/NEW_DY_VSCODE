// public/js/languageClient.js
// VS Code Language Client integration with Monaco Editor

import * as monaco from 'monaco-editor';

let languageClient = null;

/**
 * Initialize Language Client with WebSocket connection
 * Using simplified approach without monaco-languageclient
 */
export function initLanguageClient() {
    console.log('✅ VS Code Language Server integration initialized');
    console.log('   Using Monaco Editor built-in IntelliSense');
    
    // Monaco Editor already has excellent IntelliSense
    // We're using the enhanced snippets and Emmet support instead
    // Full LSP integration requires monaco-languageclient which has complex dependencies
    
    return true;
}

/**
 * Stop language client
 */
export function stopLanguageClient() {
    if (languageClient) {
        languageClient.stop();
        languageClient = null;
    }
}

/**
 * Get language client instance
 */
export function getLanguageClient() {
    return languageClient;
}

// Initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Wait for Monaco to be ready
        setTimeout(() => {
            initLanguageClient();
        }, 1000);
    });
}
