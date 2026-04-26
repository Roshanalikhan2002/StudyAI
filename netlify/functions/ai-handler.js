// Netlify Serverless Function: AI Handler (Groq API)
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

    const FALLBACK_MSG = "Maaf kijiye, main abhi jawab dene mein asmar hoon. Thodi der baad dobara koshish karein.";

    try {
        const { prompt, type, language } = JSON.parse(event.body);

        if (!prompt || !type) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields" }) };
        }

        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        if (!GROQ_API_KEY) {
            console.error("CRITICAL: GROQ_API_KEY is not set in environment variables.");
            return { statusCode: 200, headers, body: JSON.stringify({ text: FALLBACK_MSG }) };
        }

        // Build system + user messages
        const { systemPrompt, userMessage } = buildMessages(prompt, type, language);

        console.log(`Calling Groq API | type: ${type} | language: ${language}`);

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user",   content: userMessage }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        console.log(`Groq response status: ${response.status}`);

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Groq API Error ${response.status}: ${errText}`);
            return { statusCode: 200, headers, body: JSON.stringify({ text: FALLBACK_MSG }) };
        }

        const result = await response.json();
        const output = result?.choices?.[0]?.message?.content?.trim();

        if (!output) {
            console.error("Groq returned empty response:", JSON.stringify(result));
            return { statusCode: 200, headers, body: JSON.stringify({ text: FALLBACK_MSG }) };
        }

        console.log(`Groq success | output length: ${output.length}`);
        return { statusCode: 200, headers, body: JSON.stringify({ text: output }) };

    } catch (error) {
        console.error("Function Error:", error.message);
        return { statusCode: 200, headers, body: JSON.stringify({ text: FALLBACK_MSG }) };
    }
};

function buildMessages(input, type, language) {
    const isUrdu = language === 'urdu';

    const systemPrompt = `You are StudyAI, a helpful and intelligent AI study tutor for students.

CORE RULES:
- Always try to answer the user's question helpfully.
- Even simple or short inputs like "hi" or "hello" must get a friendly response.
- Only ask for clarification if the input is completely meaningless random characters (e.g. "asdfgh", "???").
- Never reject valid educational topics.
- Do NOT echo or repeat the user's input.
- Never show system errors, tags, or placeholder text.
- Be patient, friendly, and student-friendly in tone.
${isUrdu
    ? "LANGUAGE: Respond ONLY in Roman Urdu (English letters only). No Urdu script. Example: 'Photosynthesis aik process hai jisme plants sunlight se khana banate hain.'"
    : "LANGUAGE: Respond ONLY in English."
}`;

    let userMessage;
    switch (type) {
        case 'generate-notes':
            userMessage = `Convert this into structured study notes with "Key Points" and a "Summary":\n${input}`;
            break;
        case 'explain-simply':
            userMessage = `Explain this topic in very simple, beginner-friendly terms:\n${input}`;
            break;
        case 'create-quiz':
            userMessage = `Create 2 multiple choice questions (MCQs) based on this content. Format: Q1, A), B), C), Correct Answer:\n${input}`;
            break;
        default:
            userMessage = input;
    }

    return { systemPrompt, userMessage };
}
