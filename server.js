require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI) // Removed deprecated options
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// Chat Schema
const chatSchema = new mongoose.Schema({
    role: String,
    content: String,
    timestamp: { type: Date, default: Date.now }
});
const Chat = mongoose.model("Chat", chatSchema);

// Gemini API Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Chat Endpoint
app.post("/chat", async (req, res) => {
    const userMessage = req.body.message;
    if (!userMessage) return res.status(400).json({ error: "Message is required" });

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Changed model name here
        const result = await model.generateContent(userMessage);

        if (!result.response || !result.response.candidates || result.response.candidates.length === 0) {
            console.error("Gemini API returned an empty or invalid response.");
            return res.status(500).json({ error: "Gemini API returned an invalid response." });
        }

        const botReply = result.response.candidates[0]?.content?.parts[0]?.text || "I couldn't understand that.";

        // Save messages to MongoDB
        await Chat.create({ role: "user", content: userMessage });
        await Chat.create({ role: "bot", content: botReply });

        res.json({ reply: botReply });
    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: "Something went wrong with Gemini API" });
    }
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));