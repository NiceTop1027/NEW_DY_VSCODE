// public/js/ui.js
import { fetchFileTree, uploadFile, fetchFileContent } from './api.js';
import { initEditor, setEditorContent, clearEditorContent, getEditor, showDiffEditor, hideDiffEditor } from './editor.js';
import { showNotification, getLanguageIdFromFilePath } from './utils.js';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { initAIChat } from './aiChat.js';
import { clientFS } from './fileSystem.js';
import { downloadManager } from './downloadManager.js';
import { commandPalette } from './commandPalette.js';
import { quickOpen } from './quickOpen.js';
import { outputPanel } from './outputPanel.js';
import { initTerminal } from './terminal.js';
import { initLanguageClient } from './languageClient.js';
import { fileIcons } from './fileIcons.js';
import { tutorial } from './tutorial.js';

// DOM Elements
let fileExplorerEl;
let activityBar;
let tabsContainer;
let statusLeft;
let statusRight;
let sidebar;
let resizeHandle;
let fileUploadInput;
let panelResizeHandle;
let panel;
let editorGroup;
let breadcrumb;
let fileSearchInput;

// Global State
let openFiles = new Map(); // Map of filePath -> content
let activeFile = null;
let fileChanges = new Map(); // Map of filePath -> { status: 'modified'|'added'|'deleted', originalContent: string }
let currentView = 'explorer'; // 'explorer', 'source-control', 'debug'

// Terminal state
let xterm = null;
let fitAddon = null;

// -----------------------------
// Helper Functions
// -----------------------------
function renderFileTree(node, parentEl, depth = 0) {
    const item = document.createElement('div');
    item.className = `tree-item ${node.type}`;
    item.dataset.path = node.path || node.name;
    item.dataset.type = node.type; // Add data-type attribute for styling

    // Create wrapper for the item content
    const itemContent = document.createElement('div');
    itemContent.className = 'tree-item-content';
    itemContent.style.paddingLeft = `${depth * 15}px`;

    // Add icon
    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'tree-item-icon';

    const icon = document.createElement('i');
    icon.className = 'codicon';
    if (node.type === 'directory') {
        icon.classList.add(`codicon-${fileIcons.getFolderIcon(false)}`);
        icon.style.color = '#dcb67a';
    } else {
        const iconClass = fileIcons.getFileIcon(node.name);
        icon.classList.add(`codicon-${iconClass}`);
        icon.style.color = fileIcons.getFileColor(node.name);
    }
    iconWrapper.appendChild(icon);
    itemContent.appendChild(iconWrapper);

    // Add label
    const label = document.createElement('span');
    label.className = 'tree-item-label';
    label.textContent = node.name;
    label.title = node.name; // Tooltip for long names
    itemContent.appendChild(label);

    item.appendChild(itemContent);

    if (node.type === 'directory') {
        item.classList.add('closed');

        // Create children container
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';
        item.appendChild(childrenContainer);

        // Click handler for folder
        itemContent.addEventListener('click', e => {
            e.stopPropagation();
            item.classList.toggle('closed');

            // Update folder icon (closed/open)
            const isOpen = !item.classList.contains('closed');
            const newIconClass = fileIcons.getFolderIcon(isOpen);
            icon.className = 'codicon';
            icon.classList.add(`codicon-${newIconClass}`);
        });

        // Render children
        if (node.children) {
            node.children.forEach(child => renderFileTree(child, childrenContainer, depth + 1));
        }
    } else { // file
        itemContent.addEventListener('click', () => openFile(node.path, node.name));
    }

    parentEl.appendChild(item);
}

const FILE_ITEM_HEIGHT = 22;
let allFileItems = [];

function renderVisibleFileItems() {
    const scrollTop = sidebar.scrollTop;
    const viewportHeight = sidebar.clientHeight;
    const startIndex = Math.floor(scrollTop / FILE_ITEM_HEIGHT);
    const endIndex = Math.min(allFileItems.length, startIndex + Math.ceil(viewportHeight / FILE_ITEM_HEIGHT) + 5); // +5 for buffer

    fileExplorerEl.innerHTML = '<h3>Project Files</h3>';
    for (let i = startIndex; i < endIndex; i++) {
        fileExplorerEl.appendChild(allFileItems[i]);
    }

    const totalHeight = allFileItems.length * FILE_ITEM_HEIGHT;
    fileExplorerEl.style.paddingTop = `${startIndex * FILE_ITEM_HEIGHT}px`;
    fileExplorerEl.style.paddingBottom = `${totalHeight - endIndex * FILE_ITEM_HEIGHT}px`;
}

async function fetchAndRenderFileTree() {
    try {
        const fileTree = await fetchFileTree();
        if (fileExplorerEl) {
            fileExplorerEl.innerHTML = '<h3>Project Files</h3>';
            allFileItems = []; // Clear previous items
            renderFileTree(fileTree, fileExplorerEl);
            renderVisibleFileItems();
        }
    } catch (err) {
        showNotification(`Error fetching file tree: ${err.message}`, 'error');
        if (fileExplorerEl) fileExplorerEl.innerHTML = '<p>Error loading file explorer.</p>';
    }
}

// -----------------------------
// File Tabs & Editor Functions
// -----------------------------
export function openFile(filePath, fileName) {
    if (openFiles.has(filePath)) {
        setActiveTab(filePath);
        return;
    }

    fetchFileContent(filePath)
        .then(data => {
            const newTab = document.createElement('div');
            newTab.className = 'tab';
            newTab.dataset.filePath = filePath;

            const tabLabel = document.createElement('span');
            tabLabel.textContent = fileName;
            newTab.appendChild(tabLabel);

            const closeBtn = document.createElement('i');
            closeBtn.className = 'codicon codicon-close';
            closeBtn.addEventListener('click', e => {
                e.stopPropagation();
                closeFile(filePath);
            });
            newTab.appendChild(closeBtn);

            newTab.addEventListener('click', () => setActiveTab(filePath));

            tabsContainer.appendChild(newTab);
            openFiles.set(filePath, { tabEl: newTab, content: data.content });

            setActiveTab(filePath);
        })
        .catch(err => showNotification(`Error opening file: ${filePath}`, 'error'));
}

export function setActiveTab(filePath) {
    openFiles.forEach((file, path) => {
        if (path === filePath) {
            file.tabEl.classList.add('active');
            setEditorContent(file.content, filePath); // Use editor.js function
            const language = getLanguageIdFromFilePath(filePath);
            const languageStatusItem = document.querySelector('#status-right .status-item:nth-child(4)');
            if (languageStatusItem) languageStatusItem.textContent = language.charAt(0).toUpperCase() + language.slice(1);
            const pathStatusItem = document.querySelector('#status-left .status-item:nth-child(1)');
            if (pathStatusItem) pathStatusItem.textContent = `Path: ${filePath}`;
            
            // Update breadcrumb
            updateBreadcrumb(filePath);
            
            // Check if HTML file and show preview button
            checkAndShowPreviewButton(filePath);
        } else {
            file.tabEl.classList.remove('active');
        }
    });
    const lnColStatusItem = document.querySelector('#status-right .status-item:nth-child(1)');
    if (lnColStatusItem) lnColStatusItem.textContent = "Ln 1, Col 1";
}

function updateBreadcrumb(filePath) {
    if (!breadcrumb) return;
    const parts = filePath.split('/');
    breadcrumb.innerHTML = '';
    parts.forEach((part, index) => {
        if (index > 0) {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = '/';
            breadcrumb.appendChild(separator);
        }
        const item = document.createElement('span');
        item.className = 'breadcrumb-item';
        item.textContent = part;
        breadcrumb.appendChild(item);
    });
}

export function closeFile(filePath) {
    const file = openFiles.get(filePath);
    if (!file) return;
    file.tabEl.remove();
    openFiles.delete(filePath);
    if (file.tabEl.classList.contains('active')) {
        if (openFiles.size > 0) setActiveTab(openFiles.keys().next().value);
        else clearEditorContent(); // Use editor.js function
    }
}

