// GitHub Integration
import { githubCloneRepo, githubPush, githubGetRepos } from './api.js';

let githubToken = null;
let githubUser = null;
let selectedRepo = null;

export function initGitHub() {
    const githubBtn = document.getElementById('github-btn');
    const githubModal = document.getElementById('github-modal');
    const githubLoginBtn = document.getElementById('github-login-btn');
    const githubCloneBtn = document.getElementById('github-clone-btn');
    const githubPushBtn = document.getElementById('github-push-btn');
    
    // Load saved token
    const savedToken = localStorage.getItem('githubToken');
    const savedUser = localStorage.getItem('githubUser');
    if (savedToken && savedUser) {
        githubToken = savedToken;
        githubUser = JSON.parse(savedUser);
        updateGitHubUI();
    }
    
    // Open GitHub modal
    if (githubBtn) {
        githubBtn.addEventListener('click', () => {
            githubModal.style.display = 'flex';
            if (githubToken) {
                loadRepositories();
            }
        });
    }
    
    // GitHub login
    if (githubLoginBtn) {
        githubLoginBtn.addEventListener('click', () => {
            const clientId = 'Ov23liOXbJBdYDDXCwzF'; // GitHub OAuth App Client ID
            const redirectUri = `${window.location.origin}/api/github/callback`;
            const scope = 'repo,user';
            
            const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
            
            // Open popup
            const popup = window.open(authUrl, 'GitHub Login', 'width=600,height=700');
            
            // Listen for message from popup
            window.addEventListener('message', (event) => {
                if (event.data.type === 'github-auth') {
                    githubToken = event.data.token;
                    githubUser = event.data.user;
                    
                    // Save to localStorage
                    localStorage.setItem('githubToken', githubToken);
                    localStorage.setItem('githubUser', JSON.stringify(githubUser));
                    
                    updateGitHubUI();
                    loadRepositories();
                    popup.close();
                }
            });
        });
    }
    
    // Clone repository with isomorphic-git
    if (githubCloneBtn) {
        githubCloneBtn.addEventListener('click', async () => {
            if (!selectedRepo) {
                alert('레포지토리를 선택하세요');
                return;
            }
            
            try {
                githubCloneBtn.disabled = true;
                githubCloneBtn.textContent = '클론 중...';
                
                const [owner, repo] = selectedRepo.split('/');
                const repoUrl = `https://github.com/${owner}/${repo}`;
                
                console.log('🚀 isomorphic-git 클론 시작:', repoUrl);
                
                // Import gitClient
                const { default: gitClient } = await import('./gitClient.js');
                const { clientFS } = await import('./fileSystem.js');
                
                // Clone using isomorphic-git
                await gitClient.clone(repoUrl, githubToken);
                console.log('✓ Repository cloned');
                
                // Load files into clientFS
                githubCloneBtn.textContent = '파일 로드 중...';
                const files = await loadFilesFromGit(gitClient, clientFS);
                console.log(`✓ Loaded ${files.length} files`);
                
                // Save cloned repo info
                const clonedRepos = JSON.parse(localStorage.getItem('clonedRepos') || '[]');
                if (!clonedRepos.find(r => r.fullName === selectedRepo)) {
                    clonedRepos.push({
                        fullName: selectedRepo,
                        owner,
                        repo,
                        path: '/workspace',
                        clonedAt: new Date().toISOString()
                    });
                    localStorage.setItem('clonedRepos', JSON.stringify(clonedRepos));
                }
                
                alert(`✅ ${selectedRepo} 클론 완료!\n\n파일 수: ${files.length}개\n브라우저에서 직접 Git 작업이 가능합니다!`);
                githubModal.style.display = 'none';
                
                // Refresh UI
                window.location.reload();
            } catch (error) {
                console.error('❌ Clone error:', error);
                alert(`❌ 클론 실패\n\n에러: ${error.message}\n\n💡 팁: 토큰 권한을 확인하세요.`);
            } finally {
                githubCloneBtn.disabled = false;
                githubCloneBtn.textContent = '선택한 레포 클론';
            }
        });
    }
    
    // Helper: Load files from git to clientFS
    async function loadFilesFromGit(gitClient, clientFS) {
        const files = [];
        
        async function walkDir(dirPath = '') {
            const items = await gitClient.listFiles(dirPath);
            
            for (const item of items) {
                if (item === '.git') continue;
                
                const fullPath = dirPath ? `${dirPath}/${item}` : item;
                
                try {
                    // Try to read as file
                    const content = await gitClient.readFile(fullPath);
                    clientFS.addFile(fullPath, content);
                    files.push(fullPath);
                } catch (err) {
                    // It's a directory, recurse
                    await walkDir(fullPath);
                }
            }
        }
        
        await walkDir();
        return files;
    }
    
    // Push changes - Open new modal
    if (githubPushBtn) {
        githubPushBtn.addEventListener('click', () => {
            openPushModal();
        });
    }
    
    // Initialize push modal
    initPushModal();
}

