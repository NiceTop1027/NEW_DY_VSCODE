// GitHub Integration
import { githubCloneRepo, githubPush, githubGetRepos } from './api.js';

let githubToken = null;
let githubUser = null;
export let selectedRepo = null;

// Setter for selectedRepo
export function setSelectedRepo(repo) {
    selectedRepo = repo;
    console.log('✅ 선택된 레포:', selectedRepo);
}

export function initGitHub() {
    console.log('🔧 initGitHub() 호출됨');
    
    const githubBtn = document.getElementById('github-btn');
    const githubModal = document.getElementById('github-modal');
    const githubLoginBtn = document.getElementById('github-login-btn');
    const githubCloneBtn = document.getElementById('github-clone-btn');
    const githubPushBtn = document.getElementById('github-push-btn');
    
    console.log('🔍 GitHub 버튼 요소 확인:', {
        githubBtn: !!githubBtn,
        githubModal: !!githubModal,
        githubLoginBtn: !!githubLoginBtn
    });
    
    // Load saved token
    const savedToken = localStorage.getItem('githubToken');
    const savedUser = localStorage.getItem('githubUser');
    console.log('💾 localStorage 확인:', {
        hasToken: !!savedToken,
        hasUser: !!savedUser,
        tokenLength: savedToken ? savedToken.length : 0
    });
    
    if (savedToken && savedUser) {
        githubToken = savedToken;
        try {
            githubUser = JSON.parse(savedUser);
            console.log('✅ GitHub 인증 정보 로드됨:', githubUser.login);
        } catch (e) {
            console.error('GitHub 사용자 정보 파싱 실패:', e);
            localStorage.removeItem('githubToken');
            localStorage.removeItem('githubUser');
            githubToken = null;
            githubUser = null;
        }
    } else {
        console.log('⚠️ GitHub 인증 정보 없음');
    }
    
    // GitHub modal will be opened by ui.js activity bar click
    // This function just sets up the modal UI update logic
    console.log('✅ GitHub 모달 초기화 완료 (버튼 클릭은 ui.js에서 처리)');
    
    // Setup sidebar login button
    const sidebarLoginBtn = document.getElementById('github-sidebar-login-btn');
    if (sidebarLoginBtn) {
        sidebarLoginBtn.addEventListener('click', handleGitHubLogin);
    }
    
    // GitHub login (modal)
    if (githubLoginBtn) {
        githubLoginBtn.addEventListener('click', handleGitHubLogin);
    }
    
    // Setup clone and push buttons
    setupGitHubCloneButton();
    setupGitHubPushButton();
    
    // Setup logout button
    const logoutBtn = document.getElementById('github-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('로그아웃하시겠습니까?\n\n다시 로그인하려면 GitHub 인증이 필요합니다.')) {
                localStorage.removeItem('githubToken');
                localStorage.removeItem('githubUser');
                githubToken = null;
                githubUser = null;
                alert('✅ 로그아웃되었습니다.\n\n새 토큰으로 다시 로그인해주세요.');
                window.location.reload();
            }
        });
    }
}

