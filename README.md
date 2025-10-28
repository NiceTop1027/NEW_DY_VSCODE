# 덕영고등학교 VS Code

웹 기반 코드 에디터 - VS Code 스타일의 온라인 개발 환경

## 설치 방법

### 1. Node.js 패키지 설치
```bash
npm install
```

### 2. Python 라이브러리 설치
```bash
npm run setup-python
```

또는 직접 설치:
```bash
pip3 install -r requirements.txt
```

## 지원 언어

- C/C++ (gcc, g++ 필요)
- Python (python3 + 다양한 라이브러리)
- JavaScript/Node.js
- Java (javac 필요)
- Go, Rust, Ruby, PHP 등

## 포함된 Python 라이브러리

- **과학 계산**: numpy, pandas, scipy
- **데이터 시각화**: matplotlib, seaborn, plotly
- **머신러닝**: scikit-learn
- **웹 개발**: flask, requests, beautifulsoup4
- **이미지 처리**: pillow
- **데이터 처리**: openpyxl, xlrd

## 실행 방법

```bash
npm start
```

서버가 http://localhost:3000 에서 실행됩니다.

## 기능

- 파일 탐색기
- 코드 실행 (실시간 입출력 지원)
- GitHub 연동 (Clone, Push)
- 터미널
- 코드 자동완성
- 디버깅

## 문제 해결

### Python 라이브러리가 없다는 오류
```bash
npm run setup-python
```

### C/C++ 컴파일 오류
GCC/G++ 컴파일러가 설치되어 있는지 확인하세요.

## 라이선스

ISC
