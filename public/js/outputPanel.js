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
        if (!this.ws || !this.isRunning) return;

        const value = this.outputInput.value;
        
        // Display the input
        this.write(`${value}`, 'input');
        
        // Send to server
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
        this.hideInput();
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

    // Show input field
    showInput() {
        if (this.outputInputLine) {
            this.outputInputLine.style.display = 'flex';
            setTimeout(() => {
                if (this.outputInput) {
                    this.outputInput.focus();
                }
            }, 100);
        }
    }

    // Hide input field
    hideInput() {
        if (this.outputInputLine) {
            this.outputInputLine.style.display = 'none';
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

        // Show input field immediately
        this.showInput();

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
                    // Write output directly (no newline, server handles it)
                    const lines = data.data.split('\n');
                    lines.forEach((line, index) => {
                        if (line || index < lines.length - 1) {
                            this.write(line, 'output');
                        }
                    });
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
                    this.hideInput();
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
            this.hideInput();
        };

        this.ws.onclose = () => {
            if (this.isRunning) {
                this.write('─'.repeat(60), 'output');
                this.write('Connection closed', 'output');
                this.isRunning = false;
                this.hideInput();
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
