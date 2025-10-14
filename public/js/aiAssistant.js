// AI Assistant with Free AI APIs
class AIAssistant {
    constructor() {
        this.enabled = true;
        this.apiUrl = 'https://api.deepseek.com/v1/chat/completions'; // Free tier available
        this.fallbackUrl = 'https://api.groq.com/openai/v1/chat/completions'; // Backup
    }

    // Call AI API with simple prompt
    async callAI(prompt, systemPrompt = 'You are a helpful coding assistant.') {
        try {
            // Try using a simple mock AI for demo (replace with real API later)
            // For now, return a helpful message
            return await this.mockAI(prompt);
        } catch (error) {
            console.error('AI API error:', error);
            throw error;
        }
    }

    // Mock AI for demonstration (returns helpful responses)
    async mockAI(prompt) {
        // Simple pattern matching for common requests
        if (prompt.includes('Explain') || prompt.includes('설명')) {
            return '이 코드는 다음과 같이 동작합니다:\n\n1. 먼저 변수를 선언하고 초기화합니다.\n2. 조건문을 통해 로직을 분기합니다.\n3. 결과를 반환하거나 출력합니다.\n\n더 자세한 설명이 필요하시면 코드의 특정 부분을 선택해주세요.';
        } else if (prompt.includes('Fix') || prompt.includes('수정')) {
            return '// 수정된 코드\n// 문법 오류를 수정했습니다\n// 변수명을 명확하게 변경했습니다\n// 주석을 추가했습니다';
        } else if (prompt.includes('Generate') || prompt.includes('생성')) {
            return '// 생성된 코드 예시\nfunction example() {\n    // TODO: 구현 필요\n    console.log("Hello, World!");\n    return true;\n}';
        } else {
            return '죄송합니다. 현재 AI 기능은 데모 모드입니다.\n\n실제 AI 기능을 사용하려면:\n1. Groq API 키를 발급받으세요 (무료)\n2. https://console.groq.com/keys\n3. Activity Bar의 ✨ AI 아이콘을 클릭하여 설정하세요';
        }
    }


    // Get code completion suggestion
    async getCodeCompletion(code, language, cursorPosition) {
        try {
            const prompt = `Complete this ${language} code. Return only the next line:\n\n${code}`;
            const result = await this.callAI(prompt);
            return result.trim();
        } catch (error) {
            console.error('AI completion error:', error);
            return null;
        }
    }

    // Explain code
    async explainCode(code, language) {
        try {
            const prompt = `Explain this ${language} code in Korean:\n\n\`\`\`${language}\n${code}\n\`\`\``;
            const result = await this.callAI(prompt);
            return result || 'No explanation available.';
        } catch (error) {
            console.error('AI explain error:', error);
            return `Error: ${error.message}`;
        }
    }

    // Fix code errors
    async fixCode(code, language, error) {
        try {
            const prompt = `Fix this ${language} code. Return only the corrected code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nError: ${error}`;
            const result = await this.callAI(prompt);
            return result ? result.trim().replace(/```[\w]*\n?/g, '').trim() : code;
        } catch (error) {
            console.error('AI fix error:', error);
            return code;
        }
    }

    // Generate code from description
    async generateCode(description, language) {
        try {
            const prompt = `Generate ${language} code for: ${description}\n\nReturn only the code:`;
            const result = await this.callAI(prompt);
            return result ? result.trim().replace(/```[\w]*\n?/g, '').trim() : '';
        } catch (error) {
            console.error('AI generate error:', error);
            return `Error: ${error.message}`;
        }
    }

    // Chat with AI
    async chat(message, context = '') {
        try {
            let prompt = message;
            if (context) {
                prompt = `Context:\n${context}\n\nQuestion: ${message}\n\nAnswer in Korean:`;
            }
            const result = await this.callAI(prompt);
            return result || 'No response available.';
        } catch (error) {
            console.error('AI chat error:', error);
            return `Error: ${error.message}`;
        }
    }
}

// Create global instance
export const aiAssistant = new AIAssistant();

// Show AI info modal
export function showAISettings() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>🤖 AI Assistant (데모)</h2>
                <button class="modal-close" id="close-ai-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div style="padding: 20px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; text-align: center;">
                    <h3 style="margin: 0 0 15px 0; color: var(--accent-color);">✨ AI 코딩 어시스턴트</h3>
                    <p style="margin: 0 0 10px 0; color: var(--text-secondary);">
                        <strong>현재 데모 모드로 실행 중</strong><br>
                        간단한 응답만 제공됩니다
                    </p>
                    <div style="margin-top: 20px; padding: 15px; background: rgba(0, 0, 0, 0.2); border-radius: 4px; text-align: left;">
                        <p style="margin: 0 0 10px 0; font-weight: 500;">사용 가능한 기능:</p>
                        <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary);">
                            <li>코드 설명 (Ctrl+Shift+E)</li>
                            <li>코드 수정 (Ctrl+Shift+F)</li>
                            <li>코드 생성 (Ctrl+Shift+G)</li>
                            <li>AI 채팅</li>
                        </ul>
                    </div>
                    <div style="margin-top: 20px; padding: 15px; background: rgba(251, 191, 36, 0.1); border-radius: 4px; border: 1px solid rgba(251, 191, 36, 0.3); text-align: left;">
                        <p style="margin: 0 0 10px 0; color: #fbbf24; font-weight: 500;">
                            💡 실제 AI 기능을 사용하려면:
                        </p>
                        <ol style="margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 13px;">
                            <li>Groq API 키 발급 (무료): <a href="https://console.groq.com/keys" target="_blank" style="color: var(--accent-color);">console.groq.com</a></li>
                            <li>또는 OpenAI API 키 사용</li>
                            <li>코드에 API 키 추가</li>
                        </ol>
                    </div>
                    <div style="margin-top: 20px; padding: 10px; background: rgba(34, 197, 94, 0.1); border-radius: 4px; border: 1px solid rgba(34, 197, 94, 0.3);">
                        <p style="margin: 0; color: #22c55e; font-weight: 500;">
                            ✅ 데모 모드 활성화됨
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close button
    document.getElementById('close-ai-modal').addEventListener('click', () => {
        modal.remove();
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}
