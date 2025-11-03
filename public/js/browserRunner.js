// public/js/browserRunner.js
// Browser-based code execution using Pyodide and QuickJS

import { getQuickJS } from 'quickjs-emscripten';

class BrowserCodeRunner {
    constructor() {
        this.pyodide = null;
        this.quickjs = null;
        this.pyodideLoading = false;
        this.quickjsLoading = false;
        this.isRunning = false;
        this.shouldStop = false;
    }

    // Initialize Pyodide (Python)
    async initPyodide() {
        if (this.pyodide) return this.pyodide;
        if (this.pyodideLoading) {
            // Wait for existing load
            while (this.pyodideLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.pyodide;
        }

        this.pyodideLoading = true;
        console.log('🐍 Loading Pyodide...');

        try {
            // Load from CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
            document.head.appendChild(script);

            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });

            this.pyodide = await window.loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
            });

            console.log('✅ Pyodide loaded');
            this.pyodideLoading = false;
            return this.pyodide;
        } catch (error) {
            console.error('❌ Pyodide load failed:', error);
            this.pyodideLoading = false;
            throw error;
        }
    }

    // Initialize QuickJS (JavaScript sandbox)
    async initQuickJS() {
        if (this.quickjs) return this.quickjs;
        if (this.quickjsLoading) {
            while (this.quickjsLoading) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.quickjs;
        }

        this.quickjsLoading = true;
        console.log('⚡ Loading QuickJS...');

        try {
            this.quickjs = await getQuickJS();
            console.log('✅ QuickJS loaded');
            this.quickjsLoading = false;
            return this.quickjs;
        } catch (error) {
            console.error('❌ QuickJS load failed:', error);
            this.quickjsLoading = false;
            throw error;
        }
    }

    // Run Python code
    async runPython(code, onOutput, signal) {
        this.isRunning = true;
        this.shouldStop = false;

        try {
            const pyodide = await this.initPyodide();

            // Check if already aborted
            if (signal && signal.aborted) {
                throw new Error('Execution aborted');
            }

            // Capture stdout
            let output = '';
            pyodide.setStdout({
                batched: (text) => {
                    if (this.shouldStop) return;
                    output += text + '\n';
                    if (onOutput) onOutput(text + '\n');
                }
            });

            // Run code
            const result = await pyodide.runPythonAsync(code);

            // Check if stopped
            if (this.shouldStop) {
                this.isRunning = false;
                return {
                    success: false,
                    output: output + '\n⛔ 실행이 중단되었습니다.\n',
                    error: 'Execution stopped'
                };
            }

            // Get final output
            if (result !== undefined && result !== null) {
                const resultStr = String(result);
                output += resultStr + '\n';
                if (onOutput) onOutput(resultStr + '\n');
            }

            this.isRunning = false;
            return {
                success: true,
                output: output,
                result: result
            };
        } catch (error) {
            this.isRunning = false;
            const errorMsg = `Error: ${error.message}\n`;
            if (onOutput) onOutput(errorMsg);
            return {
                success: false,
                output: errorMsg,
                error: error.message
            };
        }
    }

    // Run JavaScript code (sandboxed)
    async runJavaScript(code, onOutput, signal) {
        this.isRunning = true;
        this.shouldStop = false;

        try {
            const QuickJS = await this.initQuickJS();
            const vm = QuickJS.newContext();

            // Check if already aborted
            if (signal && signal.aborted) {
                throw new Error('Execution aborted');
            }

            let output = '';

            // Add console.log
            const logHandle = vm.newFunction('log', (...args) => {
                if (this.shouldStop) return;
                const message = args.map(arg => {
                    const str = vm.dump(arg);
                    return str;
                }).join(' ') + '\n';
                output += message;
                if (onOutput) onOutput(message);
            });

            const consoleHandle = vm.newObject();
            vm.setProp(consoleHandle, 'log', logHandle);
            vm.setProp(vm.global, 'console', consoleHandle);

            // Run code
            const result = vm.evalCode(code);

            // Check if stopped
            if (this.shouldStop) {
                logHandle.dispose();
                consoleHandle.dispose();
                vm.dispose();
                this.isRunning = false;
                return {
                    success: false,
                    output: output + '\n⛔ 실행이 중단되었습니다.\n',
                    error: 'Execution stopped'
                };
            }

            if (result.error) {
                const error = vm.dump(result.error);
                result.error.dispose();
                const errorMsg = `Error: ${error}\n`;
                output += errorMsg;
                if (onOutput) onOutput(errorMsg);

                logHandle.dispose();
                consoleHandle.dispose();
                vm.dispose();
                this.isRunning = false;
                return {
                    success: false,
                    output: output,
                    error: error
                };
            }

            const resultValue = vm.dump(result.value);
            result.value.dispose();

            if (resultValue !== undefined && resultValue !== null) {
                const resultStr = String(resultValue) + '\n';
                output += resultStr;
                if (onOutput) onOutput(resultStr);
            }

            logHandle.dispose();
            consoleHandle.dispose();
            vm.dispose();

            this.isRunning = false;
            return {
                success: true,
                output: output,
                result: resultValue
            };
        } catch (error) {
            this.isRunning = false;
            const errorMsg = `Error: ${error.message}\n`;
            if (onOutput) onOutput(errorMsg);
            return {
                success: false,
                output: errorMsg,
                error: error.message
            };
        }
    }

    // Run code based on language
    async runCode(code, language, onOutput, signal) {
        console.log(`🚀 Running ${language} code in browser...`);

        switch (language.toLowerCase()) {
            case 'python':
            case 'py':
                return await this.runPython(code, onOutput, signal);

            case 'javascript':
            case 'js':
                return await this.runJavaScript(code, onOutput, signal);

            default:
                const errorMsg = `Language ${language} is not supported for browser execution.\nSupported: Python, JavaScript\n`;
                if (onOutput) onOutput(errorMsg);
                return {
                    success: false,
                    output: errorMsg,
                    error: 'Unsupported language'
                };
        }
    }

    // Stop current execution
    stopExecution() {
        this.shouldStop = true;
        this.isRunning = false;
    }

    // Install Python package
    async installPythonPackage(packageName, onOutput) {
        try {
            const pyodide = await this.initPyodide();
            
            if (onOutput) onOutput(`Installing ${packageName}...\n`);
            
            await pyodide.loadPackage('micropip');
            await pyodide.runPythonAsync(`
                import micropip
                await micropip.install('${packageName}')
            `);
            
            if (onOutput) onOutput(`✅ ${packageName} installed\n`);
            
            return { success: true };
        } catch (error) {
            const errorMsg = `Failed to install ${packageName}: ${error.message}\n`;
            if (onOutput) onOutput(errorMsg);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get available packages
    getAvailableLanguages() {
        return [
            { name: 'Python', id: 'python', icon: '🐍', ready: !!this.pyodide },
            { name: 'JavaScript', id: 'javascript', icon: '⚡', ready: !!this.quickjs }
        ];
    }

    // Preload runtimes
    async preload() {
        console.log('🔄 Preloading runtimes...');
        
        const promises = [
            this.initPyodide().catch(err => console.error('Pyodide preload failed:', err)),
            this.initQuickJS().catch(err => console.error('QuickJS preload failed:', err))
        ];
        
        await Promise.allSettled(promises);
        console.log('✅ Runtimes preloaded');
    }
}

// Export singleton
export const browserRunner = new BrowserCodeRunner();
export default browserRunner;
