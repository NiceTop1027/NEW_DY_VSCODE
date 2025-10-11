FROM node:20-bullseye

# Docker 설치
RUN apt-get update && apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce docker-ce-cli containerd.io \
    && rm -rf /var/lib/apt/lists/*

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치 (빌드 도구 포함)
RUN npm ci

# 애플리케이션 파일 복사
COPY . .

# 빌드
RUN npm run build

# production 의존성만 남기기
RUN npm prune --production

# 포트 노출
EXPOSE 3000

# Docker 데몬 시작 및 애플리케이션 실행
CMD dockerd & sleep 5 && USE_DOCKER=true node server.js