function handleGitHubLogin() {
    const clientId = 'Ov23li22YDn5ymGp9viB'; // GitHub OAuth App Client ID
    const redirectUri = `${window.location.origin}/api/github/callback`;
    const scope = 'repo,user';
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    
    console.log('🔐 GitHub 로그인 시작...');
    console.log('   Client ID:', clientId);
    console.log('   Redirect URI:', redirectUri);
    console.log('   Auth URL:', authUrl);
    
    // Open popup
    const popup = window.open(authUrl, 'GitHub Login', 'width=600,height=700');
    
    if (!popup) {
        alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
        return;
    }
    
    // Check for popup errors
    let errorCheckCount = 0;
    const errorCheck = setInterval(() => {
        errorCheckCount++;
        try {
            if (popup.closed) {
                clearInterval(errorCheck);
                return;
            }
            
            // Try to check popup URL (will fail if cross-origin)
            const popupUrl = popup.location.href;
            if (popupUrl.includes('error')) {
                clearInterval(errorCheck);
                console.error('❌ GitHub 인증 에러 감지:', popupUrl);
                alert('GitHub 인증 중 오류가 발생했습니다.\n\nCallback URL이 올바르게 설정되었는지 확인하세요:\n' + redirectUri);
            }
        } catch (e) {
            // Cross-origin error is expected
        }
        
        if (errorCheckCount > 60) {
            clearInterval(errorCheck);
        }
    }, 1000);
    
    // Listen for message from popup (use named function to avoid duplicates)
    const handleGitHubAuth = (event) => {
        console.log('📨 메시지 수신:', event);
        console.log('📨 메시지 데이터:', event.data);
        console.log('📨 메시지 origin:', event.origin);
        
        if (event.data && event.data.type === 'github-auth') {
            console.log('✅ github-auth 메시지 확인됨');
            
            githubToken = event.data.token;
            githubUser = event.data.user;
            
            // Save to localStorage
            localStorage.setItem('githubToken', githubToken);
            localStorage.setItem('githubUser', JSON.stringify(githubUser));
            
            console.log('✅ GitHub 인증 완료:', githubUser.login);
            console.log('💾 localStorage 저장 완료');
            console.log('📊 현재 상태:', {
                token: !!githubToken,
                user: !!githubUser,
                userLogin: githubUser?.login
            });
            
            // Show success notification
            const notification = document.createElement('div');
            notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #22c55e; color: white; padding: 12px 20px; border-radius: 6px; z-index: 10000; box-shadow: 0 4px 12px rgba(0,0,0,0.3);';
            notification.textContent = `✅ GitHub 인증 완료! (${githubUser.login})`;
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 3000);
                    
                    // Force UI update with delay to ensure DOM is ready
                    console.log('🔄 UI 강제 업데이트 시작...');
                    setTimeout(() => {
                        const authSection = document.getElementById('github-auth-section');
                        const reposSection = document.getElementById('github-repos-section');
                        
                        console.log('🔍 UI 요소 확인:', {
                            authSection: !!authSection,
                            reposSection: !!reposSection,
                            authDisplay: authSection?.style.display,
                            reposDisplay: reposSection?.style.display
                        });
                        
                        if (authSection && reposSection) {
                            // Force hide auth section
                            authSection.style.display = 'none';
                            authSection.style.visibility = 'hidden';
                            
                            // Force show repos section
                            reposSection.style.display = 'block';
                            reposSection.style.visibility = 'visible';
                            
                            console.log('✅ UI 강제 업데이트 완료');
                            console.log('   authSection.display:', authSection.style.display);
                            console.log('   reposSection.display:', reposSection.style.display);
                            
                            // Update user info
                            const userInfo = reposSection.querySelector('.github-user-info');
                            if (userInfo) {
                                userInfo.innerHTML = `
                                    <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(34, 197, 94, 0.1); border-radius: 6px; margin-bottom: 15px;">
                                        ${githubUser.avatar_url ? `<img src="${githubUser.avatar_url}" style="width: 32px; height: 32px; border-radius: 50%;" />` : ''}
                                        <div>
                                            <strong style="color: #22c55e;">${githubUser.login}</strong>
                                            <div style="font-size: 11px; color: #888;">GitHub 연동됨</div>
                                        </div>
                                    </div>
                                `;
                                console.log('✅ 사용자 정보 표시 완료');
                            }
                            
                            // Load repositories
                            console.log('📥 레포지토리 로드 시작...');
                            loadRepositories();
                        } else {
                            console.error('❌ UI 요소를 찾을 수 없음');
                        }
                    }, 100);
                    
                    // Close popup if still open
                    if (popup && !popup.closed) {
                        popup.close();
                    }
                    
                    // Remove event listener after successful auth
                    window.removeEventListener('message', handleGitHubAuth);
                }
            };
            
            // Global callback function for direct call
            window.handleGitHubCallback = handleGitHubAuth;
            
            window.addEventListener('message', handleGitHubAuth);
            
    console.log('👂 메시지 리스너 등록 완료');
    
    // Check if popup was closed without auth
    const checkPopup = setInterval(() => {
        if (popup.closed) {
            clearInterval(checkPopup);
            console.log('🔴 팝업이 닫혔습니다');
            window.removeEventListener('message', handleGitHubAuth);
        }
    }, 1000);
}

