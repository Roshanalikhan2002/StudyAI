// UI Rendering & DOM Updates Module
import { state } from './state.js';

export const elements = {
    chatMessages: document.getElementById('chat-messages'),
    userInput: document.getElementById('user-input'),
    sendBtn: document.getElementById('send-btn'),
    chatContainer: document.querySelector('.chat-container'),
    themeToggle: document.getElementById('theme-toggle'),
    settingsDropdown: document.getElementById('settings-dropdown'),
    profileDropdown: document.getElementById('profile-dropdown'),
    langToggleBtn: document.getElementById('lang-toggle'),
    micBtn: document.getElementById('mic-btn'),
    fileInput: document.getElementById('file-input'),
    onboardingModal: document.getElementById('onboarding-modal'),
    startBtn: document.getElementById('start-btn')
};

export function renderMessage(text, isUser = false, type = 'text', onActionClick = null) {
    const emptyState = document.getElementById('empty-state');
    if (emptyState) emptyState.remove();

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isUser ? 'user-message' : 'ai-message');

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');

    if (type === 'file') {
        contentDiv.innerHTML = `<div style="display: flex; align-items: center; gap: 10px;">
            <i data-lucide="file"></i>
            <span>${text}</span>
        </div>`;
    } else {
        const p = document.createElement('p');
        p.textContent = text;
        contentDiv.appendChild(p);
    }

    if (!isUser && type === 'text') {
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('ai-actions');
        
        const actions = [
            { id: 'generate-notes', icon: 'file-text', label: state.language === 'urdu' ? 'Notes Banayein' : 'Generate Notes' },
            { id: 'explain-simply', icon: 'zap', label: state.language === 'urdu' ? 'Asaan Alfaz' : 'Explain Simply' },
            { id: 'create-quiz', icon: 'help-circle', label: state.language === 'urdu' ? 'Quiz Banayein' : 'Create Quiz' }
        ];

        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.classList.add('action-btn');
            btn.innerHTML = `<i data-lucide="${action.icon}"></i> ${action.label}`;
            btn.dataset.action = action.id;
            btn.dataset.context = text;
            if (onActionClick) {
                btn.onclick = (e) => onActionClick(action.id, text, e);
            }
            actionsDiv.appendChild(btn);
        });

        contentDiv.appendChild(actionsDiv);
    }

    messageDiv.appendChild(contentDiv);
    elements.chatMessages.appendChild(messageDiv);
    
    if (window.lucide) window.lucide.createIcons();
    scrollToBottom();
}

export function renderEmptyState() {
    if (elements.chatMessages.children.length > 0) return;
    const div = document.createElement('div');
    div.id = 'empty-state';
    div.classList.add('empty-state');
    div.innerHTML = `
        <div class="empty-icon"><i data-lucide="message-square"></i></div>
        <h3>No messages yet</h3>
        <p>Start a conversation to begin studying!</p>
    `;
    elements.chatMessages.appendChild(div);
    if (window.lucide) window.lucide.createIcons();
}

export function showOnboarding() {
    elements.onboardingModal.classList.add('active');
}

export function hideOnboarding() {
    elements.onboardingModal.classList.remove('active');
}

export function showTypingIndicator() {
    const indicatorDiv = document.createElement('div');
    indicatorDiv.id = 'typing-indicator-container';
    indicatorDiv.classList.add('message', 'ai-message');
    indicatorDiv.innerHTML = `
        <div class="message-content" style="padding: 12px 20px;">
            <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>
    `;
    elements.chatMessages.appendChild(indicatorDiv);
    scrollToBottom();
    return indicatorDiv;
}

export function scrollToBottom() {
    elements.chatContainer.scrollTo({ top: elements.chatContainer.scrollHeight, behavior: 'smooth' });
}

export function toggleDropdown(dropdown) {
    const all = [elements.settingsDropdown, elements.profileDropdown];
    all.forEach(d => {
        if (d !== dropdown) d.classList.remove('active');
    });
    dropdown.classList.toggle('active');
}

export function updateThemeUI(isDark) {
    const moonIcon = elements.themeToggle.querySelector('i');
    moonIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    if (window.lucide) window.lucide.createIcons();
}

export function clearChatUI() {
    elements.chatMessages.innerHTML = '';
}
