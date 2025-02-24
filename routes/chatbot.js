const express = require("express");
const { sendMessageToChatbot } = require("../controllers/chatbotController"); // ✅ Importamos correctamente

const router = express.Router();

router.post("/", sendMessageToChatbot); // ✅ Usamos la función exportada correctamente

module.exports = router;
