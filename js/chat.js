// Chat Handling Module
import { state, updateState } from './state.js';
import { fetchAIResponse } from './ai.js';
import { elements, renderMessage, showTypingIndicator } from './ui.js';
import { handleAIAction } from './actions.js';

export async function sendMessage() {
    const text = elements.userInput.value.trim();
    if (!text || state.isLoading) return;

    const startTime = Date.now();
    console.log("Analytics: Message Sent", { userId: state.userId, textLength: text.length });

    elements.userInput.value = '';
    
    // Update State & UI for User
    state.chatHistory.push({ role: 'user', content: text });
    renderMessage(text, true);

    // AI Response Flow
    updateState('isLoading', true);
    const indicator = showTypingIndicator();

    try {
        const response = await fetchAIResponse(text, 'chat');
        if (indicator) indicator.remove();
        
        // Remove previous actions from UI
        const previousActions = document.querySelectorAll('.ai-actions');
        previousActions.forEach(a => a.remove());

        // Update State & UI for AI
        const duration = Date.now() - startTime;
        console.log("Analytics: AI Response Received", { userId: state.userId, duration: `${duration}ms` });

        updateState('lastAIResponse', response);
        state.chatHistory.push({ role: 'ai', content: response });
        renderMessage(response, false, 'text', handleAIAction);
    } catch (error) {
        console.error("AI Error:", error);
        if (indicator) indicator.remove();
        renderMessage(state.language === 'urdu' ? "Maaf kijiye, kuch masla hua hai." : "Sorry, I encountered an error. Please try again.");
    } finally {
        updateState('isLoading', false);
    }
}

export async function handleFileUpload(file) {
    if (!file) return;
    
    renderMessage(file.name, true, 'file');
    updateState('isLoading', true);
    const indicator = showTypingIndicator();
    
    setTimeout(() => {
        if (indicator) indicator.remove();
        const response = state.language === 'urdu' 
            ? `Mujhe apki file "${file.name}" mil gayi hai. Main ise analyze kar raha hoon.` 
            : `I've received your file: "${file.name}". Analyzing it for study material...`;
        renderMessage(response, false, 'text', handleAIAction);
        updateState('isLoading', false);
    }, 1500);
}
