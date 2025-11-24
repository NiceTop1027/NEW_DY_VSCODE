// public/js/problemsPanel.js
// Problems panel for errors and warnings

class ProblemsPanel {
  constructor() {
    this.problems = new Map(); // filePath -> problems[]
    this.panel = null;
    this.initialized = false;
  }

  // Initialize problems panel
  init() {
    if (this.initialized) return;
        
    const panel = document.getElementById('panel');
    if (!panel) return;
        
    // Add problems tab
    const tabsContainer = panel.querySelector('.panel-tabs');
    if (!tabsContainer) return;
        
    const problemsTab = document.createElement('div');
    problemsTab.className = 'panel-tab';
    problemsTab.dataset.panel = 'problems';
    problemsTab.innerHTML = `
            <span class="codicon codicon-warning"></span>
            <span>문제</span>
            <span class="problems-count" id="problems-count">0</span>
        `;
    tabsContainer.appendChild(problemsTab);
        
    // Add problems content
    const contentContainer = panel.querySelector('.panel-content');
    if (!contentContainer) return;
        
    const problemsContent = document.createElement('div');
    problemsContent.id = 'problems-content';
    problemsContent.className = 'panel-section';
    problemsContent.style.display = 'none';
    problemsContent.innerHTML = `
            <div class="problems-toolbar">
                <div class="problems-filters">
                    <button class="filter-btn active" data-filter="all">
                        <span class="codicon codicon-list-unordered"></span>
                        모두 (<span id="count-all">0</span>)
                    </button>
                    <button class="filter-btn" data-filter="error">
                        <span class="codicon codicon-error"></span>
                        에러 (<span id="count-error">0</span>)
                    </button>
                    <button class="filter-btn" data-filter="warning">
                        <span class="codicon codicon-warning"></span>
                        경고 (<span id="count-warning">0</span>)
                    </button>
                    <button class="filter-btn" data-filter="info">
                        <span class="codicon codicon-info"></span>
                        정보 (<span id="count-info">0</span>)
                    </button>
                </div>
                <div class="problems-actions">
                    <button class="action-btn" id="clear-problems-btn" title="모두 지우기">
                        <span class="codicon codicon-clear-all"></span>
                    </button>
                </div>
            </div>
            <div class="problems-list" id="problems-list">
                <div class="empty-state">
                    <span class="codicon codicon-check"></span>
                    <p>문제가 감지되지 않았습니다</p>
                </div>
            </div>
        `;
    contentContainer.appendChild(problemsContent);
        
    // Event listeners
    problemsTab.addEventListener('click', () => this.show());
        
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.filterProblems(e.currentTarget.dataset.filter);
      });
    });
        
    document.getElementById('clear-problems-btn')?.addEventListener('click', () => {
      this.clearAll();
    });
        
    this.panel = problemsContent;
    this.initialized = true;
        
    console.log('✅ Problems panel initialized');
  }

  // Add problem
  addProblem(filePath, problem) {
    if (!this.problems.has(filePath)) {
      this.problems.set(filePath, []);
    }
        
    const problems = this.problems.get(filePath);
    problems.push({
      ...problem,
      id: Date.now() + Math.random(),
      timestamp: Date.now()
    });
        
    this.render();
  }

  // Add multiple problems
  addProblems(filePath, problems) {
    this.problems.set(filePath, problems.map(p => ({
      ...p,
      id: Date.now() + Math.random(),
      timestamp: Date.now()
    })));
        
    this.render();
  }

  // Clear problems for file
  clearFile(filePath) {
    this.problems.delete(filePath);
    this.render();
  }

  // Clear all problems
  clearAll() {
    this.problems.clear();
    this.render();
  }

  // Get all problems
  getAllProblems() {
    const all = [];
    this.problems.forEach((problems, filePath) => {
      problems.forEach(problem => {
        all.push({ ...problem, filePath });
      });
    });
    return all.sort((a, b) => {
      // Sort by severity: error > warning > info
      const severityOrder = { error: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // Get problem counts
  getCounts() {
    const all = this.getAllProblems();
    return {
      all: all.length,
      error: all.filter(p => p.severity === 'error').length,
      warning: all.filter(p => p.severity === 'warning').length,
      info: all.filter(p => p.severity === 'info').length
    };
  }

  // Render problems list
  render() {
    if (!this.initialized) return;
        
    const list = document.getElementById('problems-list');
    if (!list) return;
        
    const problems = this.getAllProblems();
    const counts = this.getCounts();
        
    // Update counts
    document.getElementById('problems-count').textContent = counts.all;
    document.getElementById('count-all').textContent = counts.all;
    document.getElementById('count-error').textContent = counts.error;
    document.getElementById('count-warning').textContent = counts.warning;
    document.getElementById('count-info').textContent = counts.info;
        
    if (problems.length === 0) {
      list.innerHTML = `
                <div class="empty-state">
                    <span class="codicon codicon-check"></span>
                    <p>문제가 감지되지 않았습니다</p>
                </div>
            `;
      return;
    }
        
    list.innerHTML = problems.map(problem => `
            <div class="problem-item ${problem.severity}" data-file="${problem.filePath}" data-line="${problem.line}">
                <span class="problem-icon codicon codicon-${this.getIcon(problem.severity)}"></span>
                <div class="problem-content">
                    <div class="problem-message">${this.escapeHtml(problem.message)}</div>
                    <div class="problem-source">
                        <span class="problem-file">${this.getFileName(problem.filePath)}</span>
                        <span class="problem-location">[${problem.line}:${problem.column}]</span>
                        ${problem.source ? `<span class="problem-source-name">${problem.source}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
    // Add click handlers
    list.querySelectorAll('.problem-item').forEach(item => {
      item.addEventListener('click', () => {
        const filePath = item.dataset.file;
        const line = parseInt(item.dataset.line);
        this.goToProblem(filePath, line);
      });
    });
  }

  // Filter problems
  filterProblems(filter) {
    const items = document.querySelectorAll('.problem-item');
    items.forEach(item => {
      if (filter === 'all') {
        item.style.display = 'flex';
      } else {
        item.style.display = item.classList.contains(filter) ? 'flex' : 'none';
      }
    });
  }

  // Go to problem location
  goToProblem(filePath, line) {
    // TODO: Open file and go to line
    console.log(`Go to ${filePath}:${line}`);
  }

  // Get icon for severity
  getIcon(severity) {
    const icons = {
      error: 'error',
      warning: 'warning',
      info: 'info'
    };
    return icons[severity] || 'info';
  }

  // Get file name from path
  getFileName(path) {
    return path.split('/').pop();
  }

  // Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Show problems panel
  show() {
    if (!this.initialized) this.init();
        
    // Hide other panels
    document.querySelectorAll('.panel-section').forEach(section => {
      section.style.display = 'none';
    });
        
    // Show problems panel
    if (this.panel) {
      this.panel.style.display = 'block';
    }
        
    // Update tab states
    document.querySelectorAll('.panel-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector('[data-panel="problems"]')?.classList.add('active');
  }

  // Hide problems panel
  hide() {
    if (this.panel) {
      this.panel.style.display = 'none';
    }
  }

  // Add CSS styles
  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
            .problems-count {
                background: var(--primary-color);
                color: white;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 11px;
                margin-left: 5px;
            }
            
            .problems-toolbar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                border-bottom: 1px solid var(--border-color);
            }
            
            .problems-filters {
                display: flex;
                gap: 5px;
            }
            
            .filter-btn {
                padding: 4px 8px;
                background: transparent;
                border: 1px solid var(--border-color);
                border-radius: 3px;
                color: var(--text-color);
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .filter-btn.active {
                background: var(--primary-color);
                border-color: var(--primary-color);
            }
            
            .problems-list {
                overflow-y: auto;
                height: calc(100% - 40px);
            }
            
            .problem-item {
                display: flex;
                gap: 8px;
                padding: 8px;
                border-bottom: 1px solid var(--border-color);
                cursor: pointer;
            }
            
            .problem-item:hover {
                background: var(--hover-background);
            }
            
            .problem-icon {
                font-size: 16px;
                margin-top: 2px;
            }
            
            .problem-item.error .problem-icon {
                color: #f48771;
            }
            
            .problem-item.warning .problem-icon {
                color: #cca700;
            }
            
            .problem-item.info .problem-icon {
                color: #75beff;
            }
            
            .problem-content {
                flex: 1;
            }
            
            .problem-message {
                color: var(--text-color);
                font-size: 13px;
                margin-bottom: 4px;
            }
            
            .problem-source {
                display: flex;
                gap: 8px;
                font-size: 11px;
                color: var(--text-color-light);
            }
            
            .empty-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 200px;
                color: var(--text-color-light);
            }
            
            .empty-state .codicon {
                font-size: 48px;
                margin-bottom: 10px;
                color: #4ec9b0;
            }
        `;
    document.head.appendChild(style);
  }
}

export const problemsPanel = new ProblemsPanel();
export default problemsPanel;
