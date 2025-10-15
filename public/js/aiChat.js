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
        // Add user message to history
        chatHistory.push({ role: 'user', content: message });
        
        // Get current editor context for first message
        let messages = [...chatHistory];
        if (chatHistory.length === 1) {
            const context = getCurrentEditorContext();
            if (context) {
                // Add system message with context
                messages.unshift({
                    role: 'system',
                    content: `당신은 친절한 코딩 어시스턴트입니다. 한국어로 답변해주세요.\n\n${context}`
                });
            }
        }
        
        // Call AI with conversation history
        const response = await aiAssistant.callAI('', messages);
        
        // Remove loading
        loadingDiv.remove();
        
        // Add AI response
        addMessage('assistant', response);
        
        // Save AI response to history
        chatHistory.push({ role: 'assistant', content: response });
        
        // Keep only last 10 messages to avoid token limit
        if (chatHistory.length > 20) {
            chatHistory = chatHistory.slice(-20);
        }
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
    
    // Parse markdown for AI messages
    if (role === 'assistant') {
        contentDiv.innerHTML = parseMarkdown(content);
    } else {
        contentDiv.textContent = content;
    }
    
    messageDiv.appendChild(label);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Parse markdown to HTML
function parseMarkdown(text) {
    // Escape HTML first
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Code blocks with language (```language\ncode\n```)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        const language = lang || 'text';
        // Preserve newlines in code - only trim start/end whitespace
        const trimmedCode = code.replace(/^\n+/, '').replace(/\n+$/, '');
        return `<div class="code-block"><div class="code-block-header"><span class="code-language">${language}</span><button class="code-copy-btn" onclick="copyCodeBlock(this)" title="복사"><i class="codicon codicon-copy"></i></button></div><pre><code class="language-${language}">${trimmedCode}</code></pre></div>`;
    });
    
    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Bold (**text** or __text__)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Italic (*text* or _text_)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    return html;
}

// Global function for copying code blocks
window.copyCodeBlock = function(button) {
    const codeBlock = button.closest('.code-block');
    const code = codeBlock.querySelector('code').textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="codicon codicon-check"></i>';
        button.style.color = '#22c55e';
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.color = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
};

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