// -----------------------------
// Main UI Initialization
// -----------------------------
export function initUI() {
    // Initialize DOM elements
    fileExplorerEl = document.getElementById('file-explorer');
    activityBar = document.getElementById('activity-bar');
    tabsContainer = document.getElementById('tabs');
    statusLeft = document.getElementById('status-left');
    statusRight = document.getElementById('status-right');
    sidebar = document.getElementById('sidebar');
    resizeHandle = document.getElementById('resize-handle');
    fileUploadInput = document.getElementById('file-upload-input');
    panelResizeHandle = document.getElementById('panel-resize-handle');
    panel = document.getElementById('panel');
    editorGroup = document.getElementById('editor-group');
    breadcrumb = document.getElementById('breadcrumb');
    fileSearchInput = document.getElementById('file-search');

    initEditor(document.getElementById('editor'), tabsContainer, openFiles); // Initialize editor
    initAIChat(); // Initialize AI Chat Panel

    // Activity Bar Icons (VSCode 표준 순서: 핵심 기능 우선)
    const activityIcons = [
        // 1. 파일 관리 (가장 자주 사용)
        { name: 'Explorer', icon: 'files', action: 'explorer' },
        { name: 'Search', icon: 'search', action: 'search' },

        // 2. Git/소스 관리
        { name: 'Source Control', icon: 'source-control', action: 'source-control' },

        // 3. 특별 기능
        { name: 'AI Assistant', icon: 'sparkle', action: 'ai', isAI: true },
        { name: 'Upload Folder', icon: 'folder-opened', action: 'upload' },

        // 4. 외부 서비스 (맨 아래)
        { name: 'GitHub', icon: 'github', action: 'github', isGitHub: true },
        { name: '덕영고등학교', icon: 'home', action: 'school', isSchool: true }
    ];

    activityIcons.forEach(({name, icon, action, isSchool, isAI, isGitHub}, index) => {
        // 그룹 구분선 추가 (논리적 그룹 구분)
        if (index === 2 || index === 3 || index === 5) {
            const separator = document.createElement('div');
            separator.className = 'activity-separator';
            activityBar.appendChild(separator);
        }
        
        const iconEl = document.createElement('div');
        iconEl.className = 'activity-icon';
        if (isSchool) {
            iconEl.classList.add('school-icon');
        }
        if (isAI) {
            iconEl.classList.add('ai-icon');
        }
        if (isGitHub) {
            iconEl.classList.add('github-icon');
            iconEl.id = 'github-btn';
        }
        iconEl.title = name;
        iconEl.dataset.action = action;
        
        // GitHub button (no special highlight)
        
        let badgeHtml = '';
        if (action === 'source-control') {
            badgeHtml = '<span class="activity-badge" style="display: none;"></span>';
        }
        
        iconEl.innerHTML = `<i class="codicon codicon-${icon}"></i>${badgeHtml}`;
        
        iconEl.addEventListener('click', async () => {
            document.querySelectorAll('.activity-icon').forEach(el => el.classList.remove('active'));
            iconEl.classList.add('active');

                const fileExplorerView = document.getElementById('file-explorer');
                const sourceControlView = document.getElementById('source-control-view');
                const githubView = document.getElementById('github-view');
                const searchBox = document.querySelector('.search-box');

                // Hide all sidebar views
                fileExplorerView.style.display = 'none';
                sourceControlView.style.display = 'none';
                githubView.style.display = 'none';
                searchBox.style.display = 'none';

            switch (action) {
                case 'school':
                    // Open school website in new tab
                    window.open('https://dukyoung-h.goeyi.kr/dukyoung-h/main.do', '_blank');
                    // Don't change view, keep current view active
                    return;
                case 'ai':
                    // Open AI settings
                    import('./aiAssistant.js').then(({ showAISettings }) => {
                        showAISettings();
                    }).catch(err => {
                        console.error('Failed to load AI assistant:', err);
                        showNotification('AI Assistant 로드 실패', 'error');
                    });
                    return;
                case 'explorer':
                    fileExplorerView.style.display = 'block';
                    searchBox.style.display = 'block';
                    currentView = 'explorer';
                    break;
                case 'source-control':
                    sourceControlView.style.display = 'block';
                    currentView = 'source-control';
                    renderSourceControlView();
                    break;
                case 'github':
                    // Show GitHub sidebar view
                    githubView.style.display = 'block';
                    currentView = 'github';
                    
                    // Update GitHub sidebar UI
                    import('./github.js').then(module => {
                        const hasToken = !!localStorage.getItem('githubToken');
                        const hasUser = !!localStorage.getItem('githubUser');
                        
                        const authSection = document.getElementById('github-sidebar-auth');
                        const reposSection = document.getElementById('github-sidebar-repos');
                        
                        if (authSection && reposSection) {
                            if (hasToken && hasUser) {
                                authSection.style.display = 'none';
                                reposSection.style.display = 'block';
                                // Load GitHub data
                                renderGitHubSidebar();
                            } else {
                                authSection.style.display = 'block';
                                reposSection.style.display = 'none';
                            }
                        }
                    });
                    break;
                case 'search':
                    // For now, just show explorer and focus search
                    fileExplorerView.style.display = 'block';
                    searchBox.style.display = 'block';
                    if (fileSearchInput) fileSearchInput.focus();
                    currentView = 'explorer';
                    break;
                case 'upload':
                    if ('showDirectoryPicker' in window) {
                        try {
                            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
                            showNotification('폴더 로드 중...', 'info');
                            await loadDirectoryWithHandles(dirHandle);
                            showNotification('✓ 폴더 로드 완료', 'success');
                        } catch (err) {
                            if (err.name !== 'AbortError') {
                                console.error('Directory picker error:', err);
                                showNotification(`폴더 선택 실패: ${err.message}`, 'error');
                            }
                        }
                    } else {
                        fileUploadInput.click();
                    }
                    break;
            }
        });
        
        activityBar.appendChild(iconEl);
    });
    
    // Set explorer as active by default
    document.querySelector('.activity-icon[data-action="explorer"]')?.classList.add('active');

    // Show explorer view by default
    const fileExplorerView = document.getElementById('file-explorer');
    const searchBox = document.querySelector('.search-box');
    if (fileExplorerView) fileExplorerView.style.display = 'block';
    if (searchBox) searchBox.style.display = 'block';

    // 탭 변경 시 푸시 버튼 체크
    document.addEventListener('click', (e) => {
        if (e.target.closest('.tab')) {
            const tab = e.target.closest('.tab');
            const filePath = tab.dataset.filePath;
            if (filePath) {
                setTimeout(() => checkAndShowGitPushButton(filePath), 100);
            }
        }
    });

    // Run Code Button - Use PTY system for interactive I/O
    const runCodeBtn = document.getElementById('run-code-btn');
    if (runCodeBtn) {
        runCodeBtn.addEventListener('click', async () => {
            const editor = getEditor();
            if (!editor) return;

            const code = editor.getValue();
            const model = editor.getModel();
            if (!model) return;

            const language = model.getLanguageId();
            const uri = model.uri.toString();
            const filename = uri.split('/').pop();
            
            // Switch to output panel
            const outputTab = document.querySelector('[data-panel-id="output"]');
            if (outputTab) {
                outputTab.click();
            }

            // Run code with PTY support (interactive I/O)
            await outputPanel.runCode(code, language, filename);
        });
    }
    
    // Git Push Button
    const gitPushBtn = document.getElementById('git-push-btn');
    if (gitPushBtn) {
        gitPushBtn.addEventListener('click', quickGitPush);
    }
    
    // Preview Button
    const previewBtn = document.getElementById('preview-btn');
    if (previewBtn) {
        previewBtn.addEventListener('click', togglePreview);
    }
    
    // Preview Close Button
    const previewClose = document.getElementById('preview-close');
    const previewModal = document.getElementById('preview-modal');
    if (previewClose && previewModal) {
        previewClose.addEventListener('click', (e) => {
            e.stopPropagation();
            previewModal.style.display = 'none';
            showNotification('프리뷰 닫기', 'info');
        });
    }
    
    // Make preview modal draggable
    const previewHeader = document.querySelector('.preview-header');
    if (previewHeader && previewModal) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        
        previewHeader.addEventListener('mousedown', (e) => {
            // Don't drag if clicking on buttons
            if (e.target.closest('.preview-action-btn')) return;
            
            isDragging = true;
            initialX = e.clientX - previewModal.offsetLeft;
            initialY = e.clientY - previewModal.offsetTop;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                
                previewModal.style.left = currentX + 'px';
                previewModal.style.top = currentY + 'px';
                previewModal.style.right = 'auto';
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    // Preview Fullscreen Button
    const previewFullscreen = document.getElementById('preview-fullscreen');
    if (previewFullscreen && previewModal) {
        let isFullscreen = false;
        let savedPosition = {};

        previewFullscreen.addEventListener('click', (e) => {
            e.stopPropagation();

            if (!isFullscreen) {
                // Save current position and size
                savedPosition = {
                    top: previewModal.style.top,
                    left: previewModal.style.left,
                    right: previewModal.style.right,
                    width: previewModal.style.width,
                    height: previewModal.style.height
                };

                // Set fullscreen
                previewModal.style.top = '0';
                previewModal.style.left = '0';
                previewModal.style.right = '0';
                previewModal.style.width = '100vw';
                previewModal.style.height = '100vh';
                previewModal.style.borderRadius = '0';

                // Change icon
                previewFullscreen.innerHTML = '<i class="codicon codicon-screen-normal"></i>';
                previewFullscreen.title = '전체 화면 해제';

                isFullscreen = true;
                showNotification('전체 화면 모드', 'info');
            } else {
                // Restore position and size
                previewModal.style.top = savedPosition.top || '50px';
                previewModal.style.left = savedPosition.left || 'auto';
                previewModal.style.right = savedPosition.right || '20px';
                previewModal.style.width = savedPosition.width || '1200px';
                previewModal.style.height = savedPosition.height || '800px';
                previewModal.style.borderRadius = '8px';

                // Change icon back
                previewFullscreen.innerHTML = '<i class="codicon codicon-screen-full"></i>';
                previewFullscreen.title = '전체 화면';

                isFullscreen = false;
                showNotification('전체 화면 해제', 'info');
            }
        });
    }

    // Preview Refresh Button
    const previewRefresh = document.getElementById('preview-refresh');
    if (previewRefresh) {
        previewRefresh.addEventListener('click', refreshPreview);
    }
    
    // Theme Toggle Button
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', async () => {
            try {
                const { toggleTheme } = await import('./editor.js');
                const newTheme = toggleTheme();
                showNotification(`테마 변경: ${newTheme === 'vs-dark' ? '다크' : '라이트'}`, 'info');
            } catch (err) {
                console.error('Theme toggle error:', err);
            }
        });
    }
    
    // Minimap Toggle Button
    const minimapToggleBtn = document.getElementById('minimap-toggle-btn');
    if (minimapToggleBtn) {
        minimapToggleBtn.addEventListener('click', async () => {
            try {
                const { toggleMinimap } = await import('./editor.js');
                const enabled = toggleMinimap();
                showNotification(`미니맵: ${enabled ? 'ON' : 'OFF'}`, 'info');
            } catch (err) {
                console.error('Minimap toggle error:', err);
            }
        });
    }
    
    // Split Editor Button
    const splitEditorBtn = document.getElementById('split-editor-btn');
    if (splitEditorBtn) {
        splitEditorBtn.addEventListener('click', () => {
            showNotification('에디터 분할 기능은 곧 추가됩니다', 'info');
        });
    }
    
    // Format Button
    const formatBtn = document.getElementById('format-btn');
    if (formatBtn) {
        formatBtn.addEventListener('click', async () => {
            try {
                const { formatDocument } = await import('./editor.js');
                formatDocument();
                showNotification('코드 포맷팅 완료', 'success');
            } catch (err) {
                console.error('Format error:', err);
                showNotification('포맷팅 실패', 'error');
            }
        });
    }
    
    // AI Buttons
    const aiExplainBtn = document.getElementById('ai-explain-btn');
    const aiFixBtn = document.getElementById('ai-fix-btn');
    const aiGenerateBtn = document.getElementById('ai-generate-btn');
    
    if (aiExplainBtn) {
        aiExplainBtn.addEventListener('click', () => {
            // Trigger the editor action
            const editor = getEditor();
            if (editor) {
                editor.trigger('toolbar', 'ai-explain-code');
            }
        });
    }
    
    if (aiFixBtn) {
        aiFixBtn.addEventListener('click', () => {
            const editor = getEditor();
            if (editor) {
                editor.trigger('toolbar', 'ai-fix-code');
            }
        });
    }
    
    if (aiGenerateBtn) {
        aiGenerateBtn.addEventListener('click', () => {
            const editor = getEditor();
            if (editor) {
                editor.trigger('toolbar', 'ai-generate-code');
            }
        });
    }
    
    // Zen Mode Button
    const zenModeBtn = document.getElementById('zen-mode-btn');
    if (zenModeBtn) {
        zenModeBtn.addEventListener('click', async () => {
            try {
                const { toggleZenMode } = await import('./editor.js');
                const isZen = toggleZenMode();
                showNotification(`Zen 모드: ${isZen ? 'ON' : 'OFF'}`, 'info');
            } catch (err) {
                console.error('Zen mode error:', err);
            }
        });
    }
    
    // Create Sandbox Button
    const createSandboxBtn = document.getElementById('create-sandbox-btn');
    if (createSandboxBtn) {
        createSandboxBtn.addEventListener('click', createSandboxEnvironment);
    }

    // Panel toggle buttons
    const togglePanelBtn = document.getElementById('toggle-panel-btn');
    const openPanelBtn = document.getElementById('panel-open-btn');
    
    if (togglePanelBtn) {
        togglePanelBtn.addEventListener('click', togglePanel);
    }
    
    if (openPanelBtn) {
        openPanelBtn.addEventListener('click', togglePanel);
    }

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
    }

    // Close mobile sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            if (sidebar && sidebar.classList.contains('mobile-open')) {
                if (!sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                    sidebar.classList.remove('mobile-open');
                }
            }
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // F5: Run code
        if (e.key === 'F5') {
            e.preventDefault();
            runCode();
        }
        // Ctrl+J: Toggle panel
        if (e.ctrlKey && e.key === 'j') {
            e.preventDefault();
            togglePanel();
        }
    });

    // Sidebar Resize
    let isResizingSidebar = false;
    const MIN_SIDEBAR_WIDTH = 150;
    const MAX_SIDEBAR_WIDTH = 600;

    resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isResizingSidebar = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        // Create handler references for proper cleanup
        const handleMove = (e) => handleSidebarMouseMove(e);
        const handleUp = () => stopSidebarResize(handleMove, handleUp);

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    });

    function handleSidebarMouseMove(e) {
        if (!isResizingSidebar) return;
        let newWidth = e.clientX - sidebar.getBoundingClientRect().left;
        newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth));
        sidebar.style.width = `${newWidth}px`;
    }

    function stopSidebarResize(moveHandler, upHandler) {
        isResizingSidebar = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', moveHandler);
        document.removeEventListener('mouseup', upHandler);
    }

    // Panel Resize
    let isResizingPanel = false;
    let startY = 0;
    let startPanelHeight = 0;
    const MIN_PANEL_HEIGHT = 100;
    const MIN_EDITOR_HEIGHT = 150;

    panelResizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isResizingPanel = true;
        startY = e.clientY;
        startPanelHeight = panel.offsetHeight;
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        
        const handleMove = (e) => handlePanelMouseMove(e);
        const handleUp = () => stopPanelResize(handleMove, handleUp);
        
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);
    });

    function handlePanelMouseMove(e) {
        if (!isResizingPanel) return;
        e.preventDefault();
        
        const deltaY = startY - e.clientY;
        let newPanelHeight = startPanelHeight + deltaY;
        
        const containerHeight = document.getElementById('main-content').offsetHeight;
        const maxPanelHeight = containerHeight - MIN_EDITOR_HEIGHT;
        
        newPanelHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(maxPanelHeight, newPanelHeight));
        
        panel.style.height = `${newPanelHeight}px`;

        const editor = getEditor();
        if (editor) requestAnimationFrame(() => editor.layout());
        
        // 터미널이 활성화된 탭일 때만 fit 호출
        const activeTab = document.querySelector('.panel-tab.active');
        if (activeTab && activeTab.dataset.panel === 'terminal' && xterm && fitAddon) {
            requestAnimationFrame(() => {
                try {
                    fitAddon.fit();
                } catch (err) {
                    console.warn('Terminal fit error:', err);
                }
            });
        }
    }

    function stopPanelResize(handleMove, handleUp) {
        isResizingPanel = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        
        // 리사이즈 완료 후 터미널 크기 재조정
        const activeTab = document.querySelector('.panel-tab.active');
        if (activeTab && activeTab.dataset.panel === 'terminal' && xterm && fitAddon) {
            setTimeout(() => {
                try {
                    fitAddon.fit();
                    console.log('Terminal resized to fit panel');
                } catch (err) {
                    console.warn('Terminal fit error:', err);
                }
            }, 100);
        }
    }

    // File Upload - Use File System Access API for real file system access
    fileUploadInput.addEventListener('change', async (e) => {
        // Try to use File System Access API if available
        if ('showDirectoryPicker' in window) {
            try {
                const dirHandle = await window.showDirectoryPicker({
                    mode: 'readwrite' // Request write permission
                });
                
                clientFS.setDirectoryHandle(dirHandle);
                await loadDirectoryWithHandles(dirHandle);
                
                // Switch to file explorer view
                switchToView('files');
                
                showNotification(`✓ 폴더 로드 완료 (실시간 저장 가능)`, 'success');
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Directory picker error:', err);
                    showNotification(`폴더 선택 실패: ${err.message}`, 'error');
                }
            }
            fileUploadInput.value = '';
            return;
        }

        // Fallback to traditional file input
        const files = Array.from(fileUploadInput.files);
        if (files.length === 0) return;

        showNotification(`업로드 중... ${files.length}개 파일`, 'info');

        let successCount = 0;
        let errorCount = 0;
        
        const sessionId = localStorage.getItem('terminalSessionId');

        for (const file of files) {
            try {
                const content = await readFileAsText(file);
                const path = file.webkitRelativePath || file.name;
                
                // 클라이언트 파일 시스템에 추가
                clientFS.addFile(path, content);
                
                // 서버에도 저장 (실행 가능하도록)
                if (sessionId) {
                    try {
                        const { saveFile } = await import('./api.js');
                        await saveFile(path, content);
                    } catch (err) {
                        console.warn(`Server save failed for ${path}:`, err);
                    }
                }
                
                successCount++;
            } catch (err) {
                console.error(`Error reading file ${file.name}:`, err);
                errorCount++;
            }
        }

        clientFS.sortChildren(clientFS.root);
        renderClientFileTree();

        // Switch to file explorer view
        switchToView('files');

        if (errorCount === 0) {
            showNotification(`✓ ${successCount}개 파일 업로드 완료`, 'success');
        } else {
            showNotification(`${successCount}개 성공, ${errorCount}개 실패`, 'error');
        }

        fileUploadInput.value = '';
    });

    // Panel Tabs
    const panelTabs = document.querySelectorAll('.panel-tab');
    const panelViews = document.querySelectorAll('.panel-view');
    const terminalEl = document.getElementById('terminal');

    panelTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();

            const panelId = tab.dataset.panelId;
            
            // Deactivate all tabs and views
            panelTabs.forEach(t => t.classList.remove('active'));
            panelViews.forEach(v => v.classList.remove('active'));

            // Activate the clicked tab and corresponding view
            tab.classList.add('active');
            const activeView = document.getElementById(panelId);
            if (activeView) {
                activeView.classList.add('active');
            }

            if (panelId === 'terminal') {
                if (!xterm) {
                    // Initialize terminal only once
                    const terminalContainer = document.getElementById('terminal-container');
                    xterm = new Terminal({
                        convertEol: false, // 개행 문자 자동 변환 비활성화
                        fontFamily: 'Consolas, "Courier New", monospace',
                        fontSize: 14,
                        cursorBlink: true,
                        rendererType: 'canvas',
                        theme: { background: '#1e1e1e', foreground: '#cccccc' },
                        scrollback: 1000
                    });
                    fitAddon = new FitAddon();
                    xterm.loadAddon(fitAddon);
                    xterm.open(terminalContainer || terminalEl);

                    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    // Get or create session ID
                    let sessionId = localStorage.getItem('terminalSessionId');
                    if (!sessionId) {
                        sessionId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                        localStorage.setItem('terminalSessionId', sessionId);
                    }
                    const socket = new WebSocket(`${wsProtocol}//${window.location.host}/terminal?sessionId=${sessionId}`);
                    
                    socket.onopen = () => {
                        xterm.onData(data => {
                            // WebSocket 상태 확인
                            if (socket.readyState === WebSocket.OPEN) {
                                socket.send(data);
                            }
                        });
                    };
                    
                    // 중복 데이터 필터링
                    let lastMessage = '';
                    let lastMessageTime = 0;
                    
                    socket.onmessage = event => {
                        const now = Date.now();
                        
                        // JSON 메시지 처리 (세션 정보 등)
                        try {
                            const json = JSON.parse(event.data);
                            if (json.type === 'session') {
                                return; // 세션 메시지는 표시 안 함
                            }
                        } catch (e) {
                            // JSON이 아니면 일반 터미널 데이터
                        }
                        
                        // 짧은 시간 내 같은 메시지 중복 방지
                        if (event.data === lastMessage && now - lastMessageTime < 50) {
                            return;
                        }
                        
                        lastMessage = event.data;
                        lastMessageTime = now;
                        xterm.write(event.data);
                    };
                    
                    socket.onerror = (error) => {
                        console.error('Terminal WebSocket error:', error);
                        xterm.write('\r\n\x1b[1;31m터미널 연결 오류\x1b[0m\r\n');
                    };
                    
                    socket.onclose = () => {
                        xterm.write('\r\n\x1b[1;33m터미널 연결이 종료되었습니다.\x1b[0m\r\n');
                    };
                }
                // Always try to fit the terminal when its tab is shown
                setTimeout(() => {
                    if (fitAddon) fitAddon.fit();
                }, 1);
            }
            // Relayout editor whenever panel visibility changes
            const editor = getEditor();
            if (editor) setTimeout(() => editor.layout(), 1);
        });
    });

    // File Search
    if (fileSearchInput) {
        fileSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterFileTree(searchTerm);
        });
    }

    // Context Menu
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        // Close any existing context menu
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) existingMenu.remove();
    });

    // Click outside to close context menu
    document.addEventListener('click', () => {
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) existingMenu.remove();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + W: Close current tab
        if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
            e.preventDefault();
            const activeTab = tabsContainer.querySelector('.tab.active');
            if (activeTab) {
                const filePath = activeTab.dataset.filePath;
                closeFile(filePath);
            }
        }
        // Ctrl/Cmd + P: Quick file open (placeholder)
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            if (fileSearchInput) fileSearchInput.focus();
        }
    });

    // Listen for notification events from other modules
    document.addEventListener('showNotification', (e) => {
        if (e.detail) {
            showNotification(e.detail.message, e.detail.type);
        }
    });

    // Try to restore previous directory on load
    restorePreviousDirectory();

    // IndexedDB에서 파일 복원
    loadFilesFromIndexedDB();

    // Initialize download manager
    downloadManager.init();

    // Initialize command palette
    commandPalette.init();

    // Initialize quick open
    quickOpen.init();

    // Listen for quick open file events
    window.addEventListener('quick-open-file', (e) => {
        const { path } = e.detail;
        openFile(path, path.split('/').pop());
    });

    // Initialize output panel
    outputPanel.init();

    // Initialize terminal
    initTerminal();
    
    // Initialize VS Code Language Client
    initLanguageClient();

    // Add run button functionality
    const runButton = document.getElementById('run-btn');
    if (runButton) {
        runButton.addEventListener('click', async () => {
            const editor = getEditor();
            if (!editor) return;

            const code = editor.getValue();
            const model = editor.getModel();
            if (!model) return;

            const language = model.getLanguageId();
            const uri = model.uri.toString();
            const filename = uri.split('/').pop();
            
            // Switch to output panel
            const outputTab = document.querySelector('[data-panel-id="output"]');
            if (outputTab) {
                outputTab.click();
            }

            // Run code with WebSocket support
            await outputPanel.runCode(code, language, filename);
        });
    }

    // Activate Explorer by default on startup
    setTimeout(() => {
        const explorerIcon = document.querySelector('.activity-icon[data-action="explorer"]');
        if (explorerIcon) {
            explorerIcon.click();
            console.log('✅ Explorer 기본 활성화');
        }
    }, 100);
}

