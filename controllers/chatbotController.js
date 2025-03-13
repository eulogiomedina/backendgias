const dialogflow = require("@google-cloud/dialogflow");
const axios = require("axios");
require("dotenv").config();

// ✅ Validar que las credenciales están definidas
if (!process.env.DIALOGFLOW_PRIVATE_KEY || !process.env.DIALOGFLOW_CLIENT_EMAIL) {
    console.error("❌ ERROR: Credenciales de Dialogflow no están configuradas correctamente.");
    process.exit(1); // Termina la ejecución del servidor si no hay credenciales
}

// ✅ Cargar credenciales de Dialogflow desde .env
const dialogflowConfig = {
    credentials: {
        private_key: process.env.DIALOGFLOW_PRIVATE_KEY.replace(/\\n/g, "\n"),
        client_email: process.env.DIALOGFLOW_CLIENT_EMAIL
    },
    projectId: process.env.DIALOGFLOW_PROJECT_ID
};

// ✅ Crear cliente de sesión de Dialogflow
let sessionClient;
try {
    sessionClient = new dialogflow.SessionsClient(dialogflowConfig);
} catch (error) {
    console.error("❌ ERROR: No se pudo inicializar el cliente de Dialogflow:", error.message);
    process.exit(1);
}

const conversationHistory = []; // Historial de conversación

const sendMessageToChatbot = async (req, res) => {
    const message = req.body.message;
    const sessionId = "12345"; // Se puede generar dinámicamente

    const sessionPath = `projects/${process.env.DIALOGFLOW_PROJECT_ID}/agent/sessions/${sessionId}`;
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
        console.error("❌ ERROR en la API de Gemini o Dialogflow:", error.response?.data || error.message);
        return res.json({ response: "Lo siento, no puedo responder en este momento." });
    }
};

module.exports = { sendMessageToChatbot };
