// public/js/tutorial.js
// First-time user tutorial system

class Tutorial {
  constructor() {
    this.STORAGE_KEY = 'dy_vscode_tutorial_completed';
    this.currentStep = 0;
    this.steps = [
      {
        title: '👋 덕영고등학교 VS Code에 오신 것을 환영합니다!',
        content: `
                    <p>이 웹 IDE는 브라우저에서 바로 코딩할 수 있는 통합 개발 환경입니다.</p>
                    <p>간단한 튜토리얼로 주요 기능을 알아보겠습니다.</p>
                `,
        highlight: null
      },
      {
        title: '📁 파일 탐색기',
        content: `
                    <p><strong>왼쪽 사이드바</strong>에서 파일과 폴더를 관리할 수 있습니다.</p>
                    <ul>
                        <li>새 파일/폴더 생성</li>
                        <li>파일 삭제 및 이름 변경</li>
                        <li>파일 트리 구조 탐색</li>
                    </ul>
                `,
        highlight: '#sidebar'
      },
      {
        title: '✏️ 코드 에디터',
        content: `
                    <p><strong>중앙 영역</strong>이 코드 편집기입니다.</p>
                    <ul>
                        <li>자동 완성 (Ctrl+Space)</li>
                        <li>다중 커서 (Alt+Click)</li>
                        <li>코드 포맷팅 (Shift+Alt+F)</li>
                        <li>Zen 모드 (Ctrl+K Z)</li>
                    </ul>
                `,
        highlight: '#editor-container'
      },
      {
        title: '🖥️ 터미널 & 출력',
        content: `
                    <p><strong>하단 패널</strong>에서 코드를 실행하고 결과를 확인합니다.</p>
                    <ul>
                        <li>터미널: 명령어 실행</li>
                        <li>출력: 프로그램 실행 결과</li>
                        <li>문제: 코드 오류 확인</li>
                    </ul>
                `,
        highlight: '#panel'
      },
      {
        title: '▶️ 코드 실행',
        content: `
                    <p><strong>상단 우측 실행 버튼</strong>으로 코드를 실행하세요.</p>
                    <ul>
                        <li>Python, JavaScript, Java 등 지원</li>
                        <li>브라우저에서 직접 실행</li>
                        <li>HTML 라이브 미리보기</li>
                    </ul>
                `,
        highlight: '#editor-actions'
      },
      {
        title: '🔧 추가 기능',
        content: `
                    <p><strong>왼쪽 Activity Bar</strong>에서 더 많은 기능을 사용하세요:</p>
                    <ul>
                        <li><strong>검색</strong>: 프로젝트 전체 검색</li>
                        <li><strong>소스 제어</strong>: Git 커밋 관리</li>
                        <li><strong>디버그</strong>: 코드 디버깅</li>
                        <li><strong>AI 도우미</strong>: AI 코딩 지원</li>
                        <li><strong>GitHub</strong>: 코드 공유 및 협업</li>
                    </ul>
                `,
        highlight: '#activity-bar'
      },
      {
        title: '🎉 준비 완료!',
        content: `
                    <p>이제 코딩을 시작할 준비가 되었습니다!</p>
                    <p>더 많은 기능은 직접 탐색하면서 발견해보세요.</p>
                    <p><small>※ 이 튜토리얼은 다시 볼 수 없으니 참고하세요.</small></p>
                `,
        highlight: null
      }
    ];
  }

  // Check if user has completed tutorial
  hasCompletedTutorial() {
    return localStorage.getItem(this.STORAGE_KEY) === 'true';
  }

  // Mark tutorial as completed
  markCompleted() {
    localStorage.setItem(this.STORAGE_KEY, 'true');
  }

  // Show tutorial if first time
  showIfFirstTime() {
    if (!this.hasCompletedTutorial()) {
      this.show();
    }
  }

  // Show tutorial
  show() {
    this.currentStep = 0;
    this.createTutorialModal();
    this.renderStep();
  }

  // Create tutorial modal HTML
  createTutorialModal() {
    // Remove existing modal if any
    const existing = document.getElementById('tutorial-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'tutorial-modal';
    modal.className = 'tutorial-modal';
    modal.innerHTML = `
            <div class="tutorial-overlay"></div>
            <div class="tutorial-content">
                <div class="tutorial-header">
                    <h2 id="tutorial-title"></h2>
                    <div class="tutorial-progress">
                        <span id="tutorial-step-indicator"></span>
                    </div>
                </div>
                <div class="tutorial-body" id="tutorial-body">
                </div>
                <div class="tutorial-footer">
                    <button id="tutorial-skip" class="tutorial-btn tutorial-btn-secondary">
                        건너뛰기
                    </button>
                    <div class="tutorial-nav">
                        <button id="tutorial-prev" class="tutorial-btn tutorial-btn-secondary" style="display: none;">
                            이전
                        </button>
                        <button id="tutorial-next" class="tutorial-btn tutorial-btn-primary">
                            다음
                        </button>
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);

    // Event listeners
    document.getElementById('tutorial-skip').addEventListener('click', () => this.skip());
    document.getElementById('tutorial-prev').addEventListener('click', () => this.prev());
    document.getElementById('tutorial-next').addEventListener('click', () => this.next());
  }

  // Render current step
  renderStep() {
    const step = this.steps[this.currentStep];

    // Update content
    document.getElementById('tutorial-title').textContent = step.title;
    document.getElementById('tutorial-body').innerHTML = step.content;
    document.getElementById('tutorial-step-indicator').textContent =
            `${this.currentStep + 1} / ${this.steps.length}`;

    // Update buttons
    const prevBtn = document.getElementById('tutorial-prev');
    const nextBtn = document.getElementById('tutorial-next');

    prevBtn.style.display = this.currentStep > 0 ? 'block' : 'none';
    nextBtn.textContent = this.currentStep === this.steps.length - 1 ? '시작하기' : '다음';

    // Highlight element
    this.removeHighlight();
    if (step.highlight) {
      this.highlightElement(step.highlight);
    }
  }

  // Highlight element
  highlightElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.classList.add('tutorial-highlight');
    }
  }

  // Remove highlight
  removeHighlight() {
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
  }

  // Next step
  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      this.complete();
    }
  }

  // Previous step
  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  }

  // Skip tutorial
  skip() {
    if (confirm('튜토리얼을 건너뛰시겠습니까? 다시 볼 수 없습니다.')) {
      this.complete();
    }
  }

  // Complete tutorial
  complete() {
    this.markCompleted();
    this.removeHighlight();

    const modal = document.getElementById('tutorial-modal');
    if (modal) {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 300);
    }
  }
}

// Export singleton instance
export const tutorial = new Tutorial();
export default tutorial;
