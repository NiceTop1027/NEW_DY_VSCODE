# 🛠 Tech Stack (기술 스택)

## 1. Frontend (프론트엔드)
*   **Language**: JavaScript (ES6+)
    *   **도입 이유**: React 등의 프레임워크 오버헤드 없이 브라우저의 네이티브 성능을 극대화하여 저사양 기기(크롬북 등)에서도 쾌적하게 구동하기 위함.
*   **Core Engine**: Monaco Editor
    *   **도입 이유**: 현업 표준인 **VS Code**와 100% 동일한 편집 경험(단축키, 미니맵, 인텔리센스)을 제공하여 학생들의 도구 적응 비용을 최소화.
*   **Terminal**: Xterm.js
    *   **도입 이유**: 단순 텍스트 입력창이 아닌, ANSI 컬러와 커서 제어가 완벽히 지원되는 실제 터미널 환경 구현.

## 2. Backend & Runtime (백엔드 및 실행 환경)
*   **Server**: Node.js & Express
    *   **도입 이유**: WebSocket을 통한 실시간 터미널 통신 구현에 최적화되어 있으며, 가벼운 리소스로 높은 동시 접속 처리가 가능.
*   **Sandbox**: Docker Containers
    *   **도입 이유**: 사용자 코드를 서버에서 직접 실행하면 보안 위험이 큼. 사용자별로 독립된 **Docker 컨테이너**를 할당하여, 시스템을 파괴하는 코드(예: `rm -rf /`)를 실행해도 본 서버에는 영향이 없도록 격리.
*   **WebAssembly (Helper)**: Pyodide / QuickJS
    *   **도입 이유**: 간단한 코드는 서버 통신 없이 브라우저 자체(Client-side)에서 즉시 실행하여 서버 비용 절감 및 응답 속도 향상.

## 3. Data & Auth (데이터 및 인증)
*   **Code Storage**: Server File System + GitHub
    *   **도입 이유**: 복잡한 DB 스키마 설계 없이, 실제 개발 환경과 똑같이 **파일 시스템** 구조로 데이터를 저장. 영구 보관은 **GitHub 연동**을 통해 해결하여 별도 데이터베이스 비용 '0원' 달성.
*   **Authentication**: GitHub OAuth
    *   **도입 이유**: 별도의 회원가입 절차 없이, 개발자들의 필수 계정인 GitHub 계정 하나로 로그인부터 코드 저장까지 원스톱 처리.

## 4. DevOps (배포 및 운영)
*   **Cloud**: Railway
    *   **도입 이유**: Dockerfile 기반의 배포를 손쉽게 지원하며, 학생 프로젝트 규모에 맞는 합리적인 비용 구조.
*   **Bundler**: Webpack
    *   **도입 이유**: Monaco Editor의 무거운 리소스(언어별 워커 등)를 효율적으로 분할 로딩(Code Splitting)하여 초기 로딩 속도 최적화.
