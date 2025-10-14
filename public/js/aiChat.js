// AI Chat Panel
import { aiAssistant } from './aiAssistant.js';

let chatHistory = [];

export function initAIChat() {
    const chatPanel = document.getElementById('ai-chat-panel');
    const chatToggleBtn = document.getElementById('ai-chat-toggle-btn');
    const chatCloseBtn = document.getElementById('ai-chat-close');
    const chatInput = document.getElementById('ai-chat-input');
    const chatSendBtn = document.getElementById('ai-chat-send');
    const chatMessages = document.getElementById('ai-chat-messages');

    // Toggle chat panel
    if (chatToggleBtn) {
        chatToggleBtn.addEventListener('click', () => {
            toggleChatPanel();
        });
    }

    // Close chat panel
    if (chatCloseBtn) {
        chatCloseBtn.addEventListener('click', () => {
            chatPanel.style.display = 'none';
        });
    }

    // Send message
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', () => {
            sendMessage();
        });
    }

    // Send on Shift+Enter
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Keyboard shortcut: Ctrl+Shift+I
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            toggleChatPanel();
        }
    });
}

function toggleChatPanel() {
    const chatPanel = document.getElementById('ai-chat-panel');
    if (chatPanel.style.display === 'none') {
        chatPanel.style.display = 'flex';
        document.getElementById('ai-chat-input').focus();
    } else {
        chatPanel.style.display = 'none';
    }
}

async function sendMessage() {
    const chatInput = document.getElementById('ai-chat-input');
    const chatMessages = document.getElementById('ai-chat-messages');
    const chatSendBtn = document.getElementById('ai-chat-send');
    
    const message = chatInput.value.trim();
    if (!message) return;

    // Check if AI is enabled
    if (!aiAssistant.enabled) {
        addMessage('assistant', '⚠️ AI Assistant를 먼저 설정해주세요.\n\nActivity Bar의 ✨ AI 아이콘을 클릭하여 Groq API 키를 입력하세요.');
        return;
    }

    // Clear welcome message
    const welcome = chatMessages.querySelector('.ai-chat-welcome');
    if (welcome) {
        welcome.remove();
    }

    // Add user message
    addMessage('user', message);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Disable input while processing
    chatInput.disabled = true;
    chatSendBtn.disabled = true;

    // Add loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'ai-chat-loading';
    loadingDiv.textContent = 'AI가 응답중입니다...';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        // Get current editor context
        const context = getCurrentEditorContext();
        
        // Call AI
        const response = await aiAssistant.chat(message, context);
        
        // Remove loading
        loadingDiv.remove();
        
        // Add AI response
        addMessage('assistant', response);
        
        // Save to history
        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: response });
    } catch (error) {
        loadingDiv.remove();
        addMessage('assistant', `❌ 오류가 발생했습니다: ${error.message}`);
    } finally {
        // Re-enable input
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
    }
}

function addMessage(role, content) {
    const chatMessages = document.getElementById('ai-chat-messages');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-chat-message ${role}`;
    
    const label = document.createElement('div');
    label.className = 'ai-chat-message-label';
    label.textContent = role === 'user' ? 'You' : 'AI Assistant';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'ai-chat-message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(label);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getCurrentEditorContext() {
    try {
        // Get editor instance from window
        const editor = window.monaco?.editor?.getEditors?.()?.[0];
        if (!editor) return '';
        
        const selection = editor.getSelection();
        const model = editor.getModel();
        if (!model) return '';
        
        // If there's a selection, use it
        if (selection && !selection.isEmpty()) {
            const selectedText = model.getValueInRange(selection);
            const language = model.getLanguageId();
            return `Current file (${language}):\n\`\`\`${language}\n${selectedText}\n\`\`\``;
        }
        
        // Otherwise, use visible lines
        const visibleRanges = editor.getVisibleRanges();
        if (visibleRanges && visibleRanges.length > 0) {
            const visibleText = model.getValueInRange(visibleRanges[0]);
            const language = model.getLanguageId();
            return `Current file (${language}):\n\`\`\`${language}\n${visibleText.substring(0, 500)}...\n\`\`\``;
        }
        
        return '';
    } catch (error) {
        console.error('Error getting editor context:', error);
        return '';
    }
}

export function clearChatHistory() {
    chatHistory = [];
    const chatMessages = document.getElementById('ai-chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="ai-chat-welcome">
                <i class="codicon codicon-sparkle" style="font-size: 48px; opacity: 0.5;"></i>
                <h3>AI 코딩 어시스턴트</h3>
                <p>코드에 대해 질문하거나 도움을 요청하세요</p>
            </div>
        `;
    }
}
