import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log("🔍 OPENAI_API_KEY:", OPENAI_API_KEY ? "✅ trovata" : "❌ non trovata");

app.get("/", (req, res) => {
  res.send("✅ ChrisGPT Proxy attivo su Render!");
});

app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ reply: "⚠️ Nessun prompt ricevuto." });
  }

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ reply: "❌ API key non configurata sul server." });
  }

  try {
    console.log("💬 Richiesta classica (non streaming)");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Sei Chris – Travel Planner di Blog di Viaggi. Genera itinerari di viaggio dettagliati in italiano, c
