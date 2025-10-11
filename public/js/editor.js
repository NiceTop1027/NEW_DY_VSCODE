// public/js/editor.js
import * as monaco from 'monaco-editor';
import { saveFile } from './api.js';
import { getLanguageIdFromFilePath } from './utils.js';
import { openFiles, trackFileChange } from './ui.js';
import { clientFS } from './fileSystem.js';

let editor = null;
let diffEditor = null;
let tabsContainer = null;
const breakpoints = new Map(); // filePath -> Set of line numbers
let currentEditorMode = 'normal'; // 'normal' or 'diff'
let breakpointDecorations = []; // Store decoration IDs to update them

// 에디터 설정 복원 (초기화 전에 정의)
function restoreEditorSettingsInternal() {
    if (!editor) return;
    
    const savedTheme = localStorage.getItem('editor-theme');
    if (savedTheme) {
        monaco.editor.setTheme(savedTheme);
    }
    
    const minimapEnabled = localStorage.getItem('minimap-enabled');
    if (minimapEnabled !== null) {
        editor.updateOptions({
            minimap: {
                enabled: minimapEnabled === 'true'
            }
        });
    }
}

export function initEditor(editorEl, tabsEl, openFilesMap) {
    tabsContainer = tabsEl;

    // Show welcome screen initially
    showWelcomeScreen(editorEl);

    editor = monaco.editor.create(editorEl, {
        value: '',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        glyphMargin: true, // Enable glyph margin for breakpoints
        minimap: {
            enabled: true,
            side: 'right',
            showSlider: 'mouseover',
            renderCharacters: true,
            maxColumn: 120
        },
        scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10
        },
        fontSize: 14,
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        cursorBlinking: 'smooth',
        smoothScrolling: true,
        // 고급 기능 활성화
        quickSuggestions: true,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'on',
        wordBasedSuggestions: true,
        parameterHints: { enabled: true },
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        autoIndent: 'full',
        formatOnPaste: true,
        formatOnType: true,
        // 리팩토링 지원
        renameOnType: false,
        // 코드 렌즈
        codeLens: true,
        // 폴딩
        folding: true,
        foldingStrategy: 'indentation',
        // 링크 감지
        links: true,
        // 색상 데코레이터
        colorDecorators: true
    });

    // Hide editor initially
    editorEl.querySelector('.monaco-editor')?.style.setProperty('display', 'none');

    // Restore saved settings
    restoreEditorSettingsInternal();

    // Add breakpoint support
    editor.onMouseDown((e) => {
        const target = e.target;
        if (target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
            const lineNumber = target.position.lineNumber;
            toggleBreakpoint(lineNumber);
        }
    });

    window.addEventListener('resize', () => {
        if (editor) editor.layout();
    });

    // Keyboard shortcuts
    // Save: Ctrl+S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        const activeTab = tabsContainer.querySelector('.tab.active');
        const activeFilePath = activeTab?.dataset.filePath;
        if (activeFilePath && editor) {
            const content = editor.getValue();
            const fileInfo = openFilesMap.get(activeFilePath);
            
            // Check if it's a client-side file
            if (fileInfo && fileInfo.isClientFile) {
                // Update client file system (async)
                clientFS.updateFile(activeFilePath, content).then(result => {
                    if (activeTab) activeTab.classList.remove('dirty');
                    
                    // Show notification based on result
                    let message, type;
                    if (result.savedToDisk) {
                        message = `✓ 파일 저장됨: ${activeFilePath.split('/').pop()}`;
                        type = 'success';
                    } else if (result.success) {
                        message = `⚠ 메모리에만 저장됨 (디스크 권한 없음)`;
                        type = 'info';
                    } else {
                        message = `✗ 저장 실패`;
                        type = 'error';
                    }
                    
                    const event = new CustomEvent('showNotification', { 
                        detail: { message, type } 
                    });
                    document.dispatchEvent(event);
                });
            } else {
                // Save to server
                saveFile(activeFilePath, content)
                    .then(data => {
                        if (data.success) {
                            if (activeTab) activeTab.classList.remove('dirty');
                        } else {
                            console.error('Save failed:', data.error);
                        }
                    })
                    .catch(err => console.error('Error saving file:', err));
            }
        }
    });
    
    // Format Document: Shift+Alt+F
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
        editor.getAction('editor.action.formatDocument')?.run();
    });
    
    // Rename Symbol: F2
    editor.addCommand(monaco.KeyCode.F2, () => {
        editor.getAction('editor.action.rename')?.run();
    });
    
    // Go to Definition: F12
    editor.addCommand(monaco.KeyCode.F12, () => {
        editor.getAction('editor.action.revealDefinition')?.run();
    });
    
    // Command Palette: Ctrl+Shift+P
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
        editor.getAction('editor.action.quickCommand')?.run();
    });
    
    // Quick Fix: Ctrl+.
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period, () => {
        editor.getAction('editor.action.quickFix')?.run();
    });

    editor.onDidChangeModelContent(() => {
        const activeFilePath = tabsContainer.querySelector('.tab.active')?.dataset.filePath;
        if (activeFilePath && openFilesMap.has(activeFilePath)) {
            const currentContent = editor.getValue();
            openFilesMap.get(activeFilePath).content = currentContent;
            
            // Add dirty indicator to tab
            const activeTab = tabsContainer.querySelector('.tab.active');
            if (activeTab && !activeTab.classList.contains('dirty')) {
                activeTab.classList.add('dirty');
            }
            
            // Track file changes for source control
            trackFileChange(activeFilePath, currentContent);
        }
    });

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
        const position = e.position;
        const lnColStatusItem = document.querySelector('#status-right .status-item:nth-child(1)');
        if (lnColStatusItem) {
            lnColStatusItem.textContent = `Ln ${position.lineNumber}, Col ${position.column}`;
        }
    });
}

