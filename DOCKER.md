# 🐳 Docker 격리 환경 가이드

## 개요

각 사용자마다 독립된 **Docker 컨테이너**를 생성하여 완벽하게 격리된 우분투 환경을 제공합니다.

### Docker 모드의 장점:
- ✅ **완벽한 격리** - 각 사용자마다 독립된 우분투 컨테이너
- ✅ **보안** - 다른 사용자 접근 불가능
- ✅ **리소스 제한** - CPU, 메모리 제한 가능
- ✅ **깨끗한 환경** - 세션 종료 시 자동 삭제
- ✅ **패키지 설치 자유** - apt, npm, pip 등 자유롭게 사용

---

## 🚀 사용 방법

### 1. Docker 설치

#### Mac:
```bash
brew install --cask docker
```

#### Ubuntu/Debian:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

#### Windows:
Docker Desktop 설치: https://www.docker.com/products/docker-desktop

### 2. Docker 이미지 빌드

```bash
# 프로젝트 루트에서
docker build -t vscode-user -f Dockerfile.user .
```

### 3. 환경 변수 설정

```bash
# .env 파일 생성
echo "USE_DOCKER=true" > .env
```

또는 Railway 환경 변수에 추가:
```
USE_DOCKER=true
```

### 4. 서버 시작

```bash
npm start
```

---

## 📦 Docker 컨테이너 구조

### 각 사용자 세션마다:
```
vscode-session_xxx
├── /workspace (마운트됨)
│   ├── 사용자 파일들
│   └── 프로젝트 파일들
├── Python 3
├── Node.js
├── npm
└── 기본 개발 도구
```

### 컨테이너 생명주기:
1. **생성** - 사용자가 터미널 열 때
2. **사용** - 터미널 명령어 실행, 코드 실행
3. **삭제** - 세션 종료 시 (30분 타임아웃 또는 수동 종료)

---

## 🔧 고급 설정

### 리소스 제한

`server.js`의 `createUserContainer` 함수 수정:

```javascript
docker run -d \
  --name ${containerName} \
  --rm \
  --cpus="0.5" \              // CPU 제한
  --memory="512m" \           // 메모리 제한
  --pids-limit=100 \          // 프로세스 수 제한
  -w /workspace \
  -v ${PROJECT_ROOT}/${sessionId}:/workspace \
  ubuntu:22.04 \
  tail -f /dev/null
```

### 네트워크 격리

```javascript
docker run -d \
  --name ${containerName} \
  --network none \            // 네트워크 차단
  ...
```

### 추가 패키지 설치

`Dockerfile.user` 수정:

```dockerfile
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    nodejs \
    npm \
    gcc \
    g++ \
    make \
    git \
    # 추가 패키지
    postgresql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*
```

---

## 🎯 일반 모드 vs Docker 모드

| 기능 | 일반 모드 | Docker 모드 |
|------|-----------|-------------|
| **격리** | 디렉토리만 | 완전 격리 ✅ |
| **보안** | 명령어 필터링 | 컨테이너 격리 ✅ |
| **패키지 설치** | 제한적 | 자유롭게 ✅ |
| **리소스 제한** | 없음 | 가능 ✅ |
| **성능** | 빠름 ✅ | 약간 느림 |
| **설정** | 간단 ✅ | Docker 필요 |

---

## 🐛 문제 해결

### Docker가 실행되지 않음
```bash
# Docker 데몬 상태 확인
docker ps

# Docker 시작
sudo systemctl start docker  # Linux
open -a Docker              # Mac
```

### 컨테이너가 남아있음
```bash
# 모든 vscode 컨테이너 정리
docker ps -a | grep vscode | awk '{print $1}' | xargs docker rm -f
```

### 이미지 재빌드
```bash
docker build --no-cache -t vscode-user -f Dockerfile.user .
```

---

## 📊 모니터링

### 실행 중인 컨테이너 확인
```bash
docker ps | grep vscode
```

### 리소스 사용량
```bash
docker stats $(docker ps -q --filter "name=vscode")
```

### 로그 확인
```bash
docker logs vscode-session_xxx
```

---

## 🚀 Railway 배포

Railway에서는 Docker-in-Docker가 제한될 수 있습니다.

### 대안:
1. **일반 모드 사용** (USE_DOCKER=false)
2. **Kubernetes 사용** (고급)
3. **별도 VM 서버** 사용

---

## ✅ 권장 사항

### 개발 환경:
- ✅ Docker 모드 사용
- ✅ 완전한 격리 및 테스트

### 프로덕션:
- ⚠️ Railway: 일반 모드 권장
- ✅ 자체 서버: Docker 모드 권장
- ✅ Kubernetes: 프로덕션 환경에 최적
