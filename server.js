const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const expressWs = require('express-ws');
const pty = require('node-pty');
const axios = require('axios');
const multer = require('multer');
const { exec, spawn } = require('child_process'); 
const inspector = require('inspector'); 

const app = express();
const port = process.env.PORT || 3000;

// CORS 설정 (Railway serves both frontend and backend)
app.use((req, res, next) => {
    const allowedOrigins = [
        'http://localhost:3000',
        'https://vscode.dyhs.kr',
        'https://web-production-87bbd.up.railway.app'
    ];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

expressWs(app); // app에 WebSocket 기능 추가

// Define the project root directory (for security, restrict to a specific folder)
// Use Railway Volume if available, otherwise /tmp
const PROJECT_ROOT = process.env.RAILWAY_VOLUME_MOUNT_PATH 
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'workspace')
    : (process.env.NODE_ENV === 'production' ? '/tmp/workspace' : path.resolve(__dirname, './'));

// Ensure workspace directory exists
if (!fsSync.existsSync(PROJECT_ROOT)) {
    fsSync.mkdirSync(PROJECT_ROOT, { recursive: true });
    console.log(`✅ Workspace directory created: ${PROJECT_ROOT}`);
}

// Multer setup for file uploads
const upload = multer({ dest: path.join(PROJECT_ROOT, 'uploads/') });

// Serve static files from the 'public' directory
app.use(express.static('public'));
app.use(express.json()); // JSON 요청 본문을 파싱하기 위한 미들웨어 추가

// Helper function to validate file paths
function isValidPath(filePath) {
    const absolutePath = path.resolve(PROJECT_ROOT, filePath);
    return absolutePath.startsWith(PROJECT_ROOT);
}

// Helper function to get directory structure
async function getDirectoryStructure(dirPath) {
    const name = path.basename(dirPath);
    const stats = await fs.stat(dirPath);

    if (stats.isFile()) {
        return { name, type: 'file', path: path.relative(PROJECT_ROOT, dirPath) };
    } else if (stats.isDirectory()) {
        const childrenNames = await fs.readdir(dirPath);
        const children = await Promise.all(
            childrenNames.map(async childName => {
                const childPath = path.join(dirPath, childName);
                // Ignore node_modules and .git for cleaner explorer
                if (childName === 'node_modules' || childName === '.git' || childName === 'uploads') { // 'uploads' 폴더도 무시
                    return null;
                }
                try {
                    const childStats = await fs.stat(childPath);
                    return getDirectoryStructure(childPath);
                } catch (error) {
                    // If stat fails (e.g., permission denied), ignore this child
                    console.warn(`Could not stat ${childPath}: ${error.message}`);
                    return null;
                }
            })
        );
        return { name, type: 'directory', path: path.relative(PROJECT_ROOT, dirPath), children: children.filter(Boolean) };
    }
    return null;
}

// A simple API endpoint to get the file explorer structure
app.get('/api/files', async (req, res) => {
    try {
        const structure = await getDirectoryStructure(PROJECT_ROOT);
        res.json(structure);
    } catch (error) {
        console.error('Error reading directory structure:', error);
        if (error.code === 'ENOENT') { // No such file or directory
            res.status(404).json({ error: 'Project directory not found', details: error.message });
        } else if (error.code === 'EACCES') { // Permission denied
            res.status(403).json({ error: 'Permission denied to access project directory', details: error.message });
        } else {
            res.status(500).json({ error: 'Failed to read directory structure', details: error.message });
        }
    }
});

app.get('/api/file-content', async (req, res) => {
    const relativeFilePath = req.query.path;
    if (!relativeFilePath) {
        return res.status(400).send({ error: 'File path is required' });
    }
    if (!isValidPath(relativeFilePath)) { // 경로 유효성 검사
        return res.status(403).json({ error: 'Access denied: Invalid file path' });
    }

    const absoluteFilePath = path.join(PROJECT_ROOT, relativeFilePath);

    try {
        const content = await fs.readFile(absoluteFilePath, 'utf8');
        res.json({ path: relativeFilePath, content: content });
    } catch (error) {
        console.error('Error reading file content:', absoluteFilePath, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'File not found', details: error.message });
        } else if (error.code === 'EACCES') {
            res.status(403).json({ error: 'Permission denied to read file', details: error.message });
        } else {
            res.status(500).json({ error: 'Failed to read file content', details: error.message });
        }
    }
});

app.post('/api/save-file', async (req, res) => {
    const { path: relativeFilePath, content } = req.body;
    if (!relativeFilePath || content === undefined) {
        return res.status(400).send({ error: 'File path and content are required' });
    }
    if (!isValidPath(relativeFilePath)) { // 경로 유효성 검사
        return res.status(403).json({ error: 'Access denied: Invalid file path' });
    }

    const absoluteFilePath = path.join(PROJECT_ROOT, relativeFilePath);

    try {
        // 상위 디렉토리가 없으면 생성
        const dir = path.dirname(absoluteFilePath);
        if (!fsSync.existsSync(dir)) {
            await fs.mkdir(dir, { recursive: true });
        }
        
        await fs.writeFile(absoluteFilePath, content, 'utf8');
        res.json({ success: true, message: 'File saved successfully' });
    } catch (error) {
        console.error('Error saving file:', absoluteFilePath, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Target directory or file not found', details: error.message });
        } else if (error.code === 'EACCES') {
            res.status(403).json({ error: 'Permission denied to write file', details: error.message });
        } else {
            res.status(500).json({ error: 'Failed to save file', details: error.message });
        }
    }
});