export function setEditorContent(content, filePath) {
    if (editor) {
        // Hide welcome screen and show editor
        const editorEl = document.getElementById('editor');
        const welcomeScreen = editorEl.querySelector('.editor-welcome');
        if (welcomeScreen) {
            welcomeScreen.remove();
        }
        const monacoEditor = editorEl.querySelector('.monaco-editor');
        if (monacoEditor) {
            monacoEditor.style.display = 'block';
        }

        editor.setValue(content);
        const language = getLanguageIdFromFilePath(filePath);
        monaco.editor.setModelLanguage(editor.getModel(), language);
        editor.layout();
        
        // Update breakpoint decorations for the new file
        updateBreakpointDecorations();
    }
}

export function getEditorContent() {
    return editor ? editor.getValue() : '';
}

export function clearEditorContent() {
    if (editor) {
        editor.setValue('');
        // Show welcome screen again
        const editorEl = document.getElementById('editor');
        const monacoEditor = editorEl.querySelector('.monaco-editor');
        if (monacoEditor) {
            monacoEditor.style.display = 'none';
        }
        showWelcomeScreen(editorEl);
    }
}

export function getEditor() {
    return editor;
}

function showWelcomeScreen(editorEl) {
    // Remove existing welcome screen if any
    const existingWelcome = editorEl.querySelector('.editor-welcome');
    if (existingWelcome) {
        existingWelcome.remove();
    }

    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'editor-welcome';
    welcomeDiv.innerHTML = `
        <h1>VS Code Clone</h1>
        <p>웹 기반 코드 에디터에 오신 것을 환영합니다!</p>
        <p>왼쪽 파일 탐색기에서 파일을 선택하여 편집을 시작하세요.</p>
        <div style="margin-top: 20px;">
            <p><strong>키보드 단축키:</strong></p>
            <p><span class="shortcut">Ctrl/Cmd + S</span> 파일 저장</p>
            <p><span class="shortcut">Ctrl/Cmd + W</span> 탭 닫기</p>
            <p><span class="shortcut">Ctrl/Cmd + P</span> 파일 검색</p>
        </div>
        <div class="welcome-actions">
            <button class="welcome-button" onclick="document.getElementById('file-upload-input').click()">
                <i class="codicon codicon-cloud-upload"></i> 파일 업로드
            </button>
            <button class="welcome-button secondary" onclick="document.getElementById('file-search').focus()">
                <i class="codicon codicon-search"></i> 파일 검색
            </button>
        </div>
    `;
    editorEl.insertBefore(welcomeDiv, editorEl.firstChild);
}

