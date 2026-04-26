// Netlify Serverless Function: AI Handler
// Path: /netlify/functions/ai-handler.js

export const handler = async (event) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json"
    };

    // Handle Preflight
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, headers, body: "Method Not Allowed" };
    }

    try {
        const { prompt, type, language } = JSON.parse(event.body);

        if (!prompt || !type) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields" }) };
        }
        const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN;

        if (!HUGGING_FACE_TOKEN) {
            return { 
                statusCode: 500, 
                body: JSON.stringify({ error: "API Token Missing in Environment" }) 
            };
        }

        // Construct Prompt
        const aiPrompt = constructPrompt(prompt, type, language);

        // Call Hugging Face
        const response = await fetch(
            "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
            {
                headers: { 
                    Authorization: `Bearer ${HUGGING_FACE_TOKEN}`, 
                    "Content-Type": "application/json" 
                },
                method: "POST",
                body: JSON.stringify({ 
                    inputs: aiPrompt, 
                    parameters: { max_new_tokens: 500, temperature: 0.7, return_full_text: false } 
                }),
            }
        );

        if (!response.ok) {
            return { 
                statusCode: 200, 
                headers,
                body: JSON.stringify({ text: "Main is waqt is sawal ka jawab nahi de sakta. Baraye meherbani thora detail mein sawal poochein." }) 
            };
        }

        const result = await response.json();
        const output = Array.isArray(result) && result[0].generated_text 
            ? result[0].generated_text.trim() 
            : "Main is waqt is sawal ka jawab nahi de sakta. Baraye meherbani thora detail mein sawal poochein.";

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ text: output })
        };

    } catch (error) {
        console.error("Function Error:", error);
        return { 
            statusCode: 200, 
            headers,
            body: JSON.stringify({ text: "Main is waqt is sawal ka jawab nahi de sakta. Baraye meherbani thora detail mein sawal poochein." }) 
        };
    }
};

function constructPrompt(input, type, language) {
    const systemPrompt = `You are StudyAI, a professional AI study tutor.

RULES:
- Always respond in Roman Urdu (English letters only) if language is set to Urdu, otherwise English.
- Never repeat or echo user input.
- Never show fallback or placeholder text to users.
- If question is unclear or too short, ask a polite clarification question.
- Always give educational, structured, and helpful explanations.
- Maintain consistent tone suitable for students.`;

    const langInstruction = language === 'urdu' ? "IMPORTANT: Respond ONLY in Roman Urdu (English letters)." : "IMPORTANT: Respond ONLY in English.";
    
    switch(type) {
        case 'chat':
            return `[INST] ${systemPrompt}\n\nUser question: "${input}".\n${langInstruction} [/INST]`;
        case 'generate-notes':
            return `[INST] ${systemPrompt}\n\nConvert the following text into structured study notes with "Key Points" and a "Summary". Text: "${input}".\n${langInstruction} [/INST]`;
        case 'explain-simply':
            return `[INST] ${systemPrompt}\n\nExplain this topic in very simple, beginner-friendly terms. Topic: "${input}".\n${langInstruction} [/INST]`;
        case 'create-quiz':
            return `[INST] ${systemPrompt}\n\nCreate 2 multiple choice questions (MCQs) based on this content. Format: Q1, A), B), C), Correct Answer. Content: "${input}".\n${langInstruction} [/INST]`;
        default:
            return `[INST] ${systemPrompt}\n\nInput: "${input}".\n${langInstruction} [/INST]`;
    }
}
