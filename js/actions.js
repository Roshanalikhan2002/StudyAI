// AI Action Handling Module
import { state, updateState } from './state.js';
import { fetchAIResponse } from './ai.js';
import { renderMessage, showTypingIndicator } from './ui.js';

export async function handleAIAction(actionType, originalText, event) {
    if (state.isLoading) return;

    if (event) {
        const btn = event.currentTarget;
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = '', 100);
    }

    updateState('isLoading', true);
    const indicator = showTypingIndicator();
    
    try {
        const response = await fetchAIResponse(originalText, actionType);
        indicator.remove();
        renderMessage(response, false, 'text', handleAIAction);
    } catch (error) {
        console.error("Action Error:", error);
        indicator.remove();
        renderMessage("Sorry, I couldn't generate that for you right now.");
    } finally {
        updateState('isLoading', false);
    }
}
