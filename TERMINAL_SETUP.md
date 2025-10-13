# 터미널 비밀번호 설정 가이드

## 🔒 보안 중요!

터미널 기능을 사용하려면 **반드시** 환경변수로 비밀번호를 설정해야 합니다.

## Railway 설정 방법

1. **Railway 대시보드 접속**
   - https://railway.app
   - 프로젝트 선택

2. **Variables 탭 클릭**

3. **환경변수 추가**
   ```
   Variable Name: TERMINAL_PASSWORD
   Value: s13w00
   ```

4. **저장 후 재배포**
   - 자동으로 재배포됩니다

## 로컬 개발 환경

1. **.env 파일 생성**
   ```bash
   cp .env.example .env
   ```

2. **.env 파일 수정**
   ```
   TERMINAL_PASSWORD=s13w00
   ```

3. **서버 재시작**
   ```bash
   npm start
   ```

## 비밀번호 변경

Railway Variables에서 `TERMINAL_PASSWORD` 값을 변경하면 됩니다.

## 보안 기능

- ✅ SHA-256 해싱
- ✅ 3회 실패 시 15분 차단
- ✅ IP별 시도 횟수 제한
- ✅ 서버 로그 기록

## 주의사항

⚠️ **절대로** 코드에 비밀번호를 하드코딩하지 마세요!
⚠️ **반드시** 환경변수를 사용하세요!
