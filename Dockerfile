FROM node:20-bullseye

# Install compilers and development tools
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    gdb \
    python3 \
    python3-pip \
    default-jdk \
    golang-go \
    rustc \
    cargo \
    ruby \
    php \
    perl \
    lua5.3 \
    r-base \
    && rm -rf /var/lib/apt/lists/*

# Install additional language tools
RUN npm install -g typescript ts-node

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

# 환경 변수 설정
ENV NODE_ENV=production
ENV TERM=xterm-256color

# 애플리케이션 실행
CMD ["node", "server.js"]
