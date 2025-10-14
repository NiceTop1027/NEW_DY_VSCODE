// AI Assistant with multiple API options
class AIAssistant {
    constructor() {
        this.apiKey = null;
        this.provider = 'puter'; // Default to Puter (easiest, works in Korea)
        this.enabled = false;
        this.loadSettings();
    }

    // API endpoints
    getApiUrl() {
        switch (this.provider) {
            case 'puter':
                return null; // Puter uses SDK
            case 'huggingface':
                return 'https://api-inference.huggingface.co/models/bigcode/starcoder';
            case 'openai':
                return 'https://api.openai.com/v1/chat/completions';
            case 'groq':
                return 'https://api.groq.com/openai/v1/chat/completions';
            default:
                return null;
        }
    }

    // Initialize Puter SDK
    async initPuter() {
        if (this.provider !== 'puter') return false;
        
        try {
            // Load Puter SDK if not already loaded
            if (!window.puter) {
                const script = document.createElement('script');
                script.src = 'https://js.puter.com/v2/';
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
            return true;
        } catch (error) {
            console.error('Failed to load Puter SDK:', error);
            return false;
        }
    }

    // Load settings from localStorage
    loadSettings() {
        this.apiKey = localStorage.getItem('ai_api_key');
        this.provider = localStorage.getItem('ai_provider') || 'puter';
        // Puter doesn't need API key
        this.enabled = this.provider === 'puter' ? true : !!this.apiKey;
    }

    // Save settings
    saveSettings(key, provider) {
        this.apiKey = key;
        this.provider = provider;
        localStorage.setItem('ai_api_key', key);
        localStorage.setItem('ai_provider', provider);
        this.enabled = true;
    }

    // Remove settings
    removeSettings() {
        this.apiKey = null;
        this.provider = 'huggingface';
        localStorage.removeItem('ai_api_key');
        localStorage.removeItem('ai_provider');
        this.enabled = false;
    }

    // Get code completion suggestion
    async getCodeCompletion(code, language, cursorPosition) {
        if (!this.enabled) {
            return null;
        }

        try {
            if (this.provider === 'puter') {
                // Puter with Gemini (무료, 한국에서 사용 가능)
                await this.initPuter();
                
                const response = await window.puter.ai.chat(`Complete this ${language} code. Only return the completion, no explanations:\n\n${code}`);
                return response || null;
            } else if (this.provider === 'huggingface') {
                // HuggingFace API (무료, 한국에서 사용 가능)
                const response = await fetch(this.getApiUrl(), {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        inputs: code,
                        parameters: {
                            max_new_tokens: 50,
                            temperature: 0.2,
                            return_full_text: false
                        }
                    })
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const data = await response.json();
                return data[0]?.generated_text || null;
            } else if (this.provider === 'openai' || this.provider === 'groq') {
                // OpenAI/Groq compatible API
                const response = await fetch(this.getApiUrl(), {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: this.provider === 'groq' ? 'llama3-8b-8192' : 'gpt-3.5-turbo',
                        messages: [{
                            role: 'user',
                            content: `Complete this ${language} code:\n${code}`
                        }],
                        temperature: 0.2,
                        max_tokens: 200
                    })
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }

                const data = await response.json();
                return data.choices?.[0]?.message?.content || null;
            }

            return null;
        } catch (error) {
            console.error('AI completion error:', error);
            return null;
        }
    }

    // Explain code
    async explainCode(code, language) {
        if (!this.enabled || !this.apiKey) {
            return 'AI Assistant is not configured. Please add your Gemini API key.';
        }

        try {
            const prompt = `Explain the following ${language} code in a clear and concise way:

\`\`\`${language}
${code}
\`\`\``;

            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 500,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No explanation available.';
        } catch (error) {
            console.error('AI explain error:', error);
            return `Error: ${error.message}`;
        }
    }

    // Fix code errors
    async fixCode(code, language, error) {
        if (!this.enabled || !this.apiKey) {
            return 'AI Assistant is not configured. Please add your Gemini API key.';
        }

        try {
            const prompt = `Fix the following ${language} code that has an error. Return only the corrected code without explanations.

Code:
\`\`\`${language}
${code}
\`\`\`

Error: ${error}

Provide the fixed code:`;

            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 1000,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const fixedCode = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (fixedCode) {
                return fixedCode.trim().replace(/```[\w]*\n?/g, '').trim();
            }

            return code;
        } catch (error) {
            console.error('AI fix error:', error);
            return code;
        }
    }

    // Generate code from description
    async generateCode(description, language) {
        if (!this.enabled || !this.apiKey) {
            return 'AI Assistant is not configured. Please add your Gemini API key.';
        }

        try {
            const prompt = `Generate ${language} code based on this description. Return only the code without explanations.

Description: ${description}

Generate the code:`;

            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 1000,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const code = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (code) {
                return code.trim().replace(/```[\w]*\n?/g, '').trim();
            }

            return '';
        } catch (error) {
            console.error('AI generate error:', error);
            return `Error: ${error.message}`;
        }
    }

    // Chat with AI
    async chat(message, context = '') {
        if (!this.enabled || !this.apiKey) {
            return 'AI Assistant is not configured. Please add your Gemini API key.';
        }

        try {
            let prompt = message;
            if (context) {
                prompt = `Context:\n${context}\n\nQuestion: ${message}`;
            }

            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 800,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response available.';
        } catch (error) {
            console.error('AI chat error:', error);
            return `Error: ${error.message}`;
        }
    }
}

// Create global instance
export const aiAssistant = new AIAssistant();

