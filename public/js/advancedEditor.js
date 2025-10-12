// public/js/advancedEditor.js
// Advanced Editor Features with Vim/Emacs modes

import { showNotification } from './utils.js';

class AdvancedEditor {
    constructor() {
        this.vimMode = false;
        this.emacsMode = false;
        this.currentMode = 'normal';
        this.multiCursors = [];
        this.snippets = new Map();
        this.macros = new Map();
    }

    // Initialize advanced editor
    async init(editor) {
        this.editor = editor;
        this.setupVimMode();
        this.setupEmacsMode();
        this.setupMultiCursor();
        this.setupSnippets();
        this.setupMacros();
        this.setupAdvancedFeatures();
        console.log('✅ Advanced editor features initialized');
    }

    // Setup Vim mode
    setupVimMode() {
        // Vim mode toggle
        document.addEventListener('keydown', async (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                await this.toggleVimMode();
            }
        });
    }

    // Toggle Vim mode
    async toggleVimMode() {
        try {
            if (!this.vimMode) {
                // Load monaco-vim
                const { initVimMode } = await import('monaco-vim');
                this.vimStatusNode = document.createElement('div');
                this.vimStatusNode.style.cssText = `
                    position: fixed;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.8);
                    color: #fff;
                    padding: 5px 15px;
                    border-radius: 5px;
                    font-family: monospace;
                    z-index: 1000;
                `;
                document.body.appendChild(this.vimStatusNode);
                
                this.vimMode = initVimMode(this.editor, this.vimStatusNode);
                showNotification('✅ Vim mode enabled', 'success');
            } else {
                this.vimMode.dispose();
                this.vimMode = null;
                if (this.vimStatusNode) {
                    this.vimStatusNode.remove();
                }
                showNotification('Vim mode disabled', 'info');
            }
        } catch (error) {
            console.error('Vim mode error:', error);
            showNotification('Failed to load Vim mode', 'error');
        }
    }

    // Setup Emacs mode
    setupEmacsMode() {
        document.addEventListener('keydown', async (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
                e.preventDefault();
                await this.toggleEmacsMode();
            }
        });
    }

    // Toggle Emacs mode
    async toggleEmacsMode() {
        try {
            if (!this.emacsMode) {
                const { EmacsExtension } = await import('monaco-emacs');
                this.emacsMode = new EmacsExtension(this.editor);
                this.emacsMode.start();
                showNotification('✅ Emacs mode enabled', 'success');
            } else {
                this.emacsMode.dispose();
                this.emacsMode = null;
                showNotification('Emacs mode disabled', 'info');
            }
        } catch (error) {
            console.error('Emacs mode error:', error);
            showNotification('Failed to load Emacs mode', 'error');
        }
    }

    // Setup Multi-cursor
    setupMultiCursor() {
        if (!this.editor) return;

        // Add cursor on Ctrl+Click
        this.editor.onMouseDown((e) => {
            if (e.event.ctrlKey || e.event.metaKey) {
                const position = e.target.position;
                if (position) {
                    this.addCursor(position);
                }
            }
        });

        // Multi-cursor shortcuts
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
            this.addNextOccurrence();
        });

        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
            this.selectAllOccurrences();
        });
    }

    // Add cursor at position
    addCursor(position) {
        const selections = this.editor.getSelections();
        selections.push(new monaco.Selection(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column
        ));
        this.editor.setSelections(selections);
    }

    // Add next occurrence
    addNextOccurrence() {
        this.editor.trigger('keyboard', 'editor.action.addSelectionToNextFindMatch', {});
    }

    // Select all occurrences
    selectAllOccurrences() {
        this.editor.trigger('keyboard', 'editor.action.selectHighlights', {});
    }

    // Setup Snippets
    setupSnippets() {
        // Common snippets
        this.snippets.set('log', {
            prefix: 'log',
            body: 'console.log($1);',
            description: 'Console log'
        });

        this.snippets.set('func', {
            prefix: 'func',
            body: 'function ${1:name}(${2:params}) {\n\t$0\n}',
            description: 'Function'
        });

        this.snippets.set('arrow', {
            prefix: 'arrow',
            body: 'const ${1:name} = (${2:params}) => {\n\t$0\n};',
            description: 'Arrow function'
        });

        this.snippets.set('class', {
            prefix: 'class',
            body: 'class ${1:ClassName} {\n\tconstructor(${2:params}) {\n\t\t$0\n\t}\n}',
            description: 'Class'
        });

        this.snippets.set('if', {
            prefix: 'if',
            body: 'if (${1:condition}) {\n\t$0\n}',
            description: 'If statement'
        });

        this.snippets.set('for', {
            prefix: 'for',
            body: 'for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t$0\n}',
            description: 'For loop'
        });

        this.snippets.set('foreach', {
            prefix: 'foreach',
            body: '${1:array}.forEach((${2:item}) => {\n\t$0\n});',
            description: 'ForEach loop'
        });

        this.snippets.set('try', {
            prefix: 'try',
            body: 'try {\n\t$0\n} catch (error) {\n\tconsole.error(error);\n}',
            description: 'Try-catch'
        });

        // Register snippets with Monaco
        if (monaco && monaco.languages) {
            monaco.languages.registerCompletionItemProvider('javascript', {
                provideCompletionItems: () => {
                    const suggestions = Array.from(this.snippets.values()).map(snippet => ({
                        label: snippet.prefix,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: snippet.body,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: snippet.description
                    }));
                    return { suggestions };
                }
            });
        }
    }

    // Setup Macros
    setupMacros() {
        let recording = false;
        let currentMacro = [];

        // Start/Stop recording macro
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
                e.preventDefault();
                if (!recording) {
                    recording = true;
                    currentMacro = [];
                    showNotification('🔴 Recording macro...', 'info');
                } else {
                    recording = false;
                    this.macros.set('last', currentMacro);
                    showNotification('✅ Macro recorded', 'success');
                }
            }

            // Play macro
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                this.playMacro('last');
            }

            // Record actions
            if (recording) {
                currentMacro.push({
                    key: e.key,
                    ctrl: e.ctrlKey,
                    shift: e.shiftKey,
                    alt: e.altKey
                });
            }
        });
    }

    // Play macro
    playMacro(name) {
        const macro = this.macros.get(name);
        if (!macro) {
            showNotification('No macro found', 'warning');
            return;
        }

        showNotification('▶️ Playing macro...', 'info');
        // TODO: Implement macro playback
    }

    // Setup Advanced Features
    setupAdvancedFeatures() {
        if (!this.editor) return;

        // Minimap toggle
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyM, () => {
            const options = this.editor.getOptions();
            const minimapEnabled = options.get(monaco.editor.EditorOption.minimap).enabled;
            this.editor.updateOptions({
                minimap: { enabled: !minimapEnabled }
            });
            showNotification(`Minimap ${!minimapEnabled ? 'enabled' : 'disabled'}`, 'info');
        });

        // Word wrap toggle
        this.editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyZ, () => {
            const options = this.editor.getOptions();
            const wordWrap = options.get(monaco.editor.EditorOption.wordWrap);
            this.editor.updateOptions({
                wordWrap: wordWrap === 'on' ? 'off' : 'on'
            });
            showNotification(`Word wrap ${wordWrap === 'off' ? 'enabled' : 'disabled'}`, 'info');
        });

        // Zen mode
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
            document.body.classList.toggle('zen-mode');
            showNotification('Zen mode toggled', 'info');
        });
    }

    // Show shortcuts help
    showShortcuts() {
        const shortcuts = `
            <h3>Advanced Editor Shortcuts</h3>
            <div style="display: grid; gap: 10px; font-family: monospace;">
                <div><strong>Ctrl+Shift+V</strong> - Toggle Vim mode</div>
                <div><strong>Ctrl+Shift+E</strong> - Toggle Emacs mode</div>
                <div><strong>Ctrl+D</strong> - Add next occurrence</div>
                <div><strong>Ctrl+Shift+L</strong> - Select all occurrences</div>
                <div><strong>Ctrl+Shift+M</strong> - Record/Stop macro</div>
                <div><strong>Ctrl+Shift+P</strong> - Play macro</div>
                <div><strong>Ctrl+M</strong> - Toggle minimap</div>
                <div><strong>Alt+Z</strong> - Toggle word wrap</div>
                <div><strong>Ctrl+K</strong> - Zen mode</div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h2>⌨️ Keyboard Shortcuts</h2>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${shortcuts}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
}

export const advancedEditor = new AdvancedEditor();
export default advancedEditor;
