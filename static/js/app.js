// DOM Elements
const chatContainer = document.getElementById('chat');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const themeToggle = document.getElementById('theme-toggle');
const clearChatBtn = document.getElementById('clear-chat');
const modelBtn = document.getElementById('model-btn');
const modelMenu = document.getElementById('model-menu');
const modelName = document.getElementById('model-name');
const notification = document.getElementById('notification');
const modelOptions = document.querySelectorAll('.model-option');

// State
let currentTheme = 'light';
let messages = [];
let currentModel = 'llama-3.3-nemotron-super-49b-v1';
let isWaitingForResponse = false;
let eventSource = null;

// Initialize
initTheme();
loadChat();
addWelcomeMessage();

// Event Listeners
themeToggle.addEventListener('click', toggleTheme);
clearChatBtn.addEventListener('click', clearChat);
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keydown', handleKeyDown);
messageInput.addEventListener('input', adjustTextareaHeight);
modelBtn.addEventListener('click', toggleModelMenu);
modelOptions.forEach(option => {
    option.addEventListener('click', () => selectModel(option));
});
document.addEventListener('click', closeModelMenuOnOutsideClick);

// Functions
function initTheme() {
    currentTheme = localStorage.getItem('theme') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = themeToggle.querySelector('i');
    icon.className = currentTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function addWelcomeMessage() {
    if (messages.length === 0) {
        const welcomeMessage = {
            role: 'assistant',
            content: "Hello! I'm Vedantra AI assistant. How can I help you today?\n\nHere are some things I can do:\n- Explain complex technical concepts\n- Help with coding problems\n- Provide detailed analysis\n- Answer general knowledge questions",
            timestamp: new Date(),
            model: currentModel
        };
        addMessageToChat(welcomeMessage);
        messages.push(welcomeMessage);
        saveChat();
    }
}

function addMessageToChat(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}-message`;
    
    const timestamp = message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedContent = formatMessageContent(message.content);
    
    messageDiv.innerHTML = `
        ${message.role === 'user' ? '' : `
        <div class="avatar">
            <i class="fas fa-robot"></i>
        </div>
        `}
        <div class="message-content">
            <div class="message-bubble">${formattedContent}</div>
            <div class="message-actions">
                <span class="message-time">${timestamp}</span>
                <button class="action-btn copy-btn">
                    <i class="fas fa-copy"></i>
                    <span>Copy</span>
                </button>
                ${message.role === 'assistant' ? `
                <button class="action-btn regenerate-btn">
                    <i class="fas fa-sync-alt"></i>
                    <span>Regenerate</span>
                </button>
                ` : ''}
            </div>
        </div>
        ${message.role === 'user' ? `
        <div class="avatar user-avatar">
            <i class="fas fa-user"></i>
        </div>
        ` : ''}
    `;
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
    
    // Add event listeners to action buttons
    const copyBtn = messageDiv.querySelector('.copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => copyMessage(message.content));
    }
    
    const regenerateBtn = messageDiv.querySelector('.regenerate-btn');
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', () => regenerateResponse(message));
    }
}

function formatMessageContent(content) {
    // Simple markdown formatting
    let formatted = content
        // Headings: dynamically handle any number of #
        .replace(/^(\#{1,6}) (.*)$/gm, (_, hashes, text) => {
            const level = hashes.length;
            return `<h${level}>${text}</h${level}>`;
        })
        // Code blocks (```code```)
        .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Bold (**text**)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic (*text*)
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Links [text](url)
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
        // Paragraphs and line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');

    return `<p>${formatted}</p>`;
}



function copyMessage(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Message copied to clipboard!', 'success');
    }).catch(err => {
        showNotification('Failed to copy message', 'error');
        console.error('Failed to copy text: ', err);
    });
}

function showNotification(text, type = 'success') {
    const iconMap = {
        success: 'fa-check-circle',
        warning: 'fa-exclamation-circle',
        error: 'fa-times-circle'
    };
    
    notification.querySelector('i').className = `fas ${iconMap[type]}`;
    notification.querySelector('span').textContent = text;
    notification.className = `notification show ${type}`;
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.className = 'notification', 300);
    }, 3000);
}

function regenerateResponse(message) {
    if (isWaitingForResponse) {
        showNotification('Please wait for current response to complete', 'warning');
        return;
    }
    
    // Find the index of the message to regenerate
    const index = messages.findIndex(m => m.timestamp === message.timestamp);
    if (index !== -1) {
        // Remove all messages after this one
        messages = messages.slice(0, index);
        saveChat();
        
        // Clear chat UI and rebuild
        chatContainer.innerHTML = '';
        messages.forEach(msg => addMessageToChat(msg));
        
        // Get new response
        getAIResponse(messages[messages.length - 1].content);
    }
}

function sendMessage() {
    const content = messageInput.value.trim();
    if (!content) {
        messageInput.focus();
        return;
    }
    
    if (isWaitingForResponse) {
        showNotification('Please wait for current response to complete', 'warning');
        return;
    }
    
    const userMessage = {
        role: 'user',
        content: content,
        timestamp: new Date(),
        model: currentModel
    };
    
    addMessageToChat(userMessage);
    messages.push(userMessage);
    saveChat();
    
    messageInput.value = '';
    adjustTextareaHeight();
    messageInput.focus();
    
    getAIResponse(content);
}

async function getAIResponse(prompt) {
    isWaitingForResponse = true;
    sendBtn.disabled = true;
    
    const typingIndicator = showTypingIndicator();
    let aiMessageDiv = null;
    let aiMessageContent = '';
    
    try {
        // Create a new message container for the AI response
        aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message ai-message';
        aiMessageDiv.innerHTML = `
            <div class="avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble"></div>
                <div class="message-actions">
                    <span class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button class="action-btn copy-btn">
                        <i class="fas fa-copy"></i>
                        <span>Copy</span>
                    </button>
                    <button class="action-btn regenerate-btn">
                        <i class="fas fa-sync-alt"></i>
                        <span>Regenerate</span>
                    </button>
                </div>
            </div>
        `;
        
        chatContainer.appendChild(aiMessageDiv);
        scrollToBottom();
        
        // Get the message bubble element
        const messageBubble = aiMessageDiv.querySelector('.message-bubble');
        
        // Make API call to Flask backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: currentModel,
                messages: [
                    ...messages.map(msg => ({ 
                        role: msg.role, 
                        content: msg.content 
                    })),
                    { role: 'user', content: prompt }
                ]
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        // Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            aiMessageContent += chunk;
            messageBubble.innerHTML = formatMessageContent(aiMessageContent);
            scrollToBottom();
        }
        
        // Save the complete message
        const aiMessage = {
            role: 'assistant',
            content: aiMessageContent,
            timestamp: new Date(),
            model: currentModel
        };
        
        messages.push(aiMessage);
        saveChat();
        
        // Add event listeners to the new message's buttons
        const copyBtn = aiMessageDiv.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => copyMessage(aiMessageContent));
        }
        
        const regenerateBtn = aiMessageDiv.querySelector('.regenerate-btn');
        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', () => regenerateResponse(aiMessage));
        }
        
    } catch (error) {
        console.error('API Error:', error);
        showNotification('Failed to get response. Please try again.', 'error');
        
        // If we created a message div but failed to get a complete response, remove it
        if (aiMessageDiv && aiMessageDiv.parentNode) {
            aiMessageDiv.remove();
        }
    } finally {
        removeTypingIndicator(typingIndicator);
        isWaitingForResponse = false;
        sendBtn.disabled = false;
    }
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message';
    typingDiv.innerHTML = `
        <div class="avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <span class="typing-text">Vedantra AI is typing</span>
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    chatContainer.appendChild(typingDiv);
    scrollToBottom();
    return typingDiv;
}

