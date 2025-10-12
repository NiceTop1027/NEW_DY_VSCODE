// public/js/codeRunner.js
// Multi-language code execution with browser-first approach

import browserRunner from './browserRunner.js';

const PISTON_API = 'https://emkc.org/api/v2/piston';

// Languages that can run in browser
const BROWSER_LANGUAGES = ['python', 'py', 'javascript', 'js'];

// 언어 이름 매핑 (Piston Language Names)
const LANGUAGE_NAMES = {
    // Bash
    'sh': 'bash',
    'bash': 'bash',
    
    // C
    'c': 'c',
    
    // C++
    'cpp': 'c++',
    'cc': 'c++',
    'cxx': 'c++',
    'c++': 'c++',
    
    // C#
    'cs': 'csharp',
    'csharp': 'csharp',
    
    // Go
    'go': 'go',
    'golang': 'go',
    
    // Java
    'java': 'java',
    
    // JavaScript
    'js': 'javascript',
    'javascript': 'javascript',
    
    // TypeScript
    'ts': 'typescript',
    'typescript': 'typescript',
    
    // Python
    'py': 'python',
    'py3': 'python',
    'python': 'python',
    'python3': 'python',
    
    // Ruby
    'rb': 'ruby',
    'ruby': 'ruby',
    
    // Rust
    'rs': 'rust',
    'rust': 'rust',
    
    // PHP
    'php': 'php',
    
    // Swift
    'swift': 'swift',
    
    // Kotlin
    'kt': 'kotlin',
    'kotlin': 'kotlin',
    
    // Scala
    'scala': 'scala',
    
    // R
    'r': 'r',
    
    // Perl
    'pl': 'perl',
    'perl': 'perl',
    
    // Lua
    'lua': 'lua',
    
    // Haskell
    'hs': 'haskell',
    'haskell': 'haskell',
    
    // Assembly
    'asm': 'nasm64',
    'nasm': 'nasm64',
    
    // Fortran
    'f90': 'fortran',
    'f': 'fortran',
    'for': 'fortran',
    'fortran': 'fortran',
    
    // Lisp
    'lisp': 'commonlisp',
    'cl': 'commonlisp',
    
    // Clojure
    'clj': 'clojure',
    'clojure': 'clojure',
    
    // Elixir
    'ex': 'elixir',
    'exs': 'elixir',
    'elixir': 'elixir',
    
    // Erlang
    'erl': 'erlang',
    'erlang': 'erlang',
    
    // F#
    'fs': 'fsharp',
    'fsharp': 'fsharp',
    
    // Groovy
    'groovy': 'groovy',
    
    // OCaml
    'ml': 'ocaml',
    'ocaml': 'ocaml',
    
    // Pascal
    'pas': 'pascal',
    'pascal': 'pascal',
    
    // Prolog
    'pro': 'prolog',
    'prolog': 'prolog',
    
    // D
    'd': 'd',
    
    // Dart
    'dart': 'dart',
    
    // Nim
    'nim': 'nim',
    
    // Zig
    'zig': 'zig',
    
    // Crystal
    'cr': 'crystal',
    'crystal': 'crystal',
    
    // Julia
    'jl': 'julia',
    'julia': 'julia',
    
    // Racket
    'rkt': 'racket',
    'racket': 'racket',
};

// 파일 확장자로 언어 이름 가져오기
function getLanguageName(fileExtension) {
    const ext = fileExtension.toLowerCase().replace('.', '');
    return LANGUAGE_NAMES[ext] || null;
}

// 코드 실행 (Browser-first approach)
export async function runCode(code, fileExtension, onOutput) {
    const language = getLanguageName(fileExtension);
    const ext = fileExtension.toLowerCase().replace('.', '');
    
    if (!language) {
        const supportedLanguages = Object.keys(LANGUAGE_NAMES).sort().join(', ');
        return {
            output: '',
            error: `지원하지 않는 파일 형식: .${fileExtension}\n\n지원하는 확장자:\n${supportedLanguages}`,
            execError: 'Unsupported language'
        };
    }
    
    // Try browser execution first for supported languages
    if (BROWSER_LANGUAGES.includes(ext)) {
        try {
            console.log(`🌐 Running ${language} in browser...`);
            if (onOutput) onOutput(`🌐 Running ${language} in browser...\n`);
            
            const result = await browserRunner.runCode(code, language, onOutput);
            
            if (result.success) {
                return {
                    output: result.output,
                    error: '',
                    execError: '',
                    language: language,
                    version: 'browser',
                    executionMode: 'browser'
                };
            } else {
                // Browser execution failed, fallback to Piston
                console.log('Browser execution failed, falling back to Piston...');
                if (onOutput) onOutput('\n⚠️ Browser execution failed, using online compiler...\n\n');
            }
        } catch (err) {
            console.error('Browser execution error:', err);
            if (onOutput) onOutput(`\n⚠️ Browser error: ${err.message}\nFalling back to online compiler...\n\n`);
        }
    }
    
    // Fallback to Piston API for other languages or if browser failed
    try {
        console.log(`☁️ Running ${language} on Piston API...`);
        if (onOutput) onOutput(`☁️ Running ${language} on online compiler...\n`);
        
        const response = await fetch(`${PISTON_API}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                language: language,
                version: '*',
                files: [{
                    content: code
                }],
                stdin: '',
                args: [],
                compile_timeout: 10000,
                run_timeout: 3000,
                compile_memory_limit: -1,
                run_memory_limit: -1
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const result = await response.json();
        
        let output = result.run?.output || '';
        let error = result.run?.stderr || '';
        let execError = '';
        
        if (result.compile && result.compile.output) {
            error += '\n=== Compile Output ===\n' + result.compile.output;
        }
        
        if (result.run && result.run.code !== 0) {
            execError = `Exit code: ${result.run.code}`;
        }
        
        if (onOutput && output) onOutput(output);
        if (onOutput && error) onOutput(error);
        
        return {
            output: output.trim(),
            error: error.trim(),
            execError: execError,
            language: language,
            version: result.language || 'unknown',
            executionMode: 'piston'
        };
        
    } catch (err) {
        console.error('Piston API Error:', err);
        const errorMsg = `실행 실패: ${err.message}\n\n온라인 컴파일러 서비스에 연결할 수 없습니다.`;
        if (onOutput) onOutput(errorMsg);
        return {
            output: '',
            error: errorMsg,
            execError: err.toString()
        };
    }
}

// 지원하는 언어 목록 가져오기
export function getSupportedLanguages() {
    return Object.keys(LANGUAGE_NAMES).map(ext => {
        const name = LANGUAGE_NAMES[ext];
        return { extension: ext, languageName: name };
    });
}
