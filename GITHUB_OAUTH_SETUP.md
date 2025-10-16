# GitHub OAuth App 설정 가이드

## 404 에러 해결 방법

GitHub 로그인 시 404 에러가 발생하면 OAuth App의 Callback URL 설정을 확인해야 합니다.

## 설정 방법

### 1. GitHub OAuth App 설정 페이지 접속

https://github.com/settings/developers

### 2. OAuth Apps 선택

왼쪽 메뉴에서 "OAuth Apps" 클릭

### 3. 해당 앱 선택

Client ID가 `Ov23liOXbJBdYDDXCwzF`인 앱 선택

### 4. Authorization callback URL 확인

다음 URL이 정확히 입력되어 있는지 확인:

```
http://localhost:3000/api/github/callback
```

또는 배포된 도메인을 사용하는 경우:

```
https://your-domain.com/api/github/callback
```

### 5. 저장

"Update application" 버튼 클릭

## 현재 설정

- **Client ID**: `Ov23liOXbJBdYDDXCwzF`
- **Callback URL**: `{origin}/api/github/callback`
- **Scope**: `repo,user`

## 문제 해결

### 404 에러가 계속 발생하는 경우

1. **서버가 실행 중인지 확인**
   ```bash
   npm start
   ```

2. **포트 확인**
   - 서버가 3000번 포트에서 실행 중인지 확인
   - `http://localhost:3000`으로 접속 가능한지 확인

3. **Callback URL 확인**
   - GitHub OAuth App 설정에서 정확히 입력되었는지 확인
   - 끝에 슬래시(/)가 없는지 확인

4. **Client Secret 확인**
   - 서버의 환경 변수에 Client Secret이 설정되어 있는지 확인
   - `.env` 파일 또는 환경 변수 확인

## 새 OAuth App 생성 (선택사항)

기존 앱 설정이 복잡하다면 새로 생성:

1. https://github.com/settings/developers
2. "New OAuth App" 클릭
3. 정보 입력:
   - **Application name**: DY VSCode
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/github/callback`
4. "Register application" 클릭
5. Client ID와 Client Secret 복사
6. `github.js`의 `clientId` 업데이트
7. 서버의 환경 변수 업데이트

## 환경 변수 설정

`.env` 파일 생성:

```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
PORT=3000
```

## 테스트

1. 서버 재시작
2. 브라우저에서 `http://localhost:3000` 접속
3. GitHub 아이콘 클릭
4. "Sign in with GitHub" 클릭
5. GitHub 인증 페이지로 이동하는지 확인
6. 인증 후 자동으로 돌아오는지 확인