let selectedPushRepo = null;
let selectedFiles = new Set();

export function openPushModal() {
    const clonedRepos = JSON.parse(localStorage.getItem('clonedRepos') || '[]');
    const pushModal = document.getElementById('github-push-modal');
    const repoSelect = document.getElementById('push-repo-select');
    
    // Render repository selection
    repoSelect.innerHTML = '';
    
    if (clonedRepos.length === 0) {
        // No cloned repos - show manual input option
        repoSelect.innerHTML = `
            <div style="padding: 15px; background: rgba(255, 193, 7, 0.1); border-left: 3px solid #ffc107; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; font-weight: bold;">⚠️ 클론된 레포지토리가 없습니다</p>
                <p style="margin: 0 0 10px 0; font-size: 13px;">레포지토리 정보를 직접 입력하세요:</p>
                <input type="text" id="manual-repo-owner" placeholder="GitHub 사용자명 (예: NiceTop1027)" 
                    style="width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--editor-background); color: var(--text-color);">
                <input type="text" id="manual-repo-name" placeholder="레포지토리 이름 (예: DY_VScode)" 
                    style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--editor-background); color: var(--text-color);">
            </div>
        `;
        
        // Set manual repo info
        selectedPushRepo = {
            fullName: 'manual',
            path: '/workspace',
            isManual: true
        };
        
        // Load current files
        loadChangedFiles(selectedPushRepo);
    } else {
        // Show cloned repos
        clonedRepos.forEach((repo, index) => {
            const repoOption = document.createElement('label');
            repoOption.className = 'push-repo-option';
            repoOption.innerHTML = `
                <input type="radio" name="push-repo" value="${index}">
                <div class="repo-option-content">
                    <strong>${repo.fullName}</strong>
                    <span>📁 ${repo.path}</span>
                </div>
            `;
            
            const radio = repoOption.querySelector('input');
            radio.addEventListener('change', () => {
                selectedPushRepo = repo;
                loadChangedFiles(repo);
            });
            
            repoSelect.appendChild(repoOption);
        });
        
        // Select first repo by default
        const firstRadio = repoSelect.querySelector('input[type="radio"]');
        firstRadio.checked = true;
        selectedPushRepo = clonedRepos[0];
        loadChangedFiles(clonedRepos[0]);
    }
    
    // Show modal
    document.getElementById('github-modal').style.display = 'none';
    pushModal.style.display = 'flex';
}

function initPushModal() {
    const pushModeRadios = document.querySelectorAll('input[name="push-mode"]');
    const fileSelectionSection = document.getElementById('file-selection-section');
    
    pushModeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'select') {
                fileSelectionSection.style.display = 'block';
            } else {
                fileSelectionSection.style.display = 'none';
            }
        });
    });
    
    // Cancel button
    document.getElementById('push-cancel-btn').addEventListener('click', () => {
        document.getElementById('github-push-modal').style.display = 'none';
        selectedFiles.clear();
    });
    
    // Confirm button
    document.getElementById('push-confirm-btn').addEventListener('click', async () => {
        await executePush();
    });
}

