const dialogflow = require("@google-cloud/dialogflow");
const axios = require("axios");
const path = require("path");
require("dotenv").config();

const sessionClient = new dialogflow.SessionsClient({
    keyFilename: path.join(__dirname, "../config/dialogflow.json"),
});

const projectId = "chatbotgias-kx9y"; // ID de tu agente Dialogflow
const conversationHistory = []; // Historial de conversación

const sendMessageToChatbot = async (req, res) => {
    const message = req.body.message;
    const sessionId = "12345"; // Se puede generar dinámicamente

    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: message,
                languageCode: "es", // ✅ Se asegura de que Dialogflow procese en español
            },
        },
    };

    try {
        // **1️⃣ Intentamos obtener una respuesta de Dialogflow**
        const responses = await sessionClient.detectIntent(request);
        const result = responses[0].queryResult;

        if (
            result.intent &&
            result.intent.displayName !== "Default Fallback Intent" &&
            result.intentDetectionConfidence > 0.9 // 🔹 Se baja la confianza a 0.6 para mejorar coincidencias
        ) {
            return res.json({ response: result.fulfillmentText });
        }

        // **2️⃣ Si Dialogflow no tiene un intent válido, usamos Gemini**
        conversationHistory.push({ role: "user", content: message });

        const geminiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
            {
                contents: [
                    { parts: [{ text: `Responde en español, sé preciso y claro. Pregunta del usuario: ${message}` }] } // 🔹 Se fuerza respuesta en español
                ],
                generationConfig: {
                    temperature: 0.2,  // 🔹 Se reduce creatividad para respuestas más precisas
                    maxOutputTokens: 100,  // 🔹 Se limita la respuesta para evitar texto innecesario
                    topP: 0.8,
                    topK: 30
                }
            },
            { headers: { "Content-Type": "application/json" } }
        );

        let responseText = "Lo siento, no puedo responder en este momento.";
        if (geminiResponse.data?.candidates?.[0]?.content?.parts) {
            responseText = geminiResponse.data.candidates[0].content.parts.map(part => part.text).join(" ");
        }

        conversationHistory.push({ role: "assistant", content: responseText });

        return res.json({ response: responseText });

    } catch (error) {
        return res.json({ response: "Lo siento, no puedo responder en este momento." });
    }
};

module.exports = { sendMessageToChatbot };
