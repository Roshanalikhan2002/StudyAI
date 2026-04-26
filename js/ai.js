// AI Response Engine Module (Netlify Proxy Integration)
import { state, updateState } from './state.js';

export async function fetchAIResponse(prompt, type = 'chat') {
    updateState('error', null);
    
    try {
        const response = await fetch("/.netlify/functions/ai-handler", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                prompt: prompt, 
                type: type, 
                language: state.language 
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Backend Function Failed");
        }

        const result = await response.json();
        return formatAIResponse(result.text);

    } catch (error) {
        console.error("AI Proxy Error:", error);
        updateState('error', error.message);
        // Robust Fallback to localized mock
        return formatAIResponse(generateMockResponse(prompt, type));
    }
}

function formatAIResponse(text) {
    // Clean any potential [Fallback] tags or prompt leakage if they somehow get through
    return text.replace(/\[Fallback\]/gi, '').trim();
}

function generateMockResponse(prompt, type) {
    return "Main is waqt is sawal ka jawab nahi de sakta. Baraye meherbani thora detail mein sawal poochein.";
}
