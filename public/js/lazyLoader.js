// public/js/lazyLoader.js
// Lazy Loading System for Performance Optimization

class LazyLoader {
    constructor() {
        this.loadedModules = new Map();
        this.loadingPromises = new Map();
    }

    // Lazy load a module
    async load(modulePath) {
        // Check if already loaded
        if (this.loadedModules.has(modulePath)) {
            return this.loadedModules.get(modulePath);
        }

        // Check if currently loading
        if (this.loadingPromises.has(modulePath)) {
            return this.loadingPromises.get(modulePath);
        }

        // Start loading
        const loadPromise = this.loadModule(modulePath);
        this.loadingPromises.set(modulePath, loadPromise);

        try {
            const module = await loadPromise;
            this.loadedModules.set(modulePath, module);
            this.loadingPromises.delete(modulePath);
            return module;
        } catch (error) {
            this.loadingPromises.delete(modulePath);
            throw error;
        }
    }

    // Load module dynamically
    async loadModule(modulePath) {
        console.log(`📦 Lazy loading: ${modulePath}`);
        const startTime = performance.now();

        try {
            const module = await import(modulePath);
            const loadTime = (performance.now() - startTime).toFixed(2);
            console.log(`✅ Loaded ${modulePath} in ${loadTime}ms`);
            return module;
        } catch (error) {
            console.error(`❌ Failed to load ${modulePath}:`, error);
            throw error;
        }
    }

    // Preload modules in background
    async preload(modulePaths) {
        console.log(`🔄 Preloading ${modulePaths.length} modules...`);
        
        const promises = modulePaths.map(path => 
            this.load(path).catch(err => {
                console.warn(`Failed to preload ${path}:`, err);
                return null;
            })
        );

        await Promise.all(promises);
        console.log('✅ Preloading complete');
    }

    // Get loaded module (sync)
    get(modulePath) {
        return this.loadedModules.get(modulePath);
    }

    // Check if module is loaded
    isLoaded(modulePath) {
        return this.loadedModules.has(modulePath);
    }

    // Unload module (for memory management)
    unload(modulePath) {
        this.loadedModules.delete(modulePath);
        console.log(`🗑️ Unloaded ${modulePath}`);
    }

    // Get loading stats
    getStats() {
        return {
            loaded: this.loadedModules.size,
            loading: this.loadingPromises.size,
            modules: Array.from(this.loadedModules.keys())
        };
    }
}

// Module registry for lazy loading
export const ModuleRegistry = {
    // Core modules (always loaded)
    CORE: {
        EDITOR: './editor.js',
        UI: './ui.js',
        UTILS: './utils.js'
    },

    // Feature modules (lazy loaded)
    FEATURES: {
        FORMATTER: './formatter.js',
        DIFF_VIEWER: './diffViewer.js',
        MARKDOWN_PREVIEW: './markdownPreview.js',
        SCREENSHOT: './screenshot.js',
        CHARTS: './charts.js',
        COLOR_PICKER: './colorPicker.js',
        EMMET: './emmetSupport.js',
        PROBLEMS_PANEL: './problemsPanel.js',
        BREADCRUMBS: './breadcrumbs.js'
    },

    // Advanced features (lazy loaded on demand)
    ADVANCED: {
        ADVANCED_EDITOR: './advancedEditor.js',
        EDITOR_SPLIT: './editorSplit.js',
        DATA_UTILS: './dataUtils.js',
        DOWNLOAD_MANAGER: './downloadManager.js'
    },

    // Git features (lazy loaded)
    GIT: {
        GIT_CLIENT: './gitClient.js',
        GITHUB: './github.js'
    },

    // UI Effects (lazy loaded)
    EFFECTS: {
        ANIMATIONS: './animations.js',
        UI_EFFECTS: './uiEffects.js',
        PREMIUM_UI: './premiumUI.js'
    },

    // Storage (lazy loaded)
    STORAGE: {
        PERSISTENT_STORAGE: './persistentStorage.js',
        WORKSPACE: './workspace.js'
    }
};

// Create singleton instance
export const lazyLoader = new LazyLoader();

// Helper functions
export async function loadFeature(featureName) {
    const modulePath = ModuleRegistry.FEATURES[featureName] || 
                       ModuleRegistry.ADVANCED[featureName] ||
                       ModuleRegistry.GIT[featureName] ||
                       ModuleRegistry.EXTENSIONS[featureName] ||
                       ModuleRegistry.EFFECTS[featureName] ||
                       ModuleRegistry.STORAGE[featureName];

    if (!modulePath) {
        throw new Error(`Unknown feature: ${featureName}`);
    }

    return await lazyLoader.load(modulePath);
}

// Preload essential features in background
export async function preloadEssentials() {
    const essentials = [
        ModuleRegistry.STORAGE.PERSISTENT_STORAGE,
        ModuleRegistry.FEATURES.BREADCRUMBS,
        ModuleRegistry.ADVANCED.DOWNLOAD_MANAGER
    ];

    await lazyLoader.preload(essentials);
}

// Load feature on user action
export function onDemand(featureName) {
    return async function(...args) {
        const module = await loadFeature(featureName);
        const defaultExport = module.default || module[featureName];
        
        if (typeof defaultExport === 'function') {
            return defaultExport(...args);
        } else if (defaultExport && typeof defaultExport.init === 'function') {
            return defaultExport.init(...args);
        }
        
        return defaultExport;
    };
}

export default lazyLoader;
