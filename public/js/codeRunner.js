// public/js/codeRunner.js
// Judge0 API를 사용한 다중 언어 코드 실행

const JUDGE0_API = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = '0220526e50mshf341f62d91faccdp17746bjsn0c8744a916f6'; // 무료: https://rapidapi.com/judge0-official/api/judge0-ce

// 언어 ID 매핑 (Judge0 Language IDs - 전체 목록)
const LANGUAGE_IDS = {
    // Assembly
    'asm': 45,         // Assembly (NASM 2.14.02)
    'nasm': 45,
    
    // Bash
    'sh': 46,          // Bash (5.0.0)
    'bash': 46,
    
    // Basic
    'bas': 47,         // Basic (FBC 1.07.1)
    'basic': 47,
    
    // C
    'c': 50,           // C (GCC 9.2.0)
    
    // C++
    'cpp': 54,         // C++ (GCC 9.2.0)
    'cc': 54,
    'cxx': 54,
    'c++': 54,
    
    // C# (C Sharp)
    'cs': 51,          // C# (Mono 6.6.0.161)
    'csharp': 51,
    
    // Clojure
    'clj': 86,         // Clojure (1.10.1)
    'clojure': 86,
    
    // COBOL
    'cob': 77,         // COBOL (GnuCOBOL 2.2)
    'cobol': 77,
    
    // Common Lisp
    'lisp': 55,        // Common Lisp (SBCL 2.0.0)
    'cl': 55,
    
    // D
    'd': 56,           // D (DMD 2.089.1)
    
    // Elixir
    'ex': 57,          // Elixir (1.9.4)
    'exs': 57,
    'elixir': 57,
    
    // Erlang
    'erl': 58,         // Erlang (OTP 22.2)
    'erlang': 58,
    
    // Executable
    'exe': 44,         // Executable
    
    // F#
    'fs': 87,          // F# (.NET Core SDK 3.1.202)
    'fsharp': 87,
    
    // Fortran
    'f90': 59,         // Fortran (GFortran 9.2.0)
    'f': 59,
    'for': 59,
    'fortran': 59,
    
    // Go
    'go': 60,          // Go (1.13.5)
    'golang': 60,
    
    // Groovy
    'groovy': 88,      // Groovy (3.0.3)
    
    // Haskell
    'hs': 61,          // Haskell (GHC 8.8.1)
    'haskell': 61,
    
    // Java
    'java': 62,        // Java (OpenJDK 13.0.1)
    
    // JavaScript
    'js': 63,          // JavaScript (Node.js 12.14.0)
    'javascript': 63,
    
    // Kotlin
    'kt': 78,          // Kotlin (1.3.70)
    'kotlin': 78,
    
    // Lua
    'lua': 64,         // Lua (5.3.5)
    
    // Multi-file program
    'multi': 89,       // Multi-file program
    
    // Objective-C
    'm': 79,           // Objective-C (Clang 7.0.1)
    'objc': 79,
    
    // OCaml
    'ml': 65,          // OCaml (4.09.0)
    'ocaml': 65,
    
    // Octave
    'octave': 66,      // Octave (5.1.0)
    
    // Pascal
    'pas': 67,         // Pascal (FPC 3.0.4)
    'pascal': 67,
    
    // Perl
    'pl': 85,          // Perl (5.28.1)
    'perl': 85,
    
    // PHP
    'php': 68,         // PHP (7.4.1)
    
    // Plain Text
    'txt': 43,         // Plain Text
    'text': 43,
    
    // Prolog
    'pro': 69,         // Prolog (GNU Prolog 1.4.5)
    'prolog': 69,
    
    // Python 2
    'py2': 70,         // Python (2.7.17)
    
    // Python 3
    'py': 71,          // Python (3.8.1)
    'py3': 71,
    'python': 71,
    'python3': 71,
    
    // R
    'r': 80,           // R (4.0.0)
    
    // Ruby
    'rb': 72,          // Ruby (2.7.0)
    'ruby': 72,
    
    // Rust
    'rs': 73,          // Rust (1.40.0)
    'rust': 73,
    
    // Scala
    'scala': 81,       // Scala (2.13.2)
    
    // SQL
    'sql': 82,         // SQL (SQLite 3.27.2)
    
    // Swift
    'swift': 83,       // Swift (5.2.3)
    
    // TypeScript
    'ts': 74,          // TypeScript (3.7.4)
    'typescript': 74,
    
    // Visual Basic.Net
    'vb': 84,          // Visual Basic.Net (vbnc 0.0.0.5943)
    'vbnet': 84,
    
    // C (Clang)
    'clang': 75,       // C (Clang 7.0.1)
    
    // C++ (Clang)
    'clang++': 76,     // C++ (Clang 7.0.1)
};

// Judge0 API 호출 (무료 버전 - API 키 불필요)
const JUDGE0_FREE_API = 'https://judge0-ce.p.rapidapi.com';

// 파일 확장자로 언어 ID 가져오기
function getLanguageId(fileExtension) {
    const ext = fileExtension.toLowerCase().replace('.', '');
    return LANGUAGE_IDS[ext] || null;
}

// 코드 실행
export async function runCode(code, fileExtension) {
    const languageId = getLanguageId(fileExtension);
    
    if (!languageId) {
        const supportedLanguages = Object.keys(LANGUAGE_IDS).sort().join(', ');
        return {
            output: '',
            error: `지원하지 않는 파일 형식: .${fileExtension}\n\n지원하는 확장자:\n${supportedLanguages}`,
            execError: 'Unsupported language'
        };
    }
    
    try {
        // 1. 코드 제출
        const submitResponse = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-RapidAPI-Key': '6526efe7e9msh8b0c8e0a6c7e9b8p1c5e3ajsn9f8e7d6c5b4a',
                'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
            },
            body: JSON.stringify({
                source_code: code,
                language_id: languageId,
                stdin: '',
                cpu_time_limit: 5,
                memory_limit: 128000
            })
        });
        
        if (!submitResponse.ok) {
            throw new Error(`API Error: ${submitResponse.status}`);
        }
        
        const result = await submitResponse.json();
        
        // 결과 처리
        let output = result.stdout || '';
        let error = result.stderr || '';
        let execError = '';
        
        // 컴파일 에러
        if (result.compile_output) {
            error += '\n=== Compile Error ===\n' + result.compile_output;
        }
        
        // 실행 에러
        if (result.status && result.status.id !== 3) { // 3 = Accepted
            execError = result.status.description;
            if (result.message) {
                error += '\n' + result.message;
            }
        }
        
        return {
            output: output.trim(),
            error: error.trim(),
            execError: execError,
            status: result.status?.description || 'Unknown'
        };
        
    } catch (err) {
        console.error('Judge0 API Error:', err);
        return {
            output: '',
            error: `실행 실패: ${err.message}\n\n온라인 컴파일러 서비스에 연결할 수 없습니다.`,
            execError: err.toString()
        };
    }
}

// 지원하는 언어 목록 가져오기
export function getSupportedLanguages() {
    return Object.keys(LANGUAGE_IDS).map(ext => {
        const id = LANGUAGE_IDS[ext];
        return { extension: ext, languageId: id };
    });
}