function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.remove();
    }
}

function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

function adjustTextareaHeight() {
    messageInput.style.height = 'auto';
    messageInput.style.height = `${Math.min(messageInput.scrollHeight, 200)}px`;
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function clearChat() {
    if (isWaitingForResponse) {
        showNotification('Please wait for current response to complete', 'warning');
        return;
    }
    
    if (messages.length > 1 && confirm('Are you sure you want to clear the chat history?')) {
        messages = [];
        chatContainer.innerHTML = '';
        saveChat();
        addWelcomeMessage();
    } else if (messages.length <= 1) {
        showNotification('Chat is already empty', 'warning');
    }
}

function saveChat() {
    localStorage.setItem('vedantra-chat-messages', JSON.stringify(messages));
}

function loadChat() {
    const savedMessages = localStorage.getItem('vedantra-chat-messages');
    if (savedMessages) {
        messages = JSON.parse(savedMessages).map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
        }));
        
        chatContainer.innerHTML = '';
        messages.forEach(msg => addMessageToChat(msg));
    }
}

function toggleModelMenu() {
    modelMenu.classList.toggle('show');
}

function closeModelMenu() {
    modelMenu.classList.remove('show');
}

function closeModelMenuOnOutsideClick(e) {
    if (!modelBtn.contains(e.target) && !modelMenu.contains(e.target)) {
        closeModelMenu();
    }
}

function selectModel(option) {
    const model = option.getAttribute('data-model');
    currentModel = model;
    modelName.textContent = option.querySelector('span').textContent;
    
    // Update active state
    modelOptions.forEach(opt => opt.classList.remove('active'));
    option.classList.add('active');
    
    closeModelMenu();
    showNotification(`Switched to ${modelName.textContent} model`, 'success');
}