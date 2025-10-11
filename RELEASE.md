# 📦 Release 가이드

## 설치 파일 빌드

### 모든 플랫폼 빌드:
```bash
npm run dist -- --mac --win --linux
```

### 개별 플랫폼:
```bash
# Mac만
npm run dist -- --mac

# Windows만
npm run dist -- --win

# Linux만
npm run dist -- --linux
```

---

## 📁 빌드된 파일 위치

빌드 완료 후 `dist/` 폴더에 생성됩니다:

### Mac:
- `dist/덕영고등학교 VS Code-1.0.0.dmg` - DMG 설치 파일
- `dist/덕영고등학교 VS Code-1.0.0-mac.zip` - ZIP 압축 파일

### Windows:
- `dist/덕영고등학교 VS Code Setup 1.0.0.exe` - 설치 프로그램
- `dist/덕영고등학교 VS Code-1.0.0-win.zip` - ZIP 압축 파일

### Linux:
- `dist/덕영고등학교 VS Code-1.0.0.AppImage` - AppImage 파일
- `dist/덕영고등학교-vs-code_1.0.0_amd64.deb` - Debian/Ubuntu
- `dist/덕영고등학교-vs-code-1.0.0.x86_64.rpm` - RedHat/Fedora

---

## 🚀 GitHub Release 생성

### 1. Git 태그 생성:
```bash
git tag -a v1.0.0 -m "Release v1.0.0 - 덕영고등학교 VS Code"
git push origin v1.0.0
```

### 2. GitHub에서 Release 생성:
1. https://github.com/NiceTop1027/DY_VScode/releases/new
2. **Tag:** v1.0.0 선택
3. **Title:** 덕영고등학교 VS Code v1.0.0
4. **Description:** 릴리스 노트 작성
5. **Attach files:** `dist/` 폴더의 설치 파일 업로드

### 3. 업로드할 파일:
- ✅ Mac: `.dmg` 파일
- ✅ Windows: `.exe` 파일
- ✅ Linux: `.AppImage` 파일

---

## 📝 릴리스 노트 템플릿

```markdown
# 🎉 덕영고등학교 VS Code v1.0.0

## ✨ 주요 기능

- 🖥️ **데스크톱 앱** - Mac, Windows, Linux 지원
- 💻 **실제 로컬 터미널** - 내 컴퓨터의 터미널 사용
- 📁 **파일 시스템 완전 접근** - 제한 없는 파일 관리
- 🎨 **VS Code 스타일 UI** - 익숙한 인터페이스
- 🔐 **보안** - 세션 격리 및 명령어 필터링

## 📦 설치 방법

### Mac
1. `.dmg` 파일 다운로드
2. 파일 열기
3. 앱을 Applications 폴더로 드래그

### Windows
1. `.exe` 파일 다운로드
2. 실행하여 설치

### Linux
1. `.AppImage` 파일 다운로드
2. 실행 권한 부여: `chmod +x *.AppImage`
3. 실행

## 🌐 웹 버전

설치 없이 바로 사용: https://vscode.dyhs.kr

## 🐛 버그 수정

- ✅ 터미널 개행 버그 수정
- ✅ 터미널 리사이즈 자동 조정
- ✅ WebSocket 보안 연결 (WSS)

## 📚 문서

- [배포 가이드](DEPLOYMENT.md)
- [보안 가이드](SECURITY_TERMINAL.md)
- [저장소 설정](STORAGE.md)
```

---

## 🔄 자동 Release (GitHub Actions)

`.github/workflows/release.yml` 생성:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Build Electron app
        run: npm run dist
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-build
          path: dist/*
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: dist/*
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