// Show AI settings modal
export function showAISettings() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2>🤖 AI Assistant Settings</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">
                        AI Provider:
                    </label>
                    <select 
                        id="ai-provider" 
                        style="width: 100%; padding: 10px; background: var(--input-background); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-color); margin-bottom: 15px;"
                    >
                        <option value="puter" ${aiAssistant.provider === 'puter' ? 'selected' : ''}>
                            ✨ Puter + Gemini (무료, 한국 사용 가능, 추천!)
                        </option>
                        <option value="huggingface" ${aiAssistant.provider === 'huggingface' ? 'selected' : ''}>
                            🤗 HuggingFace (무료, 한국 사용 가능)
                        </option>
                        <option value="groq" ${aiAssistant.provider === 'groq' ? 'selected' : ''}>
                            ⚡ Groq (무료, 빠름)
                        </option>
                        <option value="openai" ${aiAssistant.provider === 'openai' ? 'selected' : ''}>
                            🤖 OpenAI (유료)
                        </option>
                    </select>
                    
                    <div id="api-key-info" style="margin-bottom: 10px; padding: 10px; background: rgba(59, 130, 246, 0.1); border-radius: 4px; font-size: 13px;">
                        <p style="margin: 0; color: var(--text-secondary);">
                            <strong>✨ Puter + Gemini:</strong><br>
                            • 완전 무료 (API 키 불필요!)<br>
                            • 한국에서 사용 가능<br>
                            • Google Gemini 모델 사용<br>
                            • 가장 쉬운 설정
                        </p>
                    </div>
                    
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">
                        API Key:
                    </label>
                    <input 
                        type="password" 
                        id="ai-api-key" 
                        placeholder="Enter your API key"
                        value="${aiAssistant.apiKey || ''}"
                        style="width: 100%; padding: 10px; background: var(--input-background); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-color); font-family: monospace;"
                    />
                </div>
                <div style="margin-bottom: 20px;">
                    <p style="color: var(--text-secondary); font-size: 13px;">
                        ✨ Features:<br>
                        • Code completion (like Copilot)<br>
                        • Code explanation<br>
                        • Error fixing<br>
                        • Code generation<br>
                        • AI chat assistant
                    </p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="save-ai-key" class="btn btn-primary" style="flex: 1;">
                        💾 Save
                    </button>
                    <button id="remove-ai-key" class="btn btn-secondary" style="flex: 1;">
                        🗑️ Remove
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Provider change handler
    const providerSelect = document.getElementById('ai-provider');
    const infoDiv = document.getElementById('api-key-info');
    
    const apiKeyInput = document.getElementById('ai-api-key');
    const apiKeyLabel = apiKeyInput.previousElementSibling;
    
    const updateProviderInfo = () => {
        const provider = providerSelect.value;
        let infoHTML = '';
        let requiresKey = true;
        
        if (provider === 'puter') {
            infoHTML = `
                <strong>✨ Puter + Gemini:</strong><br>
                • 완전 무료 (API 키 불필요!)<br>
                • 한국에서 사용 가능<br>
                • Google Gemini 모델 사용<br>
                • 가장 쉬운 설정
            `;
            requiresKey = false;
        } else if (provider === 'huggingface') {
            infoHTML = `
                <strong>🤗 HuggingFace:</strong><br>
                • 무료 API (한국에서 사용 가능)<br>
                • API 키: <a href="https://huggingface.co/settings/tokens" target="_blank" style="color: var(--accent-color);">HuggingFace Tokens</a><br>
                • 코드 자동완성 특화
            `;
        } else if (provider === 'groq') {
            infoHTML = `
                <strong>⚡ Groq:</strong><br>
                • 무료 API (매우 빠름)<br>
                • API 키: <a href="https://console.groq.com/keys" target="_blank" style="color: var(--accent-color);">Groq Console</a><br>
                • Llama 3 모델 사용
            `;
        } else if (provider === 'openai') {
            infoHTML = `
                <strong>🤖 OpenAI:</strong><br>
                • 유료 API<br>
                • API 키: <a href="https://platform.openai.com/api-keys" target="_blank" style="color: var(--accent-color);">OpenAI Platform</a><br>
                • GPT-3.5/4 모델
            `;
        }
        
        infoDiv.innerHTML = `<p style="margin: 0; color: var(--text-secondary);">${infoHTML}</p>`;
        
        // Show/hide API key input based on provider
        if (requiresKey) {
            apiKeyLabel.style.display = 'block';
            apiKeyInput.style.display = 'block';
            apiKeyInput.required = true;
        } else {
            apiKeyLabel.style.display = 'none';
            apiKeyInput.style.display = 'none';
            apiKeyInput.required = false;
        }
    };
    
    providerSelect.addEventListener('change', updateProviderInfo);
    updateProviderInfo(); // Initial call

    // Save button
    document.getElementById('save-ai-key').addEventListener('click', () => {
        const provider = providerSelect.value;
        const key = document.getElementById('ai-api-key').value.trim();
        
        // Puter doesn't need API key
        if (provider === 'puter') {
            aiAssistant.saveSettings('puter-enabled', provider);
            showNotification('✅ AI Assistant enabled with Puter!', 'success');
            modal.remove();
        } else if (key) {
            aiAssistant.saveSettings(key, provider);
            showNotification('✅ AI Assistant enabled!', 'success');
            modal.remove();
        } else {
            showNotification('❌ Please enter an API key', 'error');
        }
    });

    // Remove button
    document.getElementById('remove-ai-key').addEventListener('click', () => {
        aiAssistant.removeSettings();
        showNotification('🗑️ AI Assistant disabled', 'info');
        modal.remove();
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Show notification (assuming it exists in ui.js)
function showNotification(message, type) {
    // This will be imported from ui.js
    if (window.showNotification) {
        window.showNotification(message, type);
    } else {
        console.log(message);
    }
}
