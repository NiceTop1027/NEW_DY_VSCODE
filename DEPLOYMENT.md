# 🚀 DY-VSCode 배포 가이드

## 프로젝트 정보
- **이름:** dy-vscode
- **GitHub:** https://github.com/NiceTop1027/DY_VScode.git
- **로고:** 덕영고등학교 공식 로고

## 아키텍처
- **프론트엔드:** Vercel (정적 파일)
- **백엔드:** Railway (Node.js 서버)

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
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
PORT=3000
NODE_ENV=production
```

**⚠️ 중요:** GitHub OAuth 앱 설정에서 실제 Client ID와 Secret을 가져와서 입력하세요.

### 4. 도메인 확인
- Railway가 자동으로 도메인 생성
- 예: `https://dy-vscode.up.railway.app`
- 이 URL을 복사해두세요!

---

## 🌐 2단계: Vercel 배포 (프론트엔드)

### 1. Vercel 가입
1. https://vercel.com 접속
2. GitHub 계정으로 로그인

### 2. 프로젝트 배포
1. **"Add New Project"** 클릭
2. **DY_VScode** 레포지토리 선택
3. 설정:
   - **Framework Preset:** Other
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `public`

### 3. 환경 변수 설정
Vercel 대시보드 → Settings → Environment Variables:
```
NEXT_PUBLIC_API_URL=https://dy-vscode.up.railway.app
```

### 4. 배포 완료
- Vercel이 자동으로 도메인 생성
- 예: `https://dy-vscode.vercel.app`

---

## 🔧 3단계: 설정 업데이트

### 1. config.js 업데이트
`public/config.js` 파일에서:
```javascript
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://dy-vscode.up.railway.app'; // ← Railway URL로 변경
```

### 2. server.js CORS 업데이트
`server.js` 파일에서:
```javascript
const allowedOrigins = [
    'http://localhost:3000',
    'https://dy-vscode.vercel.app', // ← Vercel URL로 변경
    'https://*.vercel.app'
];
```

### 3. GitHub OAuth 콜백 URL 업데이트
GitHub OAuth 앱 설정 (https://github.com/settings/developers):
```
Homepage URL: https://dy-vscode.vercel.app
Authorization callback URL: https://dy-vscode.up.railway.app/api/github/callback
```

### 4. 변경사항 커밋 & 푸시
```bash
git add .
git commit -m "Update deployment URLs"
git push origin main
```

---

## ✅ 배포 확인

1. **Vercel URL 접속:** https://dy-vscode.vercel.app
2. **GitHub 로그인 테스트**
3. **레포지토리 조회 테스트**
4. **파일 편집 테스트**

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
