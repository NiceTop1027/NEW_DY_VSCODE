// public/js/editor.js
import * as monaco from 'monaco-editor';
import { saveFile } from './api.js';
import { getLanguageIdFromFilePath } from './utils.js';
import { openFiles, trackFileChange } from './ui.js';
import { clientFS } from './fileSystem.js';
import { registerSnippets } from './snippets.js';
import { aiAssistant } from './aiAssistant.js';
import { registerEnhancedAutocomplete } from './enhancedAutocomplete.js';
import { configureMonacoLanguages } from './monacoConfig.js';

let editor = null;
let diffEditor = null;
let tabsContainer = null;
let currentEditorMode = 'normal'; // 'normal' or 'diff'

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

  // Configure Monaco Language Services (VS Code mode)
  configureMonacoLanguages();

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
    // 고급 기능 활성화 (VS Code 스타일)
    quickSuggestions: {
      other: true,
      comments: true,
      strings: true
    },
    quickSuggestionsDelay: 0,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    acceptSuggestionOnCommitCharacter: true,
    tabCompletion: 'on',
    wordBasedSuggestions: true,
    parameterHints: {
      enabled: true,
      cycle: true
    },
    autoClosingBrackets: 'languageDefined',
    autoClosingQuotes: 'languageDefined',
    autoSurround: 'languageDefined',
    snippetSuggestions: 'top',
    suggestSelection: 'first',
    suggest: {
      showWords: true,
      showSnippets: true,
      showKeywords: true,
      showFunctions: true,
      showClasses: true,
      showVariables: true,
      showModules: true,
      showProperties: true,
      showMethods: true,
      showConstructors: true,
      showFields: true,
      showInterfaces: true,
      showStructs: true,
      showEvents: true,
      showOperators: true,
      showUnits: true,
      showValues: true,
      showConstants: true,
      showEnums: true,
      showEnumMembers: true,
      showColors: true,
      showFiles: true,
      showReferences: true,
      showFolders: true,
      showTypeParameters: true,
      showIssues: true,
      showUsers: true,
      insertMode: 'insert',
      filterGraceful: true,
      localityBonus: true,
      shareSuggestSelections: true,
      showInlineDetails: true,
      snippetsPreventQuickSuggestions: false,
      preview: true,
      previewMode: 'subwordSmart',
      showStatusBar: true
    },
    inlineSuggest: {
      enabled: true,
      mode: 'subwordSmart'
    },
    parameterHints: { 
      enabled: true,
      cycle: true
    },
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
    colorDecorators: true,
    // Emmet 활성화 (HTML/CSS에서 ! → DOCTYPE, div.class 등)
    'emmet.triggerExpansionOnTab': true,
    'emmet.showExpandedAbbreviation': 'always',
    'emmet.showSuggestionsAsSnippets': true
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

  // Register advanced snippets
  registerSnippets();
    
  // Register enhanced autocomplete (symbol extraction from code)
  registerEnhancedAutocomplete();
  console.log('✅ Enhanced Autocomplete enabled - Extracts symbols from your code!');

  // Add AI context menu actions
  editor.addAction({
    id: 'ai-explain-code',
    label: '🤖 AI: Explain Code',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyE],
    contextMenuGroupId: 'ai-assistant',
    contextMenuOrder: 1,
    run: async function(ed) {
      const selection = ed.getSelection();
      const selectedText = ed.getModel().getValueInRange(selection);
            
      if (!selectedText) {
        showNotification('선택된 코드가 없습니다', 'warning');
        return;
      }
            
      if (!aiAssistant.enabled) {
        showNotification('AI Assistant를 먼저 설정해주세요', 'warning');
        return;
      }
            
      showNotification('AI가 코드를 분석중입니다...', 'info');
            
      const language = ed.getModel().getLanguageId();
      const explanation = await aiAssistant.explainCode(selectedText, language);
            
      // Show explanation in a modal
      showAIResultModal('코드 설명', explanation);
    }
  });

  editor.addAction({
    id: 'ai-fix-code',
    label: '🔧 AI: Fix Code',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
    contextMenuGroupId: 'ai-assistant',
    contextMenuOrder: 2,
    run: async function(ed) {
      const selection = ed.getSelection();
      const selectedText = ed.getModel().getValueInRange(selection);
            
      if (!selectedText) {
        showNotification('선택된 코드가 없습니다', 'warning');
        return;
      }
            
      if (!aiAssistant.enabled) {
        showNotification('AI Assistant를 먼저 설정해주세요', 'warning');
        return;
      }
            
      showNotification('AI가 코드를 수정중입니다...', 'info');
            
      const language = ed.getModel().getLanguageId();
      const fixedCode = await aiAssistant.fixCode(selectedText, language, 'Please fix any errors');
            
      // Replace selection with fixed code
      ed.executeEdits('ai-fix', [{
        range: selection,
        text: fixedCode
      }]);
            
      showNotification('✅ 코드가 수정되었습니다', 'success');
    }
  });

  editor.addAction({
    id: 'ai-generate-code',
    label: '✨ AI: Generate Code',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyG],
    contextMenuGroupId: 'ai-assistant',
    contextMenuOrder: 3,
    run: async function(ed) {
      if (!aiAssistant.enabled) {
        showNotification('AI Assistant를 먼저 설정해주세요', 'warning');
        return;
      }
            
      const description = prompt('생성할 코드를 설명해주세요:');
      if (!description) return;
            
      showNotification('AI가 코드를 생성중입니다...', 'info');
            
      const language = ed.getModel().getLanguageId();
      const generatedCode = await aiAssistant.generateCode(description, language);
            
      // Insert at cursor position
      const position = ed.getPosition();
      ed.executeEdits('ai-generate', [{
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: generatedCode
      }]);
            
      showNotification('✅ 코드가 생성되었습니다', 'success');
    }
  });

  editor.addAction({
    id: 'ai-chat',
    label: '💬 AI: Chat',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyC],
    contextMenuGroupId: 'ai-assistant',
    contextMenuOrder: 4,
    run: async function(ed) {
      if (!aiAssistant.enabled) {
        showNotification('AI Assistant를 먼저 설정해주세요', 'warning');
        return;
      }
            
      const question = prompt('AI에게 질문하세요:');
      if (!question) return;
            
      showNotification('AI가 답변중입니다...', 'info');
            
      const context = ed.getValue();
      const answer = await aiAssistant.chat(question, context);
            
      showAIResultModal('AI 답변', answer);
    }
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
            message = '⚠ 메모리에만 저장됨 (디스크 권한 없음)';
            type = 'info';
          } else {
            message = '✗ 저장 실패';
            type = 'error';
          }
                    
          const event = new CustomEvent('showNotification', { 
            detail: { message, type } 
          });
          document.dispatchEvent(event);
        });
      } else {
        // Save to server (with feedback)
        saveFile(activeFilePath, content)
          .then(data => {
            if (data.success) {
              if (activeTab) activeTab.classList.remove('dirty');

              // Show success notification
              const event = new CustomEvent('showNotification', {
                detail: { message: `파일 저장됨: ${activeFilePath}`, type: 'success' }
              });
              document.dispatchEvent(event);
            } else {
              console.error('Save failed:', data.error);

              // Show error notification
              const event = new CustomEvent('showNotification', {
                detail: { message: `파일 저장 실패: ${data.error || '알 수 없는 오류'}`, type: 'error' }
              });
              document.dispatchEvent(event);
            }
          })
          .catch(err => {
            console.error('Error saving file:', err);

            // Show error notification
            const event = new CustomEvent('showNotification', {
              detail: { message: `파일 저장 중 오류 발생: ${err.message}`, type: 'error' }
            });
            document.dispatchEvent(event);
          });
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
    
  // Register custom snippets for all languages
  registerCustomSnippets();

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
        
    // Breakpoint decorations removed
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

// Show AI result modal
function showAIResultModal(title, content) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.display = 'flex';

  // Create modal structure safely
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  modalContent.style.cssText = 'max-width: 700px; max-height: 80vh;';

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  const h2 = document.createElement('h2');
  h2.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'modal-close';
  closeBtn.textContent = '×';
  closeBtn.onclick = () => modal.remove();
  header.appendChild(h2);
  header.appendChild(closeBtn);

  // Body with safe content
  const body = document.createElement('div');
  body.className = 'modal-body';
  body.style.cssText = 'overflow-y: auto; max-height: 60vh;';
  const contentDiv = document.createElement('div');
  contentDiv.style.cssText = 'background: var(--editor-background); padding: 15px; border-radius: 4px; border: 1px solid var(--border-color); white-space: pre-wrap; font-family: "Courier New", monospace; line-height: 1.6;';
  contentDiv.textContent = content; // Safe: uses textContent instead of innerHTML
  body.appendChild(contentDiv);

  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = 'padding: 15px; border-top: 1px solid var(--border-color); display: flex; gap: 10px; justify-content: flex-end;';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = '닫기';
  cancelBtn.onclick = () => modal.remove();
  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn btn-primary';
  copyBtn.textContent = '📋 복사';
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(content);
    showNotification('클립보드에 복사되었습니다', 'success');
  };
  footer.appendChild(cancelBtn);
  footer.appendChild(copyBtn);

  modalContent.appendChild(header);
  modalContent.appendChild(body);
  modalContent.appendChild(footer);
  modal.appendChild(modalContent);

  document.body.appendChild(modal);
    
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Show notification helper
function showNotification(message, type) {
  const event = new CustomEvent('showNotification', { 
    detail: { message, type } 
  });
  document.dispatchEvent(event);
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

// Breakpoint management removed

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

    // Create Zen mode exit button
    createZenExitButton();
  } else {
    // Show all UI elements
    if (sidebar) sidebar.style.display = '';
    if (panel) panel.style.display = '';
    if (activityBar) activityBar.style.display = '';
    if (editorActions) editorActions.style.display = '';
    if (breadcrumb) breadcrumb.style.display = '';

    // Remove Zen mode exit button
    removeZenExitButton();
  }

  // Relayout editor
  if (editor) {
    setTimeout(() => editor.layout(), 100);
  }

  return isZenMode;
}