// Clone repository with isomorphic-git (moved outside initGitHub)
export function setupGitHubCloneButton() {
    const githubCloneBtn = document.getElementById('github-clone-btn');
    if (githubCloneBtn) {
        githubCloneBtn.addEventListener('click', async () => {
            console.log('🔍 Clone 버튼 클릭됨');
            console.log('   selectedRepo:', selectedRepo);
            
            if (!selectedRepo) {
                alert('레포지토리를 선택하세요\n\n현재 선택된 레포: ' + (selectedRepo || 'null'));
                return;
            }
            
            // Get token from localStorage
            const token = localStorage.getItem('githubToken');
            
            if (!token) {
                alert('❌ GitHub 토큰이 없습니다.\n\n다시 로그인해주세요.');
                return;
            }
            
            try {
                githubCloneBtn.disabled = true;
                githubCloneBtn.innerHTML = '<i class="codicon codicon-loading codicon-modifier-spin"></i> 클론 중...';
                
                const [owner, repo] = selectedRepo.split('/');
                const repoUrl = `https://github.com/${owner}/${repo}`;
                
                console.log('🚀 isomorphic-git 클론 시작:', {
                    url: repoUrl,
                    owner: owner,
                    repo: repo,
                    hasToken: !!token,
                    tokenLength: token.length,
                    tokenPrefix: token.substring(0, 7) + '...'
                });
                
                // Import gitClient
                const { default: gitClient } = await import('./gitClient.js');
                const { clientFS } = await import('./fileSystem.js');
                
                // Clone using isomorphic-git
                console.log('📡 클론 요청 전송 중...');
                await gitClient.clone(repoUrl, token);
                console.log('✓ Repository cloned');
                
                // Load files into clientFS
                githubCloneBtn.innerHTML = '<i class="codicon codicon-loading codicon-modifier-spin"></i> 파일 로드 중...';
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
                
                let errorMsg = '알 수 없는 오류';
                let helpText = '';
                
                if (error.message.includes('401')) {
                    errorMsg = 'GitHub 인증 실패 (401)';
                    helpText = '\n\n💡 해결 방법:\n1. 로그아웃 후 다시 로그인\n2. GitHub에서 새 Personal Access Token 발급\n   - Settings → Developer settings → Personal access tokens\n   - "repo" 권한 필수 체크\n3. 토큰으로 다시 로그인\n\n현재 토큰 길이: ' + token.length + '자';
                } else if (error.message.includes('404')) {
                    errorMsg = '레포지토리를 찾을 수 없음 (404)';
                    helpText = '\n\n레포지토리: ' + selectedRepo + '\n레포지토리가 존재하는지 확인하세요.';
                } else if (error.message.includes('403')) {
                    errorMsg = '접근 권한 없음 (403)';
                    helpText = '\n\n레포지토리가 Private인 경우 토큰에 repo 권한이 필요합니다.';
                } else {
                    errorMsg = error.message;
                    helpText = '\n\n토큰 정보:\n- 길이: ' + token.length + '자\n- 시작: ' + token.substring(0, 7) + '...';
                }
                
                alert(`❌ 클론 실패\n\n에러: ${errorMsg}${helpText}`);
            } finally {
                githubCloneBtn.disabled = false;
                githubCloneBtn.innerHTML = '<i class="codicon codicon-cloud-download"></i> Clone Selected Repository';
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
}

// Setup Push Button
export function setupGitHubPushButton() {
    const githubPushBtn = document.getElementById('github-push-btn');
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
    
    // Check GitHub token
    const githubToken = localStorage.getItem('github_token');
    if (!githubToken) {
        alert('❌ GitHub 토큰이 없습니다!\n\n먼저 GitHub에 로그인하세요.');
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
                        const errorData = await response.json().catch(() => ({}));
                        console.error(`✗ Failed: ${filePath}`, errorData);
                        
                        // Handle specific errors
                        if (response.status === 401) {
                            throw new Error('GitHub 토큰이 유효하지 않습니다. 다시 로그인하세요.');
                        } else if (response.status === 404) {
                            throw new Error(`레포지토리 "${repoOwner}/${repoName}"를 찾을 수 없습니다.`);
                        } else if (response.status === 403) {
                            throw new Error('레포지토리에 쓰기 권한이 없습니다.');
                        }
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
        
        let errorMessage = `❌ 푸시 실패\n\n에러: ${error.message}\n\n`;
        
        if (error.message.includes('토큰')) {
            errorMessage += `💡 해결 방법:\n1. GitHub 버튼 클릭\n2. "로그아웃" 후 다시 로그인\n3. 새 토큰으로 다시 시도`;
        } else if (error.message.includes('찾을 수 없습니다')) {
            errorMessage += `💡 해결 방법:\n1. 레포지토리 이름 확인\n2. 사용자명 확인\n3. 레포지토리가 존재하는지 확인`;
        } else if (error.message.includes('권한')) {
            errorMessage += `💡 해결 방법:\n1. 레포지토리 소유자인지 확인\n2. 협업자로 추가되었는지 확인\n3. 토큰 권한 확인 (repo 스코프 필요)`;
        } else {
            errorMessage += `💡 팁: GitHub 토큰과 레포지토리 정보를 확인하세요.`;
        }
        
        alert(errorMessage);
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
    
    console.log('🔄 updateGitHubUI 호출:', {
        hasToken: !!githubToken,
        hasUser: !!githubUser,
        userLogin: githubUser ? githubUser.login : null,
        authSection: !!authSection,
        reposSection: !!reposSection
    });
    
    if (!authSection || !reposSection) {
        console.error('❌ GitHub UI 요소를 찾을 수 없습니다');
        console.error('   authSection:', authSection);
        console.error('   reposSection:', reposSection);
        return;
    }
    
    if (githubToken && githubUser) {
        console.log('✅ GitHub 로그인 상태 - UI 업데이트');
        console.log('   authSection 숨기기');
        authSection.style.display = 'none';
        console.log('   reposSection 표시');
        reposSection.style.display = 'block';
        
        // 사용자 정보 표시
        const userInfo = reposSection.querySelector('.github-user-info');
        if (userInfo) {
            userInfo.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: rgba(34, 197, 94, 0.1); border-radius: 6px; margin-bottom: 15px;">
                    ${githubUser.avatar_url ? `<img src="${githubUser.avatar_url}" style="width: 32px; height: 32px; border-radius: 50%;" />` : ''}
                    <div>
                        <strong style="color: #22c55e;">${githubUser.login}</strong>
                        <div style="font-size: 11px; color: #888;">GitHub 연동됨</div>
                    </div>
                </div>
            `;
        }
        
        // 클론한 레포지토리 목록 표시
        displayClonedRepos();
    } else {
        console.log('⚠️ GitHub 미로그인 상태 - 로그인 UI 표시');
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
