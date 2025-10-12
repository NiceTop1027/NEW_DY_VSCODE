// public/js/ui.js
import { fetchFileTree, uploadFile, fetchFileContent } from './api.js';
import { initEditor, setEditorContent, clearEditorContent, getEditor, showDiffEditor, hideDiffEditor } from './editor.js';
import { showNotification, getLanguageIdFromFilePath } from './utils.js';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { clientFS } from './fileSystem.js';

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
    item.style.paddingLeft = `${depth * 15}px`;
    item.dataset.path = node.path || node.name;

    const label = document.createElement('span');
    label.textContent = node.name;
    item.appendChild(label);

    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';
    item.appendChild(childrenContainer);

    if (node.type === 'directory') {
        item.classList.add('closed');
        label.addEventListener('click', e => {
            e.stopPropagation();
            item.classList.toggle('closed');
            renderVisibleFileItems();
        });
        if (node.children) node.children.forEach(child => renderFileTree(child, childrenContainer, depth + 1));
    } else { // file
        label.addEventListener('click', () => openFile(node.path, node.name));
    }

    parentEl.appendChild(item);
    allFileItems.push(item);
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

    // Activity Bar Icons
    const activityIcons = [
        { name: 'Explorer', icon: 'files', action: 'explorer' },
        { name: 'Source Control', icon: 'source-control', action: 'source-control' },
        { name: 'GitHub', icon: 'github', action: 'github' },
        { name: 'Search', icon: 'search', action: 'search' },
        { name: 'Run and Debug', icon: 'debug-alt', action: 'debug' },
        { name: 'Upload Folder', icon: 'folder-opened', action: 'upload' }
    ];

    activityIcons.forEach(({name, icon, action}) => {
        const iconEl = document.createElement('div');
        iconEl.className = 'activity-icon';
        iconEl.title = name;
        iconEl.dataset.action = action;
        
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
                const debugView = document.getElementById('debug-view');
                const searchBox = document.querySelector('.search-box');

                // Hide all sidebar views
                fileExplorerView.style.display = 'none';
                sourceControlView.style.display = 'none';
                githubView.style.display = 'none';
                debugView.style.display = 'none';
                searchBox.style.display = 'none';

            switch (action) {
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
                    githubView.style.display = 'block';
                    currentView = 'github';
                    renderGitHubView();
                    break;
                case 'search':
                    // For now, just show explorer and focus search
                    fileExplorerView.style.display = 'block';
                    searchBox.style.display = 'block';
                    if (fileSearchInput) fileSearchInput.focus();
                    currentView = 'explorer';
                    break;
                case 'debug':
                    debugView.style.display = 'block';
                    currentView = 'debug';
                    renderDebugView(); // Render the debug UI
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

    // Run Code Button
    const runCodeBtn = document.getElementById('run-code-btn');
    if (runCodeBtn) {
        runCodeBtn.addEventListener('click', runCode);
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
        document.addEventListener('mousemove', handleSidebarMouseMove);
        document.addEventListener('mouseup', stopSidebarResize);
    });

    function handleSidebarMouseMove(e) {
        if (!isResizingSidebar) return;
        let newWidth = e.clientX - sidebar.getBoundingClientRect().left;
        newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth));
        sidebar.style.width = `${newWidth}px`;
    }

    function stopSidebarResize() {
        isResizingSidebar = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', handleSidebarMouseMove);
        document.removeEventListener('mouseup', stopSidebarResize);
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
                    clientFS.addFile(entryPath, content);
                    clientFS.setFileHandle(entryPath, entry);
                } catch (e) {
                    console.error(`Could not read file: ${entryPath}`, e);
                    clientFS.addFile(entryPath, '[Error Reading File]');
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
                <button id="empty-upload-btn" style="
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
                    <i class="codicon codicon-file-add"></i>
                    파일 업로드
                </button>
            </div>
        `;
        fileExplorerEl.appendChild(emptyMsg);
        
        // Add event listeners to buttons
        setTimeout(() => {
            document.getElementById('empty-new-file-btn')?.addEventListener('click', () => createNewFile('', true));
            document.getElementById('empty-new-folder-btn')?.addEventListener('click', () => createNewFolder('', true));
            document.getElementById('empty-upload-btn')?.addEventListener('click', () => {
                document.getElementById('file-upload-input')?.click();
            });
        }, 0);
        
        // Don't return - continue to add context menu listener
    }
    
    tree.children.forEach(child => renderClientFileNode(child, fileExplorerEl, 0));
}

// Render a single file/directory node
function renderClientFileNode(node, parentEl, depth = 0) {
    const item = document.createElement('div');
    item.className = `tree-item ${node.type}`;
    item.style.paddingLeft = `${depth * 15}px`;
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.justifyContent = 'space-between';
    item.dataset.path = node.path;

    const labelContainer = document.createElement('div');
    labelContainer.style.display = 'flex';
    labelContainer.style.alignItems = 'center';
    labelContainer.style.flex = '1';
    
    const label = document.createElement('span');
    label.textContent = node.name;
    labelContainer.appendChild(label);
    item.appendChild(labelContainer);
    
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

    if (node.type === 'directory') {
        item.classList.add('closed');

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';

        const toggleFolder = (e) => {
            e.stopPropagation();
            item.classList.toggle('closed');
        };

        labelContainer.addEventListener('click', toggleFolder);

        if (node.children && node.children.length > 0) {
            node.children.forEach(child => renderClientFileNode(child, childrenContainer, depth + 1));
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
        labelContainer.addEventListener('click', openFile);
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
const resizeObserverLoopErrRe = /^[^(ResizeObserver loop limit exceeded)]/;
window.addEventListener('error', (e) => {
    if (resizeObserverLoopErrRe.test(e.message)) {
        const resizeObserverErrDiv = document.getElementById('webpack-dev-server-client-overlay-div');
        const resizeObserverErr = document.getElementById('webpack-dev-server-client-overlay');
        if (resizeObserverErr) {
            resizeObserverErr.setAttribute('style', 'display: none');
        }
        if (resizeObserverErrDiv) {
            resizeObserverErrDiv.setAttribute('style', 'display: none');
        }
    }
    if (e.message.includes('ResizeObserver')) {
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
    }, 3300); // 3.3 seconds (animation duration + fade out)
});

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
    const message = prompt('커밋 메시지를 입력하세요:', 'Update from web IDE');
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

// --- Debugging --- 
function renderDebugView() {
    const debugView = document.getElementById('debug-view');
    if (!debugView) return;

    debugView.innerHTML = `
        <div class="debug-controls">
            <button class="debug-btn" id="debug-start-btn" title="Start Debugging (F5)">
                <i class="codicon codicon-debug-start"></i>
            </button>
            <button class="debug-btn" id="debug-stop-btn" title="Stop" disabled>
                <i class="codicon codicon-debug-stop"></i>
            </button>
            <button class="debug-btn" id="debug-continue-btn" title="Continue (F5)" disabled>
                <i class="codicon codicon-debug-continue"></i>
            </button>
            <button class="debug-btn" id="debug-step-over-btn" title="Step Over (F10)" disabled>
                <i class="codicon codicon-debug-step-over"></i>
            </button>
            <button class="debug-btn" id="debug-step-into-btn" title="Step Into (F11)" disabled>
                <i class="codicon codicon-debug-step-into"></i>
            </button>
            <button class="debug-btn" id="debug-step-out-btn" title="Step Out (Shift+F11)" disabled>
                <i class="codicon codicon-debug-step-out"></i>
            </button>
        </div>
        <div class="debug-section">
            <div class="debug-section-header">VARIABLES</div>
            <div class="debug-content" id="debug-variables">No active debug session</div>
        </div>
        <div class="debug-section">
            <div class="debug-section-header">WATCH</div>
            <div class="debug-content" id="debug-watch">No expressions</div>
        </div>
        <div class="debug-section">
            <div class="debug-section-header">CALL STACK</div>
            <div class="debug-content" id="debug-callstack">No active debug session</div>
        </div>
        <div class="debug-section">
            <div class="debug-section-header">BREAKPOINTS</div>
            <div class="debug-content" id="debug-breakpoints">No breakpoints set</div>
        </div>
    `;

    // Attach event listeners
    document.getElementById('debug-start-btn')?.addEventListener('click', startDebugging);
    document.getElementById('debug-stop-btn')?.addEventListener('click', stopDebugging);
    document.getElementById('debug-continue-btn')?.addEventListener('click', () => sendDebugCommand('continue'));
    document.getElementById('debug-step-over-btn')?.addEventListener('click', () => sendDebugCommand('stepOver'));
    document.getElementById('debug-step-into-btn')?.addEventListener('click', () => sendDebugCommand('stepInto'));
    document.getElementById('debug-step-out-btn')?.addEventListener('click', () => sendDebugCommand('stepOut'));
}

async function startDebugging() {
    const activeTab = document.querySelector('.tab.active');
    if (!activeTab) {
        showNotification('디버깅할 파일을 먼저 열어주세요', 'error');
        return;
    }

    const filePath = activeTab.dataset.filePath;
    const breakpoints = Array.from((await import('./editor.js')).getBreakpoints().get(filePath) || []);

    try {
        const response = await fetch('/api/debug/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath, breakpoints })
        });

        const result = await response.json();
        if (result.success) {
            showNotification('디버깅 시작됨', 'success');
            updateDebugControls(true);
            connectDebugWebSocket();
        } else {
            showNotification('디버깅 시작 실패', 'error');
        }
    } catch (error) {
        console.error('Failed to start debugging:', error);
        showNotification('디버깅 시작 실패', 'error');
    }
}

async function stopDebugging() {
    try {
        const response = await fetch('/api/debug/stop', {
            method: 'POST'
        });

        const result = await response.json();
        if (result.success) {
            showNotification('디버깅 중지됨', 'info');
            updateDebugControls(false);
        }
    } catch (error) {
        console.error('Failed to stop debugging:', error);
    }
}

function updateDebugControls(isDebugging) {
    document.getElementById('debug-start-btn').disabled = isDebugging;
    document.getElementById('debug-stop-btn').disabled = !isDebugging;
    document.getElementById('debug-continue-btn').disabled = !isDebugging;
    document.getElementById('debug-step-over-btn').disabled = !isDebugging;
    document.getElementById('debug-step-into-btn').disabled = !isDebugging;
    document.getElementById('debug-step-out-btn').disabled = !isDebugging;
}

let debugWebSocket = null;

function connectDebugWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    debugWebSocket = new WebSocket(`${wsProtocol}//${window.location.host}/debug`);
    
    debugWebSocket.onopen = () => {
        // Debug WebSocket connected
    };

    debugWebSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        // Handle debug events (breakpoint hit, variable updates, etc.)
    };

    debugWebSocket.onclose = () => {
        debugWebSocket = null;
    };
}