// Filter file tree based on search term
function filterFileTree(searchTerm) {
    const allItems = document.querySelectorAll('.tree-item');
    allItems.forEach(item => {
        const fileName = item.textContent.toLowerCase();
        if (fileName.includes(searchTerm) || searchTerm === '') {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Read file as text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

// Load directory with file handles (File System Access API) - Simplified Sequential Approach
async function loadDirectoryWithHandles(dirHandle) {
    // Close all open tabs before loading new directory
    const openFilePaths = Array.from(openFiles.keys());
    openFilePaths.forEach(filePath => {
        closeFile(filePath);
    });
    
    // Clear file system
    clientFS.clear();
    clientFS.setDirectoryHandle(dirHandle);

    // Process directory with parallel file reading
    async function processDirectory(directoryHandle, path) {
        const entries = [];
        for await (const entry of directoryHandle.values()) {
            entries.push(entry);
        }
        
        // Process all entries in parallel
        await Promise.all(entries.map(async (entry) => {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            if (entry.kind === 'file') {
                try {
                    const file = await entry.getFile();
                    let content = '[Binary File]';
                    // Only read text files
                    if (file.size < 5000000 && (file.type.startsWith('text/') || !file.type ||
                        entry.name.match(/\.(js|ts|jsx|tsx|html|css|json|md|txt|py|java|c|cpp|h|go|rs)$/i))) {
                        content = await file.text();
                    }
                    clientFS.addFile(entryPath, content, true, true); // hasFileHandle = true
                    clientFS.setFileHandle(entryPath, entry);
                } catch (e) {
                    console.error(`Could not read file: ${entryPath}`, e);
                    clientFS.addFile(entryPath, '[Error Reading File]', true, true); // hasFileHandle = true
                }
            } else if (entry.kind === 'directory') {
                clientFS.createDirectory(entryPath);
                await processDirectory(entry, entryPath);
            }
        }));
    }

    await processDirectory(dirHandle, '');

    // Final step: sort and render
    clientFS.sortChildren(clientFS.root);
    renderClientFileTree();
    await saveDirHandleToStorage(dirHandle);
}

// Save directory handle and file tree to IndexedDB
async function saveDirHandleToStorage(dirHandle) {
    try {
        const db = await openDB();
        
        // Save handle
        try {
            const handleTx = db.transaction('handles', 'readwrite');
            await handleTx.objectStore('handles').put(dirHandle, 'rootDir');
            await handleTx.done;
        } catch (e) {
            // Handle might not be serializable, continue
        }
        
        // Save file tree data (serializable)
        const filesData = {
            root: clientFS.root,
            timestamp: Date.now()
        };
        
        const dataTx = db.transaction('fileData', 'readwrite');
        await dataTx.objectStore('fileData').put(filesData, 'currentProject');
        await dataTx.done;
    } catch (err) {
        console.error('Failed to save directory:', err);
    }
}

// Open IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('VSCodeCloneDB', 3);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('handles')) {
                db.createObjectStore('handles');
            }
            if (!db.objectStoreNames.contains('fileData')) {
                db.createObjectStore('fileData');
            }
        };
    });
}

