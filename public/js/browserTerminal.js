// Browser-based Terminal (로컬 실행)
// 사용자의 브라우저에서 직접 실행되는 터미널

import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import BrowserShell from 'browser-shell';

let localTerminal = null;
let localShell = null;
let fitAddon = null;

export function initBrowserTerminal(container) {
    // xterm 터미널 생성
    localTerminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Consolas, "Courier New", monospace',
        theme: {
            background: '#1e1e1e',
            foreground: '#cccccc',
            cursor: '#ffffff',
            selection: '#264f78'
        }
    });

    fitAddon = new FitAddon();
    localTerminal.loadAddon(fitAddon);
    localTerminal.open(container);
    fitAddon.fit();

    // 브라우저 셸 초기화
    localShell = new BrowserShell({
        cwd: '/',
        env: {
            HOME: '/home/user',
            USER: 'user',
            PATH: '/usr/local/bin:/usr/bin:/bin'
        }
    });

    // 환영 메시지
    localTerminal.writeln('\x1b[1;32m🌐 브라우저 터미널 (로컬 실행)\x1b[0m');
    localTerminal.writeln('이 터미널은 당신의 브라우저에서 실행됩니다.');
    localTerminal.writeln('서버가 아닌 로컬 환경입니다.\n');
    localTerminal.write('$ ');

    let currentLine = '';

    // 키보드 입력 처리
    localTerminal.onData(data => {
        const code = data.charCodeAt(0);

        if (code === 13) { // Enter
            localTerminal.write('\r\n');
            if (currentLine.trim()) {
                executeCommand(currentLine.trim());
            } else {
                localTerminal.write('$ ');
            }
            currentLine = '';
        } else if (code === 127) { // Backspace
            if (currentLine.length > 0) {
                currentLine = currentLine.slice(0, -1);
                localTerminal.write('\b \b');
            }
        } else if (code >= 32) { // 일반 문자
            currentLine += data;
            localTerminal.write(data);
        }
    });

    return { terminal: localTerminal, fitAddon };
}

async function executeCommand(command) {
    try {
        // 기본 명령어 처리
        if (command === 'clear') {
            localTerminal.clear();
            localTerminal.write('$ ');
            return;
        }

        if (command === 'help') {
            localTerminal.writeln('사용 가능한 명령어:');
            localTerminal.writeln('  ls       - 파일 목록');
            localTerminal.writeln('  pwd      - 현재 디렉토리');
            localTerminal.writeln('  echo     - 텍스트 출력');
            localTerminal.writeln('  clear    - 화면 지우기');
            localTerminal.writeln('  help     - 도움말');
            localTerminal.writeln('  node     - Node.js 실행 (준비 중)');
            localTerminal.writeln('  python   - Python 실행 (준비 중)');
            localTerminal.write('\n$ ');
            return;
        }

        // 간단한 명령어 구현
        const parts = command.split(' ');
        const cmd = parts[0];
        const args = parts.slice(1);

        switch (cmd) {
            case 'ls':
                localTerminal.writeln('📁 workspace/');
                localTerminal.writeln('📄 README.md');
                localTerminal.writeln('📄 index.html');
                break;

            case 'pwd':
                localTerminal.writeln('/home/user/workspace');
                break;

            case 'echo':
                localTerminal.writeln(args.join(' '));
                break;

            case 'whoami':
                localTerminal.writeln('user (브라우저 로컬)');
                break;

            case 'date':
                localTerminal.writeln(new Date().toString());
                break;

            case 'node':
                localTerminal.writeln('Node.js 환경 준비 중...');
                localTerminal.writeln('WebAssembly 기반 Node.js를 로드하려면');
                localTerminal.writeln('추가 패키지가 필요합니다.');
                break;

            default:
                localTerminal.writeln(`bash: ${cmd}: command not found`);
                localTerminal.writeln('사용 가능한 명령어를 보려면 "help"를 입력하세요.');
        }

        localTerminal.write('$ ');
    } catch (err) {
        localTerminal.writeln(`\x1b[1;31mError: ${err.message}\x1b[0m`);
        localTerminal.write('$ ');
    }
}

export function resizeBrowserTerminal() {
    if (fitAddon) {
        fitAddon.fit();
    }
}

export function destroyBrowserTerminal() {
    if (localTerminal) {
        localTerminal.dispose();
        localTerminal = null;
    }
    if (localShell) {
        localShell = null;
    }
}
