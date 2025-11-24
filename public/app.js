// public/app.js
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready: app script running');

  const fileExplorerEl = document.getElementById('file-explorer');
  const activityBar = document.getElementById('activity-bar');
  const tabsContainer = document.getElementById('tabs');
  const statusLeft = document.getElementById('status-left');
  const statusRight = document.getElementById('status-right');
  const sidebar = document.getElementById('sidebar');
  const resizeHandle = document.getElementById('resize-handle');

  let editor = null; // Monaco Editor instance
  const openFiles = new Map(); // path -> { tabEl, content }

  // -----------------------------
  // Monaco Editor Initialization
  // -----------------------------
  require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.33.0/min/vs' }});
  require(['vs/editor/editor.main'], () => {
    editor = monaco.editor.create(document.getElementById('editor'), {
      value: '// Welcome to VS Code Clone!\n// Click a file in the explorer to open it.',
      language: 'javascript',
      theme: 'vs-dark'
    });

    // Adjust editor layout on window resize
    window.addEventListener('resize', () => {
      editor.layout();
    });

    // Add save functionality (Ctrl+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const activeFilePath = tabsContainer.querySelector('.tab.active')?.dataset.filePath;
      if (activeFilePath && editor) {
        const content = editor.getValue();
        saveFile(activeFilePath, content);
      }
    });
  });

  // -----------------------------
  // Activity Bar Icons
  // -----------------------------
  const activityIcons = [
    { name: 'Files', icon: 'explorer' },
    { name: 'Search', icon: 'search' },
    { name: 'Source Control', icon: 'source-control' },
    { name: 'Debug', icon: 'debug-alt' },
    { name: 'Extensions', icon: 'extensions' },
    { name: 'Upload', icon: 'cloud-upload', action: 'upload' } // Upload icon
  ];

  activityIcons.forEach(({name, icon, action}) => {
    const iconEl = document.createElement('div');
    iconEl.className = 'activity-icon';
    iconEl.title = name; // Use title attribute for native tooltip
    iconEl.innerHTML = `<i class="codicon codicon-${icon}"></i>`;
    if (action === 'upload') {
      iconEl.addEventListener('click', () => {
        document.getElementById('file-upload-input').click();
      });
    }
    activityBar.appendChild(iconEl);
  });

  // -----------------------------
  // Resizable Sidebar
  // -----------------------------
  let isResizing = false;
  resizeHandle.addEventListener('mousedown', () => {
    isResizing = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResize);
  });

  function handleMouseMove(e) {
    if (!isResizing) return;
    const newWidth = e.clientX - sidebar.getBoundingClientRect().left;
    sidebar.style.width = `${newWidth}px`;
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResize);
  }

  // -----------------------------
  // File Explorer Rendering
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
      });
      if (node.children) {
        node.children.forEach(child => renderFileTree(child, childrenContainer, depth + 1));
      }
    } else { // file
      label.addEventListener('click', () => openFile(node.path, node.name));
    }

    parentEl.appendChild(item);
  }

  // -----------------------------
  // File Tabs Management
  // -----------------------------
  function saveFile(filePath, content) {
    fetch('/api/save-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: filePath, content: content }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          console.log('File saved successfully:', data.message);
          // Optionally, update UI to show file is no longer dirty
        } else {
          console.error('Failed to save file:', data.error);
        }
      })
      .catch(error => {
        console.error('Error during file save:', error);
      });
  }

  function openFile(filePath, fileName) {
    if (openFiles.has(filePath)) {
      setActiveTab(filePath);
      return;
    }

    fetch(`/api/file-content?path=${encodeURIComponent(filePath)}`)
      .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
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
      .catch(err => console.error('Error opening file:', filePath, err));
  }

  function setActiveTab(filePath) {
    openFiles.forEach((file, path) => {
      if (path === filePath) {
        file.tabEl.classList.add('active');
        if (editor) {
          editor.setValue(file.content);
          // Update language in status bar
          const language = getLanguageIdFromFilePath(filePath);
          const languageStatusItem = document.querySelector('#status-right .status-item:nth-child(4)'); // JavaScript
          if (languageStatusItem) {
            languageStatusItem.textContent = language.charAt(0).toUpperCase() + language.slice(1);
          }
        }
        // Update path in status bar (using a generic status-item for now)
        const pathStatusItem = document.querySelector('#status-left .status-item:nth-child(1)'); // SSH: localhost
        if (pathStatusItem) {
          pathStatusItem.textContent = `Path: ${filePath}`;
        }
      } else {
        file.tabEl.classList.remove('active');
      }
    });
    // Initial status text (e.g., "Ready" or "Ln 1, Col 1")
    const lnColStatusItem = document.querySelector('#status-right .status-item:nth-child(1)'); // Ln 1, Col 1
    if (lnColStatusItem) lnColStatusItem.textContent = 'Ln 1, Col 1'; // Reset or update as needed
  }

  // Helper function to get language ID from file path (needed for status bar)
  function getLanguageIdFromFilePath(filePath) {
    const extension = filePath.split('.').pop();
    switch (extension) {
    case 'js': return 'javascript';
    case 'ts': return 'typescript';
    case 'html': return 'html';
    case 'css': return 'css';
    case 'json': return 'json';
    case 'py': return 'python';
    case 'md': return 'markdown';
    default: return 'plaintext';
    }
  }

  function closeFile(filePath) {
    const file = openFiles.get(filePath);
    if (!file) return;

    file.tabEl.remove();
    openFiles.delete(filePath);

    // If the closed tab was active, activate another tab or clear editor
    if (file.tabEl.classList.contains('active')) {
      if (openFiles.size > 0) {
        setActiveTab(openFiles.keys().next().value);
      } else if (editor) {
        editor.setValue('');
      }
    }
  }

  // --- Notifications ---
  function showNotification(message, type = 'info') {
    const notificationArea = document.getElementById('notification-area');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notificationArea.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.addEventListener('transitionend', () => notification.remove());
    }, 3000);
  }

  // --- File Upload ---
  // ... (기존 코드) ...

  // --- Panel Tabs ---
  const panelTabs = document.querySelectorAll('.panel-tab');
  const panelViews = document.querySelectorAll('.panel-view');

  panelTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      panelTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      panelViews.forEach(view => view.classList.remove('active'));
      document.getElementById(tab.dataset.panelId).classList.add('active');
    });
  });

  // -----------------------------
  // Fetch Project Files & Render
  // -----------------------------
  async function fetchAndRenderFileTree() {
    try {
      const response = await fetch('/api/files');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const fileTree = await response.json();
      if (fileExplorerEl) {
        fileExplorerEl.innerHTML = '<h3>Project Files</h3>'; // Clear and add title
        renderFileTree(fileTree, fileExplorerEl);
      }
    } catch (error) {
      console.error('Error fetching file structure:', error);
      if (fileExplorerEl) fileExplorerEl.innerHTML = '<p>Error loading file explorer.</p>';
    }
  }

  // Initial fetch
  fetchAndRenderFileTree();

  // Expose openFile for testing purposes
  window.openFile = openFile;
});
