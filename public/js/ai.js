// AI Assistant Module
class AIAssistant {
    constructor() {
        this.models = [];
        this.currentModel = null;
        this.currentProvider = 'openrouter';
        this.messages = [];
        this.chatContainer = null;
        this.init();
    }
    
    async init() {
        try {
            const result = await API.getAIModels();
            this.models = result.models;
            this.currentModel = this.models.openrouter[0].id;
            this.currentProvider = 'openrouter';
        } catch (error) {
            console.error('Failed to load AI models:', error);
        }
    }
    
    render() {
        const container = document.getElementById('contentContainer');
        container.innerHTML = `
            <div class="ai-chat-container">
                <div class="model-selector">
                    <i class="fas fa-microchip"></i>
                    <select id="aiProvider">
                        <option value="openrouter">OpenRouter (Free)</option>
                        <option value="sambanova">SambaNova (Free)</option>
                    </select>
                    <select id="aiModel"></select>
                    <button id="clearChat" class="btn btn-sm">Clear Chat</button>
                </div>
                <div class="ai-messages" id="aiMessages">
                    <div class="ai-message assistant">
                        <div class="message-content">
                            👋 Hello! I'm your AI assistant. I can help you with:
                            <ul style="margin-top: 8px;">
                                <li>Finding videos and PDFs</li>
                                <li>Opening your last watched video</li>
                                <li>Searching for specific topics</li>
                                <li>Managing your favorites</li>
                                <li>Answering questions about courses</li>
                            </ul>
                            <strong>Try saying:</strong> "Open my last video" or "Find history videos about maths"
                        </div>
                    </div>
                </div>
                <div class="ai-input-container">
                    <input type="text" id="aiInput" placeholder="Ask me anything..." autocomplete="off">
                    <button id="aiSendBtn" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        `;
        
        this.chatContainer = document.getElementById('aiMessages');
        
        // Populate models
        this.updateModelSelect();
        
        // Event listeners
        document.getElementById('aiProvider').addEventListener('change', (e) => {
            this.currentProvider = e.target.value;
            this.updateModelSelect();
        });
        
        document.getElementById('aiModel').addEventListener('change', (e) => {
            this.currentModel = e.target.value;
        });
        
        document.getElementById('clearChat').addEventListener('click', () => {
            this.messages = [];
            this.chatContainer.innerHTML = '';
            Utils.showToast('Chat cleared', 'success');
        });
        
        document.getElementById('aiSendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('aiInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    }
    
    updateModelSelect() {
        const modelSelect = document.getElementById('aiModel');
        const models = this.models[this.currentProvider] || [];
        modelSelect.innerHTML = models.map(m => 
            `<option value="${m.id}" ${m.id === this.currentModel ? 'selected' : ''}>${m.name}</option>`
        ).join('');
        this.currentModel = modelSelect.value;
    }
    
    async sendMessage() {
        const input = document.getElementById('aiInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        // Add user message
        this.addMessage(message, 'user');
        input.value = '';
        
        // Show typing indicator
        const typingId = this.showTypingIndicator();
        
        try {
            // First, check if it's a command
            const commandResult = await API.aiCommand(message, {
                history: userData.history.slice(0, 10),
                favorites: userData.favorites,
                completed: userData.completedItems
            });
            
            if (commandResult.action && commandResult.action !== 'answer') {
                // Execute command
                this.executeCommand(commandResult);
                this.removeTypingIndicator(typingId);
                return;
            }
            
            // Regular chat
            const userMessages = this.messages.map(m => ({
                role: m.role,
                content: m.content
            }));
            userMessages.push({ role: 'user', content: message });
            
            const result = await API.aiChat(
                this.currentModel,
                userMessages,
                this.currentProvider
            );
            
            this.removeTypingIndicator(typingId);
            this.addMessage(result.response, 'assistant');
            
            // Save to history
            this.messages.push({ role: 'user', content: message });
            this.messages.push({ role: 'assistant', content: result.response });
            
        } catch (error) {
            this.removeTypingIndicator(typingId);
            this.addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
            console.error('AI error:', error);
        }
    }
    
    executeCommand(command) {
        switch (command.action) {
            case 'open_video':
                if (command.data) {
                    // Open video
                    const item = command.data;
                    if (item.url) {
                        universalPlayer.play(item.url, item, item.app);
                        document.getElementById('playerModal').classList.add('show');
                    } else {
                        // Fetch video URL first
                        this.fetchAndPlayVideo(item);
                    }
                }
                break;
                
            case 'search':
                // Trigger search
                document.getElementById('searchBtn').click();
                document.getElementById('searchInput').value = command.data.query || '';
                document.getElementById('searchInput').dispatchEvent(new Event('input'));
                break;
                
            case 'favorite':
                Utils.showToast('Added to favorites', 'success');
                // Trigger favorite action
                break;
                
            case 'answer':
            default:
                this.addMessage(command.message, 'assistant');
                break;
        }
    }
    
    async fetchAndPlayVideo(item) {
        try {
            const result = await API.getVideo(item.app, item.id, item.batchId, item);
            if (result.videoData?.data?.link?.file_url) {
                const videoUrl = result.videoData.data.link.file_url;
                universalPlayer.play(videoUrl, item, item.app);
                document.getElementById('playerModal').classList.add('show');
            } else {
                this.addMessage('Could not fetch video URL. Please try again.', 'assistant');
            }
        } catch (error) {
            this.addMessage('Failed to load video: ' + error.message, 'assistant');
        }
    }
    
    addMessage(content, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${role}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                ${this.formatMessage(content)}
            </div>
        `;
        this.chatContainer.appendChild(messageDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }
    
    showTypingIndicator() {
        const id = 'typing_' + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.id = id;
        typingDiv.className = 'ai-message assistant';
        typingDiv.innerHTML = `
            <div class="message-content">
                <span class="typing-dots">...</span>
            </div>
        `;
        this.chatContainer.appendChild(typingDiv);
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        return id;
    }
    
    removeTypingIndicator(id) {
        const indicator = document.getElementById(id);
        if (indicator) indicator.remove();
    }
    
    formatMessage(content) {
        // Convert URLs to links
        content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
        // Convert line breaks
        content = content.replace(/\n/g, '<br>');
        return content;
    }
}

let aiAssistant;

document.addEventListener('DOMContentLoaded', () => {
    aiAssistant = new AIAssistant();
});