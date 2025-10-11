const express = require('express');
const path = require('path');
const fs = require('fs').promises;
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
// Use /tmp for Railway (writable directory)
const PROJECT_ROOT = process.env.NODE_ENV === 'production' 
    ? '/tmp/workspace' 
    : path.resolve(__dirname, './');

// Ensure workspace directory exists
const fsSync = require('fs');
if (process.env.NODE_ENV === 'production' && !fsSync.existsSync(PROJECT_ROOT)) {
    fsSync.mkdirSync(PROJECT_ROOT, { recursive: true });
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

// WebSocket endpoint for terminal
app.ws('/terminal', (ws, req) => {
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: PROJECT_ROOT, // 터미널 시작 디렉토리
        env: process.env
    });

    console.log('Terminal WebSocket connected.');

    ptyProcess.onData(data => {
        ws.send(data); // Send data from pty to websocket
    });

    ws.onmessage = msg => {
        ptyProcess.write(msg.data);
    };

    ws.onclose = () => {
        ptyProcess.kill(); // Kill pty process on websocket close
        console.log('Terminal WebSocket disconnected.');
    };

    ptyProcess.onExit(({ exitCode, signal }) => {
        console.log(`Terminal process exited with code ${exitCode}, signal ${signal}`);
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
        return res.status(401).json({ error: 'No token provided' });
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

// API endpoint to run a code file
app.get('/api/run', (req, res) => {
    res.status(405).json({ error: 'Method Not Allowed. Use POST to run code.' });
});

app.post('/api/run', (req, res) => {
    const { filePath } = req.body;

    if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
    }

    if (!isValidPath(filePath)) {
        return res.status(403).json({ error: 'Access denied: Invalid file path' });
    }

    const absoluteFilePath = path.join(PROJECT_ROOT, filePath);
    const fileExtension = path.extname(absoluteFilePath);

    let command;
    switch (fileExtension) {
        case '.js':
            command = `node "${absoluteFilePath}"`;
            break;
        case '.py':
            command = `python3 "${absoluteFilePath}"`; // Use python3
            break;
        case '.sh':
            command = `bash "${absoluteFilePath}"`;
            break;
        default:
            return res.status(400).json({ error: `Unsupported file type: ${fileExtension}` });
    }

    exec(command, (error, stdout, stderr) => {
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

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});