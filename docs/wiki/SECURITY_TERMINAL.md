# 🔒 터미널 보안 가이드

## 현재 보안 조치

### 1. 세션 격리
- ✅ 각 사용자마다 고유한 세션 ID
- ✅ 세션별 독립된 작업 디렉토리
- ✅ 환경 변수 격리 (HOME, PWD)

### 2. 명령어 필터링
차단되는 명령어:
```bash
cd ..          # 상위 디렉토리 접근
cd /           # 루트 디렉토리 접근
cd ~           # 홈 디렉토리 접근
rm -rf /       # 시스템 파일 삭제
mkfs           # 파일시스템 포맷
dd if=         # 디스크 덮어쓰기
chmod 777      # 권한 변경
:(){:|:&};:    # Fork bomb
```

### 3. 환경 변수 제한
```javascript
HOME: /tmp/workspace/session_xxx
PWD: /tmp/workspace/session_xxx
OLDPWD: /tmp/workspace/session_xxx
PS1: [ISOLATED] \w $
```

---

## ⚠️ 현재 제한사항

### 우회 가능한 경로:
1. **심볼릭 링크:** `ln -s /etc/passwd link`
2. **절대 경로:** `cat /etc/passwd`
3. **환경 변수:** `cd $HOME/../../`
4. **서브셸:** `bash -c "cd .."`

---

## 🛡️ 추가 보안 권장사항

### 옵션 1: Docker 컨테이너 사용 (가장 안전)

각 세션을 독립된 Docker 컨테이너에서 실행:

```javascript
const { exec } = require('child_process');

// 세션별 Docker 컨테이너 생성
const containerId = `vscode-${sessionId}`;
exec(`docker run -d --name ${containerId} --rm -w /workspace alpine sh`, (err) => {
    if (err) return console.error(err);
    
    // 컨테이너 내부에서 터미널 실행
    const ptyProcess = pty.spawn('docker', ['exec', '-it', containerId, 'sh'], {
        name: 'xterm-color',
        cols: 80,
        rows: 30
    });
});
```

**장점:**
- ✅ 완벽한 격리
- ✅ 리소스 제한 가능
- ✅ 네트워크 격리 가능

**단점:**
- ❌ Docker 설치 필요
- ❌ 리소스 사용량 증가
- ❌ Railway에서 Docker-in-Docker 제한

---

### 옵션 2: chroot 사용 (Linux만 가능)

```javascript
const { spawn } = require('child_process');

// chroot 환경 생성
const chrootDir = path.join(PROJECT_ROOT, sessionId);
exec(`sudo chroot ${chrootDir} /bin/bash`, (err) => {
    // chroot 환경에서 터미널 실행
});
```

**장점:**
- ✅ 파일시스템 격리
- ✅ 가벼움

**단점:**
- ❌ root 권한 필요
- ❌ Railway에서 sudo 불가능

---

### 옵션 3: 명령어 화이트리스트 (현재 적용 가능)

허용된 명령어만 실행:

```javascript
const allowedCommands = ['ls', 'cat', 'echo', 'pwd', 'mkdir', 'touch', 'node', 'python3', 'npm'];

ws.onmessage = msg => {
    const command = msg.data.toString().trim().split(' ')[0];
    
    if (!allowedCommands.includes(command)) {
        ws.send(`\r\n❌ 명령어 '${command}'는 허용되지 않습니다.\r\n`);
        return;
    }
    
    ptyProcess.write(msg.data);
};
```

**장점:**
- ✅ 간단한 구현
- ✅ Railway에서 바로 사용 가능

**단점:**
- ❌ 사용자 경험 제한
- ❌ 우회 가능 (파이프, 서브셸)

---

## 🎯 현재 프로젝트 권장사항

### Railway 환경에서 가능한 최선의 보안:

1. **명령어 필터링 강화** ✅ (현재 적용됨)
2. **절대 경로 접근 차단** (추가 필요)
3. **심볼릭 링크 생성 차단** (추가 필요)
4. **리소스 제한** (CPU, 메모리)
5. **타임아웃 설정** (장시간 실행 방지)

### 추가 구현 예시:

```javascript
// 절대 경로 차단
if (command.match(/\/[a-zA-Z]/)) {
    ws.send(`\r\n❌ 절대 경로 접근이 차단되었습니다.\r\n`);
    return;
}

// 심볼릭 링크 차단
if (command.includes('ln -s')) {
    ws.send(`\r\n❌ 심볼릭 링크 생성이 차단되었습니다.\r\n`);
    return;
}

// 타임아웃 설정
setTimeout(() => {
    ptyProcess.kill();
    ws.send(`\r\n⏱️  세션 타임아웃 (30분)\r\n`);
    ws.close();
}, 30 * 60 * 1000);
```

---

## 📊 보안 레벨 비교

| 방법 | 보안 레벨 | Railway 호환 | 구현 난이도 | 사용자 경험 |
|------|-----------|--------------|-------------|-------------|
| 명령어 필터링 | ⭐⭐ | ✅ | 쉬움 | 보통 |
| chroot | ⭐⭐⭐ | ❌ | 어려움 | 좋음 |
| Docker | ⭐⭐⭐⭐⭐ | ❌ | 어려움 | 좋음 |
| VM | ⭐⭐⭐⭐⭐ | ❌ | 매우 어려움 | 좋음 |

---

## ✅ 결론

**현재 구현된 보안 조치:**
- 세션 격리
- 기본 명령어 필터링
- 환경 변수 제한

**추가 권장 사항:**
- 절대 경로 차단
- 심볼릭 링크 차단
- 세션 타임아웃

**완벽한 보안을 위해서는:**
- Docker 컨테이너 사용 (별도 서버 필요)
- 또는 전용 샌드박스 서비스 사용 (예: CodeSandbox, StackBlitz)
