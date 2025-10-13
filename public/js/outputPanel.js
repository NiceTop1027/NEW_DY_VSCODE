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
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not ready:', this.ws?.readyState);
            this.writeError('❌ 연결이 끊어졌습니다. 코드를 다시 실행하세요.');
            return;
        }

        if (!this.isRunning) {
            console.warn('Process not running');
            return;
        }

        const value = this.outputInput.value.trim();
        
        if (value === '') {
            // Empty input, just send newline
            this.ws.send(JSON.stringify({
                type: 'input',
                data: '\n'
            }));
        } else {
            console.log('Sending input:', value);
            
            // Send to server
            this.ws.send(JSON.stringify({
                type: 'input',
                data: value + '\n'
            }));
        }

        // Clear input and refocus
        this.outputInput.value = '';
        this.outputInput.focus();
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
            console.log('WebSocket opened successfully');
            this.write('✅ Connected to execution server', 'success');
            
            // Check if WebSocket is still valid
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                console.error('WebSocket not ready in onopen');
                return;
            }
            
            // Send execution request
            try {
                this.ws.send(JSON.stringify({
                    type: 'execute',
                    language,
                    code,
                    filename
                }));
            } catch (error) {
                console.error('Failed to send execution request:', error);
                this.writeError('❌ 실행 요청 전송 실패');
                return;
            }
            
            // Ensure input is ready
            if (this.outputInput) {
                this.outputInput.disabled = false;
                this.outputInput.placeholder = '입력하고 Enter를 누르세요...';
                setTimeout(() => {
                    if (this.outputInput) {
                        this.outputInput.focus();
                    }
                }, 100);
            }
            
            console.log('Input field ready:', {
                element: this.outputInput,
                disabled: this.outputInput?.disabled,
                readyState: this.ws?.readyState
            });
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'output') {
                    const text = data.data;
                    
                    // Process output character by character for proper formatting
                    for (let i = 0; i < text.length; i++) {
                        const char = text[i];
                        
                        if (char === '\n') {
                            // New line
                            const line = document.createElement('div');
                            line.className = 'output-line output';
                            this.outputContent.appendChild(line);
                        } else if (char === '\r') {
                            // Carriage return - ignore or handle specially
                            continue;
                        } else {
                            // Regular character - append to last line
                            let lastLine = this.outputContent.lastElementChild;
                            if (!lastLine || !lastLine.classList.contains('output-line')) {
                                lastLine = document.createElement('div');
                                lastLine.className = 'output-line output';
                                this.outputContent.appendChild(lastLine);
                            }
                            lastLine.textContent += char;
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
            console.log('WebSocket closed, isRunning:', this.isRunning);
            
            // Only show error if it was unexpected (not a normal exit)
            if (this.isRunning) {
                this.isRunning = false;
                
                if (this.outputInput) {
                    this.outputInput.disabled = true;
                    this.outputInput.placeholder = '연결 종료됨';
                }
            }
            
            // Clean up WebSocket reference
            this.ws = null;
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
