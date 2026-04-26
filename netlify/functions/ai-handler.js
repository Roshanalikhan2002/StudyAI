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
                statusCode: response.status, 
                body: JSON.stringify({ error: "Hugging Face API Error" }) 
            };
        }

        const result = await response.json();
        const output = Array.isArray(result) && result[0].generated_text 
            ? result[0].generated_text.trim() 
            : "No response generated";

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ text: output })
        };

    } catch (error) {
        console.error("Function Error:", error);
        return { 
            statusCode: 500, 
            headers,
            body: JSON.stringify({ error: "Internal Server Error" }) 
        };
    }
};

function constructPrompt(input, type, language) {
    const langSuffix = language === 'urdu' ? "IMPORTANT: Respond only in Urdu." : "IMPORTANT: Respond only in English.";
    
    switch(type) {
        case 'chat':
            return `[INST] You are StudyAI, a premium SaaS learning assistant. User question: "${input}". ${langSuffix} [/INST]`;
        case 'generate-notes':
            return `[INST] Convert the following text into structured study notes with "Key Points" and a "Summary". Text: "${input}". ${langSuffix} [/INST]`;
        case 'explain-simply':
            return `[INST] Explain this topic in very simple, beginner-friendly terms. Topic: "${input}". ${langSuffix} [/INST]`;
        case 'create-quiz':
            return `[INST] Create 2 multiple choice questions (MCQs) based on this content. Format: Q1, A), B), C), Correct Answer. Content: "${input}". ${langSuffix} [/INST]`;
        default:
            return input;
    }
}
