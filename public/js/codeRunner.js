// public/js/codeRunner.js
// Piston API를 사용한 다중 언어 코드 실행 (완전 무료, API 키 불필요)

const PISTON_API = 'https://emkc.org/api/v2/piston';

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

// 코드 실행
export async function runCode(code, fileExtension) {
    const language = getLanguageName(fileExtension);
    
    if (!language) {
        const supportedLanguages = Object.keys(LANGUAGE_NAMES).sort().join(', ');
        return {
            output: '',
            error: `지원하지 않는 파일 형식: .${fileExtension}\n\n지원하는 확장자:\n${supportedLanguages}`,
            execError: 'Unsupported language'
        };
    }
    
    try {
        // Piston API 호출
        const response = await fetch(`${PISTON_API}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                language: language,
                version: '*', // 최신 버전 사용
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
        
        // 결과 처리
        let output = result.run?.output || '';
        let error = result.run?.stderr || '';
        let execError = '';
        
        // 컴파일 에러
        if (result.compile && result.compile.output) {
            error += '\n=== Compile Output ===\n' + result.compile.output;
        }
        
        // 실행 에러
        if (result.run && result.run.code !== 0) {
            execError = `Exit code: ${result.run.code}`;
        }
        
        return {
            output: output.trim(),
            error: error.trim(),
            execError: execError,
            language: language,
            version: result.language || 'unknown'
        };
        
    } catch (err) {
        console.error('Piston API Error:', err);
        return {
            output: '',
            error: `실행 실패: ${err.message}\n\n온라인 컴파일러 서비스에 연결할 수 없습니다.`,
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