// Delete file or directory
app.get('/api/delete', (req, res) => {
    res.status(405).json({ error: 'Method Not Allowed. Use DELETE method to delete files.' });
});

app.delete('/api/delete', async (req, res) => {
    console.log('DELETE /api/delete - Body:', req.body);
    const { path: relativeFilePath } = req.body;
    if (!relativeFilePath) {
        console.error('No path provided in request body');
        return res.status(400).json({ error: 'File path is required' });
    }
    if (!isValidPath(relativeFilePath)) {
        return res.status(403).json({ error: 'Access denied: Invalid file path' });
    }

    const absoluteFilePath = path.join(PROJECT_ROOT, relativeFilePath);
    console.log('Attempting to delete:', absoluteFilePath);

    try {
        const stats = await fs.stat(absoluteFilePath);
        if (stats.isDirectory()) {
            await fs.remove(absoluteFilePath); // Remove directory and all contents
            console.log('Directory deleted successfully');
        } else {
            await fs.unlink(absoluteFilePath); // Remove file
            console.log('File deleted successfully');
        }
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        console.error('Error deleting:', absoluteFilePath, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'File or directory not found', details: error.message });
        } else if (error.code === 'EACCES') {
            res.status(403).json({ error: 'Permission denied', details: error.message });
        } else {
            res.status(500).json({ error: 'Failed to delete', details: error.message });
        }
    }
});

// Rename file or directory
app.post('/api/rename', async (req, res) => {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
        return res.status(400).json({ error: 'Both old and new paths are required' });
    }
    if (!isValidPath(oldPath) || !isValidPath(newPath)) {
        return res.status(403).json({ error: 'Access denied: Invalid file path' });
    }

    const absoluteOldPath = path.join(PROJECT_ROOT, oldPath);
    const absoluteNewPath = path.join(PROJECT_ROOT, newPath);

    try {
        await fs.rename(absoluteOldPath, absoluteNewPath);
        res.json({ success: true, message: 'Renamed successfully' });
    } catch (error) {
        console.error('Error renaming:', absoluteOldPath, error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'File or directory not found', details: error.message });
        } else if (error.code === 'EACCES') {
            res.status(403).json({ error: 'Permission denied', details: error.message });
        } else {
            res.status(500).json({ error: 'Failed to rename', details: error.message });
        }
    }
});

// Create new file
app.post('/api/create-file', async (req, res) => {
    const { path: relativeFilePath } = req.body;
    if (!relativeFilePath) {
        return res.status(400).json({ error: 'File path is required' });
    }
    if (!isValidPath(relativeFilePath)) {
        return res.status(403).json({ error: 'Access denied: Invalid file path' });
    }

    const absoluteFilePath = path.join(PROJECT_ROOT, relativeFilePath);

    try {
        await fs.ensureFile(absoluteFilePath); // Create file and parent directories if needed
        res.json({ success: true, message: 'File created successfully' });
    } catch (error) {
        console.error('Error creating file:', absoluteFilePath, error);
        res.status(500).json({ error: 'Failed to create file', details: error.message });
    }
});

// Create new directory
app.post('/api/create-directory', async (req, res) => {
    const { path: relativeDirPath } = req.body;
    if (!relativeDirPath) {
        return res.status(400).json({ error: 'Directory path is required' });
    }
    if (!isValidPath(relativeDirPath)) {
        return res.status(403).json({ error: 'Access denied: Invalid directory path' });
    }

    const absoluteDirPath = path.join(PROJECT_ROOT, relativeDirPath);

    try {
        await fs.ensureDir(absoluteDirPath);
        res.json({ success: true, message: 'Directory created successfully' });
    } catch (error) {
        console.error('Error creating directory:', absoluteDirPath, error);
        res.status(500).json({ error: 'Failed to create directory', details: error.message });
    }
});

app.post('/api/upload-file', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const tempPath = req.file.path;
    const targetPath = path.join(PROJECT_ROOT, req.file.originalname);

    if (!isValidPath(req.file.originalname)) { // 업로드 파일 경로 유효성 검사
        await fs.remove(tempPath); // 임시 파일 삭제
        return res.status(403).json({ error: 'Access denied: Invalid upload path' });
    }

    try {
        // Ensure the target directory exists
        await fs.ensureDir(path.dirname(targetPath));
        await fs.move(tempPath, targetPath, { overwrite: true });
        res.json({ success: true, message: 'File uploaded successfully', filePath: req.file.originalname });
    } catch (error) {
        console.error('Error uploading file:', error);
        if (error.code === 'EACCES') {
            res.status(403).json({ error: 'Permission denied to upload file', details: error.message });
        } else {
            res.status(500).json({ error: 'Failed to upload file', details: error.message });
        }
    }
});

// Session-based terminal management
const terminalSessions = new Map();
const dockerContainers = new Map(); // 세션별 Docker 컨테이너 관리