async function loadChangedFiles(repo) {
    const fileList = document.getElementById('push-file-list');
    fileList.innerHTML = '<p style="color: #888;">변경된 파일을 불러오는 중...</p>';
    
    try {
        // Get changed files from clientFS
        const { clientFS } = await import('./fileSystem.js');
        const tree = clientFS.getTree();
        
        fileList.innerHTML = '';
        selectedFiles.clear();
        
        function renderFileTree(node, parentEl, path = '') {
            if (node.type === 'file') {
                const filePath = path ? `${path}/${node.name}` : node.name;
                const fileItem = document.createElement('label');
                fileItem.className = 'push-file-item';
                fileItem.innerHTML = `
                    <input type="checkbox" value="${filePath}" checked>
                    <span>📄 ${filePath}</span>
                `;
                
                const checkbox = fileItem.querySelector('input');
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        selectedFiles.add(filePath);
                    } else {
                        selectedFiles.delete(filePath);
                    }
                });
                
                selectedFiles.add(filePath);
                parentEl.appendChild(fileItem);
            } else if (node.type === 'directory' && node.children) {
                const newPath = path ? `${path}/${node.name}` : node.name;
                node.children.forEach(child => renderFileTree(child, parentEl, newPath));
            }
        }
        
        if (tree.children && tree.children.length > 0) {
            tree.children.forEach(child => renderFileTree(child, fileList));
        } else {
            fileList.innerHTML = '<p style="color: #888;">변경된 파일이 없습니다.</p>';
        }
    } catch (error) {
        console.error('Failed to load files:', error);
        fileList.innerHTML = '<p style="color: red;">파일 로드 실패</p>';
    }
}

async function executePush() {
    if (!selectedPushRepo) {
        alert('레포지토리를 선택하세요!');
        return;
    }
    
    const pushMode = document.querySelector('input[name="push-mode"]:checked');
    if (!pushMode) {
        alert('푸시 방식을 선택하세요!');
        return;
    }
    
    const commitMessage = document.getElementById('push-commit-message').value.trim();
    
    if (!commitMessage) {
        alert('커밋 메시지를 입력하세요!');
        return;
    }
    
    const confirmBtn = document.getElementById('push-confirm-btn');
    const originalText = confirmBtn.textContent;
    
    try {
        confirmBtn.disabled = true;
        confirmBtn.textContent = '푸시 중...';
        
        // Import gitClient
        const { default: gitClient } = await import('./gitClient.js');
        const { clientFS } = await import('./fileSystem.js');
        
        let filesToPush = null;
        
        if (pushMode.value === 'all') {
            filesToPush = null; // null means all files
            console.log('푸시 모드: 전체 파일');
        } else if (pushMode.value === 'select') {
            if (selectedFiles.size === 0) {
                alert('푸시할 파일을 선택하세요!');
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalText;
                return;
            }
            filesToPush = Array.from(selectedFiles);
            console.log('푸시 모드: 선택된 파일', filesToPush);
        } else if (pushMode.value === 'current') {
            const activeTab = document.querySelector('.tab.active');
            if (!activeTab) {
                alert('열린 파일이 없습니다!');
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalText;
                return;
            }
            const currentFile = activeTab.dataset.filePath;
            filesToPush = [currentFile];
            console.log('푸시 모드: 현재 파일', currentFile);
        }
        
        console.log('🚀 GitHub API 푸시 시작:', {
            repo: selectedPushRepo.fullName,
            message: commitMessage,
            files: filesToPush
        });
        
        // Get manual repo info if needed
        let repoOwner, repoName;
        
        if (selectedPushRepo.isManual) {
            repoOwner = document.getElementById('manual-repo-owner')?.value.trim();
            repoName = document.getElementById('manual-repo-name')?.value.trim();
            
            if (!repoOwner || !repoName) {
                alert('GitHub 사용자명과 레포지토리 이름을 입력하세요!');
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalText;
                return;
            }
        } else {
            [repoOwner, repoName] = selectedPushRepo.fullName.split('/');
        }
        
        // Use GitHub API directly
        confirmBtn.textContent = '파일 업로드 중...';
        const filesToWrite = filesToPush || getAllFiles(clientFS);
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const filePath of filesToWrite) {
            const file = clientFS.getFile(filePath);
            if (file && file.content) {
                try {
                    // Use GitHub Contents API
                    const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${githubToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            message: commitMessage,
                            content: btoa(unescape(encodeURIComponent(file.content))),
                            branch: 'main'
                        })
                    });
                    
                    if (response.ok) {
                        successCount++;
                        console.log(`✓ Pushed: ${filePath}`);
                    } else {
                        errorCount++;
                        console.error(`✗ Failed: ${filePath}`, await response.text());
                    }
                } catch (err) {
                    errorCount++;
                    console.error(`✗ Error: ${filePath}`, err);
                }
            }
        }
        
        if (errorCount === 0) {
            alert(`✅ 푸시 성공!\n\n레포지토리: ${repoOwner}/${repoName}\n메시지: ${commitMessage}\n파일: ${successCount}개`);
        } else {
            alert(`⚠️ 푸시 완료\n\n성공: ${successCount}개\n실패: ${errorCount}개\n\n레포지토리: ${repoOwner}/${repoName}`);
        }
        
        // Close modal
        document.getElementById('github-push-modal').style.display = 'none';
        selectedFiles.clear();
        document.getElementById('push-commit-message').value = '';
        
    } catch (error) {
        console.error('❌ Push error:', error);
        alert(`❌ 푸시 실패\n\n에러: ${error.message}\n\n레포지토리: ${selectedPushRepo.fullName}\n\n💡 팁: 레포지토리를 먼저 클론했는지 확인하세요.`);
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    }
}

