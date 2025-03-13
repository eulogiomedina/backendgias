const dialogflow = require("@google-cloud/dialogflow");
const axios = require("axios");
const path = require("path");
require("dotenv").config();

// Verificar si la clave API de Gemini está cargando correctamente
console.log("Clave API de Gemini:", process.env.GOOGLE_GEMINI_API_KEY ? "Cargada correctamente" : "No encontrada");

const sessionClient = new dialogflow.SessionsClient({
    keyFilename: path.join(__dirname, "../config/dialogflow.json"),
});

const projectId = "chatbotgias-kx9y"; // ID de tu agente Dialogflow
const conversationHistory = []; // Historial de conversación

const sendMessageToChatbot = async (req, res) => {
    const message = req.body.message;
    const sessionId = "12345"; // Se puede generar dinámicamente

    const sessionPath = `projects/${projectId}/agent/sessions/${sessionId}`;
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: message,
                languageCode: "es", // ✅ Asegura que Dialogflow procese en español
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
            result.intentDetectionConfidence > 0.9
        ) {
            return res.json({ response: result.fulfillmentText });
        }

        // **2️⃣ Si Dialogflow no tiene un intent válido, usamos Gemini**
        conversationHistory.push({ role: "user", content: message });

        const geminiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
            {
                contents: [
                    { parts: [{ text: `Responde en español, sé preciso y claro. Pregunta del usuario: ${message}` }] }
                ],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 100,
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
        console.error("Error en la API de Gemini:", error.response?.data || error.message);
        return res.json({ response: "Lo siento, no puedo responder en este momento." });
    }
};

module.exports = { sendMessageToChatbot };