// Global reference to escape handler for cleanup
let zenEscapeHandler = null;

// Create Zen mode exit button
function createZenExitButton() {
  // Remove existing button if any
  removeZenExitButton();

  const exitBtn = document.createElement('button');
  exitBtn.id = 'zen-exit-btn';
  exitBtn.className = 'zen-exit-btn';
  exitBtn.innerHTML = '<i class="codicon codicon-chrome-close"></i>';
  exitBtn.title = 'Zen 모드 종료 (Esc 또는 Ctrl+K Z)';
  exitBtn.onclick = () => toggleZenMode();

  document.body.appendChild(exitBtn);

  // Add ESC key listener with cleanup reference
  zenEscapeHandler = (e) => {
    if (e.key === 'Escape' && isZenMode) {
      toggleZenMode();
    }
  };
  document.addEventListener('keydown', zenEscapeHandler);
}

// Remove Zen mode exit button
function removeZenExitButton() {
  const exitBtn = document.getElementById('zen-exit-btn');
  if (exitBtn) {
    exitBtn.remove();
  }

  // Remove event listener to prevent memory leak
  if (zenEscapeHandler) {
    document.removeEventListener('keydown', zenEscapeHandler);
    zenEscapeHandler = null;
  }
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

// Register custom snippets for all languages
// Monaco Editor already has built-in snippets and IntelliSense
// We only add commonly used shortcuts here
function registerCustomSnippets() {
  // JavaScript/TypeScript snippets
  monaco.languages.registerCompletionItemProvider('javascript', {
    provideCompletionItems: () => ({
      suggestions: [
        {
          label: 'import',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'import ${1:module} from \'${2:path}\';',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Import module'
        },
        {
          label: 'impo',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'import ${1:module} from \'${2:path}\';',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Import module (shorthand)'
        },
        {
          label: 'const',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'const ${1:name} = ${2:value};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Const declaration'
        },
        {
          label: 'func',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'function ${1:name}(${2:params}) {\n\t${3}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Function declaration'
        },
        {
          label: 'log',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'console.log(${1});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Console log'
        }
      ]
    })
  });
    
  // Python snippets
  monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: () => ({
      suggestions: [
        {
          label: 'import',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'import ${1:module}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Import module'
        },
        {
          label: 'impo',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'import ${1:module}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Import module (shorthand)'
        },
        {
          label: 'def',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'def ${1:function_name}(${2:params}):\n\t${3:pass}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Function definition'
        },
        {
          label: 'class',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'class ${1:ClassName}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Class definition'
        }
      ]
    })
  });
    
  // C/C++ snippets
  monaco.languages.registerCompletionItemProvider('c', {
    provideCompletionItems: () => ({
      suggestions: [
        {
          label: 'include',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '#include <${1:stdio.h}>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Include header'
        },
        {
          label: 'main',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'int main() {\n\t${1}\n\treturn 0;\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Main function'
        }
      ]
    })
  });
    
  // Java snippets
  monaco.languages.registerCompletionItemProvider('java', {
    provideCompletionItems: () => ({
      suggestions: [
        {
          label: 'import',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'import ${1:package};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Import package'
        },
        {
          label: 'impo',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'import ${1:package};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Import package (shorthand)'
        },
        {
          label: 'sout',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'System.out.println(${1});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'System.out.println'
        }
      ]
    })
  });
    
  // HTML snippets (Emmet-style)
  monaco.languages.registerCompletionItemProvider('html', {
    provideCompletionItems: () => ({
      suggestions: [
        {
          label: '!',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<!DOCTYPE html>\n<html lang="ko">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t${2}\n</body>\n</html>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'HTML5 DOCTYPE template (Emmet: !)'
        },
        {
          label: 'html5',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<!DOCTYPE html>\n<html lang="ko">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t${2}\n</body>\n</html>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'HTML5 template'
        },
        {
          label: 'div',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<div>\n\t${1}\n</div>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Div element'
        },
        {
          label: 'link',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<link rel="stylesheet" href="${1:style.css}">',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Link stylesheet'
        },
        {
          label: 'script',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<script src="${1:script.js}"></script>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Script tag'
        },
        {
          label: 'img',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<img src="${1:image.jpg}" alt="${2:description}">',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Image tag'
        },
        {
          label: 'a',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<a href="${1:#}">${2:Link}</a>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Anchor tag'
        },
        {
          label: 'button',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<button type="${1:button}">${2:Click me}</button>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Button element'
        },
        {
          label: 'input',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<input type="${1:text}" name="${2:name}" placeholder="${3}">',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Input element'
        },
        {
          label: 'form',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<form action="${1}" method="${2:post}">\n\t${3}\n</form>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Form element'
        },
        {
          label: 'ul',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<ul>\n\t<li>${1}</li>\n</ul>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Unordered list'
        },
        {
          label: 'table',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<table>\n\t<tr>\n\t\t<th>${1:Header}</th>\n\t</tr>\n\t<tr>\n\t\t<td>${2:Data}</td>\n\t</tr>\n</table>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Table element'
        }
      ]
    })
  });
    
  // CSS snippets
  monaco.languages.registerCompletionItemProvider('css', {
    provideCompletionItems: () => ({
      suggestions: [
        {
          label: 'flex',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'display: flex;\njustify-content: ${1:center};\nalign-items: ${2:center};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Flexbox layout'
        },
        {
          label: 'grid',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'display: grid;\ngrid-template-columns: ${1:repeat(3, 1fr)};\ngap: ${2:10px};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Grid layout'
        },
        {
          label: 'transition',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'transition: ${1:all} ${2:0.3s} ${3:ease};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Transition'
        },
        {
          label: 'animation',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'animation: ${1:name} ${2:1s} ${3:ease} ${4:infinite};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Animation'
        }
      ]
    })
  });
    
  // Go snippets
  monaco.languages.registerCompletionItemProvider('go', {
    provideCompletionItems: () => ({
      suggestions: [
        {
          label: 'package',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'package ${1:main}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Package declaration'
        },
        {
          label: 'func',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'func ${1:name}(${2:params}) ${3:returnType} {\n\t${4}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Function'
        },
        {
          label: 'main',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'func main() {\n\t${1}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Main function'
        },
        {
          label: 'for',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'for ${1:i} := 0; ${1:i} < ${2:n}; ${1:i}++ {\n\t${3}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'For loop'
        }
      ]
    })
  });
    
  // Rust snippets
  monaco.languages.registerCompletionItemProvider('rust', {
    provideCompletionItems: () => ({
      suggestions: [
        {
          label: 'fn',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'fn ${1:name}(${2:params}) ${3:-> ReturnType} {\n\t${4}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Function'
        },
        {
          label: 'main',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'fn main() {\n\t${1}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Main function'
        },
        {
          label: 'struct',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'struct ${1:Name} {\n\t${2}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Struct'
        },
        {
          label: 'impl',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'impl ${1:Name} {\n\t${2}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Implementation'
        }
      ]
    })
  });
    
  // PHP snippets
  monaco.languages.registerCompletionItemProvider('php', {
    provideCompletionItems: () => ({
      suggestions: [
        {
          label: 'php',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '<?php\n\n${1}\n\n?>',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'PHP tags'
        },
        {
          label: 'function',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'function ${1:name}(${2:params}) {\n\t${3}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Function'
        },
        {
          label: 'class',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'class ${1:ClassName} {\n\tpublic function __construct(${2:params}) {\n\t\t${3}\n\t}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Class'
        },
        {
          label: 'echo',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'echo ${1};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Echo statement'
        }
      ]
    })
  });
    
  // Ruby snippets
  monaco.languages.registerCompletionItemProvider('ruby', {
    provideCompletionItems: () => ({
      suggestions: [
        {
          label: 'def',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'def ${1:method_name}(${2:params})\n\t${3}\nend',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Method definition'
        },
        {
          label: 'class',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'class ${1:ClassName}\n\tdef initialize(${2:params})\n\t\t${3}\n\tend\nend',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Class definition'
        },
        {
          label: 'each',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '${1:array}.each do |${2:item}|\n\t${3}\nend',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Each loop'
        }
      ]
    })
  });
    
  // SQL snippets
  monaco.languages.registerCompletionItemProvider('sql', {
    provideCompletionItems: () => ({
      suggestions: [
        {
          label: 'select',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'SELECT ${1:*} FROM ${2:table} WHERE ${3:condition};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'SELECT statement'
        },
        {
          label: 'insert',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'INSERT INTO ${1:table} (${2:columns}) VALUES (${3:values});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'INSERT statement'
        },
        {
          label: 'update',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'UPDATE ${1:table} SET ${2:column} = ${3:value} WHERE ${4:condition};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'UPDATE statement'
        },
        {
          label: 'create',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'CREATE TABLE ${1:table_name} (\n\t${2:id} INT PRIMARY KEY,\n\t${3:column} VARCHAR(255)\n);',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'CREATE TABLE statement'
        }
      ]
    })
  });
    
  // Shell/Bash snippets
  monaco.languages.registerCompletionItemProvider('shell', {
    provideCompletionItems: () => ({
      suggestions: [
        {
          label: 'bash',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '#!/bin/bash\n\n${1}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Bash shebang'
        },
        {
          label: 'for',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'for ${1:i} in ${2:list}; do\n\t${3}\ndone',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'For loop'
        },
        {
          label: 'if',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'if [ ${1:condition} ]; then\n\t${2}\nfi',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'If statement'
        },
        {
          label: 'function',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: '${1:function_name}() {\n\t${2}\n}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Function'
        }
      ]
    })
  });
}