// public/js/outputPanel.js
// Interactive Output Panel with WebSocket-based execution

class OutputPanel {
    constructor() {
        this.outputContent = null;
        this.outputInput = null;
        this.outputInputLine = null;
        this.ws = null;
        this.isRunning = false;
    }

    // Initialize output panel
    init() {
        this.outputContent = document.getElementById('output-content');
        this.outputInput = document.getElementById('output-input');
        this.outputInputLine = document.getElementById('output-input-line');

        if (!this.outputContent || !this.outputInput || !this.outputInputLine) {
            console.error('Output panel elements not found');
            return;
        }

        // Setup input handler
        this.outputInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendInput();
            }
        });

        console.log('✅ Output Panel initialized with WebSocket support');
    }

    // Send input to running process
    sendInput() {
        if (!this.ws || !this.isRunning) {
            console.warn('Cannot send input: ws=', this.ws, 'isRunning=', this.isRunning);
            return;
        }

        const value = this.outputInput.value;
        
        console.log('Sending input:', value);
        
        // Send to server (don't display yet, let server echo it back)
        this.ws.send(JSON.stringify({
            type: 'input',
            data: value + '\n'
        }));

        // Clear input
        this.outputInput.value = '';
    }

    // Clear output
    clear() {
        if (this.outputContent) {
            this.outputContent.innerHTML = '';
        }
    }

    // Write output
    write(text, type = 'output') {
        if (!this.outputContent) return;

        const line = document.createElement('div');
        line.className = `output-line ${type}`;
        line.textContent = text;
        this.outputContent.appendChild(line);

        // Auto scroll to bottom
        this.outputContent.scrollTop = this.outputContent.scrollHeight;
    }

    // Write error
    writeError(text) {
        this.write(text, 'error');
    }

    // Write success
    writeSuccess(text) {
        this.write(text, 'success');
    }

    // Stop running process
    stopExecution() {
        if (this.ws && this.isRunning) {
            this.ws.send(JSON.stringify({ type: 'kill' }));
            this.write('─'.repeat(60), 'output');
            this.write('⚠️  Execution stopped by user', 'error');
            this.isRunning = false;
            
            if (this.outputInput) {
                this.outputInput.disabled = true;
                this.outputInput.placeholder = '실행 중지됨';
            }
            
            this.ws.close();
        }
    }

    // Run code with WebSocket
    async runCode(code, language, filename) {
        this.clear();
        this.write(`🚀 Running ${language} code...`, 'success');
        this.write('─'.repeat(60), 'output');

        // Close existing WebSocket
        if (this.ws) {
            this.ws.close();
        }

        // Create WebSocket connection
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/execute`;
        
        this.ws = new WebSocket(wsUrl);
        this.isRunning = true;

        // Enable input field
        if (this.outputInput) {
            this.outputInput.disabled = false;
            this.outputInput.placeholder = '입력하고 Enter를 누르세요...';
            this.outputInput.focus();
        }

        this.ws.onopen = () => {
            this.write('✅ Connected to execution server', 'success');
            
            // Send code to execute
            this.ws.send(JSON.stringify({
                type: 'run',
                code,
                language,
                filename
            }));
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'output') {
                    // Write output as-is (preserve formatting)
                    const text = data.data;
                    
                    // Don't split by newlines, just append to last line or create new
                    if (text.includes('\n')) {
                        const lines = text.split('\n');
                        lines.forEach((line, index) => {
                            if (index === 0 && this.outputContent.lastChild) {
                                // Append to last line
                                this.outputContent.lastChild.textContent += line;
                            } else if (index < lines.length - 1 || line) {
                                // Create new line
                                this.write(line, 'output');
                            }
                        });
                    } else {
                        // No newline, append to last line
                        if (this.outputContent.lastChild && this.outputContent.lastChild.classList.contains('output-line')) {
                            this.outputContent.lastChild.textContent += text;
                        } else {
                            this.write(text, 'output');
                        }
                    }
                    
                    // Auto scroll
                    this.outputContent.scrollTop = this.outputContent.scrollHeight;
                } else if (data.type === 'error') {
                    this.writeError(data.data);
                } else if (data.type === 'exit') {
                    this.write('─'.repeat(60), 'output');
                    if (data.exitCode === 0) {
                        this.write(`✅ Program exited successfully (code: ${data.exitCode})`, 'success');
                    } else {
                        this.writeError(`❌ Program exited with code: ${data.exitCode}`);
                    }
                    this.isRunning = false;
                    
                    // Disable input
                    if (this.outputInput) {
                        this.outputInput.disabled = true;
                        this.outputInput.placeholder = '프로그램이 종료되었습니다';
                    }
                    
                    this.ws.close();
                }
            } catch (error) {
                console.error('WebSocket message error:', error);
            }
        };

        this.ws.onerror = (error) => {
            this.writeError('❌ WebSocket error occurred');
            console.error('WebSocket error:', error);
            this.isRunning = false;
            
            if (this.outputInput) {
                this.outputInput.disabled = true;
                this.outputInput.placeholder = '연결 오류';
            }
        };

        this.ws.onclose = () => {
            if (this.isRunning) {
                this.write('─'.repeat(60), 'output');
                this.write('Connection closed', 'output');
                this.isRunning = false;
                
                if (this.outputInput) {
                    this.outputInput.disabled = true;
                    this.outputInput.placeholder = '연결 종료됨';
                }
            }
        };
    }

    // Stop running process
    stopExecution() {
        if (this.ws && this.isRunning) {
            this.ws.send(JSON.stringify({ type: 'kill' }));
            this.write('─'.repeat(60), 'output');
            this.write('⚠️  Execution stopped by user', 'error');
            this.isRunning = false;
            this.hideInput();
            this.ws.close();
        }
    }

}

export const outputPanel = new OutputPanel();
export default outputPanel;
