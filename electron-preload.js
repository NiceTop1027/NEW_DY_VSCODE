// Electron Preload Script
const { contextBridge } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform
});
