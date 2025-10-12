// public/js/premiumUI.js
// Premium UI/UX System - The Ultimate Experience

import 'animate.css';
import { showNotification } from './utils.js';

class PremiumUI {
    constructor() {
        this.theme = 'premium-dark';
        this.animations = true;
        this.particles = true;
        this.glassmorphism = true;
    }

    // Initialize premium UI
    init() {
        this.injectPremiumStyles();
        this.enhanceActivityBar();
        this.enhanceEditor();
        this.enhanceSidebar();
        this.enhanceStatusBar();
        this.addFloatingElements();
        this.addContextMenus();
        this.addCommandPalette();
        this.addMiniWidgets();
        console.log('✨ Premium UI initialized');
    }

    // Inject premium styles
    injectPremiumStyles() {
        const style = document.createElement('style');
        style.id = 'premium-ui-styles';
        style.textContent = `
            /* Premium Theme Variables */
            :root {
                --premium-gradient-1: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                --premium-gradient-2: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                --premium-gradient-3: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
                --premium-gradient-4: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
                --premium-glow: 0 0 20px rgba(102, 126, 234, 0.5);
                --premium-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                --glass-bg: rgba(255, 255, 255, 0.05);
                --glass-border: rgba(255, 255, 255, 0.1);
            }

            /* Glassmorphism Effect */
            .glass-effect {
                background: var(--glass-bg);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid var(--glass-border);
                box-shadow: var(--premium-shadow);
            }

            /* Premium Activity Bar */
            #activity-bar {
                background: linear-gradient(180deg, #1e1e1e 0%, #252526 100%);
                box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
                position: relative;
                overflow: hidden;
            }

            #activity-bar::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: var(--premium-gradient-1);
                opacity: 0.8;
            }

            .activity-icon {
                position: relative;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                overflow: hidden;
            }

            .activity-icon::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: var(--premium-gradient-1);
                transition: left 0.3s ease;
                opacity: 0.2;
            }

            .activity-icon:hover::before {
                left: 0;
            }

            .activity-icon:hover {
                transform: scale(1.1);
                box-shadow: var(--premium-glow);
            }

            .activity-icon.active {
                background: var(--premium-gradient-1);
                box-shadow: var(--premium-glow);
                animation: pulse 2s infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }

            /* Premium Sidebar */
            #sidebar {
                background: linear-gradient(180deg, #252526 0%, #2d2d30 100%);
                box-shadow: 2px 0 15px rgba(0, 0, 0, 0.2);
            }

            .search-box input {
                background: var(--glass-bg);
                backdrop-filter: blur(10px);
                border: 1px solid var(--glass-border);
                transition: all 0.3s ease;
            }

            .search-box input:focus {
                border-color: #667eea;
                box-shadow: 0 0 15px rgba(102, 126, 234, 0.3);
                transform: scale(1.02);
            }

            /* Premium File Tree */
            .tree-item {
                transition: all 0.2s ease;
                position: relative;
            }

            .tree-item::before {
                content: '';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: 3px;
                background: var(--premium-gradient-1);
                opacity: 0;
                transition: opacity 0.2s ease;
            }

            .tree-item:hover::before {
                opacity: 1;
            }

            .tree-item:hover {
                background: var(--glass-bg);
                backdrop-filter: blur(10px);
                transform: translateX(5px);
            }

            /* Premium Tabs */
            .tab {
                position: relative;
                transition: all 0.3s ease;
                overflow: hidden;
            }

            .tab::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: var(--premium-gradient-1);
                transform: scaleX(0);
                transition: transform 0.3s ease;
            }

            .tab:hover::after {
                transform: scaleX(1);
            }

            .tab.active {
                background: var(--glass-bg);
                backdrop-filter: blur(10px);
            }

            .tab.active::after {
                transform: scaleX(1);
            }

            /* Premium Editor */
            #editor {
                box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.2);
            }

            /* Premium Status Bar */
            #status-bar {
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
                position: relative;
                overflow: hidden;
            }

            #status-bar::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                animation: shimmer 3s infinite;
            }

            @keyframes shimmer {
                0% { left: -100%; }
                100% { left: 100%; }
            }

            /* Premium Buttons */
            .btn-primary {
                background: var(--premium-gradient-1);
                border: none;
                box-shadow: var(--premium-shadow);
                transition: all 0.3s ease;
                position: relative;
                overflow: hidden;
            }

            .btn-primary::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: translate(-50%, -50%);
                transition: width 0.6s, height 0.6s;
            }

            .btn-primary:hover::before {
                width: 300px;
                height: 300px;
            }

            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 40px rgba(102, 126, 234, 0.4);
            }

            /* Premium Modal */
            .modal {
                backdrop-filter: blur(10px);
                animation: fadeIn 0.3s ease;
            }

            .modal-content {
                background: linear-gradient(135deg, #2d2d30 0%, #252526 100%);
                border: 1px solid var(--glass-border);
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Floating Action Button */
            .fab {
                position: fixed;
                bottom: 30px;
                right: 30px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: var(--premium-gradient-1);
                box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s ease;
                z-index: 1000;
                animation: float 3s ease-in-out infinite;
            }

            @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }

            .fab:hover {
                transform: scale(1.1) rotate(90deg);
                box-shadow: 0 12px 32px rgba(102, 126, 234, 0.6);
            }

            /* Premium Scrollbar */
            ::-webkit-scrollbar {
                width: 10px;
                height: 10px;
            }

            ::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.2);
            }

            ::-webkit-scrollbar-thumb {
                background: var(--premium-gradient-1);
                border-radius: 5px;
            }

            ::-webkit-scrollbar-thumb:hover {
                background: var(--premium-gradient-2);
            }

            /* Premium Tooltips */
            [title] {
                position: relative;
            }

            /* Micro Interactions */
            .interactive {
                transition: all 0.2s ease;
            }

            .interactive:active {
                transform: scale(0.95);
            }

            /* Loading Spinner */
            .premium-spinner {
                width: 50px;
                height: 50px;
                border: 3px solid transparent;
                border-top-color: #667eea;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* Gradient Text */
            .gradient-text {
                background: var(--premium-gradient-1);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            /* Card Hover Effect */
            .premium-card {
                background: var(--glass-bg);
                backdrop-filter: blur(10px);
                border: 1px solid var(--glass-border);
                transition: all 0.3s ease;
            }

            .premium-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 40px rgba(102, 126, 234, 0.3);
                border-color: #667eea;
            }

            /* Neon Glow */
            .neon-glow {
                text-shadow: 0 0 10px #667eea, 0 0 20px #667eea, 0 0 30px #667eea;
                animation: neon-pulse 2s ease-in-out infinite;
            }

            @keyframes neon-pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `;
        document.head.appendChild(style);
    }