function sendDebugCommand(command) {
    if (debugWebSocket && debugWebSocket.readyState === WebSocket.OPEN) {
        debugWebSocket.send(JSON.stringify({ command }));
    }
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

async function renameFile(filePath, fileName, isDirectory) {
    const type = isDirectory ? '폴더' : '파일';
    const newName = prompt(`${type} 이름 변경:`, fileName);
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
        // No directory handle - rename in memory only
        showNotification('메모리 전용 모드에서는 이름 변경이 지원되지 않습니다', 'error');
    }
}

async function createNewFile(parentPath, isDirectory) {
    const fileName = prompt('새 파일 이름:');
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
    const folderName = prompt('새 폴더 이름:');
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
        <h3>소스 제어</h3>
        <div class="source-control-header">
            <div class="source-control-message">
                <input type="text" id="commit-message" placeholder="메시지 (Ctrl+Enter로 커밋)" />
                <button id="commit-btn" class="commit-btn" ${changesCount === 0 ? 'disabled' : ''}>
                    <i class="codicon codicon-check"></i> 커밋
                </button>
            </div>
        </div>
        <div class="source-control-changes">
            <div class="changes-header">변경사항 (${changesCount})</div>
            <div class="changes-list" id="changes-list">
                ${changesCount === 0 ? '<div class="no-changes">변경사항이 없습니다</div>' : ''}
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

    // Commit button event
    const commitBtn = document.getElementById('commit-btn');
    const commitMessage = document.getElementById('commit-message');
    
    if (commitBtn && commitMessage) {
        commitBtn.addEventListener('click', () => commitChanges());
        commitMessage.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                commitChanges();
            }
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
            <span class="breadcrumb-item">${fileName}</span>
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

async function commitChanges() {
    const commitMessage = document.getElementById('commit-message');
    if (!commitMessage || !commitMessage.value.trim()) {
        showNotification('커밋 메시지를 입력하세요', 'error');
        return;
    }

    const message = commitMessage.value.trim();
    const changesArray = Array.from(fileChanges.entries());
    
    showNotification(`${changesArray.length}개 파일 커밋 중...`, 'info');
    
    // Save all changes to disk
    for (const [filePath, change] of changesArray) {
        if (change.status === 'modified' || change.status === 'added') {
            const content = openFiles.get(filePath)?.content || clientFS.getFile(filePath)?.content || '';
            const fileHandle = clientFS.fileHandles.get(filePath);
            
            if (fileHandle) {
                try {
                    const writable = await fileHandle.createWritable();
                    await writable.write(content);
                    await writable.close();
                    
                    // Update original content
                    clientFS.files.set(filePath, { content, type: 'file' });
                } catch (err) {
                    console.error('Failed to save file:', filePath, err);
                }
            }
        }
    }
    
    // Clear changes
    fileChanges.clear();
    commitMessage.value = '';
    
    // Close all diff tabs
    document.querySelectorAll('.tab[data-is-diff="true"]').forEach(tab => tab.remove());
    hideDiffEditor();
    
    showNotification(`커밋 완료: "${message}"`, 'success');
    updateSourceControlView();
    updateSourceControlBadge();
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

function renderGitHubView() {
    const githubView = document.getElementById('github-view');
    if (!githubView) return;

    if (!githubToken) {
        // Show login screen
        githubView.innerHTML = `
            <div class="github-login">
                <h3>GitHub</h3>
                <div class="github-login-content">
                    <i class="codicon codicon-github" style="font-size: 64px; margin-bottom: 20px;"></i>
                    <p>GitHub에 연결하여 레포지토리를 관리하세요</p>
                    <button class="github-login-btn" id="github-login-btn">
                        <i class="codicon codicon-github"></i>
                        GitHub로 로그인
                    </button>
                </div>
            </div>
        `;

        document.getElementById('github-login-btn')?.addEventListener('click', loginToGitHub);
    } else {
        // Show repositories
        loadGitHubRepositories();
    }
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
        <div class="github-actions">
            <button class="github-action-btn" id="push-all-btn" title="현재 파일 전체 푸시">
                <i class="codicon codicon-cloud-upload"></i> 푸시
            </button>
            <button class="github-action-btn" id="create-repo-btn" title="새 레포지토리 생성">
                <i class="codicon codicon-add"></i> 새 레포
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
    document.getElementById('push-all-btn')?.addEventListener('click', pushAllFiles);
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

// 전체 파일 푸시
async function pushAllFiles() {
    // 레포지토리 선택 다이얼로그 표시
    const repoName = prompt('푸시할 레포지토리 이름을 입력하세요:');
    if (!repoName) return;
    
    const commitMessage = prompt('커밋 메시지를 입력하세요:', 'Update files');
    if (!commitMessage) return;
    
    showNotification('파일 푸시 중...', 'info');
    
    try {
        // clientFS에서 모든 파일 가져오기
        const files = [];
        clientFS.files.forEach((file, path) => {
            if (file.type === 'file' && file.content) {
                files.push({
                    path: path,
                    content: file.content
                });
            }
        });
        
        if (files.length === 0) {
            showNotification('푸시할 파일이 없습니다', 'error');
            return;
        }
        
        // 각 파일을 GitHub에 푸시
        let successCount = 0;
        let errorCount = 0;
        
        for (const file of files) {
            try {
                const response = await fetch(`/api/github/repos/${githubUser.login}/${repoName}/contents/${file.path}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${githubToken}`
                    },
                    body: JSON.stringify({
                        message: commitMessage,
                        content: btoa(unescape(encodeURIComponent(file.content))), // Base64 encode
                        branch: 'main'
                    })
                });
                
                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                    console.error(`Failed to push ${file.path}`);
                }
            } catch (err) {
                errorCount++;
                console.error(`Error pushing ${file.path}:`, err);
            }
        }
        
        if (errorCount === 0) {
            showNotification(`✅ ${successCount}개 파일 푸시 완료!`, 'success');
        } else {
            showNotification(`${successCount}개 성공, ${errorCount}개 실패`, 'warning');
        }
    } catch (error) {
        console.error('Push error:', error);
        showNotification('푸시 실패: ' + error.message, 'error');
    }
}

// Load user info on startup if token exists
if (githubToken) {
    const storedUser = localStorage.getItem('github_user');
    if (storedUser) {
        try {
            githubUser = JSON.parse(storedUser);
        } catch (e) {
            console.error('Failed to parse stored user:', e);
        }
    }
}

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
