# 🔒 보안 가이드

## ⚠️ 중요: 민감한 정보 관리

### GitHub에 절대 올리면 안 되는 것들:

1. **GitHub OAuth Credentials**
   - ❌ Client Secret
   - ✅ Client ID (공개 가능)

2. **API Keys & Tokens**
   - ❌ 모든 API Secret Keys
   - ❌ Access Tokens
   - ❌ Private Keys

3. **환경 변수**
   - ❌ `.env` 파일
   - ✅ `.env.example` (예시 파일만)

---

## 🛡️ 올바른 보안 관리

### 1. 환경 변수 사용

**로컬 개발:**
```bash
# .env 파일 생성 (절대 Git에 커밋하지 말 것!)
GITHUB_CLIENT_ID=your_actual_client_id
GITHUB_CLIENT_SECRET=your_actual_client_secret
```

**서버 코드:**
```javascript
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
```

### 2. .gitignore 설정

```
node_modules
.env
.env.local
.env.production
*.log
```

### 3. 배포 환경 설정

**Railway:**
- Dashboard → Variables 탭에서 환경 변수 설정
- 절대 코드에 하드코딩하지 말 것

**Vercel:**
- Settings → Environment Variables에서 설정

---

## 🚨 만약 Secret이 노출되었다면?

### 즉시 해야 할 일:

1. **GitHub OAuth App 재생성**
   - https://github.com/settings/developers
   - 기존 앱 삭제
   - 새 앱 생성
   - 새 Client Secret 발급

2. **Git 히스토리에서 제거**
   ```bash
   # 민감한 정보가 포함된 커밋 제거
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch server.js" \
     --prune-empty --tag-name-filter cat -- --all
   
   # 강제 푸시
   git push origin --force --all
   ```

3. **환경 변수로 마이그레이션**
   - 코드에서 하드코딩된 값 제거
   - 환경 변수로 변경
   - Railway/Vercel에 새 값 설정

---

## ✅ 보안 체크리스트

배포 전 확인:
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는가?
- [ ] 코드에 하드코딩된 Secret이 없는가?
- [ ] 환경 변수를 올바르게 사용하고 있는가?
- [ ] `.env.example`에는 실제 값이 없는가?
- [ ] Railway/Vercel에 환경 변수를 설정했는가?

---

## 📚 참고 자료

- [GitHub OAuth Best Practices](https://docs.github.com/en/developers/apps/building-oauth-apps/best-practices-for-oauth-apps)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