// Restore previous directory
async function restorePreviousDirectory() {
    try {
        const db = await openDB();
        
        // Try to restore from saved file data first
        const dataTx = db.transaction('fileData', 'readonly');
        const filesData = await dataTx.objectStore('fileData').get('currentProject');
        
        if (filesData && filesData.root) {
            // Restore from saved data
            clientFS.clear();
            clientFS.root = filesData.root;
            
            renderClientFileTree();
            return;
        }
        
        // Fallback: try handle-based restoration (for same session)
        if ('showDirectoryPicker' in window) {
            try {
                const handleTx = db.transaction('handles', 'readonly');
                const dirHandle = await handleTx.objectStore('handles').get('rootDir');
                
                if (dirHandle) {
                    const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
                    if (permission === 'granted') {
                        await loadDirectoryWithHandles(dirHandle);
                        return;
                    }
                }
            } catch (err) {
                // Handle invalid, continue to welcome
            }
        }
        
        // No saved data, show welcome
        showWelcomeMessage();
    } catch (err) {
        console.error('Failed to restore directory:', err);
        showWelcomeMessage();
    }
}

// Show welcome message
function showWelcomeMessage() {
    if (!fileExplorerEl) return;
    
    const welcomeDiv = document.createElement('div');
    welcomeDiv.style.padding = '20px';
    welcomeDiv.style.textAlign = 'center';
    
    const title = document.createElement('h3');
    title.style.color = 'var(--text-color)';
    title.style.marginBottom = '15px';
    title.textContent = '환영합니다! 👋';
    
    const description = document.createElement('p');
    description.style.color = 'var(--text-color-light)';
    description.style.marginBottom = '20px';
    description.textContent = '시작하려면 폴더를 선택하세요';
    
    const button = document.createElement('button');
    button.textContent = '📁 폴더 선택';
    button.style.padding = '10px 20px';
    button.style.background = 'var(--active-item-border)';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.fontSize = '14px';
    button.addEventListener('click', () => {
        const uploadIcon = document.querySelector('.activity-icon[data-action="upload"]');
        if (uploadIcon) uploadIcon.click();
    });
    
    welcomeDiv.appendChild(title);
    welcomeDiv.appendChild(description);
    welcomeDiv.appendChild(button);
    
    fileExplorerEl.innerHTML = '';
    fileExplorerEl.appendChild(welcomeDiv);
}

// Render client-side file tree
function renderClientFileTree() {
    if (!fileExplorerEl) return;
    
    const dirHandle = clientFS.getDirectoryHandle();
    const headerHtml = `
        <div style="padding: 10px; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h3 style="margin: 0;">${dirHandle ? '📁 로컬 폴더' : '📂 업로드된 파일'}</h3>
                <div style="display: flex; gap: 4px;">
                    <button id="explorer-new-file-btn" title="새 파일" style="
                        background: none;
                        border: none;
                        color: var(--text-color-light);
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 3px;
                        display: flex;
                        align-items: center;
                    ">
                        <i class="codicon codicon-file"></i>
                    </button>
                    <button id="explorer-new-folder-btn" title="새 폴더" style="
                        background: none;
                        border: none;
                        color: var(--text-color-light);
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 3px;
                        display: flex;
                        align-items: center;
                    ">
                        <i class="codicon codicon-folder"></i>
                    </button>
                    <button id="explorer-refresh-btn" title="새로고침" style="
                        background: none;
                        border: none;
                        color: var(--text-color-light);
                        cursor: pointer;
                        padding: 4px;
                        border-radius: 3px;
                        display: flex;
                        align-items: center;
                    ">
                        <i class="codicon codicon-refresh"></i>
                    </button>
                </div>
            </div>
            <div style="font-size: 11px; color: var(--text-color-light);">
                ${dirHandle ? '실제 파일 시스템 연결됨' : '메모리 전용 모드'}
            </div>
        </div>
    `;
    
    fileExplorerEl.innerHTML = headerHtml;
    
    // Add event listeners to header buttons
    setTimeout(() => {
        document.getElementById('explorer-new-file-btn')?.addEventListener('click', () => createNewFile('', true));
        document.getElementById('explorer-new-folder-btn')?.addEventListener('click', () => createNewFolder('', true));
        document.getElementById('explorer-refresh-btn')?.addEventListener('click', () => renderClientFileTree());
    }, 0);
    const tree = clientFS.getTree();

    if (tree.children.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.className = 'empty-explorer-msg';
        emptyMsg.style.padding = '20px';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.color = 'var(--text-color-light)';
        emptyMsg.innerHTML = `
            <p style="margin-bottom: 15px;">📂 빈 폴더입니다</p>
            <div style="display: flex; flex-direction: column; gap: 8px; max-width: 200px; margin: 0 auto;">
                <button id="empty-new-file-btn" style="
                    padding: 8px 12px;
                    background: var(--button-bg);
                    color: var(--text-color);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    font-size: 13px;
                ">
                    <i class="codicon codicon-file"></i>
                    새 파일
                </button>
                <button id="empty-new-folder-btn" style="
                    padding: 8px 12px;
                    background: var(--button-bg);
                    color: var(--text-color);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 5px;
                    font-size: 13px;
                ">
                    <i class="codicon codicon-folder"></i>
                    새 폴더
                </button>
            </div>
        `;
        fileExplorerEl.appendChild(emptyMsg);
        
        // Add event listeners to buttons
        setTimeout(() => {
            document.getElementById('empty-new-file-btn')?.addEventListener('click', () => createNewFile('', true));
            document.getElementById('empty-new-folder-btn')?.addEventListener('click', () => createNewFolder('', true));
        }, 0);
        
        // Don't return - continue to add context menu listener
    }
    
    // Filter out .gitkeep placeholder files from display
    const visibleChildren = tree.children.filter(child => {
        if (child.type === 'file' && child.name === '.gitkeep') {
            return false; // Hide .gitkeep files
        }
        return true;
    });

    visibleChildren.forEach(child => renderClientFileNode(child, fileExplorerEl, 0));
    
    // Add drop zone to file explorer root
    fileExplorerEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
    
    fileExplorerEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        
        // Only handle drops on the explorer background, not on items
        if (e.target.closest('.tree-item')) return;
        
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            await moveFileOrFolder(data.path, '', data.name); // Empty string = root
        } catch (err) {
            console.error('Drop to root error:', err);
        }
    });
}

// Render a single file/directory node
function renderClientFileNode(node, parentEl, depth = 0) {
    const item = document.createElement('div');
    item.className = `tree-item ${node.type}`;
    item.style.paddingLeft = `${depth * 15}px`;
    item.dataset.path = node.path;
    item.dataset.type = node.type; // Add data-type attribute for styling
    item.draggable = true;

    // Create item content wrapper
    const itemContent = document.createElement('div');
    itemContent.className = 'tree-item-content';
    itemContent.style.paddingLeft = '0'; // Remove extra padding since item has it

    // Add icon
    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'tree-item-icon';

    const icon = document.createElement('i');
    icon.className = 'codicon';
    if (node.type === 'directory') {
        icon.classList.add(`codicon-${fileIcons.getFolderIcon(false)}`);
        icon.style.color = '#dcb67a';
    } else {
        const iconClass = fileIcons.getFileIcon(node.name);
        icon.classList.add(`codicon-${iconClass}`);
        icon.style.color = fileIcons.getFileColor(node.name);
    }
    iconWrapper.appendChild(icon);
    itemContent.appendChild(iconWrapper);

    // Add label
    const label = document.createElement('span');
    label.className = 'tree-item-label';
    label.textContent = node.name;
    label.title = node.name;
    itemContent.appendChild(label);

    item.appendChild(itemContent);
    
    // Action buttons (shown on hover)
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'tree-item-actions';
    actionsDiv.style.display = 'none';
    actionsDiv.style.gap = '2px';
    actionsDiv.innerHTML = `
        <button class="tree-action-btn" data-action="rename" title="이름 변경" style="
            background: none;
            border: none;
            color: var(--text-color-light);
            cursor: pointer;
            padding: 2px;
            display: flex;
            align-items: center;
        ">
            <i class="codicon codicon-edit"></i>
        </button>
        <button class="tree-action-btn" data-action="delete" title="삭제" style="
            background: none;
            border: none;
            color: var(--text-color-light);
            cursor: pointer;
            padding: 2px;
            display: flex;
            align-items: center;
        ">
            <i class="codicon codicon-trash"></i>
        </button>
    `;
    item.appendChild(actionsDiv);
    
    // Show/hide actions on hover
    item.addEventListener('mouseenter', () => {
        actionsDiv.style.display = 'flex';
    });
    item.addEventListener('mouseleave', () => {
        actionsDiv.style.display = 'none';
    });
    
    // Action button handlers
    actionsDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        const btn = e.target.closest('.tree-action-btn');
        if (!btn) return;
        
        const action = btn.dataset.action;
        if (action === 'rename') {
            renameFile(node.path, node.name, node.type === 'directory');
        } else if (action === 'delete') {
            deleteFile(node.path, node.name, node.type === 'directory');
        }
    });
    
    // Drag and drop handlers
    item.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({
            path: node.path,
            name: node.name,
            type: node.type
        }));
        item.style.opacity = '0.5';
    });
    
    item.addEventListener('dragend', (e) => {
        item.style.opacity = '1';
    });
    
    // Only allow dropping on directories
    if (node.type === 'directory') {
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            item.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        
        item.addEventListener('dragleave', (e) => {
            item.style.background = '';
        });
        
        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            item.style.background = '';
            
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                const sourcePath = data.path;
                const targetPath = node.path;
                
                // Don't move to itself
                if (sourcePath === targetPath) return;
                
                // Don't move parent into child
                if (targetPath.startsWith(sourcePath + '/')) {
                    showNotification('상위 폴더를 하위 폴더로 이동할 수 없습니다', 'error');
                    return;
                }
                
                await moveFileOrFolder(sourcePath, targetPath, data.name);
            } catch (err) {
                console.error('Drop error:', err);
                showNotification('이동 실패', 'error');
            }
        });
    }

    if (node.type === 'directory') {
        item.classList.add('closed');

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';

        const toggleFolder = (e) => {
            e.stopPropagation();
            item.classList.toggle('closed');

            // Update folder icon
            const isOpen = !item.classList.contains('closed');
            const newIconClass = fileIcons.getFolderIcon(isOpen);
            icon.className = 'codicon';
            icon.classList.add(`codicon-${newIconClass}`);
        };

        itemContent.addEventListener('click', toggleFolder);

        if (node.children && node.children.length > 0) {
            // Filter out .gitkeep files
            const visibleChildren = node.children.filter(child => {
                if (child.type === 'file' && child.name === '.gitkeep') {
                    return false;
                }
                return true;
            });

            if (visibleChildren.length > 0) {
                visibleChildren.forEach(child => renderClientFileNode(child, childrenContainer, depth + 1));
            } else {
                // Empty folder - add placeholder (only .gitkeep files exist)
                const emptyMsg = document.createElement('div');
                emptyMsg.className = 'empty-folder-msg';
                emptyMsg.style.padding = '5px 10px';
                emptyMsg.style.color = 'var(--text-color-light)';
                emptyMsg.style.fontSize = '11px';
                emptyMsg.textContent = '빈 폴더';
                childrenContainer.appendChild(emptyMsg);
            }
        } else {
            // Empty folder - add placeholder
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-folder-msg';
            emptyMsg.style.padding = '5px 10px';
            emptyMsg.style.color = 'var(--text-color-light)';
            emptyMsg.style.fontSize = '11px';
            emptyMsg.textContent = '빈 폴더';
            childrenContainer.appendChild(emptyMsg);
        }

        item.appendChild(childrenContainer);
    } else {
        // File - click to open
        const openFile = () => openClientFile(node.path, node.name);
        itemContent.addEventListener('click', openFile);
    }

    parentEl.appendChild(item);
}


