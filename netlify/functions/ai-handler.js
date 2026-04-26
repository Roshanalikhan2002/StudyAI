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

    const FALLBACK_MSG = "Maaf kijiye, main abhi jawab dene mein qasir hoon. Thodi der baad dobara koshish karein.";

    try {
        const { prompt, type, language } = JSON.parse(event.body);

        if (!prompt || !type) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields" }) };
        }

        const HUGGING_FACE_TOKEN = process.env.HUGGING_FACE_TOKEN;
        if (!HUGGING_FACE_TOKEN) {
            console.error("CRITICAL: HUGGING_FACE_TOKEN is not set in environment variables.");
            return { statusCode: 200, headers, body: JSON.stringify({ text: FALLBACK_MSG }) };
        }

        // Construct Prompt
        const aiPrompt = constructPrompt(prompt, type, language);

        // Call Hugging Face with retry logic (handles model loading / 503)
        const MAX_RETRIES = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`HF API attempt ${attempt}/${MAX_RETRIES}...`);
                
                const response = await fetch(
                    "https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta",
                    {
                        headers: { 
                            Authorization: `Bearer ${HUGGING_FACE_TOKEN}`, 
                            "Content-Type": "application/json",
                            "x-wait-for-model": "true"
                        },
                        method: "POST",
                        body: JSON.stringify({ 
                            inputs: aiPrompt, 
                            parameters: { 
                                max_new_tokens: 400, 
                                temperature: 0.7, 
                                return_full_text: false,
                                do_sample: true
                            }
                        }),
                    }
                );

                // Log status for debugging
                console.log(`HF API response status: ${response.status}`);

                if (response.status === 503) {
                    const errorBody = await response.json().catch(() => ({}));
                    const waitTime = errorBody.estimated_time || 20;
                    console.log(`Model loading, estimated wait: ${waitTime}s. Retrying in 5s...`);
                    // Wait 5s before retry (Netlify function timeout is 10s, so keep retries short)
                    await new Promise(r => setTimeout(r, 5000));
                    lastError = `Model loading (503), estimated time: ${waitTime}s`;
                    continue;
                }

                if (!response.ok) {
                    const errText = await response.text();
                    console.error(`HF API Error ${response.status}: ${errText}`);
                    lastError = `HTTP ${response.status}: ${errText}`;
                    break;
                }

                const result = await response.json();
                console.log("HF API raw result:", JSON.stringify(result).slice(0, 200));

                const output = Array.isArray(result) && result[0]?.generated_text
                    ? result[0].generated_text.trim()
                    : null;

                if (!output) {
                    console.error("HF returned empty/unexpected response:", JSON.stringify(result));
                    lastError = "Empty response from model";
                    break;
                }

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({ text: output })
                };

            } catch (fetchError) {
                console.error(`Fetch error on attempt ${attempt}:`, fetchError.message);
                lastError = fetchError.message;
            }
        }

        // All retries failed
        console.error("All HF API attempts failed. Last error:", lastError);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ text: FALLBACK_MSG })
        };

    } catch (error) {
        console.error("Function Error:", error);
        return { 
            statusCode: 200, 
            headers,
            body: JSON.stringify({ text: FALLBACK_MSG }) 
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

    const langInstruction = language === 'urdu'
        ? "IMPORTANT: Respond ONLY in Roman Urdu (English letters only, no Urdu script)."
        : "IMPORTANT: Respond ONLY in English.";

    const buildPrompt = (userMsg) =>
        `<|system|>\n${systemPrompt}\n${langInstruction}</s>\n<|user|>\n${userMsg}</s>\n<|assistant|>`;

    switch(type) {
        case 'chat':
            return buildPrompt(input);
        case 'generate-notes':
            return buildPrompt(`Convert the following text into structured study notes with "Key Points" and a "Summary": ${input}`);
        case 'explain-simply':
            return buildPrompt(`Explain this topic in very simple, beginner-friendly terms: ${input}`);
        case 'create-quiz':
            return buildPrompt(`Create 2 multiple choice questions (MCQs) based on this content. Format: Q1, A), B), C), Correct Answer. Content: ${input}`);
        default:
            return buildPrompt(input);
    }
}
