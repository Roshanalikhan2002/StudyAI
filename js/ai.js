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
    return text;
}

function generateMockResponse(prompt, type) {
    const isUrdu = state.language === "urdu";
    if (isUrdu) {
        switch(type) {
            case 'generate-notes': return "📝 NOTES (Urdu): Bunyadi tasawurat extraction... [Fallback]";
            case 'create-quiz': return "❓ QUIZ (Urdu): Q1: Aham tareef... [Fallback]";
            default: return `Is topic ka Urdu explanation: "${prompt}" ke mutabiq samjha gaya hai. [Fallback]`;
        }
    }
    return `AI response for "${prompt}" in English mode. [Fallback]`;
}