// Open a file from client file system
function openClientFile(filePath, fileName) {
    if (openFiles.has(filePath)) {
        setActiveTab(filePath);
        return;
    }

    const file = clientFS.getFile(filePath);
    if (!file) {
        showNotification(`파일을 찾을 수 없습니다: ${filePath}`, 'error');
        return;
    }

    // Prevent opening binary files in the editor
    if (file.content === '[Binary File]' || file.content === '[Error Reading File]') {
        showNotification(`바이너리 파일은 열 수 없습니다: ${fileName}`, 'info');
        return;
    }

    const newTab = document.createElement('div');
    newTab.className = 'tab';
    newTab.dataset.filePath = filePath;

    const tabLabel = document.createElement('span');
    tabLabel.textContent = fileName;
    newTab.appendChild(tabLabel);

    const closeBtn = document.createElement('i');
    closeBtn.className = 'codicon codicon-close';
    closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        closeFile(filePath);
    });
    newTab.appendChild(closeBtn);

    newTab.addEventListener('click', () => setActiveTab(filePath));

    tabsContainer.appendChild(newTab);
    openFiles.set(filePath, { tabEl: newTab, content: file.content, isClientFile: true });

    setActiveTab(filePath);
    
    // Check if HTML file and show preview button
    checkAndShowPreviewButton(filePath);
}

// Window resize handler - 터미널 크기 자동 조정
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const editor = getEditor();
        if (editor) editor.layout();
        
        const activeTab = document.querySelector('.panel-tab.active');
        if (activeTab && activeTab.dataset.panel === 'terminal' && xterm && fitAddon) {
            try {
                fitAddon.fit();
                console.log('Terminal auto-resized on window resize');
            } catch (err) {
                console.warn('Terminal fit error:', err);
            }
        }
    }, 100);
});

// 터미널 패널 크기 변경 감지 및 자동 조절
const terminalContainer = document.getElementById('terminal-container');
if (terminalContainer) {
    const resizeObserver = new ResizeObserver(() => {
        if (xterm && fitAddon) {
            try {
                fitAddon.fit();
            } catch (err) {
                // 무시
            }
        }
    });
    resizeObserver.observe(terminalContainer);
}

// 패널 크기 조절 감지
const panelElement = document.getElementById('panel');
if (panelElement) {
    const panelResizeObserver = new ResizeObserver(() => {
        if (xterm && fitAddon) {
            try {
                fitAddon.fit();
            } catch (err) {
                // 무시
            }
        }
    });
    panelResizeObserver.observe(panelElement);
}

// Suppress ResizeObserver errors
window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('ResizeObserver')) {
        const resizeObserverErrDiv = document.getElementById('webpack-dev-server-client-overlay-div');
        const resizeObserverErr = document.getElementById('webpack-dev-server-client-overlay');
        if (resizeObserverErr) {
            resizeObserverErr.setAttribute('style', 'display: none');
        }
        if (resizeObserverErrDiv) {
            resizeObserverErrDiv.setAttribute('style', 'display: none');
        }
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
    }
});

// Also suppress in console
const originalError = console.error;
console.error = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('ResizeObserver')) {
        return;
    }
    originalError.apply(console, args);
};

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    initUI();

    // Listen for file restoration events BEFORE initializing file system
    window.addEventListener('files-restored', (event) => {
        console.log(`📂 ${event.detail.count} files restored, refreshing UI...`);
        // Always refresh file tree when files are restored
        try {
            renderClientFileTree();
            showNotification(`${event.detail.count}개 파일 복원됨`, 'success');
        } catch (err) {
            console.error('Failed to refresh file tree:', err);
        }
    });

    // Initialize file system with persistent storage
    try {
        await clientFS.init();
        console.log('✅ File system initialized');

        // Force refresh UI after initialization to show restored files
        renderClientFileTree();
    } catch (err) {
        console.error('파일 시스템 초기화 실패:', err);
    }

    // Initialize GitHub
    try {
        const { initGitHub } = await import('./github.js');
        initGitHub();
    } catch (err) {
        console.warn('GitHub 초기화 실패:', err);
    }

    // Hide splash screen after animation
    setTimeout(() => {
        const splashScreen = document.getElementById('splash-screen');
        if (splashScreen) {
            splashScreen.classList.add('hidden');
        }

        // Show tutorial for first-time users after splash screen
        setTimeout(() => {
            tutorial.showIfFirstTime();
        }, 500);
    }, 3300); // 3.3 seconds (animation duration + fade out)
});

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- Quick Git Push ---
async function quickGitPush() {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) {
        showNotification('열린 파일이 없습니다.', 'error');
        return;
    }
    
    const filePath = activeTab.dataset.filePath;
    
    // 클론한 레포지토리 목록 가져오기
    const clonedRepos = JSON.parse(localStorage.getItem('clonedRepos') || '[]');
    
    if (clonedRepos.length === 0) {
        showNotification('먼저 GitHub에서 레포지토리를 클론하세요!', 'error');
        return;
    }
    
    // 현재 파일이 어느 레포에 속하는지 확인
    let matchedRepo = null;
    for (const repo of clonedRepos) {
        if (filePath.startsWith(repo.path + '/') || filePath === repo.path) {
            matchedRepo = repo;
            break;
        }
    }
    
    if (!matchedRepo) {
        showNotification('이 파일은 GitHub 레포지토리에 속하지 않습니다.', 'error');
        return;
    }
    
    // 커밋 메시지 입력
    const message = await showInputModal(
        'GitHub에 푸시',
        '커밋 메시지를 입력하세요',
        'Update from web IDE',
        'git-commit'
    );
    if (!message) return;
    
    try {
        const gitPushBtn = document.getElementById('git-push-btn');
        if (gitPushBtn) {
            gitPushBtn.style.opacity = '0.5';
            gitPushBtn.style.pointerEvents = 'none';
        }
        
        showNotification('푸시 중...', 'info');
        
        const githubToken = localStorage.getItem('githubToken');
        if (!githubToken) {
            showNotification('GitHub 로그인이 필요합니다.', 'error');
            return;
        }
        
        const { githubPush } = await import('./api.js');
        const result = await githubPush(matchedRepo.path, message, githubToken);
        
        showNotification(`✅ ${matchedRepo.fullName}에 푸시 완료!`, 'success');
    } catch (error) {
        console.error('Push error:', error);
        showNotification(`❌ 푸시 실패: ${error.message}`, 'error');
    } finally {
        const gitPushBtn = document.getElementById('git-push-btn');
        if (gitPushBtn) {
            gitPushBtn.style.opacity = '1';
            gitPushBtn.style.pointerEvents = 'auto';
        }
    }
}

// 파일이 GitHub 레포에 속하는지 확인하고 푸시 버튼 표시
export function checkAndShowGitPushButton(filePath) {
    const gitPushBtn = document.getElementById('git-push-btn');
    if (!gitPushBtn) return;
    
    const clonedRepos = JSON.parse(localStorage.getItem('clonedRepos') || '[]');
    
    // 현재 파일이 클론한 레포에 속하는지 확인
    const isInRepo = clonedRepos.some(repo => 
        filePath.startsWith(repo.path + '/') || filePath === repo.path
    );
    
    gitPushBtn.style.display = isInRepo ? 'flex' : 'none';
    
    // HTML 파일이면 프리뷰 버튼 표시
    checkAndShowPreviewButton(filePath);
}

// HTML 파일이면 프리뷰 버튼 표시
function checkAndShowPreviewButton(filePath) {
    const previewBtn = document.getElementById('preview-btn');
    if (!previewBtn) return;
    
    const isHtml = filePath.endsWith('.html') || filePath.endsWith('.htm');
    previewBtn.style.display = isHtml ? 'flex' : 'none';
}

// 프리뷰 토글
function togglePreview() {
    const previewModal = document.getElementById('preview-modal');
    const isVisible = previewModal.style.display === 'flex';
    
    if (isVisible) {
        previewModal.style.display = 'none';
    } else {
        previewModal.style.display = 'flex';
        refreshPreview();
    }
}

// 프리뷰 새로고침
function refreshPreview() {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) {
        showNotification('열린 파일이 없습니다', 'error');
        return;
    }
    
    const filePath = activeTab.dataset.filePath;
    const editor = getEditor();
    
    if (!editor) {
        showNotification('에디터를 찾을 수 없습니다', 'error');
        return;
    }
    
    const content = editor.getValue();
    const previewFrame = document.getElementById('preview-frame');
    
    if (!previewFrame) {
        showNotification('프리뷰 프레임을 찾을 수 없습니다', 'error');
        return;
    }
    
    // iframe에 HTML 내용 로드
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    previewFrame.src = url;
    
    // 이전 URL 정리
    previewFrame.onload = () => {
        URL.revokeObjectURL(url);
    };
    
    showNotification('✅ 프리뷰 새로고침 완료', 'success');
}

// --- Sandbox Environment ---
async function createSandboxEnvironment() {
    const btn = document.getElementById('create-sandbox-btn');
    const statusText = document.getElementById('terminal-status-text');
    
    if (!btn || !statusText) return;
    
    // 이미 생성 중이면 무시
    if (btn.disabled) return;
    
    try {
        btn.disabled = true;
        btn.textContent = '🔄 생성 중...';
        statusText.textContent = '가상환경 생성 중...';
        
        const sessionId = localStorage.getItem('terminalSessionId');
        
        const response = await fetch('/api/sandbox/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (result.mode === 'docker') {
                // Docker 모드
                statusText.textContent = '🐳 Docker 가상환경';
                statusText.style.color = '#4ec9b0';
                btn.textContent = '✅ Docker 활성화됨';
                btn.style.background = 'linear-gradient(135deg, #16c79a 0%, #19456b 100%)';
                
                showNotification('✅ Docker 가상환경이 생성되었습니다!', 'success');
                
                // 터미널 탭으로 전환
                const terminalTab = document.querySelector('.panel-tab[data-panel-id="terminal"]');
                if (terminalTab) {
                    terminalTab.click();
                }
                
                // 터미널이 초기화될 때까지 대기
                setTimeout(() => {
                    if (xterm) {
                        xterm.write('\r\n\x1b[1;32m✅ Docker 가상환경이 생성되었습니다!\x1b[0m\r\n');
                        xterm.write('\x1b[1;36m완전히 격리된 우분투 컨테이너에서 작업합니다.\x1b[0m\r\n');
                        xterm.write('- Python3, Node.js, npm 사용 가능\r\n');
                        xterm.write('- apt, pip, npm으로 패키지 설치 가능\r\n');
                        xterm.write('- 다른 사용자와 완전히 격리됨\r\n\r\n');
                    }
                }, 500);
            } else {
                // 격리 모드 (Docker 없음)
                statusText.textContent = '🔒 격리된 작업공간';
                statusText.style.color = '#ce9178';
                btn.textContent = '✅ 격리 활성화됨';
                btn.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
                
                showNotification('✅ 격리된 작업공간이 생성되었습니다!', 'success');
                
                // 터미널 탭으로 전환
                const terminalTab = document.querySelector('.panel-tab[data-panel-id="terminal"]');
                if (terminalTab) {
                    terminalTab.click();
                }
                
                // 터미널이 초기화될 때까지 대기
                setTimeout(() => {
                    if (xterm) {
                        xterm.write('\r\n\x1b[1;32m✅ 격리된 작업공간이 생성되었습니다!\x1b[0m\r\n');
                        xterm.write('\x1b[1;33m독립된 디렉토리에서 작업합니다.\x1b[0m\r\n');
                        xterm.write('- 다른 사용자와 파일 격리\r\n');
                        xterm.write('- 세션별 독립된 작업 공간\r\n');
                        xterm.write('- 보안 명령어 필터링 적용\r\n\r\n');
                    }
                }, 500);
            }
        } else {
            throw new Error(result.error || '가상환경 생성 실패');
        }
    } catch (error) {
        console.error('Sandbox creation error:', error);
        statusText.textContent = '일반 모드';
        statusText.style.color = '';
        btn.textContent = '🐳 가상환경 만들기';
        btn.disabled = false;
        
        showNotification(`❌ 가상환경 생성 실패: ${error.message}`, 'error');
    }
}

