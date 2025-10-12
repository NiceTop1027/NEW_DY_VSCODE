// public/js/store.js
// Global state management with Zustand

import { create } from 'zustand';

// Main application store
export const useAppStore = create((set, get) => ({
    // File state
    openFiles: new Map(),
    activeFile: null,
    fileChanges: new Map(),
    
    // UI state
    currentView: 'explorer',
    sidebarWidth: 250,
    panelHeight: 200,
    
    // Terminal state
    terminalVisible: false,
    
    // Actions
    openFile: (path, content) => set((state) => {
        const newOpenFiles = new Map(state.openFiles);
        newOpenFiles.set(path, content);
        return { 
            openFiles: newOpenFiles,
            activeFile: path
        };
    }),
    
    closeFile: (path) => set((state) => {
        const newOpenFiles = new Map(state.openFiles);
        newOpenFiles.delete(path);
        
        let newActiveFile = state.activeFile;
        if (state.activeFile === path) {
            const files = Array.from(newOpenFiles.keys());
            newActiveFile = files.length > 0 ? files[files.length - 1] : null;
        }
        
        return {
            openFiles: newOpenFiles,
            activeFile: newActiveFile
        };
    }),
    
    setActiveFile: (path) => set({ activeFile: path }),
    
    updateFileContent: (path, content) => set((state) => {
        const newOpenFiles = new Map(state.openFiles);
        newOpenFiles.set(path, content);
        return { openFiles: newOpenFiles };
    }),
    
    markFileChanged: (path, originalContent) => set((state) => {
        const newFileChanges = new Map(state.fileChanges);
        newFileChanges.set(path, {
            status: 'modified',
            originalContent
        });
        return { fileChanges: newFileChanges };
    }),
    
    clearFileChange: (path) => set((state) => {
        const newFileChanges = new Map(state.fileChanges);
        newFileChanges.delete(path);
        return { fileChanges: newFileChanges };
    }),
    
    setCurrentView: (view) => set({ currentView: view }),
    
    setSidebarWidth: (width) => set({ sidebarWidth: width }),
    
    setPanelHeight: (height) => set({ panelHeight: height }),
    
    toggleTerminal: () => set((state) => ({ 
        terminalVisible: !state.terminalVisible 
    })),
    
    // Getters
    getOpenFileCount: () => get().openFiles.size,
    
    getChangedFileCount: () => get().fileChanges.size,
    
    isFileOpen: (path) => get().openFiles.has(path),
    
    isFileChanged: (path) => get().fileChanges.has(path),
    
    getFileContent: (path) => get().openFiles.get(path),
}));

// GitHub store
export const useGitHubStore = create((set) => ({
    token: localStorage.getItem('github_token'),
    user: null,
    repos: [],
    clonedRepos: JSON.parse(localStorage.getItem('clonedRepos') || '[]'),
    
    setToken: (token) => {
        localStorage.setItem('github_token', token);
        set({ token });
    },
    
    setUser: (user) => {
        localStorage.setItem('github_user', JSON.stringify(user));
        set({ user });
    },
    
    setRepos: (repos) => set({ repos }),
    
    addClonedRepo: (repo) => set((state) => {
        const newClonedRepos = [...state.clonedRepos, repo];
        localStorage.setItem('clonedRepos', JSON.stringify(newClonedRepos));
        return { clonedRepos: newClonedRepos };
    }),
    
    logout: () => {
        localStorage.removeItem('github_token');
        localStorage.removeItem('github_user');
        set({ token: null, user: null, repos: [] });
    }
}));

// Settings store
export const useSettingsStore = create((set) => ({
    theme: localStorage.getItem('theme') || 'vs-dark',
    fontSize: parseInt(localStorage.getItem('fontSize')) || 14,
    tabSize: parseInt(localStorage.getItem('tabSize')) || 4,
    minimap: localStorage.getItem('minimap-enabled') === 'true',
    wordWrap: localStorage.getItem('wordWrap') === 'true',
    
    setTheme: (theme) => {
        localStorage.setItem('theme', theme);
        set({ theme });
    },
    
    setFontSize: (fontSize) => {
        localStorage.setItem('fontSize', fontSize.toString());
        set({ fontSize });
    },
    
    setTabSize: (tabSize) => {
        localStorage.setItem('tabSize', tabSize.toString());
        set({ tabSize });
    },
    
    toggleMinimap: () => set((state) => {
        const newValue = !state.minimap;
        localStorage.setItem('minimap-enabled', newValue.toString());
        return { minimap: newValue };
    }),
    
    toggleWordWrap: () => set((state) => {
        const newValue = !state.wordWrap;
        localStorage.setItem('wordWrap', newValue.toString());
        return { wordWrap: newValue };
    })
}));

export default useAppStore;