// Generate unique session ID
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Docker 컨테이너 생성 함수
async function createUserContainer(sessionId) {
    return new Promise((resolve, reject) => {
        const containerName = `vscode-${sessionId}`;
        
        // Docker 컨테이너 생성 및 시작
        exec(`docker run -d --name ${containerName} --rm -w /workspace -v ${PROJECT_ROOT}/${sessionId}:/workspace ubuntu:22.04 tail -f /dev/null`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Docker 컨테이너 생성 실패: ${error}`);
                reject(error);
                return;
            }
            
            const containerId = stdout.trim();
            console.log(`✅ Docker 컨테이너 생성됨: ${containerName} (${containerId})`);
            
            // 기본 패키지 설치
            exec(`docker exec ${containerName} apt-get update && docker exec ${containerName} apt-get install -y python3 nodejs npm`, (err) => {
                if (err) console.warn('패키지 설치 경고:', err);
            });
            
            resolve({ containerName, containerId });
        });
    });
}

// WebSocket endpoint for terminal
app.ws('/terminal', async (ws, req) => {
    const sessionId = req.query.sessionId || generateSessionId();
    let useDocker = process.env.USE_DOCKER === 'true'; // 환경 변수로 Docker 사용 여부 결정
    
    // Create user-specific workspace directory
    const userWorkspace = path.join(PROJECT_ROOT, sessionId);
    if (!fsSync.existsSync(userWorkspace)) {
        fsSync.mkdirSync(userWorkspace, { recursive: true });
    }
    
    let ptyProcess;
    let containerName;
    
    if (useDocker) {
        // 🐳 Docker 모드: 컨테이너 내부에서 터미널 실행
        try {
            const container = await createUserContainer(sessionId);
            containerName = container.containerName;
            dockerContainers.set(sessionId, container);
            
            // Docker 컨테이너 내부에서 bash 실행 (탈출 방지)
            ptyProcess = pty.spawn('docker', ['exec', '-it', containerName, 'bash', '--noprofile', '--norc'], {
                name: 'xterm-color',
                cols: 80,
                rows: 30,
                env: {
                    TERM: 'xterm-color',
                    PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
                    HOME: '/workspace',
                    PWD: '/workspace'
                }
            });
            
            ws.send(`\r\n\x1b[1;32m🐳 Docker 컨테이너 환경\x1b[0m\r\n`);
            ws.send(`컨테이너: ${containerName}\r\n`);
            ws.send(`완전히 격리된 우분투 환경입니다.\r\n\r\n`);
            
        } catch (error) {
            ws.send(`\r\n\x1b[1;31m❌ Docker 컨테이너 생성 실패\x1b[0m\r\n`);
            ws.send(`일반 모드로 전환합니다...\r\n\r\n`);
            useDocker = false;
        }
    }
    
    if (!useDocker) {
        // 격리 모드: 제한된 가상 터미널 (실제 셸 접근 차단)
        ws.send('\r\n\x1b[1;33m⚠️  격리 모드\x1b[0m\r\n');
        ws.send('Docker가 없어 실제 터미널을 사용할 수 없습니다.\r\n');
        ws.send('코드 실행은 "실행" 버튼을 사용하세요.\r\n\r\n');
        ws.send('\x1b[1;31m터미널 접근이 차단되었습니다.\x1b[0m\r\n');
        ws.send('보안상의 이유로 서버 터미널에 직접 접근할 수 없습니다.\r\n\r\n');
        
        // 터미널 대신 메시지만 표시
        ws.onmessage = () => {
            ws.send('\r\n\x1b[1;31m❌ 터미널 사용 불가\x1b[0m\r\n');
            ws.send('Docker 환경이 필요합니다.\r\n');
        };
        
        return; // 실제 pty 생성하지 않음
    }

    // 세션 정보 저장 (타임아웃 없음 - 웹 나가면 자동 삭제)
    terminalSessions.set(sessionId, {
        ptyProcess,
        userWorkspace,
        sessionId
    });
    
    console.log(`Terminal WebSocket connected. Session: ${sessionId}`);
    
    // Send session ID and warning to client
    ws.send(JSON.stringify({ type: 'session', sessionId }));
    
    // 보안 경고 메시지
    const warningMessage = `\r\n\x1b[1;33m⚠️  보안 격리 모드\x1b[0m\r\n` +
                          `작업 디렉토리: ${userWorkspace}\r\n` +
                          `상위 디렉토리 접근이 제한됩니다.\r\n\r\n`;
    ws.send(warningMessage);

    // 데이터 버퍼링 및 중복 제거
    let lastData = '';
    let dataBuffer = '';
    let bufferTimeout = null;
    
    ptyProcess.onData(data => {
        // 중복된 개행 문자 제거
        if (data === '\r\n' && lastData === '\r\n') {
            return; // 연속된 개행 무시
        }
        
        lastData = data;
        ws.send(data);
    });

    ws.onmessage = msg => {
        try {
            const data = JSON.parse(msg.data);
            if (data.type === 'resize') {
                ptyProcess.resize(data.cols, data.rows);
            } else {
                // 보안: 위험한 명령어 필터링
                const command = msg.data.toString().trim();
                
                // 상위 디렉토리 접근 시도 감지
                if (command.includes('cd ..') || command.includes('cd /') || 
                    command.includes('cd ~') || command.match(/cd\s+\.\./)) {
                    const warning = `\r\n\x1b[1;31m❌ 보안: 상위 디렉토리 접근이 제한됩니다.\x1b[0m\r\n`;
                    ws.send(warning);
                    ws.send(`${restrictedEnv.PS1}`);
                    return;
                }
                
                // 절대 경로 접근 차단
                if (command.match(/\/[a-zA-Z]/)) {
                    const warning = `\r\n\x1b[1;31m❌ 보안: 절대 경로 접근이 차단되었습니다.\x1b[0m\r\n`;
                    ws.send(warning);
                    ws.send(`${restrictedEnv.PS1}`);
                    return;
                }
                
                // 심볼릭 링크 생성 차단
                if (command.includes('ln -s') || command.includes('ln -sf')) {
                    const warning = `\r\n\x1b[1;31m❌ 보안: 심볼릭 링크 생성이 차단되었습니다.\x1b[0m\r\n`;
                    ws.send(warning);
                    ws.send(`${restrictedEnv.PS1}`);
                    return;
                }
                
                // 위험한 시스템 명령어 차단
                const dangerousCommands = [
                    'rm -rf /', 'mkfs', 'dd if=', 'chmod 777', ':(){:|:&};:',
                    'sudo', 'su -', 'chroot', 'mount', 'umount'
                ];
                if (dangerousCommands.some(cmd => command.includes(cmd))) {
                    const warning = `\r\n\x1b[1;31m❌ 보안: 위험한 명령어가 차단되었습니다.\x1b[0m\r\n`;
                    ws.send(warning);
                    ws.send(`${restrictedEnv.PS1}`);
                    return;
                }
                
                ptyProcess.write(msg.data);
            }
        } catch (e) {
            ptyProcess.write(msg.data);
        }
    };

    ws.onclose = () => {
        const session = terminalSessions.get(sessionId);
        if (session) {
            session.ptyProcess.kill();
            terminalSessions.delete(sessionId);
        }
        
        // Docker 컨테이너 정리
        const container = dockerContainers.get(sessionId);
        if (container) {
            exec(`docker stop ${container.containerName}`, (error) => {
                if (error) {
                    console.error(`Docker 컨테이너 정리 실패: ${error}`);
                } else {
                    console.log(`✅ Docker 컨테이너 정리됨: ${container.containerName}`);
                }
            });
            dockerContainers.delete(sessionId);
        }
        
        // 세션 디렉토리 삭제
        const userWorkspace = path.join(PROJECT_ROOT, sessionId);
        if (fsSync.existsSync(userWorkspace)) {
            fsSync.rmSync(userWorkspace, { recursive: true, force: true });
            console.log(`✅ 세션 디렉토리 삭제됨: ${userWorkspace}`);
        }
        
        console.log(`Terminal WebSocket disconnected. Session: ${sessionId}`);
    };

    ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`Terminal process exited with code ${exitCode}, signal ${signal}. Session: ${sessionId}`);
        terminalSessions.delete(sessionId);
        ws.close();
    });
});

// ===== GitHub OAuth & API =====
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.warn('⚠️  GitHub OAuth credentials not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.');
}

// GitHub OAuth callback - serve HTML page
app.get('/api/github/callback', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.send(`
            <html>
                <body>
                    <script>
                        alert('인증 코드가 없습니다');
                        window.close();
                    </script>
                </body>
            </html>
        `);
    }
    
    try {
        // Exchange code for access token
        const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code: code
        }, {
            headers: { Accept: 'application/json' }
        });
        
        const accessToken = tokenResponse.data.access_token;
        
        if (!accessToken) {
            return res.send(`
                <html>
                    <body>
                        <script>
                            alert('액세스 토큰을 받지 못했습니다');
                            window.close();
                        </script>
                    </body>
                </html>
            `);
        }
        
        // Get user info
        const userResponse = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `token ${accessToken}` }
        });
        
        // Send HTML page that posts message to opener
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>GitHub 인증 완료</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background: #1e1e1e;
                        color: #cccccc;
                    }
                    .success {
                        text-align: center;
                    }
                    .checkmark {
                        font-size: 48px;
                        color: #00ff00;
                        margin-bottom: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="success">
                    <div class="checkmark">✓</div>
                    <p>GitHub 인증 완료!</p>
                    <p>창이 자동으로 닫힙니다...</p>
                </div>
                <script>
                    if (window.opener) {
                        window.opener.postMessage({
                            type: 'github-auth',
                            token: ${JSON.stringify(accessToken)},
                            user: ${JSON.stringify(userResponse.data)}
                        }, window.location.origin);
                        setTimeout(() => window.close(), 1000);
                    } else {
                        alert('인증 완료! 이 창을 닫아주세요.');
                    }
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('GitHub OAuth error:', error);
        res.send(`
            <html>
                <body>
                    <script>
                        alert('인증 실패: ${error.message}');
                        window.close();
                    </script>
                </body>
            </html>
        `);
    }
});

// Get user repositories
app.get('/api/github/repos', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const response = await axios.get('https://api.github.com/user/repos', {
            headers: { Authorization: `token ${token}` },
            params: {
                sort: 'updated',
                per_page: 100
            }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('GitHub API error:', error);
        res.status(500).json({ error: 'Failed to fetch repositories' });
    }
});

// Create repository
app.post('/api/github/repos', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { name, description, private: isPrivate } = req.body;
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const response = await axios.post('https://api.github.com/user/repos', {
            name,
            description,
            private: isPrivate || false
        }, {
            headers: { Authorization: `token ${token}` }
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('GitHub API error:', error);
        res.status(500).json({ error: 'Failed to create repository' });
    }
});

// Delete repository
app.delete('/api/github/repos/:owner/:repo', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { owner, repo } = req.params;
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        await axios.delete(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: { Authorization: `token ${token}` }
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('GitHub API error:', error);
        res.status(500).json({ error: 'Failed to delete repository' });
    }
});

// Get repository contents (root)
app.get('/api/github/repos/:owner/:repo/contents', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { owner, repo } = req.params;
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const response = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/`,
            { headers: { Authorization: `token ${token}` } }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('GitHub API error:', error);
        res.status(500).json({ error: 'Failed to fetch contents' });
    }
});

// Get repository contents (with path)
app.get('/api/github/repos/:owner/:repo/contents/:path', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { owner, repo, path: filePath } = req.params;
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const response = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
            { headers: { Authorization: `token ${token}` } }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('GitHub API error:', error);
        res.status(500).json({ error: 'Failed to fetch contents' });
    }
});

// Create or update file
app.put('/api/github/repos/:owner/:repo/contents/:path', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { owner, repo, path: filePath } = req.params;
    const { message, content, sha } = req.body;
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const response = await axios.put(
            `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
            {
                message,
                content: Buffer.from(content).toString('base64'),
                sha
            },
            { headers: { Authorization: `token ${token}` } }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('GitHub API error:', error);
        res.status(500).json({ error: 'Failed to update file' });
    }
});

// Get commits
app.get('/api/github/repos/:owner/:repo/commits', async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { owner, repo } = req.params;
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        const response = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/commits`,
            { 
                headers: { Authorization: `token ${token}` },
                params: { per_page: 30 }
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('GitHub API error:', error);
        res.status(500).json({ error: 'Failed to fetch commits' });
    }
});

// Clone repository to workspace
app.post('/api/github/clone', async (req, res) => {
    const { owner, repo, sessionId } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!owner || !repo) {
        return res.status(400).json({ error: 'Owner and repo are required' });
    }
    
    // 세션 작업 디렉토리
    let workingDir = PROJECT_ROOT;
    if (sessionId) {
        workingDir = path.join(PROJECT_ROOT, sessionId);
    }
    
    const repoPath = path.join(workingDir, repo);
    const cloneUrl = `https://${token}@github.com/${owner}/${repo}.git`;
    
    try {
        // 이미 존재하면 삭제
        if (fsSync.existsSync(repoPath)) {
            fsSync.rmSync(repoPath, { recursive: true, force: true });
        }
        
        // Git clone 실행
        exec(`git clone ${cloneUrl} ${repoPath}`, { cwd: workingDir }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Clone error: ${error}`);
                return res.status(500).json({ 
                    error: 'Failed to clone repository',
                    details: stderr || error.message 
                });
            }
            
            console.log(`✅ Repository cloned: ${owner}/${repo} -> ${repoPath}`);
            res.json({ 
                success: true, 
                path: repo,
                message: `Successfully cloned ${owner}/${repo}`
            });
        });
    } catch (error) {
        console.error('Clone error:', error);
        res.status(500).json({ error: 'Failed to clone repository' });
    }
});

// Create sandbox environment
app.post('/api/sandbox/create', async (req, res) => {
    const { sessionId } = req.body;
    
    if (!sessionId) {
        return res.status(400).json({ error: 'Session ID is required' });
    }
    
    try {
        // Docker가 사용 가능한지 확인
        const isDockerAvailable = await new Promise((resolve) => {
            exec('docker --version', (error) => {
                resolve(!error);
            });
        });
        
        if (isDockerAvailable) {
            // Docker 모드: 컨테이너 생성
            const container = await createUserContainer(sessionId);
            dockerContainers.set(sessionId, container);
            
            console.log(`✅ Docker sandbox created for session: ${sessionId}`);
            
            res.json({ 
                success: true, 
                mode: 'docker',
                containerName: container.containerName,
                message: 'Docker sandbox environment created successfully'
            });
        } else {
            // 일반 모드: 격리된 디렉토리만 생성
            const userWorkspace = path.join(PROJECT_ROOT, sessionId);
            if (!fsSync.existsSync(userWorkspace)) {
                fsSync.mkdirSync(userWorkspace, { recursive: true });
            }
            
            console.log(`✅ Isolated workspace created for session: ${sessionId}`);
            
            res.json({ 
                success: true, 
                mode: 'isolated',
                workspace: userWorkspace,
                message: 'Isolated workspace created successfully'
            });
        }
    } catch (error) {
        console.error('Sandbox creation error:', error);
        res.status(500).json({ 
            error: 'Failed to create sandbox environment',
            details: error.message 
        });
    }
});

// Git commit and push
app.post('/api/github/push', async (req, res) => {
    const { repoPath, message, sessionId, files } = req.body;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!repoPath || !message) {
        return res.status(400).json({ error: 'Repository path and commit message are required' });
    }
    
    // 세션 작업 디렉토리
    let workingDir = PROJECT_ROOT;
    if (sessionId) {
        workingDir = path.join(PROJECT_ROOT, sessionId);
    }
    
    const absoluteRepoPath = path.join(workingDir, repoPath);
    
    if (!fsSync.existsSync(absoluteRepoPath)) {
        return res.status(404).json({ error: 'Repository not found' });
    }
    
    try {
        // Git add command - either all files or specific files
        let gitAddCmd = 'git add .';
        if (files && Array.isArray(files) && files.length > 0) {
            // Add specific files
            const fileList = files.map(f => `"${f}"`).join(' ');
            gitAddCmd = `git add ${fileList}`;
            console.log(`📝 Adding specific files: ${fileList}`);
        } else {
            console.log('📝 Adding all files');
        }
        
        // Escape commit message to prevent command injection
        const escapedMessage = message.replace(/"/g, '\\"');
        
        const commands = [
            gitAddCmd,
            `git commit -m "${escapedMessage}"`,
            'git push'
        ];
        
        const executeCommands = (index) => {
            if (index >= commands.length) {
                return res.json({ 
                    success: true, 
                    message: 'Successfully pushed to GitHub',
                    filesCount: files ? files.length : 'all'
                });
            }
            
            exec(commands[index], { cwd: absoluteRepoPath }, (error, stdout, stderr) => {
                if (error) {
                    // commit 시 변경사항 없으면 에러지만 계속 진행
                    if (error.message.includes('nothing to commit') || 
                        stderr.includes('nothing to commit')) {
                        return res.json({ 
                            success: true, 
                            message: 'No changes to commit' 
                        });
                    }
                    
                    console.error(`❌ Git error: ${error.message}`);
                    console.error(`stderr: ${stderr}`);
                    return res.status(500).json({ 
                        error: 'Git command failed',
                        message: stderr || error.message,
                        command: commands[index]
                    });
                }
                
                console.log(`✅ Git command executed: ${commands[index]}`);
                if (stdout) console.log(`Output: ${stdout}`);
                executeCommands(index + 1);
            });
        };
        
        executeCommands(0);
    } catch (error) {
        console.error('Push error:', error);
        res.status(500).json({ 
            error: 'Failed to push to GitHub',
            message: error.message 
        });
    }
});

// API endpoint to run a code file
app.get('/api/run', (req, res) => {
    res.status(405).json({ error: 'Method Not Allowed. Use POST to run code.' });
});

app.post('/api/run', (req, res) => {
    const { filePath, sessionId } = req.body;

    if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
    }

    if (!isValidPath(filePath)) {
        return res.status(403).json({ error: 'Access denied: Invalid file path' });
    }

    // 세션 ID가 있으면 해당 세션의 작업 디렉토리 사용
    let workingDir = PROJECT_ROOT;
    if (sessionId) {
        workingDir = path.join(PROJECT_ROOT, sessionId);
    }

    const absoluteFilePath = path.join(workingDir, filePath);
    const fileExtension = path.extname(absoluteFilePath);

    // 파일 존재 확인
    if (!fsSync.existsSync(absoluteFilePath)) {
        return res.status(404).json({ 
            error: `File not found: ${filePath}`,
            execError: `파일을 찾을 수 없습니다: ${filePath}\n작업 디렉토리: ${workingDir}`
        });
    }

    const useDocker = process.env.USE_DOCKER === 'true';
    const container = dockerContainers.get(sessionId);
    
    let command;
    
    if (useDocker && container) {
        // 🐳 Docker 컨테이너 내부에서 실행
        const containerFilePath = `/workspace/${filePath}`;
        
        switch (fileExtension) {
            case '.js':
                command = `docker exec ${container.containerName} node ${containerFilePath}`;
                break;
            case '.py':
                command = `docker exec ${container.containerName} python3 ${containerFilePath}`;
                break;
            case '.sh':
                command = `docker exec ${container.containerName} bash ${containerFilePath}`;
                break;
            default:
                return res.status(400).json({ error: `Unsupported file type: ${fileExtension}` });
        }
    } else {
        // 일반 모드: 호스트에서 직접 실행
        switch (fileExtension) {
            case '.js':
                command = `node "${absoluteFilePath}"`;
                break;
            case '.py':
                command = `python3 "${absoluteFilePath}"`;
                break;
            case '.sh':
                command = `bash "${absoluteFilePath}"`;
                break;
            default:
                return res.status(400).json({ error: `Unsupported file type: ${fileExtension}` });
        }
    }

    exec(command, { cwd: workingDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Execution error: ${error}`);
            return res.status(500).json({ output: stdout, error: stderr, execError: error.message });
        }
        res.json({ output: stdout, error: stderr });
    });
});

// Debug session management
let debugSession = null;

// Start debugging session
app.post('/api/debug/start', (req, res) => {
    const { filePath, breakpoints } = req.body;

    if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
    }

    if (!isValidPath(filePath)) {
        return res.status(403).json({ error: 'Access denied: Invalid file path' });
    }

    const absoluteFilePath = path.join(PROJECT_ROOT, filePath);
    
    // Start Node.js process with inspector enabled
    const debugProcess = spawn('node', ['--inspect-brk=9229', absoluteFilePath], {
        cwd: PROJECT_ROOT,
        env: process.env
    });

    debugSession = {
        process: debugProcess,
        filePath: absoluteFilePath,
        breakpoints: breakpoints || [],
        pid: debugProcess.pid
    };

    let output = '';
    debugProcess.stdout.on('data', (data) => {
        output += data.toString();
    });

    debugProcess.stderr.on('data', (data) => {
        output += data.toString();
    });

    debugProcess.on('close', (code) => {
        console.log(`Debug process exited with code ${code}`);
        debugSession = null;
    });

    res.json({ 
        success: true, 
        message: 'Debug session started',
        pid: debugProcess.pid,
        debugUrl: 'ws://localhost:9229'
    });
});

// Stop debugging session
app.post('/api/debug/stop', (req, res) => {
    if (debugSession && debugSession.process) {
        debugSession.process.kill();
        debugSession = null;
        res.json({ success: true, message: 'Debug session stopped' });
    } else {
        res.status(404).json({ error: 'No active debug session' });
    }
});

// Get debug session status
app.get('/api/debug/status', (req, res) => {
    if (debugSession) {
        res.json({ 
            active: true, 
            filePath: debugSession.filePath,
            pid: debugSession.pid
        });
    } else {
        res.json({ active: false });
    }
});

// WebSocket for debug communication
app.ws('/debug', (ws, req) => {
    console.log('Debug WebSocket connected');
    
    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);
            console.log('Debug command:', data);
            
            // Handle debug commands (pause, continue, step, etc.)
            ws.send(JSON.stringify({ type: 'ack', command: data.command }));
        } catch (err) {
            console.error('Debug WebSocket error:', err);
        }
    });

    ws.on('close', () => {
        console.log('Debug WebSocket disconnected');
    });
});

// Interactive code execution with WebSocket
const activeProcesses = new Map();

app.ws('/api/execute', (ws, req) => {
    let currentProcess = null;
    const processId = Date.now().toString();

    ws.on('message', async (msg) => {
        try {
            const data = JSON.parse(msg);

            if (data.type === 'run') {
                const { code, language, filename } = data;
                
                // Save code to temp file
                const tempDir = path.join(PROJECT_ROOT, 'temp');
                if (!fsSync.existsSync(tempDir)) {
                    fsSync.mkdirSync(tempDir, { recursive: true });
                }

                const tempFile = path.join(tempDir, filename || `temp_${processId}.${language}`);
                await fs.writeFile(tempFile, code, 'utf8');

                let command, args;

                // Determine command based on language
                if (language === 'python' || language === 'py') {
                    command = 'python3';
                    args = [tempFile];
                } else if (language === 'javascript' || language === 'js') {
                    command = 'node';
                    args = [tempFile];
                } else if (language === 'c') {
                    const outputFile = tempFile.replace('.c', '');
                    // Compile first
                    const compileProcess = spawn('gcc', [tempFile, '-o', outputFile]);
                    
                    await new Promise((resolve, reject) => {
                        let compileError = '';
                        compileProcess.stderr.on('data', (data) => {
                            compileError += data.toString();
                        });
                        compileProcess.on('close', (code) => {
                            if (code !== 0) {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    data: `Compilation error:\n${compileError}`
                                }));
                                reject(new Error('Compilation failed'));
                            } else {
                                resolve();
                            }
                        });
                    });

                    command = outputFile;
                    args = [];
                } else if (language === 'cpp') {
                    const outputFile = tempFile.replace('.cpp', '');
                    const compileProcess = spawn('g++', [tempFile, '-o', outputFile]);
                    
                    await new Promise((resolve, reject) => {
                        let compileError = '';
                        compileProcess.stderr.on('data', (data) => {
                            compileError += data.toString();
                        });
                        compileProcess.on('close', (code) => {
                            if (code !== 0) {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    data: `Compilation error:\n${compileError}`
                                }));
                                reject(new Error('Compilation failed'));
                            } else {
                                resolve();
                            }
                        });
                    });

                    command = outputFile;
                    args = [];
                } else if (language === 'java') {
                    // Compile Java
                    const compileProcess = spawn('javac', [tempFile]);
                    
                    await new Promise((resolve, reject) => {
                        let compileError = '';
                        compileProcess.stderr.on('data', (data) => {
                            compileError += data.toString();
                        });
                        compileProcess.on('close', (code) => {
                            if (code !== 0) {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    data: `Compilation error:\n${compileError}`
                                }));
                                reject(new Error('Compilation failed'));
                            } else {
                                resolve();
                            }
                        });
                    });

                    const className = path.basename(tempFile, '.java');
                    command = 'java';
                    args = ['-cp', tempDir, className];
                } else if (language === 'go') {
                    command = 'go';
                    args = ['run', tempFile];
                } else if (language === 'rust' || language === 'rs') {
                    const outputFile = tempFile.replace('.rs', '');
                    const compileProcess = spawn('rustc', [tempFile, '-o', outputFile]);
                    
                    await new Promise((resolve, reject) => {
                        let compileError = '';
                        compileProcess.stderr.on('data', (data) => {
                            compileError += data.toString();
                        });
                        compileProcess.on('close', (code) => {
                            if (code !== 0) {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    data: `Compilation error:\n${compileError}`
                                }));
                                reject(new Error('Compilation failed'));
                            } else {
                                resolve();
                            }
                        });
                    });

                    command = outputFile;
                    args = [];
                } else if (language === 'ruby' || language === 'rb') {
                    command = 'ruby';
                    args = [tempFile];
                } else if (language === 'php') {
                    command = 'php';
                    args = [tempFile];
                } else if (language === 'perl') {
                    command = 'perl';
                    args = [tempFile];
                } else if (language === 'swift') {
                    command = 'swift';
                    args = [tempFile];
                } else if (language === 'kotlin' || language === 'kt') {
                    const outputFile = tempFile.replace('.kt', '.jar');
                    const compileProcess = spawn('kotlinc', [tempFile, '-include-runtime', '-d', outputFile]);
                    
                    await new Promise((resolve, reject) => {
                        let compileError = '';
                        compileProcess.stderr.on('data', (data) => {
                            compileError += data.toString();
                        });
                        compileProcess.on('close', (code) => {
                            if (code !== 0) {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    data: `Compilation error:\n${compileError}`
                                }));
                                reject(new Error('Compilation failed'));
                            } else {
                                resolve();
                            }
                        });
                    });

                    command = 'java';
                    args = ['-jar', outputFile];
                } else if (language === 'typescript' || language === 'ts') {
                    command = 'ts-node';
                    args = [tempFile];
                } else if (language === 'bash' || language === 'sh') {
                    command = 'bash';
                    args = [tempFile];
                } else if (language === 'lua') {
                    command = 'lua';
                    args = [tempFile];
                } else if (language === 'r') {
                    command = 'Rscript';
                    args = [tempFile];
                } else if (language === 'scala') {
                    command = 'scala';
                    args = [tempFile];
                } else if (language === 'haskell' || language === 'hs') {
                    const outputFile = tempFile.replace('.hs', '');
                    const compileProcess = spawn('ghc', [tempFile, '-o', outputFile]);
                    
                    await new Promise((resolve, reject) => {
                        let compileError = '';
                        compileProcess.stderr.on('data', (data) => {
                            compileError += data.toString();
                        });
                        compileProcess.on('close', (code) => {
                            if (code !== 0) {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    data: `Compilation error:\n${compileError}`
                                }));
                                reject(new Error('Compilation failed'));
                            } else {
                                resolve();
                            }
                        });
                    });

                    command = outputFile;
                    args = [];
                } else {
                    ws.send(JSON.stringify({
                        type: 'error',
                        data: `Unsupported language: ${language}`
                    }));
                    return;
                }

                // Run the program with PTY for interactive I/O
                const ptyEnv = Object.assign({}, process.env, {
                    TERM: 'xterm-256color',
                    COLORTERM: 'truecolor',
                    FORCE_COLOR: '1'
                });
                
                // Use shell wrapper to ensure proper stdin/stdout handling
                let ptyCommand, ptyArgs;
                if (process.platform === 'win32') {
                    ptyCommand = 'cmd.exe';
                    ptyArgs = ['/c', command, ...args];
                } else {
                    // Use bash to wrap the command for better I/O handling
                    ptyCommand = '/bin/bash';
                    ptyArgs = ['-c', `${command} ${args.join(' ')}`];
                }
                
                console.log('Spawning PTY:', ptyCommand, ptyArgs);
                
                currentProcess = pty.spawn(ptyCommand, ptyArgs, {
                    name: 'xterm-256color',
                    cols: 80,
                    rows: 30,
                    cwd: tempDir,
                    env: ptyEnv,
                    encoding: null  // Use raw buffer mode
                });

                activeProcesses.set(processId, currentProcess);

                // Send output to client
                currentProcess.onData((data) => {
                    // Convert buffer to string if needed
                    const output = typeof data === 'string' ? data : data.toString('utf8');
                    console.log('PTY output:', output);
                    ws.send(JSON.stringify({
                        type: 'output',
                        data: output
                    }));
                });

                // Handle process exit
                currentProcess.onExit(({ exitCode, signal }) => {
                    ws.send(JSON.stringify({
                        type: 'exit',
                        exitCode,
                        signal
                    }));
                    activeProcesses.delete(processId);
                    
                    // Cleanup temp files
                    try {
                        fsSync.unlinkSync(tempFile);
                        if (language === 'c' || language === 'cpp') {
                            const outputFile = tempFile.replace(/\.(c|cpp)$/, '');
                            if (fsSync.existsSync(outputFile)) {
                                fsSync.unlinkSync(outputFile);
                            }
                        }
                    } catch (e) {
                        console.error('Cleanup error:', e);
                    }
                });

            } else if (data.type === 'input') {
                // Send input to the running process
                if (currentProcess) {
                    console.log('Received input from client:', data.data);
                    currentProcess.write(data.data);
                    console.log('Input written to PTY');
                } else {
                    console.error('No active process to send input to');
                }
            } else if (data.type === 'kill') {
                // Kill the running process
                if (currentProcess) {
                    currentProcess.kill();
                    activeProcesses.delete(processId);
                }
            }
        } catch (error) {
            ws.send(JSON.stringify({
                type: 'error',
                data: error.message
            }));
        }
    });

    ws.on('close', () => {
        if (currentProcess) {
            currentProcess.kill();
            activeProcesses.delete(processId);
        }
    });
});

app.listen(port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 덕영고등학교 VS Code 서버 시작됨                        ║
╠════════════════════════════════════════════════════════════╣
║  포트: ${port}                                              ║
║  작업 디렉토리: ${PROJECT_ROOT}                            ║
║  저장소 타입: ${process.env.RAILWAY_VOLUME_MOUNT_PATH ? '영구 (Volume)' : '임시 (메모리)'}  ║
║  Docker 모드: ${process.env.USE_DOCKER === 'true' ? '활성화 🐳' : '비활성화'}  ║
║  GitHub 연동: 활성화 🐙                                     ║
╚════════════════════════════════════════════════════════════╝
    `);
    
    if (!process.env.RAILWAY_VOLUME_MOUNT_PATH && process.env.NODE_ENV === 'production') {
        console.warn(`
⚠️  경고: Railway Volume이 설정되지 않았습니다!
   - 현재 /tmp 디렉토리 사용 중 (서버 재시작 시 모든 파일 삭제됨)
   - 영구 저장을 위해 Railway Volume을 추가하세요:
     1. Railway 대시보드 → Settings → Volumes
     2. Mount Path: /data
     3. Size: 1GB 이상
        `);
    }
});