// --- Code Execution ---
async function runCode() {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) {
        showNotification('실행할 파일이 없습니다.', 'error');
        return;
    }

    const filePath = activeTab.dataset.filePath;
    const fileName = filePath.split('/').pop();
    const fileExtension = fileName.split('.').pop();
    
    // 에디터에서 코드 가져오기
    const editor = getEditor();
    if (!editor) {
        showNotification('에디터를 찾을 수 없습니다.', 'error');
        return;
    }
    
    const code = editor.getValue();
    if (!code || !code.trim()) {
        showNotification('실행할 코드가 없습니다.', 'error');
        return;
    }
    
    showNotification(`${fileName} 실행 중...`, 'info');

    // Switch to OUTPUT tab
    const outputTab = document.querySelector('.panel-tab[data-panel-id="output"]');
    if (outputTab) {
        outputTab.click();
    }

    try {
        // Judge0 API를 사용한 브라우저 내 실행
        const { runCode: executeCode } = await import('./codeRunner.js');
        const result = await executeCode(code, fileExtension);
        displayOutput(result, fileName);

    } catch (error) {
        console.error('Failed to run code:', error);
        displayOutput({ error: `Failed to connect to the server: ${error.message}` }, fileName);
    }
}

function displayOutput(result, fileName) {
    const outputView = document.getElementById('output');
    if (!outputView) return;

    // Clear previous output
    outputView.innerHTML = '';

    const pre = document.createElement('pre');
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.wordWrap = 'break-word';
    pre.style.padding = '10px';
    pre.style.fontFamily = 'monospace';

    let outputContent = `[Running] ${fileName}\n\n`;

    if (result.output) {
        outputContent += result.output;
    }
    if (result.error) {
        outputContent += `\n[Error]\n${result.error}`;
    }
    if (result.execError) {
        outputContent += `\n[Execution Error]\n${result.execError}`;
    }

    outputContent += `\n\n[Done]`;

    pre.textContent = outputContent;
    outputView.appendChild(pre);
}

// --- Context Menu for Files ---
function showFileContextMenu(event, filePath, fileName, isDirectory) {
    event.preventDefault();
    closeContextMenu();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id = 'file-context-menu';
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;

    const menuItems = [
        { icon: 'edit', label: '이름 바꾸기', action: () => renameFile(filePath, fileName, isDirectory) },
        { icon: 'trash', label: '삭제', action: () => deleteFile(filePath, fileName, isDirectory) },
        { separator: true },
        { icon: 'file', label: '새 파일', action: () => createNewFile(filePath, isDirectory) },
        { icon: 'folder', label: '새 폴더', action: () => createNewFolder(filePath, isDirectory) }
    ];

    menuItems.forEach(item => {
        if (item.separator) {
            const separator = document.createElement('div');
            separator.className = 'context-menu-separator';
            menu.appendChild(separator);
        } else {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.innerHTML = `<i class="codicon codicon-${item.icon}"></i> ${item.label}`;
            menuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                item.action();
                closeContextMenu();
            });
            menu.appendChild(menuItem);
        }
    });

    document.body.appendChild(menu);
}

// Context menu for file explorer background
function showFileExplorerContextMenu(event) {
    event.preventDefault();
    closeContextMenu();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id = 'file-context-menu';
    menu.style.left = `${event.pageX}px`;
    menu.style.top = `${event.pageY}px`;

    const menuItems = [
        { icon: 'file', label: '새 파일', action: () => createNewFile('', true) },
        { icon: 'folder', label: '새 폴더', action: () => createNewFolder('', true) },
        { separator: true },
        { icon: 'folder-opened', label: '폴더 열기', action: () => document.getElementById('open-folder-btn')?.click() },
        { icon: 'file-add', label: '파일 업로드', action: () => document.getElementById('file-upload-input')?.click() },
        { separator: true },
        { icon: 'refresh', label: '새로고침', action: () => renderClientFileTree() },
        { icon: 'clear-all', label: '모두 닫기', action: () => closeAllFiles() }
    ];

    menuItems.forEach(item => {
        if (item.separator) {
            const separator = document.createElement('div');
            separator.className = 'context-menu-separator';
            menu.appendChild(separator);
        } else {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.innerHTML = `<i class="codicon codicon-${item.icon}"></i> ${item.label}`;
            menuItem.addEventListener('click', (e) => {
                e.stopPropagation();
                item.action();
                closeContextMenu();
            });
            menu.appendChild(menuItem);
        }
    });

    document.body.appendChild(menu);
}

// Close all files
function closeAllFiles() {
    const filePaths = Array.from(openFiles.keys());
    filePaths.forEach(path => closeFile(path));
    showNotification('✅ 모든 파일 닫기 완료', 'success');
}

