// Main Entry Point
import { state, updateState } from './state.js';
import { elements, renderMessage, toggleDropdown, updateThemeUI, clearChatUI, showOnboarding, hideOnboarding, renderEmptyState } from './ui.js';
import { sendMessage, handleFileUpload } from './chat.js';
import { handleAIAction } from './actions.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- Onboarding Flow ---
    if (!state.onboarded) {
        showOnboarding();
        elements.startBtn.addEventListener('click', () => {
            hideOnboarding();
            updateState('onboarded', true);
            console.log("Analytics: Onboarding Completed", { userId: state.userId });
        });
    }

    // --- Restore Chat History ---
    if (state.chatHistory.length > 0) {
        state.chatHistory.forEach(msg => {
            renderMessage(msg.content, msg.role === 'user', 'text', handleAIAction);
        });
    } else {
        renderEmptyState();
    }
    
    console.log("Analytics: Session Started", { userId: state.userId, chatCount: state.chatHistory.length });
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // --- Navbar Listeners ---
    elements.themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        updateState('theme', isDark ? 'dark' : 'light');
        updateThemeUI(isDark);
    });

    document.getElementById('settings-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(elements.settingsDropdown);
    });

    document.getElementById('profile-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(elements.profileDropdown);
    });

    document.addEventListener('click', () => {
        elements.settingsDropdown.classList.remove('active');
        elements.profileDropdown.classList.remove('active');
    });

    // --- Settings Listeners ---
    document.getElementById('clear-chat').addEventListener('click', () => {
        clearChatUI();
        updateState('chatHistory', []);
        updateState('lastAIResponse', "");
        renderMessage(state.language === 'urdu' ? "Chat clear ho gayi hai. Main apki kaise madad kar sakta hoon?" : "Chat cleared. How can I help you today?");
    });

    elements.langToggleBtn.addEventListener('click', () => {
        const newLang = state.language === 'urdu' ? 'english' : 'urdu';
        updateState('language', newLang);
        elements.langToggleBtn.innerHTML = `<i data-lucide="languages"></i> ${newLang === 'urdu' ? 'Switch to English' : 'Switch to Urdu'}`;
        if (window.lucide) window.lucide.createIcons();
        renderMessage(newLang === 'urdu' ? "Ab AI Urdu mein jawab dega." : "AI will now respond in English.");
    });

    document.getElementById('menu-theme-toggle').addEventListener('click', () => {
        elements.themeToggle.click();
    });

    // --- Input Enhancements ---
    
    // Voice Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.onstart = () => {
            updateState('isRecording', true);
            elements.micBtn.classList.add('active');
            elements.userInput.placeholder = "Listening...";
        };

        recognition.onresult = (event) => {
            elements.userInput.value = event.results[0][0].transcript;
        };

        recognition.onend = () => {
            updateState('isRecording', false);
            elements.micBtn.classList.remove('active');
            elements.userInput.placeholder = "Ask anything about your studies...";
        };

        elements.micBtn.addEventListener('click', () => {
            if (state.isRecording) recognition.stop();
            else recognition.start();
        });
    }

    // File Upload
    document.getElementById('attach-btn').addEventListener('click', () => elements.fileInput.click());
    elements.fileInput.addEventListener('change', (e) => handleFileUpload(e.target.files[0]));

    // Initialize initial message click handler for existing buttons (if any)
    const initialActions = document.querySelectorAll('.action-btn');
    initialActions.forEach(btn => {
        btn.onclick = (e) => handleAIAction(btn.dataset.action || 'generate-notes', "Welcome message context", e);
    });
});
