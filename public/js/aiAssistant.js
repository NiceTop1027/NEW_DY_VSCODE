// AI Assistant with Hugging Face (Free, No API Key Required!)
class AIAssistant {
    constructor() {
        this.enabled = true; // Always enabled with free HF API
        this.baseUrl = 'https://api-inference.huggingface.co/models';
    }

    // Get model URL based on task
    getModelUrl(task) {
        switch (task) {
            case 'code':
                return `${this.baseUrl}/Qwen/Qwen2.5-Coder-32B-Instruct`;
            case 'chat':
                return `${this.baseUrl}/meta-llama/Llama-3.2-3B-Instruct`;
            default:
                return `${this.baseUrl}/Qwen/Qwen2.5-Coder-32B-Instruct`;
        }
    }

    // Call Hugging Face API (no auth required for public models)
    async callHuggingFace(prompt, task = 'code') {
        try {
            const response = await fetch(this.getModelUrl(task), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 1000,
                        temperature: 0.3,
                        top_p: 0.95,
                        return_full_text: false
                    }
                })
            });

            if (!response.ok) {
                // If model is loading, wait and retry
                const data = await response.json();
                if (data.error && data.error.includes('loading')) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    return this.callHuggingFace(prompt, task);
                }
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return data[0]?.generated_text || data.generated_text || '';
        } catch (error) {
            console.error('HuggingFace API error:', error);
            throw error;
        }
    }


    // Get code completion suggestion
    async getCodeCompletion(code, language, cursorPosition) {
        try {
            const prompt = `Complete this ${language} code. Return only the next line:\n\n${code}`;
            const result = await this.callHuggingFace(prompt, 'code');
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
            const result = await this.callHuggingFace(prompt, 'chat');
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
            const result = await this.callHuggingFace(prompt, 'code');
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
            const result = await this.callHuggingFace(prompt, 'code');
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
            const result = await this.callHuggingFace(prompt, 'chat');
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
                <h2>🤖 AI Assistant</h2>
                <button class="modal-close" id="close-ai-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div style="padding: 20px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; text-align: center;">
                    <h3 style="margin: 0 0 15px 0; color: var(--accent-color);">✨ 완전 무료 AI 코딩 어시스턴트</h3>
                    <p style="margin: 0 0 10px 0; color: var(--text-secondary);">
                        <strong>Hugging Face Inference API</strong><br>
                        API 키 불필요 • 무제한 사용 • 한국에서 사용 가능
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
                    <div style="margin-top: 20px; padding: 10px; background: rgba(34, 197, 94, 0.1); border-radius: 4px; border: 1px solid rgba(34, 197, 94, 0.3);">
                        <p style="margin: 0; color: #22c55e; font-weight: 500;">
                            ✅ AI Assistant가 활성화되어 있습니다!
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
