# 🚀 DY-VSCode 배포 가이드

## 프로젝트 정보
- **이름:** dy-vscode
- **GitHub:** https://github.com/NiceTop1027/DY_VScode.git
- **로고:** 덕영고등학교 공식 로고
- **도메인:** https://vscode.dyhs.kr

## 아키텍처
- **호스팅:** Railway (프론트엔드 + 백엔드 통합)
- **프론트엔드:** 정적 파일 (`/public`)
- **백엔드:** Node.js + Express + WebSocket

---

## 📦 1단계: Railway 배포 (백엔드)

### 1. Railway 가입
1. https://railway.app 접속
2. GitHub 계정으로 로그인
3. 무료 $5 크레딧 받기

### 2. 프로젝트 배포
1. **"New Project"** 클릭
2. **"Deploy from GitHub repo"** 선택
3. **DY_VScode** 레포지토리 선택
4. 자동 배포 시작

### 3. 환경 변수 설정
Railway 대시보드 → Variables 탭:
```
GITHUB_CLIENT_ID=Ov23li22YDn5ymGp9viB
GITHUB_CLIENT_SECRET=15bdfaf3122ea963c11660dd6555f7ca2161d79e
PORT=3000
NODE_ENV=production
```

### 4. 도메인 확인
- Railway가 자동으로 도메인 생성
- **실제 도메인:** `https://web-production-87bbd.up.railway.app`
- 이 URL을 복사해두세요!

---

## 🔧 2단계: 도메인 연결

### Railway 커스텀 도메인 설정
1. Railway 대시보드 → 프로젝트 선택
2. **Settings** → **Domains**
3. **Custom Domain** 추가: `vscode.dyhs.kr`
4. DNS 설정 (도메인 제공업체):
   ```
   Type: CNAME
   Name: vscode
   Value: web-production-87bbd.up.railway.app
   ```

---

## 🔐 3단계: GitHub OAuth 설정

### GitHub OAuth 콜백 URL 업데이트
GitHub OAuth 앱 설정 (https://github.com/settings/developers):
```
Homepage URL: https://vscode.dyhs.kr
Authorization callback URL: https://vscode.dyhs.kr/api/github/callback
```

---

## ✅ 배포 확인

1. **URL 접속:** https://vscode.dyhs.kr
2. **파일 탐색기:** 파일 트리 표시 확인
3. **터미널:** WebSocket 연결 확인
4. **GitHub 로그인:** OAuth 인증 테스트
5. **레포지토리 관리:** 생성/삭제/열기 테스트

---

## 🐛 문제 해결

### Railway 로그 확인
```bash
railway logs
```

### Vercel 로그 확인
Vercel 대시보드 → Deployments → 최신 배포 → Logs

### CORS 에러
- `server.js`의 `allowedOrigins`에 Vercel URL 추가 확인
- Railway 재배포

### GitHub OAuth 에러
- GitHub OAuth 앱의 콜백 URL 확인
- Railway URL이 정확한지 확인

---

## 💰 비용

- **Vercel:** 무료 (개인 프로젝트)
- **Railway:** $5 무료 크레딧/월
- **총:** 무료 (크레딧 범위 내)

---

## 🔄 자동 배포

- GitHub에 푸시하면 자동으로 배포됨
- Vercel: 프론트엔드 자동 빌드
- Railway: 백엔드 자동 재시작
