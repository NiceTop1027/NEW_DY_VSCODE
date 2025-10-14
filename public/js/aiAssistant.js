// AI Assistant with Groq (Free & Fast!)
class AIAssistant {
    constructor() {
        this.apiKey = localStorage.getItem('groq_api_key') || '';
        this.model = localStorage.getItem('groq_model') || 'llama-3.3-70b-versatile';
        this.enabled = !!this.apiKey;
        // Groq 공식 API 엔드포인트
        this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
        
        // Available models
        this.models = {
            'llama-3.3-70b-versatile': { name: 'Llama 3.3 70B', speed: '⚡⚡⚡', quality: '★★★★★' },
            'llama-3.1-70b-versatile': { name: 'Llama 3.1 70B', speed: '⚡⚡⚡', quality: '★★★★☆' },
            'llama-3.1-8b-instant': { name: 'Llama 3.1 8B', speed: '⚡⚡⚡⚡', quality: '★★★☆☆' },
            'mixtral-8x7b-32768': { name: 'Mixtral 8x7B', speed: '⚡⚡', quality: '★★★★☆' }
        };
    }

    // Call Groq API (OpenAI compatible)
    async callAI(prompt, conversationHistory = null) {
        if (!this.apiKey) {
            return '⚠️ Groq API 키가 필요합니다.\n\n1. https://console.groq.com/keys 접속\n2. "Create API Key" 클릭 (무료!)\n3. Activity Bar의 ✨ AI 아이콘을 클릭하여 API 키 입력\n\n✅ 완전 무료\n✅ 한국에서 사용 가능\n✅ 매우 빠른 속도';
        }

        // API 키 형식 검증
        if (!this.apiKey.startsWith('gsk_')) {
            return '❌ API 키 형식이 올바르지 않습니다.\n\nGroq API 키는 "gsk_"로 시작해야 합니다.\n\n새로운 API 키를 발급받아주세요:\nhttps://console.groq.com/keys';
        }

        try {
            // Build messages array with conversation history
            let messages = [];
            
            if (conversationHistory && conversationHistory.length > 0) {
                // Use conversation history
                messages = conversationHistory;
            } else {
                // Single message
                messages = [
                    {
                        role: 'user',
                        content: prompt
                    }
                ];
            }
            
            const requestBody = {
                model: this.model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 2048
            };

            console.log('🚀 Groq API Request:', {
                url: this.baseUrl,
                model: requestBody.model,
                modelInfo: this.models[this.model],
                promptLength: prompt.length,
                apiKeyPrefix: this.apiKey.substring(0, 7) + '...'
            });

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const responseText = await response.text();
            console.log('📥 Groq API Raw Response:', responseText);

            if (!response.ok) {
                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch (e) {
                    errorData = { error: { message: responseText } };
                }
                
                console.error('❌ Groq API Error Details:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorData
                });
                
                if (response.status === 401) {
                    return '❌ API 키가 유효하지 않습니다.\n\n새로운 API 키를 발급받아주세요:\nhttps://console.groq.com/keys';
                } else if (response.status === 400) {
                    const errorMsg = errorData.error?.message || '요청 형식 오류';
                    return `❌ Groq API 오류:\n${errorMsg}\n\nAPI 키를 다시 확인하거나 새로 발급받아주세요.`;
                } else if (response.status === 429) {
                    return '⚠️ 요청 한도를 초과했습니다.\n\n잠시 후 다시 시도해주세요.';
                }
                throw new Error(`API error ${response.status}: ${errorData.error?.message || responseText}`);
            }

            const data = JSON.parse(responseText);
            console.log('✅ Groq API Success:', {
                model: data.model,
                usage: data.usage,
                hasContent: !!data.choices?.[0]?.message?.content
            });
            
            const text = data.choices?.[0]?.message?.content;
            return text || 'No response from AI.';
        } catch (error) {
            console.error('💥 Groq API Fatal Error:', error);
            return `Error: ${error.message}`;
        }
    }

    // Save API key
    saveApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('groq_api_key', key);
        this.enabled = true;
    }

    // Save model
    saveModel(model) {
        this.model = model;
        localStorage.setItem('groq_model', model);
    }

    // Remove API key
    removeApiKey() {
        this.apiKey = '';
        localStorage.removeItem('groq_api_key');
        this.enabled = false;
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
            const prompt = `다음 ${language} 코드를 한국어로 설명해주세요:\n\n${code}`;
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
            const prompt = `다음 ${language} 코드를 수정해주세요. 수정된 코드만 반환하세요:\n\n${code}\n\n오류: ${error || '문법 오류'}`;
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
            const prompt = `${language}로 다음 기능을 구현하는 코드를 작성해주세요: ${description}`;
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
                prompt = `코드:\n${context}\n\n질문: ${message}\n\n한국어로 답변해주세요.`;
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

// Show AI settings modal
export function showAISettings() {
    const hasKey = !!aiAssistant.apiKey;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px;">
            <div class="modal-header">
                <h2>⚡ AI Assistant - Groq</h2>
                <button class="modal-close" id="close-ai-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div style="padding: 20px; background: rgba(59, 130, 246, 0.1); border-radius: 8px;">
                    <h3 style="margin: 0 0 15px 0; color: var(--accent-color); text-align: center;">⚡ 초고속 무료 AI 코딩 어시스턴트</h3>
                    
                    ${!hasKey ? `
                    <div style="margin-bottom: 20px; padding: 15px; background: rgba(251, 191, 36, 0.1); border-radius: 4px; border: 1px solid rgba(251, 191, 36, 0.3);">
                        <p style="margin: 0 0 10px 0; color: #fbbf24; font-weight: 500;">
                            💡 API 키 발급 방법 (1분 소요):
                        </p>
                        <ol style="margin: 0; padding-left: 20px; color: var(--text-secondary); font-size: 13px; line-height: 1.8;">
                            <li><a href="https://console.groq.com/keys" target="_blank" style="color: var(--accent-color);">Groq Console</a> 접속 (구글 로그인)</li>
                            <li>"Create API Key" 버튼 클릭</li>
                            <li>API 키 복사</li>
                            <li>아래에 붙여넣기</li>
                        </ol>
                        <p style="margin: 10px 0 0 0; color: var(--text-secondary); font-size: 12px;">
                            ✅ 완전 무료 • ✅ 한국 사용 가능 • ✅ 신용카드 불필요 • ⚡ 초고속 (Llama 3.1 70B)
                        </p>
                    </div>
                    ` : ''}
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-color);">
                            Groq API Key:
                        </label>
                        <input 
                            type="password" 
                            id="groq-api-key" 
                            placeholder="gsk_..."
                            value="${aiAssistant.apiKey}"
                            style="width: 100%; padding: 12px; background: var(--input-background); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-color); font-family: monospace; font-size: 14px;"
                        />
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-color);">
                            AI 모델 선택:
                        </label>
                        <select 
                            id="groq-model" 
                            style="width: 100%; padding: 12px; background: var(--input-background); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-color); font-size: 14px; cursor: pointer;"
                        >
                            ${Object.entries(aiAssistant.models).map(([key, info]) => `
                                <option value="${key}" ${aiAssistant.model === key ? 'selected' : ''}>
                                    ${info.name} - 속도: ${info.speed} 품질: ${info.quality}
                                </option>
                            `).join('')}
                        </select>
                        <p style="margin: 8px 0 0 0; font-size: 12px; color: var(--text-secondary);">
                            💡 <strong>Llama 3.3 70B</strong>: 최고 품질 (추천!)<br>
                            ⚡ <strong>Llama 3.1 8B</strong>: 최고 속도
                        </p>
                    </div>
                    
                    <div style="margin-bottom: 20px; padding: 15px; background: rgba(0, 0, 0, 0.2); border-radius: 4px;">
                        <p style="margin: 0 0 10px 0; font-weight: 500;">사용 가능한 기능:</p>
                        <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary); line-height: 1.8;">
                            <li>코드 설명 (Ctrl+Shift+E)</li>
                            <li>코드 수정 (Ctrl+Shift+F)</li>
                            <li>코드 생성 (Ctrl+Shift+G)</li>
                            <li>AI 채팅</li>
                        </ul>
                    </div>
                    
                    ${hasKey ? `
                    <div style="margin-bottom: 20px; padding: 10px; background: rgba(34, 197, 94, 0.1); border-radius: 4px; border: 1px solid rgba(34, 197, 94, 0.3); text-align: center;">
                        <p style="margin: 0; color: #22c55e; font-weight: 500;">
                            ✅ AI Assistant 활성화됨!
                        </p>
                    </div>
                    ` : ''}
                    
                    <div style="display: flex; gap: 10px;">
                        <button id="save-groq-key" class="btn btn-primary" style="flex: 1; padding: 12px; font-weight: 500;">
                            💾 저장
                        </button>
                        ${hasKey ? `
                        <button id="remove-groq-key" class="btn btn-secondary" style="flex: 1; padding: 12px; font-weight: 500;">
                            🗑️ 제거
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Save button
    document.getElementById('save-groq-key').addEventListener('click', () => {
        const key = document.getElementById('groq-api-key').value.trim();
        const model = document.getElementById('groq-model').value;
        
        if (key) {
            aiAssistant.saveApiKey(key);
            aiAssistant.saveModel(model);
            showNotification(`✅ 설정이 저장되었습니다! (모델: ${aiAssistant.models[model].name})`, 'success');
            modal.remove();
        } else {
            showNotification('❌ API 키를 입력해주세요', 'error');
        }
    });

    // Remove button
    const removeBtn = document.getElementById('remove-groq-key');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            aiAssistant.removeApiKey();
            showNotification('🗑️ API 키가 제거되었습니다', 'info');
            modal.remove();
        });
    }

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

// Show notification helper
function showNotification(message, type) {
    const event = new CustomEvent('showNotification', { 
        detail: { message, type } 
    });
    document.dispatchEvent(event);
}