function closeContextMenu() {
    const existingMenu = document.getElementById('file-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
}

async function deleteFile(filePath, fileName, isDirectory) {
    const type = isDirectory ? '폴더' : '파일';
    const dirHandle = clientFS.getDirectoryHandle();
    
    if (dirHandle) {
        if (!confirm(`정말로 "${fileName}" ${type}를 삭제하시겠습니까?\n\n⚠️ 이 작업은 실제 로컬 파일을 삭제합니다!`)) {
            return;
        }
    } else {
        if (!confirm(`정말로 "${fileName}" ${type}를 삭제하시겠습니까?`)) {
            return;
        }
    }

    // Try to delete from disk if directory handle exists
    if (dirHandle) {
        const result = await clientFS.deleteFileFromDisk(filePath);
        
        if (result.success && result.deletedFromDisk) {
            showNotification(`✅ ${type} 삭제됨: ${fileName}`, 'success');
            
            // Close tab if file is open
            if (openFiles.has(filePath)) {
                closeFile(filePath);
            }
            
            // Reload file tree
            await loadDirectoryWithHandles(dirHandle);
            return;
        } else {
            showNotification(`삭제 실패: ${result.error || '알 수 없는 오류'}`, 'error');
            return;
        }
    }
    
    // No directory handle - delete from memory only
    clientFS.deleteFile(filePath);
    await clientFS.saveToIndexedDB();
    
    showNotification(`✅ ${type} 삭제됨: ${fileName}`, 'success');
    
    // Close tab if file is open
    if (openFiles.has(filePath)) {
        closeFile(filePath);
    }
    
    // Refresh file tree
    renderClientFileTree();
}

// Move file or folder
async function moveFileOrFolder(sourcePath, targetFolderPath, fileName) {
    const dirHandle = clientFS.getDirectoryHandle();

    // Check if source and target are the same
    const sourcePathParts = sourcePath.split('/');
    const sourceFileName = sourcePathParts.pop();
    const sourceParentPath = sourcePathParts.join('/');

    if (sourceParentPath === targetFolderPath) {
        showNotification('같은 폴더에는 이동할 수 없습니다', 'info');
        return;
    }

    // Memory mode - move in memory
    if (!dirHandle) {
        try {
            const sourceFile = clientFS.getFile(sourcePath);
            if (!sourceFile) {
                showNotification('파일을 찾을 수 없습니다', 'error');
                return;
            }

            if (sourceFile.type === 'directory') {
                showNotification('폴더 이동은 현재 지원되지 않습니다', 'error');
                return;
            }

            // Create new path
            const newPath = targetFolderPath ? `${targetFolderPath}/${sourceFileName}` : sourceFileName;

            // Move file in memory
            const result = await clientFS.moveFile(sourcePath, newPath);

            if (result.success) {
                showNotification(`✅ ${sourceFileName} 이동 완료`, 'success');

                // Update open tab if file is open
                if (openFiles.has(sourcePath)) {
                    const fileData = openFiles.get(sourcePath);
                    openFiles.delete(sourcePath);
                    openFiles.set(newPath, { ...fileData, path: newPath });

                    // Update tab
                    const tabs = document.querySelectorAll('.tab');
                    tabs.forEach(tab => {
                        if (tab.dataset.path === sourcePath) {
                            tab.dataset.path = newPath;
                        }
                    });
                }

                // Reload file tree
                renderClientFileTree();
            } else {
                showNotification(`이동 실패: ${result.error || '알 수 없는 오류'}`, 'error');
            }
        } catch (err) {
            console.error('Memory mode move error:', err);
            showNotification(`이동 실패: ${err.message}`, 'error');
        }
        return;
    }
    
    try {
        // Navigate to source parent
        let sourceParentHandle = dirHandle;
        if (sourceParentPath) {
            for (const part of sourceParentPath.split('/')) {
                if (!part) continue;
                sourceParentHandle = await sourceParentHandle.getDirectoryHandle(part);
            }
        }
        
        // Navigate to target folder
        let targetHandle = dirHandle;
        if (targetFolderPath) {
            for (const part of targetFolderPath.split('/')) {
                if (!part) continue;
                targetHandle = await targetHandle.getDirectoryHandle(part);
            }
        }
        
        // Get source file/folder handle
        const sourceFile = clientFS.getFile(sourcePath);
        const isDirectory = sourceFile && sourceFile.type === 'directory';
        
        if (isDirectory) {
            showNotification('폴더 이동은 현재 지원되지 않습니다', 'error');
            return;
        }
        
        // For files, read content and create in new location
        const fileHandle = await sourceParentHandle.getFileHandle(sourceFileName);
        const file = await fileHandle.getFile();
        const content = await file.text();
        
        // Create in new location
        const newFileHandle = await targetHandle.getFileHandle(sourceFileName, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        
        // Try to delete from old location
        try {
            await sourceParentHandle.removeEntry(sourceFileName);
        } catch (removeErr) {
            // If removeEntry fails, ask user to manually delete
            showNotification(`⚠️ ${sourceFileName} 복사 완료. 원본 파일은 수동으로 삭제해주세요.`, 'warning');
            await loadDirectoryWithHandles(dirHandle);
            return;
        }
        
        showNotification(`✅ ${sourceFileName} 이동 완료`, 'success');
        
        // Reload file tree
        await loadDirectoryWithHandles(dirHandle);
        
    } catch (err) {
        console.error('Move error:', err);
        showNotification(`이동 실패: ${err.message}`, 'error');
    }
}

// Premium Input Modal
function showInputModal(title, placeholder = '', defaultValue = '', icon = 'edit') {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'input-modal-overlay';

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'input-modal';

        modal.innerHTML = `
            <div class="input-modal-title">
                <i class="codicon codicon-${icon}"></i>
                ${title}
            </div>
            <input
                type="text"
                class="input-modal-input"
                placeholder="${placeholder}"
                value="${defaultValue}"
                autofocus
            />
            <div class="input-modal-buttons">
                <button class="input-modal-button input-modal-button-cancel">취소</button>
                <button class="input-modal-button input-modal-button-confirm">확인</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const input = modal.querySelector('.input-modal-input');
        const cancelBtn = modal.querySelector('.input-modal-button-cancel');
        const confirmBtn = modal.querySelector('.input-modal-button-confirm');

        // Focus input and select text
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);

        // Handle confirm
        const confirm = () => {
            const value = input.value.trim();
            overlay.remove();
            resolve(value || null);
        };

        // Handle cancel
        const cancel = () => {
            overlay.remove();
            resolve(null);
        };

        // Event listeners
        confirmBtn.addEventListener('click', confirm);
        cancelBtn.addEventListener('click', cancel);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cancel();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        });
    });
}

async function renameFile(filePath, fileName, isDirectory) {
    const type = isDirectory ? '폴더' : '파일';
    const newName = await showInputModal(
        `${type} 이름 변경`,
        `새로운 ${type} 이름을 입력하세요`,
        fileName,
        'symbol-file'
    );
    if (!newName || newName === fileName) {
        return;
    }

    showNotification(`${type} 이름 변경 중...`, 'info');

    const dirHandle = clientFS.getDirectoryHandle();

    // Try to rename on disk if directory handle exists
    if (dirHandle) {
        const result = await clientFS.renameEntry(filePath, newName);

        if (result.success && result.renamed) {
            showNotification(`✅ 이름 변경됨: ${fileName} → ${newName}`, 'success');

            // Close tab if file is open
            if (openFiles.has(filePath)) {
                closeFile(filePath);
            }

            // Reload file tree
            await loadDirectoryWithHandles(dirHandle);
        } else {
            showNotification(`이름 변경 실패: ${result.error || '알 수 없는 오류'}`, 'error');
        }
    } else {
        // Memory mode - rename in memory
        const result = await clientFS.renameEntry(filePath, newName);

        if (result.success && result.renamed) {
            showNotification(`✅ 이름 변경됨: ${fileName} → ${newName}`, 'success');

            // Update open tab if file is open
            const oldPath = filePath;
            const pathParts = filePath.split('/');
            pathParts[pathParts.length - 1] = newName;
            const newPath = pathParts.join('/');

            if (openFiles.has(oldPath)) {
                const fileData = openFiles.get(oldPath);
                openFiles.delete(oldPath);
                openFiles.set(newPath, { ...fileData, path: newPath });

                // Update tab
                const tabs = document.querySelectorAll('.tab');
                tabs.forEach(tab => {
                    if (tab.dataset.path === oldPath) {
                        tab.dataset.path = newPath;
                        const tabTitle = tab.querySelector('.tab-title');
                        if (tabTitle) {
                            tabTitle.textContent = newName;
                        }
                    }
                });
            }

            // Reload file tree
            renderClientFileTree();
        } else {
            showNotification(`이름 변경 실패: ${result.error || '알 수 없는 오류'}`, 'error');
        }
    }
}

async function createNewFile(parentPath, isDirectory) {
    const fileName = await showInputModal(
        '새 파일 만들기',
        '파일 이름을 입력하세요 (예: index.js)',
        '',
        'file-add'
    );
    if (!fileName) return;

    const basePath = isDirectory ? parentPath : parentPath.split('/').slice(0, -1).join('/');
    
    const result = await clientFS.createNewFile(basePath, fileName);
    
    if (result.success && result.createdFile) {
        showNotification(`✅ 파일 생성됨: ${fileName}`, 'success');
        
        // Reload file tree
        const dirHandle = clientFS.getDirectoryHandle();
        if (dirHandle) {
            await loadDirectoryWithHandles(dirHandle);
        } else {
            // No directory handle, just refresh client tree
            renderClientFileTree();
        }
        
        // Auto-open the new file
        const newFilePath = basePath ? `${basePath}/${fileName}` : fileName;
        setTimeout(() => openClientFile(newFilePath, fileName), 100);
    } else {
        showNotification(`파일 생성 실패: ${result.error || '알 수 없는 오류'}`, 'error');
    }
}

async function createNewFolder(parentPath, isDirectory) {
    const folderName = await showInputModal(
        '새 폴더 만들기',
        '폴더 이름을 입력하세요',
        '',
        'folder'
    );
    if (!folderName) return;

    const basePath = isDirectory ? parentPath : parentPath.split('/').slice(0, -1).join('/');
    
    const result = await clientFS.createNewDirectory(basePath, folderName);
    
    if (result.success && result.createdDirectory) {
        showNotification(`✅ 폴더 생성됨: ${folderName}`, 'success');
        
        // Reload file tree
        const dirHandle = clientFS.getDirectoryHandle();
        if (dirHandle) {
            await loadDirectoryWithHandles(dirHandle);
        } else {
            // No directory handle, just refresh client tree
            renderClientFileTree();
        }
    } else {
        showNotification(`폴더 생성 실패: ${result.error || '알 수 없는 오류'}`, 'error');
    }
}

// --- Source Control Functions ---
export function trackFileChange(filePath, currentContent) {
    const originalFile = clientFS.getFile(filePath);
    if (!originalFile) {
        // New file
        fileChanges.set(filePath, { status: 'added', originalContent: '' });
    } else if (originalFile.content !== currentContent) {
        // Modified file
        fileChanges.set(filePath, { status: 'modified', originalContent: originalFile.content });
    } else {
        // No changes
        fileChanges.delete(filePath);
    }
    
    updateSourceControlView();
    updateSourceControlBadge();
}

function renderSourceControlView() {
    const sourceControlView = document.getElementById('source-control-view');
    if (!sourceControlView) return;

    const changesCount = fileChanges.size;

    sourceControlView.innerHTML = `
        <h3>변경사항</h3>
        <div class="source-control-changes">
            <div class="changes-header">
                <i class="codicon codicon-list-unordered"></i>
                수정된 파일 (${changesCount})
            </div>
            <div class="changes-list" id="changes-list">
                ${changesCount === 0 ? '<div class="no-changes"><i class="codicon codicon-check" style="font-size: 48px; opacity: 0.3; margin-bottom: 12px;"></i><p>변경사항이 없습니다</p></div>' : ''}
            </div>
        </div>
    `;

    // Render changes
    if (changesCount > 0) {
        const changesList = document.getElementById('changes-list');
        fileChanges.forEach((change, filePath) => {
            const changeItem = document.createElement('div');
            changeItem.className = 'change-item';

            const fileName = filePath.split('/').pop();
            const statusIcon = change.status === 'modified' ? 'codicon-edit' : 'codicon-add';
            const statusLabel = change.status === 'modified' ? 'M' : 'A';

            changeItem.innerHTML = `
                <i class="codicon ${statusIcon}"></i>
                <span class="change-file-name">${fileName}</span>
                <span class="change-status ${change.status}">${statusLabel}</span>
            `;

            changeItem.addEventListener('click', () => {
                showFileDiff(filePath, fileName, change);
            });

            changesList.appendChild(changeItem);
        });
    }
}

function updateSourceControlView() {
    if (currentView === 'source-control') {
        renderSourceControlView();
    }
}

function updateSourceControlBadge() {
    const badge = document.querySelector('.activity-icon[data-action="source-control"] .activity-badge');
    if (badge) {
        const count = fileChanges.size;
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function showFileDiff(filePath, fileName, change) {
    const originalContent = change.originalContent || '';
    const currentContent = openFiles.get(filePath)?.content || clientFS.getFile(filePath)?.content || '';
    
    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = `
            <span class="breadcrumb-item">${escapeHtml(fileName)}</span>
            <span class="breadcrumb-separator">›</span>
            <span class="breadcrumb-item">변경사항 비교</span>
        `;
    }
    
    // Show diff editor
    showDiffEditor(originalContent, currentContent, filePath);
    
    // Update tabs to show diff view
    const existingTab = document.querySelector(`.tab[data-file-path="${filePath}"]`);
    if (existingTab) {
        // Update existing tab
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        existingTab.classList.add('active');
    } else {
        // Create new tab for diff view
        const newTab = document.createElement('div');
        newTab.className = 'tab active';
        newTab.dataset.filePath = filePath;
        newTab.dataset.isDiff = 'true';
        
        const tabLabel = document.createElement('span');
        tabLabel.textContent = `${fileName} (비교)`;
        newTab.appendChild(tabLabel);
        
        const closeBtn = document.createElement('i');
        closeBtn.className = 'codicon codicon-close';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            newTab.remove();
            hideDiffEditor();
        });
        newTab.appendChild(closeBtn);
        
        newTab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            newTab.classList.add('active');
            showDiffEditor(originalContent, currentContent, filePath);
        });
        
        // Remove active from other tabs
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        
        tabsContainer.appendChild(newTab);
    }
}

// Toggle mobile sidebar
function toggleMobileSidebar(e) {
    if (e) e.stopPropagation();
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
    }
}

// ===== GitHub Integration =====
let githubToken = localStorage.getItem('github_token');
let githubUser = null;

// GitHub Sidebar Renderer
function renderGitHubSidebar() {
    const hasToken = !!localStorage.getItem('githubToken');
    const savedUser = localStorage.getItem('githubUser');
    
    if (!hasToken || !savedUser) return;
    
    try {
        const user = JSON.parse(savedUser);
        
        // Render user info
        const userCard = document.getElementById('github-sidebar-user');
        if (userCard) {
            userCard.innerHTML = `
                <img src="${user.avatar_url}" alt="${user.login}">
                <div class="user-info">
                    <p class="user-name">${user.login}</p>
                    <p class="user-status">Connected</p>
                </div>
                <button id="github-logout-btn" class="logout-btn" title="로그아웃">
                    <i class="codicon codicon-sign-out"></i>
                </button>
            `;
            
            // Setup logout button event
            const logoutBtn = document.getElementById('github-logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    if (confirm('로그아웃하시겠습니까?\n\n다시 로그인하려면 GitHub 인증이 필요합니다.')) {
                        localStorage.removeItem('githubToken');
                        localStorage.removeItem('githubUser');
                        alert('✅ 로그아웃되었습니다.\n\n새 토큰으로 다시 로그인해주세요.');
                        window.location.reload();
                    }
                });
            }
        }
        
        // Load repositories
        loadGitHubSidebarRepos();
        loadClonedRepos();
    } catch (e) {
        console.error('Failed to render GitHub sidebar:', e);
    }
}

async function loadGitHubSidebarRepos() {
    const reposList = document.getElementById('github-sidebar-repos-list');
    if (!reposList) return;
    
    reposList.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';
    
    try {
        const token = localStorage.getItem('githubToken');
        const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch repos');
        
        const repos = await response.json();
        
        if (repos.length === 0) {
            reposList.innerHTML = '<div class="empty-state"><i class="codicon codicon-repo"></i><p>No repositories found</p></div>';
            return;
        }
        
        reposList.innerHTML = repos.map(repo => `
            <div class="repo-item" data-repo="${repo.full_name}">
                <div class="repo-name">
                    <i class="codicon codicon-repo"></i>
                    ${repo.name}
                </div>
                ${repo.description ? `<div class="repo-description">${repo.description}</div>` : ''}
                <div class="repo-meta">
                    ${repo.language ? `<div class="repo-meta-item"><i class="codicon codicon-circle-filled"></i>${repo.language}</div>` : ''}
                    <div class="repo-meta-item"><i class="codicon codicon-star"></i>${repo.stargazers_count}</div>
                    ${repo.private ? '<div class="repo-meta-item"><i class="codicon codicon-lock"></i>Private</div>' : ''}
                </div>
            </div>
        `).join('');
        
        const cloneBtn = document.getElementById('github-clone-btn');
        
        // Add click handlers
        reposList.querySelectorAll('.repo-item').forEach(item => {
            item.addEventListener('click', async () => {
                reposList.querySelectorAll('.repo-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                
                // Import and set selected repo
                const { setSelectedRepo } = await import('./github.js');
                setSelectedRepo(item.dataset.repo);
                
                // Enable clone button
                if (cloneBtn) {
                    cloneBtn.disabled = false;
                }
            });
        });
        
        // Refresh button
        const refreshBtn = document.getElementById('refresh-repos-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadGitHubSidebarRepos();
            });
        }
    } catch (error) {
        console.error('Failed to load repos:', error);
        reposList.innerHTML = '<div class="empty-state"><i class="codicon codicon-error"></i><p>Failed to load repositories</p></div>';
    }
}

export function loadClonedRepos() {
    const clonedList = document.getElementById('github-sidebar-cloned-list');
    if (!clonedList) return;
    
    const clonedRepos = JSON.parse(localStorage.getItem('clonedRepos') || '[]');
    
    if (clonedRepos.length === 0) {
        clonedList.innerHTML = '<div class="empty-state"><i class="codicon codicon-folder"></i><p>No cloned repositories</p></div>';
        return;
    }
    
    clonedList.innerHTML = clonedRepos.map(repo => `
        <div class="cloned-item">
            <div class="cloned-info">
                <div class="cloned-name">
                    <i class="codicon codicon-folder-opened"></i>
                    ${repo.repo}
                </div>
                <div class="cloned-path">${repo.path}</div>
            </div>
            <div class="cloned-actions">
                <button class="cloned-action-btn" onclick="openClonedRepo('${repo.fullName}')" title="Open">
                    <i class="codicon codicon-folder-opened"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderGitHubView() {
    // Deprecated - use renderGitHubSidebar instead
    renderGitHubSidebar();
}

function loginToGitHub() {
    const clientId = 'Ov23li22YDn5ymGp9viB'; // GitHub OAuth App Client ID
    const redirectUri = `${window.location.origin}/api/github/callback`;
    const scope = 'repo,user,delete_repo';
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    
    // Open popup window
    const width = 600;
    const height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    
    const popup = window.open(
        authUrl,
        'GitHub Login',
        `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Listen for callback
    window.addEventListener('message', async (event) => {
        if (event.data.type === 'github-auth') {
            githubToken = event.data.token;
            githubUser = event.data.user;
            localStorage.setItem('github_token', githubToken);
            localStorage.setItem('github_user', JSON.stringify(githubUser));
            
            showNotification(`✓ ${githubUser.login}님 환영합니다!`, 'success');
            renderGitHubView();
        }
    });
}

async function loadGitHubRepositories() {
    const githubView = document.getElementById('github-view');
    if (!githubView) return;

    githubView.innerHTML = `
        <div class="github-header">
            <h3>GitHub</h3>
            <div class="github-user">
                <img src="${githubUser?.avatar_url || ''}" alt="avatar" class="github-avatar">
                <span>${githubUser?.login || ''}</span>
                <button class="github-logout-btn" id="github-logout-btn" title="로그아웃">
                    <i class="codicon codicon-sign-out"></i>
                </button>
            </div>
        </div>
        <div style="padding: 15px; margin: 10px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
            <button id="github-push-main-btn" style="width: 100%; padding: 15px; background: rgba(255, 255, 255, 0.95); color: #667eea; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.3s;">
                <i class="codicon codicon-cloud-upload" style="font-size: 20px;"></i>
                <span>변경사항 푸시</span>
            </button>
        </div>
        <div class="github-actions">
            <button class="github-action-btn" id="create-repo-btn" title="새 레포지토리 생성">
                <i class="codicon codicon-repo-create"></i> 생성
            </button>
            <button class="github-action-btn" id="refresh-repos-btn" title="새로고침">
                <i class="codicon codicon-refresh"></i>
            </button>
        </div>
        <div class="github-repos-list" id="github-repos-list">
            <div class="loading">로딩 중...</div>
        </div>
    `;

    document.getElementById('github-logout-btn')?.addEventListener('click', logoutFromGitHub);
    
    // Main push button - opens the push modal from github.js
    const pushMainBtn = document.getElementById('github-push-main-btn');
    if (pushMainBtn) {
        pushMainBtn.addEventListener('click', async () => {
            // Import and call openPushModal from github.js
            try {
                const { openPushModal } = await import('./github.js');
                openPushModal();
            } catch (error) {
                console.error('Failed to open push modal:', error);
                // Fallback: trigger the github push button
                document.getElementById('github-push-btn')?.click();
            }
        });
        
        // Hover effect
        pushMainBtn.addEventListener('mouseenter', (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        });
        pushMainBtn.addEventListener('mouseleave', (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
        });
    }
    
    document.getElementById('create-repo-btn')?.addEventListener('click', showCreateRepoDialog);
    document.getElementById('refresh-repos-btn')?.addEventListener('click', loadGitHubRepositories);

    try {
        const response = await fetch('/api/github/repos', {
            headers: { 'Authorization': `Bearer ${githubToken}` }
        });

        if (!response.ok) throw new Error('Failed to fetch repositories');

        const repos = await response.json();
        renderRepositories(repos);
    } catch (error) {
        console.error('GitHub API error:', error);
        document.getElementById('github-repos-list').innerHTML = `
            <div class="error-message">레포지토리를 불러오는데 실패했습니다</div>
        `;
    }
}

function renderRepositories(repos) {
    const reposList = document.getElementById('github-repos-list');
    if (!reposList) return;

    if (repos.length === 0) {
        reposList.innerHTML = '<div class="no-repos">레포지토리가 없습니다</div>';
        return;
    }

    reposList.innerHTML = '';
    repos.forEach(repo => {
        const repoItem = document.createElement('div');
        repoItem.className = 'github-repo-item';
        repoItem.innerHTML = `
            <div class="repo-info">
                <i class="codicon codicon-repo"></i>
                <div class="repo-details">
                    <div class="repo-name">${repo.name}</div>
                    ${repo.description ? `<div class="repo-description">${repo.description}</div>` : ''}
                </div>
            </div>
            <div class="repo-actions">
                <button class="repo-action-btn" title="열기" data-action="open" data-repo="${repo.full_name}">
                    <i class="codicon codicon-folder-opened"></i>
                </button>
                <button class="repo-action-btn" title="커밋" data-action="commits" data-repo="${repo.full_name}">
                    <i class="codicon codicon-git-commit"></i>
                </button>
                <button class="repo-action-btn" title="삭제" data-action="delete" data-repo="${repo.full_name}">
                    <i class="codicon codicon-trash"></i>
                </button>
            </div>
        `;

        repoItem.querySelectorAll('.repo-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const repoFullName = btn.dataset.repo;
                handleRepoAction(action, repoFullName);
            });
        });

        reposList.appendChild(repoItem);
    });
}

async function handleRepoAction(action, repoFullName) {
    const [owner, repo] = repoFullName.split('/');

    switch (action) {
        case 'open':
            await loadRepositoryFiles(owner, repo);
            break;
        case 'commits':
            await showCommits(owner, repo);
            break;
        case 'delete':
            if (confirm(`정말로 "${repoFullName}" 레포지토리를 삭제하시겠습니까?`)) {
                await deleteRepository(owner, repo);
            }
            break;
    }
}

async function loadRepositoryFiles(owner, repo) {
    showNotification(`${repo} 로딩 중...`, 'info');
    
    try {
        const response = await fetch(`/api/github/repos/${owner}/${repo}/contents/`, {
            headers: { 'Authorization': `Bearer ${githubToken}` }
        });

        if (!response.ok) throw new Error('Failed to load repository');

        const files = await response.json();
        
        // Clear and load files into editor
        clientFS.clear();
        await loadGitHubFilesRecursive(owner, repo, '', files);
        clientFS.sortChildren(clientFS.root);
        renderClientFileTree();
        
        // Switch to explorer view
        document.querySelector('.activity-icon[data-action="explorer"]')?.click();
        
        showNotification(`✓ ${repo} 로드 완료`, 'success');
    } catch (error) {
        console.error('Failed to load repository:', error);
        showNotification('레포지토리 로드 실패', 'error');
    }
}

async function loadGitHubFilesRecursive(owner, repo, path, items) {
    for (const item of items) {
        if (item.type === 'file') {
            try {
                const response = await fetch(item.url, {
                    headers: { 'Authorization': `Bearer ${githubToken}` }
                });
                const data = await response.json();
                const content = atob(data.content);
                clientFS.addFile(item.path, content);
            } catch (error) {
                console.error(`Failed to load file: ${item.path}`, error);
            }
        } else if (item.type === 'dir') {
            clientFS.createDirectory(item.path);
            try {
                const response = await fetch(item.url, {
                    headers: { 'Authorization': `Bearer ${githubToken}` }
                });
                const subItems = await response.json();
                await loadGitHubFilesRecursive(owner, repo, item.path, subItems);
            } catch (error) {
                console.error(`Failed to load directory: ${item.path}`, error);
            }
        }
    }
}

async function showCommits(owner, repo) {
    try {
        const response = await fetch(`/api/github/repos/${owner}/${repo}/commits`, {
            headers: { 'Authorization': `Bearer ${githubToken}` }
        });

        if (!response.ok) throw new Error('Failed to fetch commits');

        const commits = await response.json();
        
        const commitsHtml = commits.map(commit => `
            <div class="commit-item">
                <div class="commit-message">${commit.commit.message}</div>
                <div class="commit-meta">
                    <span>${commit.commit.author.name}</span>
                    <span>${new Date(commit.commit.author.date).toLocaleString()}</span>
                </div>
            </div>
        `).join('');

        showNotification(`${repo} 커밋 히스토리`, 'info');
        
        // Could show in a modal or panel
        alert(`최근 커밋:\n\n${commits.slice(0, 5).map(c => `• ${c.commit.message}`).join('\n')}`);
    } catch (error) {
        console.error('Failed to fetch commits:', error);
        showNotification('커밋 조회 실패', 'error');
    }
}

async function deleteRepository(owner, repo) {
    try {
        const response = await fetch(`/api/github/repos/${owner}/${repo}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${githubToken}` }
        });

        if (!response.ok) throw new Error('Failed to delete repository');

        showNotification(`✓ ${repo} 삭제 완료`, 'success');
        loadGitHubRepositories();
    } catch (error) {
        console.error('Failed to delete repository:', error);
        showNotification('레포지토리 삭제 실패', 'error');
    }
}

function showCreateRepoDialog() {
    const name = prompt('새 레포지토리 이름:');
    if (!name) return;

    const description = prompt('설명 (선택사항):');
    const isPrivate = confirm('비공개 레포지토리로 만드시겠습니까?');

    createRepository(name, description, isPrivate);
}

async function createRepository(name, description, isPrivate) {
    try {
        const response = await fetch('/api/github/repos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${githubToken}`
            },
            body: JSON.stringify({ name, description, private: isPrivate })
        });

        if (!response.ok) throw new Error('Failed to create repository');

        const repo = await response.json();
        showNotification(`✓ ${repo.name} 생성 완료`, 'success');
        loadGitHubRepositories();
    } catch (error) {
        console.error('Failed to create repository:', error);
        showNotification('레포지토리 생성 실패', 'error');
    }
}

