// public/js/outputPanel.js
// Interactive Output Panel with Input Support

class OutputPanel {
    constructor() {
        this.outputContent = null;
        this.outputInput = null;
        this.outputInputLine = null;
        this.currentProcess = null;
        this.inputCallback = null;
        this.isWaitingForInput = false;
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
                this.handleInput();
            }
        });

        console.log('✅ Output Panel initialized with input support');
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
    showInput(prompt = '> ') {
        if (!this.outputInputLine) return;

        this.isWaitingForInput = true;
        this.outputInputLine.style.display = 'flex';
        
        const promptEl = this.outputInputLine.querySelector('.output-prompt');
        if (promptEl) {
            promptEl.textContent = prompt;
        }

        // Focus input
        setTimeout(() => {
            if (this.outputInput) {
                this.outputInput.focus();
                this.outputInput.value = '';
            }
        }, 100);
    }

    // Hide input field
    hideInput() {
        if (this.outputInputLine) {
            this.outputInputLine.style.display = 'none';
        }
        this.isWaitingForInput = false;
        this.inputCallback = null;
    }

    // Handle input submission
    handleInput() {
        if (!this.outputInput) return;

        const value = this.outputInput.value.trim();
        
        // Display the input in output
        this.write(`> ${value}`, 'input');

        // Call callback if exists
        if (this.inputCallback) {
            this.inputCallback(value);
        }

        // Clear input
        this.outputInput.value = '';
        
        // Hide input by default (callback can show it again if needed)
        this.hideInput();
    }

    // Wait for input (returns a promise)
    waitForInput(prompt = '> ') {
        return new Promise((resolve) => {
            this.inputCallback = (value) => {
                resolve(value);
            };
            this.showInput(prompt);
        });
    }

    // Run code with input support
    async runCode(code, language) {
        this.clear();
        this.write(`Running ${language} code...`, 'success');
        this.write('─'.repeat(50), 'output');

        try {
            if (language === 'javascript') {
                await this.runJavaScript(code);
            } else if (language === 'python') {
                await this.runPython(code);
            } else if (language === 'c' || language === 'cpp') {
                await this.runC(code, language);
            } else {
                this.writeError(`Language ${language} not supported yet`);
            }
        } catch (error) {
            this.writeError(`Error: ${error.message}`);
        }

        this.write('─'.repeat(50), 'output');
        this.write('Execution completed', 'success');
    }

    // Run JavaScript with input support
    async runJavaScript(code) {
        // Create custom console
        const customConsole = {
            log: (...args) => this.write(args.join(' '), 'output'),
            error: (...args) => this.writeError(args.join(' ')),
            warn: (...args) => this.write(args.join(' '), 'output'),
        };

        // Create custom prompt function
        const customPrompt = async (message) => {
            if (message) {
                this.write(message, 'output');
            }
            return await this.waitForInput();
        };

        try {
            // Create async function with custom console and prompt
            const asyncFunction = new Function(
                'console',
                'prompt',
                `return (async () => { ${code} })();`
            );

            await asyncFunction(customConsole, customPrompt);
        } catch (error) {
            this.writeError(`JavaScript Error: ${error.message}`);
        }
    }

    // Run Python code (needs server support)
    async runPython(code) {
        // Check if code has input()
        const hasInput = code.includes('input(');

        if (hasInput) {
            this.write('Python code with input() detected', 'output');
            this.write('Sending to server for execution...', 'output');

            try {
                const response = await fetch('/api/run-python', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });

                const result = await response.json();

                if (result.needsInput) {
                    // Handle interactive input
                    await this.handlePythonInput(code, result);
                } else {
                    this.write(result.output, 'output');
                    if (result.error) {
                        this.writeError(result.error);
                    }
                }
            } catch (error) {
                this.writeError(`Server error: ${error.message}`);
            }
        } else {
            // Run simple Python code without input
            try {
                const response = await fetch('/api/run-python', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });

                const result = await response.json();
                this.write(result.output, 'output');
                if (result.error) {
                    this.writeError(result.error);
                }
            } catch (error) {
                this.writeError(`Server error: ${error.message}`);
            }
        }
    }

    // Handle Python interactive input
    async handlePythonInput(code, initialResult) {
        let currentOutput = initialResult.output || '';
        let inputs = [];

        while (true) {
            // Show current output
            if (currentOutput) {
                this.write(currentOutput, 'output');
            }

            // Wait for user input
            const userInput = await this.waitForInput();
            inputs.push(userInput);

            // Send input to server
            try {
                const response = await fetch('/api/run-python-input', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code, inputs })
                });

                const result = await response.json();

                if (result.completed) {
                    // Execution completed
                    if (result.output) {
                        this.write(result.output, 'output');
                    }
                    if (result.error) {
                        this.writeError(result.error);
                    }
                    break;
                } else {
                    // More input needed
                    currentOutput = result.output || '';
                }
            } catch (error) {
                this.writeError(`Server error: ${error.message}`);
                break;
            }
        }
    }

    // Run C/C++ code (needs server support)
    async runC(code, language) {
        // Check if code has scanf
        const hasInput = code.includes('scanf') || code.includes('cin');

        this.write(`Compiling ${language} code...`, 'output');

        try {
            const response = await fetch('/api/run-c', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language, hasInput })
            });

            const result = await response.json();

            if (result.compileError) {
                this.writeError('Compilation Error:');
                this.writeError(result.compileError);
                return;
            }

            this.write('Compilation successful', 'success');
            this.write('Running...', 'output');

            if (hasInput && result.needsInput) {
                await this.handleCInput(result.executablePath);
            } else {
                this.write(result.output, 'output');
                if (result.error) {
                    this.writeError(result.error);
                }
            }
        } catch (error) {
            this.writeError(`Server error: ${error.message}`);
        }
    }

    // Handle C/C++ interactive input
    async handleCInput(executablePath) {
        let inputs = [];

        while (true) {
            // Wait for user input
            const userInput = await this.waitForInput();
            inputs.push(userInput);

            // Send input to server
            try {
                const response = await fetch('/api/run-c-input', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ executablePath, inputs })
                });

                const result = await response.json();

                if (result.output) {
                    this.write(result.output, 'output');
                }

                if (result.completed) {
                    if (result.error) {
                        this.writeError(result.error);
                    }
                    break;
                }
            } catch (error) {
                this.writeError(`Server error: ${error.message}`);
                break;
            }
        }
    }
}

export const outputPanel = new OutputPanel();
export default outputPanel;
