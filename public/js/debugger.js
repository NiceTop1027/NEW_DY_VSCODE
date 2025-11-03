// Simple debugger - Inserts debug logs at breakpoint lines
// Works with all languages

export class SimpleDebugger {
    constructor() {
        this.isDebugging = false;
    }

    // Detect language from file extension
    detectLanguage(filePath) {
        const ext = filePath.split('.').pop().toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'py': 'python',
            'c': 'c',
            'cpp': 'cpp',
            'java': 'java',
            'go': 'go',
            'rs': 'rust',
            'rb': 'ruby',
            'php': 'php'
        };
        return languageMap[ext] || 'unknown';
    }

    // Get debug print statement for each language
    getDebugStatement(language, lineNumber, indent = '') {
        const statements = {
            'javascript': `${indent}console.log('🔍 Line ${lineNumber}: Debugging...');`,
            'python': `${indent}print(f'🔍 Line ${lineNumber}: Debugging...')`,
            'c': `${indent}printf("🔍 Line ${lineNumber}: Debugging...\\n");`,
            'cpp': `${indent}std::cout << "🔍 Line ${lineNumber}: Debugging..." << std::endl;`,
            'java': `${indent}System.out.println("🔍 Line ${lineNumber}: Debugging...");`,
            'go': `${indent}fmt.Println("🔍 Line ${lineNumber}: Debugging...")`,
            'rust': `${indent}println!("🔍 Line {}: Debugging...", ${lineNumber});`,
            'ruby': `${indent}puts "🔍 Line ${lineNumber}: Debugging..."`,
            'php': `${indent}echo "🔍 Line ${lineNumber}: Debugging...\\n";`
        };
        return statements[language] || `${indent}// Debug: Line ${lineNumber}`;
    }

    // Insert debug statements at breakpoint lines
    insertDebugStatements(code, breakpoints, language) {
        if (!breakpoints || breakpoints.size === 0) {
            return code;
        }

        const lines = code.split('\n');
        const sortedBreakpoints = Array.from(breakpoints).sort((a, b) => b - a); // Reverse order

        for (const lineNum of sortedBreakpoints) {
            if (lineNum > 0 && lineNum <= lines.length) {
                const line = lines[lineNum - 1];
                const indent = line.match(/^\s*/)[0];
                const debugStmt = this.getDebugStatement(language, lineNum, indent);
                lines.splice(lineNum - 1, 0, debugStmt);
            }
        }

        return lines.join('\n');
    }

    // Start debugging (just run with debug statements)
    async startDebugging(filePath, code, breakpoints) {
        const language = this.detectLanguage(filePath);

        if (!breakpoints || breakpoints.size === 0) {
            if (window.showNotification) {
                window.showNotification('브레이크포인트를 먼저 설정하세요', 'warning');
            }
            return { success: false, error: 'No breakpoints set' };
        }

        // Insert debug statements
        const debugCode = this.insertDebugStatements(code, breakpoints, language);

        console.log('Debug code:', debugCode);

        this.isDebugging = true;
        this.updateDebugUI(true);

        if (window.showNotification) {
            window.showNotification('디버그 모드로 실행 중...', 'info');
        }

        // Execute with debug statements
        return {
            success: true,
            debugCode,
            language
        };
    }

    // Stop debugging
    stopDebugging() {
        this.isDebugging = false;
        this.updateDebugUI(false);
    }

    // Update debug UI
    updateDebugUI(isActive) {
        const startBtn = document.getElementById('debug-start-btn');
        const stopBtn = document.getElementById('debug-stop-btn');
        const continueBtn = document.getElementById('debug-continue-btn');
        const stepOverBtn = document.getElementById('debug-step-over-btn');
        const stepIntoBtn = document.getElementById('debug-step-into-btn');
        const stepOutBtn = document.getElementById('debug-step-out-btn');

        if (startBtn) startBtn.disabled = isActive;
        if (stopBtn) stopBtn.disabled = !isActive;
        if (continueBtn) continueBtn.disabled = !isActive;
        if (stepOverBtn) stepOverBtn.disabled = !isActive;
        if (stepIntoBtn) stepIntoBtn.disabled = !isActive;
        if (stepOutBtn) stepOutBtn.disabled = !isActive;
    }
}

// Export singleton instance
export const simpleDebugger = new SimpleDebugger();
