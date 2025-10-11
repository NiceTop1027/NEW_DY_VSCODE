// public/js/ui.js
import { fetchFileTree, uploadFile, fetchFileContent } from './api.js';
import { initEditor, setEditorContent, clearEditorContent } from './editor.js';
import { showNotification, getLanguageIdFromFilePath } from './utils.js';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

const fileExplorerEl = document.getElementById('file-explorer');
const activityBar = document.getElementById('activity-bar');
const tabsContainer = document.getElementById('tabs');
const statusLeft = document.getElementById('status-left');
const statusRight = document.getElementById('status-right');
const sidebar = document.getElementById('sidebar');
const resizeHandle = document.getElementById('resize-handle');
const fileUploadInput = document.getElementById('file-upload-input');
const panelResizeHandle = document.getElementById('panel-resize-handle');
const panel = document.getElementById('panel');
const editorGroup = document.getElementById('editor-group');

export const openFiles = new Map(); // path -> { tabEl, content }

export function initUI() {
    initEditor(document.getElementById('editor'), tabsContainer, openFiles); // Initialize editor

    // -----------------------------
    // Activity Bar Icons
    // -----------------------------
    const activityIcons = [
        { name: 'Files', icon: 'explorer' },
        { name: 'Search', icon: 'search' },
        { name: 'Source Control', icon: 'source-control' },
        { name: 'Debug', icon: 'debug-alt' },
        { name: 'Extensions', icon: 'extensions' },
        { name: 'Upload', icon: 'cloud-upload', action: 'upload' }
    ];

    activityIcons.forEach(({name, icon, action}) => {
        const iconEl = document.createElement('div');
        iconEl.className = 'activity-icon';
        iconEl.title = name;
        iconEl.innerHTML = `<i class="codicon codicon-${icon}"></i>`;
        if (action === 'upload') {
            iconEl.addEventListener('click', () => fileUploadInput.click());
        }
        activityBar.appendChild(iconEl);
    });

    // -----------------------------
    // Sidebar Resize
    // -----------------------------
    let isResizingSidebar = false;
    const MIN_SIDEBAR_WIDTH = 150;
    const MAX_SIDEBAR_WIDTH = 600;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizingSidebar = true;
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
        document.removeEventListener('mousemove', handleSidebarMouseMove);
        document.removeEventListener('mouseup', stopSidebarResize);
    }

    // -----------------------------
    // Panel Resize
    // -----------------------------
    let isResizingPanel = false;
    const MIN_PANEL_HEIGHT = 100;
    const MAX_PANEL_HEIGHT_RATIO = 0.7; // Max 70% of window height

    panelResizeHandle.addEventListener('mousedown', (e) => {
        isResizingPanel = true;
        document.addEventListener('mousemove', handlePanelMouseMove);
        document.addEventListener('mouseup', stopPanelResize);
    });

    function handlePanelMouseMove(e) {
        if (!isResizingPanel) return;
        const mainContentRect = document.getElementById('main-content').getBoundingClientRect();
        let newPanelHeight = mainContentRect.bottom - e.clientY;
        newPanelHeight = Math.max(MIN_PANEL_HEIGHT, Math.min(window.innerHeight * MAX_PANEL_HEIGHT_RATIO, newPanelHeight));
        panel.style.height = `${newPanelHeight}px`;
        // Monaco Editor layout needs to be updated when panel size changes
        // editor is not directly accessible here, need to pass it or use a global event
        // For now, we'll assume editor.layout() is called externally or via event.
    }

    function stopPanelResize() {
        isResizingPanel = false;
        document.removeEventListener('mousemove', handlePanelMouseMove);
        document.removeEventListener('mouseup', stopPanelResize);
    }

    // -----------------------------
    // File Tree Rendering
    // -----------------------------
    const FILE_ITEM_HEIGHT = 22; // Approximate height of a file item
    let allFileItems = []; // Store all file items for virtual scrolling

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
                // Re-render visible items after folder toggle
                renderVisibleFileItems();
            });
            if (node.children) node.children.forEach(child => renderFileTree(child, childrenContainer, depth + 1));
        } else {
            label.addEventListener('click', () => openFile(node.path, node.name));
        }

        parentEl.appendChild(item);
        allFileItems.push(item); // Add to all items list
    }

    function renderVisibleFileItems() {
        const visibleItems = [];
        const scrollTop = sidebar.scrollTop;
        const viewportHeight = sidebar.clientHeight;
        const startIndex = Math.floor(scrollTop / FILE_ITEM_HEIGHT);
        const endIndex = Math.min(allFileItems.length, startIndex + Math.ceil(viewportHeight / FILE_ITEM_HEIGHT) + 5); // +5 for buffer

        // Clear existing items and append only visible ones
        fileExplorerEl.innerHTML = '<h3>Project Files</h3>';
        for (let i = startIndex; i < endIndex; i++) {
            fileExplorerEl.appendChild(allFileItems[i]);
        }

        // Adjust padding to simulate full scroll height
        const totalHeight = allFileItems.length * FILE_ITEM_HEIGHT;
        fileExplorerEl.style.paddingTop = `${startIndex * FILE_ITEM_HEIGHT}px`;
        fileExplorerEl.style.paddingBottom = `${totalHeight - endIndex * FILE_ITEM_HEIGHT}px`;
    }

    // -----------------------------
    // File Tabs & Editor
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
            } else {
                file.tabEl.classList.remove('active');
            }
        });
        const lnColStatusItem = document.querySelector('#status-right .status-item:nth-child(1)');
        if (lnColStatusItem) lnColStatusItem.textContent = "Ln 1, Col 1";
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
    // Panel Tabs
    // -----------------------------
    const panelTabs = document.querySelectorAll('.panel-tab');
    const panelViews = document.querySelectorAll('.panel-view');
    const terminalEl = document.getElementById('terminal');

    let xterm;
    let fitAddon;

    panelTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            panelTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            panelViews.forEach(view => view.classList.remove('active'));
            const activePanelId = tab.dataset.panelId;
            document.getElementById(activePanelId).classList.add('active');

            if (activePanelId === 'terminal') {
                if (!xterm) {
                    xterm = new Terminal({
                        convertEol: true,
                        fontFamily: 'monospace',
                        fontSize: 14,
                        theme: {
                            background: '#1e1e1e',
                            foreground: '#cccccc'
                        }
                    });
                    fitAddon = new FitAddon();
                    xterm.loadAddon(fitAddon);
                    xterm.open(terminalEl);
                    xterm.onResize(size => {
                        // Send size to backend for pty resize
                        // socket.send(JSON.stringify({ type: 'resize', cols: size.cols, rows: size.rows }));
                    });
                    fitAddon.fit();

                    // Connect to WebSocket
                    const socket = new WebSocket(`ws://${window.location.host}/terminal`);
                    socket.onopen = () => {
                        xterm.onData(data => {
                            socket.send(data);
                        });
                        socket.onmessage = event => {
                            xterm.write(event.data);
                        };
                        socket.onclose = () => {
                            console.log('Terminal WebSocket closed.');
                        };
                        socket.onerror = error => {
                            console.error('Terminal WebSocket error:', error);
                        };
                    };
                } else {
                    fitAddon.fit();
                }
            }
            // Monaco Editor layout needs to be updated when panel size changes
            // editor is not directly accessible here, need to pass it or use a global event
            // For now, we'll assume editor.layout() is called externally or via event.
        });
    });

    // -----------------------------
    // Fetch & Render File Tree
    // -----------------------------
    async function fetchAndRenderFileTree() {
        try {
            const fileTree = await fetchFileTree();
            if (fileExplorerEl) {
                fileExplorerEl.innerHTML = '<h3>Project Files</h3>';
                renderFileTree(fileTree, fileExplorerEl);
            }
        } catch (err) {
            showNotification(`Error fetching file tree: ${err.message}`, 'error');
            if (fileExplorerEl) fileExplorerEl.innerHTML = '<p>Error loading file explorer.</p>';
        }
    }

    fetchAndRenderFileTree();
}