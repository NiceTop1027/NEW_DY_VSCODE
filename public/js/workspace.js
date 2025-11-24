// public/js/workspace.js
// Workspace management with localForage

import localforage from 'localforage';
import { showNotification } from './utils.js';

class WorkspaceManager {
  constructor() {
    // Configure localforage
    this.store = localforage.createInstance({
      name: 'dy-vscode',
      storeName: 'workspaces',
      description: 'DY VSCode Workspaces'
    });
        
    this.currentWorkspace = null;
  }

  // Save workspace
  async saveWorkspace(name, data) {
    try {
      const workspace = {
        name,
        data,
        savedAt: new Date().toISOString(),
        version: '1.0'
      };
            
      await this.store.setItem(name, workspace);
      showNotification(`💾 워크스페이스 "${name}" 저장됨`, 'success');
      return workspace;
    } catch (error) {
      console.error('Save workspace error:', error);
      showNotification('워크스페이스 저장 실패', 'error');
      throw error;
    }
  }

  // Load workspace
  async loadWorkspace(name) {
    try {
      const workspace = await this.store.getItem(name);
            
      if (!workspace) {
        throw new Error('Workspace not found');
      }
            
      this.currentWorkspace = workspace;
      showNotification(`📂 워크스페이스 "${name}" 로드됨`, 'success');
      return workspace;
    } catch (error) {
      console.error('Load workspace error:', error);
      showNotification('워크스페이스 로드 실패', 'error');
      throw error;
    }
  }

  // Delete workspace
  async deleteWorkspace(name) {
    try {
      await this.store.removeItem(name);
      showNotification(`🗑️ 워크스페이스 "${name}" 삭제됨`, 'success');
    } catch (error) {
      console.error('Delete workspace error:', error);
      showNotification('워크스페이스 삭제 실패', 'error');
      throw error;
    }
  }

  // List all workspaces
  async listWorkspaces() {
    try {
      const workspaces = [];
      await this.store.iterate((value, key) => {
        workspaces.push({
          name: key,
          savedAt: value.savedAt,
          version: value.version
        });
      });
      return workspaces.sort((a, b) => 
        new Date(b.savedAt) - new Date(a.savedAt)
      );
    } catch (error) {
      console.error('List workspaces error:', error);
      return [];
    }
  }

  // Auto-save current state
  async autoSave() {
    try {
      const state = this.captureCurrentState();
      await this.store.setItem('__autosave__', {
        name: '__autosave__',
        data: state,
        savedAt: new Date().toISOString()
      });
      console.log('✓ Auto-saved');
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  }

  // Restore from auto-save
  async restoreAutoSave() {
    try {
      const autosave = await this.store.getItem('__autosave__');
      if (autosave) {
        return autosave.data;
      }
      return null;
    } catch (error) {
      console.error('Restore auto-save error:', error);
      return null;
    }
  }

  // Capture current state
  captureCurrentState() {
    return {
      openFiles: this.getOpenFiles(),
      activeFile: this.getActiveFile(),
      editorState: this.getEditorState(),
      sidebarState: this.getSidebarState(),
      panelState: this.getPanelState()
    };
  }

  // Helper methods
  getOpenFiles() {
    const tabs = document.querySelectorAll('.tab');
    return Array.from(tabs).map(tab => ({
      path: tab.dataset.filePath,
      name: tab.textContent.trim()
    }));
  }

  getActiveFile() {
    const activeTab = document.querySelector('.tab.active');
    return activeTab ? activeTab.dataset.filePath : null;
  }

  getEditorState() {
    return {
      theme: localStorage.getItem('editor-theme') || 'vs-dark',
      fontSize: localStorage.getItem('fontSize') || '14',
      minimap: localStorage.getItem('minimap-enabled') === 'true'
    };
  }

  getSidebarState() {
    const sidebar = document.getElementById('sidebar');
    return {
      visible: sidebar ? sidebar.style.display !== 'none' : true,
      width: sidebar ? sidebar.offsetWidth : 250
    };
  }

  getPanelState() {
    const panel = document.getElementById('panel');
    return {
      visible: panel ? panel.classList.contains('panel-visible') : false,
      height: panel ? panel.offsetHeight : 200
    };
  }

  // Show workspace manager modal
  async showWorkspaceModal() {
    const workspaces = await this.listWorkspaces();
        
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>💼 워크스페이스 관리</h2>
                    <button class="modal-close" id="workspace-modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 20px;">
                        <h3 style="margin-bottom: 10px;">새 워크스페이스 저장</h3>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" id="workspace-name" placeholder="워크스페이스 이름" 
                                style="flex: 1; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--editor-background); color: var(--text-color);">
                            <button id="save-workspace-btn" class="btn-primary">저장</button>
                        </div>
                    </div>
                    
                    <h3 style="margin-bottom: 10px;">저장된 워크스페이스</h3>
                    <div id="workspace-list" style="max-height: 300px; overflow-y: auto;">
                        ${workspaces.length === 0 ? 
    '<p style="color: var(--text-color-light); text-align: center; padding: 20px;">저장된 워크스페이스가 없습니다</p>' :
    workspaces.filter(w => w.name !== '__autosave__').map(w => `
                                <div class="workspace-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: var(--hover-background); border-radius: 4px; margin-bottom: 8px;">
                                    <div>
                                        <strong>${w.name}</strong>
                                        <br>
                                        <small style="color: var(--text-color-light);">${new Date(w.savedAt).toLocaleString()}</small>
                                    </div>
                                    <div style="display: flex; gap: 8px;">
                                        <button class="btn-secondary load-workspace" data-name="${w.name}">로드</button>
                                        <button class="btn-secondary delete-workspace" data-name="${w.name}">삭제</button>
                                    </div>
                                </div>
                            `).join('')
}
                    </div>
                </div>
            </div>
        `;
        
    document.body.appendChild(modal);
        
    // Event listeners
    document.getElementById('workspace-modal-close').addEventListener('click', () => {
      modal.remove();
    });
        
    document.getElementById('save-workspace-btn').addEventListener('click', async () => {
      const name = document.getElementById('workspace-name').value.trim();
      if (name) {
        const state = this.captureCurrentState();
        await this.saveWorkspace(name, state);
        modal.remove();
        this.showWorkspaceModal(); // Refresh
      }
    });
        
    document.querySelectorAll('.load-workspace').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.name;
        const workspace = await this.loadWorkspace(name);
        // TODO: Restore workspace state
        modal.remove();
      });
    });
        
    document.querySelectorAll('.delete-workspace').forEach(btn => {
      btn.addEventListener('click', async () => {
        const name = btn.dataset.name;
        if (confirm(`"${name}" 워크스페이스를 삭제하시겠습니까?`)) {
          await this.deleteWorkspace(name);
          modal.remove();
          this.showWorkspaceModal(); // Refresh
        }
      });
    });
        
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Start auto-save interval
  startAutoSave(intervalMs = 30000) {
    setInterval(() => {
      this.autoSave();
    }, intervalMs);
    console.log(`✅ Auto-save started (every ${intervalMs / 1000}s)`);
  }
}

export const workspace = new WorkspaceManager();
export default workspace;