// Helper function to get all files from clientFS
function getAllFiles(fs) {
    const files = [];
    fs.files.forEach((file, path) => {
        if (file.type === 'file') {
            files.push(path);
        }
    });
    return files;
}

function updateGitHubUI() {
    const authSection = document.getElementById('github-auth-section');
    const reposSection = document.getElementById('github-repos-section');
    
    if (githubToken && githubUser) {
        authSection.style.display = 'none';
        reposSection.style.display = 'block';
        
        // 클론한 레포지토리 목록 표시
        displayClonedRepos();
    } else {
        authSection.style.display = 'block';
        reposSection.style.display = 'none';
    }
}

function displayClonedRepos() {
    const clonedReposList = document.getElementById('cloned-repos-list');
    if (!clonedReposList) return;
    
    const clonedRepos = JSON.parse(localStorage.getItem('clonedRepos') || '[]');
    
    if (clonedRepos.length === 0) {
        clonedReposList.innerHTML = '<p style="color: #888; font-size: 12px; padding: 10px;">클론한 레포지토리가 없습니다.</p>';
        return;
    }
    
    clonedReposList.innerHTML = '';
    clonedRepos.forEach((repo, index) => {
        const repoItem = document.createElement('div');
        repoItem.className = 'cloned-repo-item';
        repoItem.innerHTML = `
            <div class="cloned-repo-info">
                <strong>${repo.fullName}</strong>
                <span>📁 ${repo.path}</span>
                <small>클론: ${new Date(repo.clonedAt).toLocaleString('ko-KR')}</small>
            </div>
            <button class="remove-repo-btn" data-index="${index}" title="목록에서 제거">
                ✕
            </button>
        `;
        
        // 제거 버튼 이벤트
        const removeBtn = repoItem.querySelector('.remove-repo-btn');
        removeBtn.addEventListener('click', () => {
            if (confirm(`${repo.fullName}을(를) 목록에서 제거하시겠습니까?\n(파일은 삭제되지 않습니다)`)) {
                clonedRepos.splice(index, 1);
                localStorage.setItem('clonedRepos', JSON.stringify(clonedRepos));
                displayClonedRepos();
            }
        });
        
        clonedReposList.appendChild(repoItem);
    });
}

async function loadRepositories() {
    const reposList = document.getElementById('github-repos-list');
    reposList.innerHTML = '<p>로딩 중...</p>';
    
    try {
        const repos = await githubGetRepos(githubToken);
        
        reposList.innerHTML = '';
        repos.forEach(repo => {
            const repoItem = document.createElement('div');
            repoItem.className = 'github-repo-item';
            repoItem.innerHTML = `
                <input type="radio" name="repo" value="${repo.full_name}" id="repo-${repo.id}">
                <label for="repo-${repo.id}">
                    <strong>${repo.name}</strong>
                    <span>${repo.description || '설명 없음'}</span>
                    <small>⭐ ${repo.stargazers_count} | 🍴 ${repo.forks_count}</small>
                </label>
            `;
            
            const radio = repoItem.querySelector('input');
            radio.addEventListener('change', () => {
                selectedRepo = repo.full_name;
            });
            
            reposList.appendChild(repoItem);
        });
    } catch (error) {
        console.error('Failed to load repositories:', error);
        reposList.innerHTML = '<p style="color: red;">레포지토리 로드 실패</p>';
    }
}

export function getGitHubToken() {
    return githubToken;
}

export function getGitHubUser() {
    return githubUser;
}
