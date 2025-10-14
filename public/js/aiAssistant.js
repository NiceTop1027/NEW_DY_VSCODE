// AI Assistant with Gemini API
class AIAssistant {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.enabled = false;
        this.loadApiKey();
    }

    // Load API key from localStorage
    loadApiKey() {
        this.apiKey = localStorage.getItem('gemini_api_key');
        this.enabled = !!this.apiKey;
    }

    // Save API key
    saveApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('gemini_api_key', key);
        this.enabled = true;
    }

    // Remove API key
    removeApiKey() {
        this.apiKey = null;
        localStorage.removeItem('gemini_api_key');
        this.enabled = false;
    }

    // Get code completion suggestion
    async getCodeCompletion(code, language, cursorPosition) {
        if (!this.enabled || !this.apiKey) {
            return null;
        }

        try {
            const prompt = `You are a code completion assistant. Given the following ${language} code and cursor position, suggest the next line or completion. Only return the code suggestion, no explanations.

Current code:
\`\`\`${language}
${code}
\`\`\`

Cursor position: ${cursorPosition}

Provide only the code completion suggestion:`;

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
                        maxOutputTokens: 200,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const suggestion = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (suggestion) {
                // Clean up the suggestion
                return suggestion.trim().replace(/```[\w]*\n?/g, '').trim();
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
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>🤖 AI Assistant Settings</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 20px;">
                    <p style="color: var(--text-secondary); margin-bottom: 10px;">
                        Get your free Gemini API key from: 
                        <a href="https://makersuite.google.com/app/apikey" target="_blank" style="color: var(--accent-color);">
                            Google AI Studio
                        </a>
                    </p>
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">
                        Gemini API Key:
                    </label>
                    <input 
                        type="password" 
                        id="ai-api-key" 
                        placeholder="Enter your Gemini API key"
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

    // Save button
    document.getElementById('save-ai-key').addEventListener('click', () => {
        const key = document.getElementById('ai-api-key').value.trim();
        if (key) {
            aiAssistant.saveApiKey(key);
            showNotification('✅ AI Assistant enabled!', 'success');
            modal.remove();
        } else {
            showNotification('❌ Please enter an API key', 'error');
        }
    });

    // Remove button
    document.getElementById('remove-ai-key').addEventListener('click', () => {
        aiAssistant.removeApiKey();
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
