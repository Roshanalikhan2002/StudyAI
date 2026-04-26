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
    const systemPrompt = `You are StudyAI, a helpful and intelligent AI study tutor for students.

CORE BEHAVIOR RULES:
- Always try to answer the user's question first.
- Even if the question is short, basic, or simple, provide a helpful explanation.
- Only ask for clarification if the input is completely meaningless (e.g. random characters like "asdfgh", "???").
- Never reject valid educational topics like science, math, history, or general knowledge.
- Do not echo or repeat the user's input in your response.
- Never show system errors, fallback tags, or placeholder text to users.
- Always maintain a patient, friendly, and student-friendly tone.

EXAMPLES OF CORRECT BEHAVIOR:
- User: "hi" → Respond: "Hello! Aap kis topic ke baray mein seekhna chahte hain?"
- User: "binary number system" → Give a clear explanation of binary numbers.
- User: "asdfgh" → Only then ask for a clear question.`;

    const langInstruction = language === 'urdu' ? "IMPORTANT: Respond ONLY in Roman Urdu (English letters only, no Urdu script)." : "IMPORTANT: Respond ONLY in English.";
    
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