// Breakpoint management
function toggleBreakpoint(lineNumber) {
    const activeTab = tabsContainer?.querySelector('.tab.active');
    const filePath = activeTab?.dataset.filePath;
    if (!filePath || !editor) return;

    if (!breakpoints.has(filePath)) {
        breakpoints.set(filePath, new Set());
    }

    const fileBreakpoints = breakpoints.get(filePath);
    
    if (fileBreakpoints.has(lineNumber)) {
        // Remove breakpoint
        fileBreakpoints.delete(lineNumber);
    } else {
        // Add breakpoint
        fileBreakpoints.add(lineNumber);
    }

    updateBreakpointDecorations();
    updateDebugView();
}

function updateBreakpointDecorations() {
    if (!editor) return;

    const activeTab = tabsContainer?.querySelector('.tab.active');
    const filePath = activeTab?.dataset.filePath;
    if (!filePath) return;

    const fileBreakpoints = breakpoints.get(filePath) || new Set();
    const decorations = Array.from(fileBreakpoints).map(lineNumber => ({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
            isWholeLine: false,
            glyphMarginClassName: 'breakpoint-glyph',
            glyphMarginHoverMessage: { value: 'Breakpoint - Click to remove' }
        }
    }));

    // Remove old decorations and add new ones
    breakpointDecorations = editor.deltaDecorations(breakpointDecorations, decorations);
}

function updateDebugView() {
    const debugView = document.getElementById('debug-view');
    if (!debugView) return;

    // Find breakpoints section
    let breakpointsSection = debugView.querySelector('.debug-section:last-child .debug-content');
    if (!breakpointsSection) return;

    // Clear and rebuild breakpoints list
    breakpointsSection.innerHTML = '';
    
    let hasBreakpoints = false;
    breakpoints.forEach((lines, filePath) => {
        if (lines.size > 0) {
            hasBreakpoints = true;
            const fileName = filePath.split('/').pop();
            lines.forEach(lineNumber => {
                const item = document.createElement('div');
                item.style.padding = '4px 0';
                item.style.cursor = 'pointer';
                item.innerHTML = `${fileName}:${lineNumber}`;
                item.addEventListener('click', () => {
                    // TODO: Jump to breakpoint location
                });
                breakpointsSection.appendChild(item);
            });
        }
    });

    if (!hasBreakpoints) {
        breakpointsSection.innerHTML = '<em style="color: var(--text-color-light);">No breakpoints set.</em>';
    }
}

export function getBreakpoints() {
    return breakpoints;
}

// Show diff editor for comparing original and modified content
export function showDiffEditor(originalContent, modifiedContent, filePath) {
    const editorEl = document.getElementById('editor');
    if (!editorEl) return;

    // Hide welcome screen
    const welcomeScreen = editorEl.querySelector('.editor-welcome');
    if (welcomeScreen) {
        welcomeScreen.remove();
    }

    // Hide normal editor
    if (editor) {
        const monacoEditor = editorEl.querySelector('.monaco-editor');
        if (monacoEditor) {
            monacoEditor.style.display = 'none';
        }
    }

    // Create or show diff editor
    if (!diffEditor) {
        diffEditor = monaco.editor.createDiffEditor(editorEl, {
            theme: 'vs-dark',
            automaticLayout: true,
            readOnly: false,
            renderSideBySide: true,
            originalEditable: false
        });
    }

    const language = getLanguageIdFromFilePath(filePath);
    
    const originalModel = monaco.editor.createModel(originalContent, language);
    const modifiedModel = monaco.editor.createModel(modifiedContent, language);

    diffEditor.setModel({
        original: originalModel,
        modified: modifiedModel
    });

    // Show diff editor
    const diffEditorEl = editorEl.querySelector('.monaco-diff-editor');
    if (diffEditorEl) {
        diffEditorEl.style.display = 'block';
    }

    currentEditorMode = 'diff';
}