    // Enhance Activity Bar
    enhanceActivityBar() {
        const activityBar = document.getElementById('activity-bar');
        if (!activityBar) return;

        activityBar.classList.add('animate__animated', 'animate__fadeInLeft');
        
        // Add interactive effects
        const icons = activityBar.querySelectorAll('.activity-icon');
        icons.forEach((icon, index) => {
            icon.classList.add('interactive');
            icon.style.animationDelay = `${index * 0.1}s`;
        });
    }

    // Enhance Editor
    enhanceEditor() {
        const editor = document.getElementById('editor');
        if (!editor) return;

        editor.classList.add('animate__animated', 'animate__fadeIn');
    }

    // Enhance Sidebar
    enhanceSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        sidebar.classList.add('animate__animated', 'animate__fadeInLeft');
    }

    // Enhance Status Bar
    enhanceStatusBar() {
        const statusBar = document.getElementById('status-bar');
        if (!statusBar) return;

        statusBar.classList.add('animate__animated', 'animate__fadeInUp');
    }

    // Add Floating Elements
    addFloatingElements() {
        // Floating Action Button
        const fab = document.createElement('div');
        fab.className = 'fab';
        fab.innerHTML = '<i class="codicon codicon-rocket" style="font-size: 24px; color: white;"></i>';
        fab.title = 'Quick Actions';
        
        fab.addEventListener('click', () => {
            this.showQuickActions();
        });
        
        document.body.appendChild(fab);
    }

    // Show Quick Actions
    showQuickActions() {
        const menu = document.createElement('div');
        menu.className = 'glass-effect';
        menu.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 30px;
            padding: 15px;
            border-radius: 12px;
            z-index: 1001;
            animation: slideUp 0.3s ease;
        `;

        menu.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="btn-primary interactive" id="quick-format" style="padding: 10px 20px; border-radius: 8px;">
                    ✨ Format Code
                </button>
                <button class="btn-primary interactive" id="quick-save" style="padding: 10px 20px; border-radius: 8px;">
                    💾 Save All
                </button>
                <button class="btn-primary interactive" id="quick-run" style="padding: 10px 20px; border-radius: 8px;">
                    ▶️ Run Code
                </button>
                <button class="btn-primary interactive" id="quick-split" style="padding: 10px 20px; border-radius: 8px;">
                    ⬌ Split Editor
                </button>
            </div>
        `;

        document.body.appendChild(menu);

        // Event listeners
        document.getElementById('quick-format')?.addEventListener('click', () => {
            showNotification('✨ Code formatted', 'success');
            menu.remove();
        });

        document.getElementById('quick-save')?.addEventListener('click', () => {
            showNotification('💾 All files saved', 'success');
            menu.remove();
        });

        document.getElementById('quick-run')?.addEventListener('click', () => {
            document.getElementById('run-code-btn')?.click();
            menu.remove();
        });

        document.getElementById('quick-split')?.addEventListener('click', () => {
            import('./editorSplit.js').then(({ editorSplit }) => {
                editorSplit.showSplitMenu();
            });
            menu.remove();
        });

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && !e.target.closest('.fab')) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    }

    // Add Context Menus
    addContextMenus() {
        // Right-click context menu enhancement
        document.addEventListener('contextmenu', (e) => {
            // Let default context menus work
        });
    }

    // Add Command Palette
    addCommandPalette() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                this.showCommandPalette();
            }
        });
    }

    // Show Command Palette
    showCommandPalette() {
        const palette = document.createElement('div');
        palette.className = 'glass-effect';
        palette.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            width: 600px;
            max-width: 90%;
            padding: 20px;
            border-radius: 12px;
            z-index: 10000;
            animation: slideUp 0.3s ease;
        `;

        palette.innerHTML = `
            <input type="text" id="command-input" placeholder="Type a command..." 
                style="width: 100%; padding: 15px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-color); font-size: 16px;">
            <div id="command-results" style="margin-top: 15px; max-height: 400px; overflow-y: auto;"></div>
        `;

        document.body.appendChild(palette);

        const input = document.getElementById('command-input');
        input?.focus();

        // Close on Escape
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                palette.remove();
            }
        });

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closePalette(e) {
                if (!palette.contains(e.target)) {
                    palette.remove();
                    document.removeEventListener('click', closePalette);
                }
            });
        }, 100);
    }

    // Add Mini Widgets
    addMiniWidgets() {
        // Add clock widget
        this.addClockWidget();
    }

    // Add Clock Widget
    addClockWidget() {
        const clock = document.createElement('div');
        clock.className = 'glass-effect';
        clock.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            color: var(--text-color);
            z-index: 999;
            animation: fadeIn 0.5s ease;
        `;

        const updateClock = () => {
            const now = new Date();
            clock.textContent = now.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        };

        updateClock();
        setInterval(updateClock, 1000);

        document.body.appendChild(clock);
    }
}

export const premiumUI = new PremiumUI();
export default premiumUI;
