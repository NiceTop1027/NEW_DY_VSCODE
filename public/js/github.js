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
    
    // Clone repository
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
                const result = await githubCloneRepo(owner, repo, githubToken);
                
                // 클론한 레포지토리 정보 저장
                const clonedRepos = JSON.parse(localStorage.getItem('clonedRepos') || '[]');
                if (!clonedRepos.find(r => r.fullName === selectedRepo)) {
                    clonedRepos.push({
                        fullName: selectedRepo,
                        owner,
                        repo,
                        path: result.path,
                        clonedAt: new Date().toISOString()
                    });
                    localStorage.setItem('clonedRepos', JSON.stringify(clonedRepos));
                }
                
                alert(`✅ ${selectedRepo} 클론 완료!\n경로: ${result.path}`);
                githubModal.style.display = 'none';
                
                // Refresh file tree
                window.location.reload();
            } catch (error) {
                console.error('Clone error:', error);
                alert(`❌ 클론 실패: ${error.message}`);
            } finally {
                githubCloneBtn.disabled = false;
                githubCloneBtn.textContent = '선택한 레포 클론';
            }
        });
    }
    
    // Push changes
    if (githubPushBtn) {
        githubPushBtn.addEventListener('click', async () => {
            // 클론한 레포지토리 목록 가져오기
            const clonedRepos = JSON.parse(localStorage.getItem('clonedRepos') || '[]');
            
            if (clonedRepos.length === 0) {
                alert('먼저 레포지토리를 클론하세요!');
                return;
            }
            
            // 레포지토리 선택 다이얼로그
            let repoOptions = '클론한 레포지토리:\n\n';
            clonedRepos.forEach((repo, index) => {
                repoOptions += `${index + 1}. ${repo.fullName} (${repo.path})\n`;
            });
            repoOptions += '\n푸시할 레포지토리 번호를 입력하세요:';
            
            const repoIndex = prompt(repoOptions);
            if (!repoIndex) return;
            
            const selectedRepoIndex = parseInt(repoIndex) - 1;
            if (selectedRepoIndex < 0 || selectedRepoIndex >= clonedRepos.length) {
                alert('잘못된 번호입니다.');
                return;
            }
            
            const selectedRepoInfo = clonedRepos[selectedRepoIndex];
            const repoPath = selectedRepoInfo.path;
            
            const message = prompt('커밋 메시지를 입력하세요:', 'Update from web IDE');
            if (!message) return;
            
            try {
                githubPushBtn.disabled = true;
                githubPushBtn.textContent = '푸시 중...';
                
                const result = await githubPush(repoPath, message, githubToken);
                
                alert(`✅ ${selectedRepoInfo.fullName}\n${result.message}`);
            } catch (error) {
                console.error('Push error:', error);
                alert(`❌ 푸시 실패: ${error.message}`);
            } finally {
                githubPushBtn.disabled = false;
                githubPushBtn.textContent = '변경사항 푸시';
            }
        });
    }
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