function logoutFromGitHub() {
    githubToken = null;
    githubUser = null;
    localStorage.removeItem('github_token');
    localStorage.removeItem('github_user');
    showNotification('로그아웃되었습니다', 'info');
    renderGitHubView();
}

// Note: GitHub push functionality is now handled by github.js
// Use the GitHub button in the activity bar to access push features

// Toggle panel visibility
function togglePanel() {
    const panel = document.getElementById('panel');
    const toggleBtn = document.getElementById('toggle-panel-btn');
    const openBtn = document.getElementById('panel-open-btn');
    const icon = toggleBtn?.querySelector('i');
    
    if (panel.classList.contains('panel-visible')) {
        // Hide panel
        panel.classList.remove('panel-visible');
        panel.classList.add('panel-hidden');
        if (icon) {
            icon.className = 'codicon codicon-chevron-up';
        }
        if (toggleBtn) {
            toggleBtn.title = '패널 열기 (Ctrl+J)';
        }
        // Show open button
        if (openBtn) {
            openBtn.style.display = 'flex';
        }
    } else {
        // Show panel
        panel.classList.remove('panel-hidden');
        panel.classList.add('panel-visible');
        if (icon) {
            icon.className = 'codicon codicon-chevron-down';
        }
        if (toggleBtn) {
            toggleBtn.title = '패널 닫기 (Ctrl+J)';
        }
        // Hide open button
        if (openBtn) {
            openBtn.style.display = 'none';
        }
        
        // Refit terminal when panel opens
        setTimeout(() => {
            if (fitAddon && xterm) {
                fitAddon.fit();
            }
            // Relayout editor
            const editor = getEditor();
            if (editor) {
                editor.layout();
            }
        }, 160); // Wait for animation to complete (150ms + 10ms buffer)
    }
}

// IndexedDB에서 파일 로드
async function loadFilesFromIndexedDB() {
    try {
        const loaded = await clientFS.loadFromIndexedDB();
        if (loaded) {
            renderClientFileTree();
            showNotification('✅ 이전 파일 복원 완료', 'success');
        } else {
            // 파일이 없으면 빈 트리 표시
            renderClientFileTree();
        }
    } catch (err) {
        console.error('Failed to load files:', err);
        renderClientFileTree();
    }
}