// Hide diff editor and show normal editor
export function hideDiffEditor() {
    const editorEl = document.getElementById('editor');
    if (!editorEl) return;

    // Hide diff editor
    const diffEditorEl = editorEl.querySelector('.monaco-diff-editor');
    if (diffEditorEl) {
        diffEditorEl.style.display = 'none';
    }

    // Show normal editor
    const monacoEditor = editorEl.querySelector('.monaco-editor');
    if (monacoEditor) {
        monacoEditor.style.display = 'block';
    }

    currentEditorMode = 'normal';
}

export function getCurrentEditorMode() {
    return currentEditorMode;
}

// 테마 토글
export function toggleTheme() {
    if (!editor) return 'vs-dark';
    
    const currentTheme = localStorage.getItem('editor-theme') || 'vs-dark';
    const newTheme = currentTheme === 'vs-dark' ? 'vs-light' : 'vs-dark';
    
    monaco.editor.setTheme(newTheme);
    localStorage.setItem('editor-theme', newTheme);
    
    return newTheme;
}

// 미니맵 토글
export function toggleMinimap() {
    if (!editor) return;
    
    const currentOptions = editor.getOptions();
    const minimapEnabled = currentOptions.get(monaco.editor.EditorOption.minimap).enabled;
    
    editor.updateOptions({
        minimap: {
            enabled: !minimapEnabled
        }
    });
    
    localStorage.setItem('minimap-enabled', !minimapEnabled);
    return !minimapEnabled;
}

// 코드 포맷팅
export function formatDocument() {
    if (!editor) return;
    editor.getAction('editor.action.formatDocument')?.run();
}

// Rename Symbol
export function renameSymbol() {
    if (!editor) return;
    editor.getAction('editor.action.rename')?.run();
}

// Go to Definition
export function goToDefinition() {
    if (!editor) return;
    editor.getAction('editor.action.revealDefinition')?.run();
}

// Symbol Search (Command Palette)
export function showCommandPalette() {
    if (!editor) return;
    editor.getAction('editor.action.quickCommand')?.run();
}

// Quick Fix
export function showQuickFix() {
    if (!editor) return;
    editor.getAction('editor.action.quickFix')?.run();
}

// Organize Imports
export function organizeImports() {
    if (!editor) return;
    editor.getAction('editor.action.organizeImports')?.run();
}

// Extract Method (Refactor)
export function extractMethod() {
    if (!editor) return;
    editor.getAction('editor.action.refactor')?.run();
}

// Zen Mode
let isZenMode = false;
export function toggleZenMode() {
    isZenMode = !isZenMode;
    
    const sidebar = document.getElementById('sidebar');
    const panel = document.getElementById('panel');
    const activityBar = document.getElementById('activity-bar');
    const editorActions = document.getElementById('editor-actions');
    const breadcrumb = document.getElementById('breadcrumb');
    
    if (isZenMode) {
        // Hide all UI elements
        if (sidebar) sidebar.style.display = 'none';
        if (panel) panel.style.display = 'none';
        if (activityBar) activityBar.style.display = 'none';
        if (editorActions) editorActions.style.display = 'none';
        if (breadcrumb) breadcrumb.style.display = 'none';
    } else {
        // Show all UI elements
        if (sidebar) sidebar.style.display = '';
        if (panel) panel.style.display = '';
        if (activityBar) activityBar.style.display = '';
        if (editorActions) editorActions.style.display = '';
        if (breadcrumb) breadcrumb.style.display = '';
    }
    
    // Relayout editor
    if (editor) {
        setTimeout(() => editor.layout(), 100);
    }
    
    return isZenMode;
}

// 에디터 설정 복원
export function restoreEditorSettings() {
    if (!editor) return;
    
    const savedTheme = localStorage.getItem('editor-theme');
    if (savedTheme) {
        monaco.editor.setTheme(savedTheme);
    }
    
    const minimapEnabled = localStorage.getItem('minimap-enabled');
    if (minimapEnabled !== null) {
        editor.updateOptions({
            minimap: {
                enabled: minimapEnabled === 'true'
            }
        });
    }
}