import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
console.log("🔍 OPENAI_API_KEY:", OPENAI_API_KEY ? "✅ trovata" : "❌ non trovata");

// ROUTE DI TEST
app.get("/", (req, res) => {
  res.send("✅ ChrisGPT Proxy attivo e diagnostico su Render!");
});

// ROUTE PRINCIPALE
app.post("/api/chat", async (req, res) => {
  const { prompt } = req.body;
  console.log("📩 Prompt ricevuto:", prompt);

  if (!prompt) {
    return res.status(400).json({ reply: "⚠️ Nessun prompt ricevuto." });
  }

  if (!OPENAI_API_KEY) {
    console.error("❌ API key mancante nel server Render!");
    return res.status(500).json({ reply: "❌ API key non configurata sul server." });
  }

  try {
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
              "Sei Chris – Travel Planner di Blog di Viaggi. Genera itinerari dettagliati in italiano, divisi per giorno, con suggerimenti su cosa vedere, dove mangiare e dove dormire.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
      }),
    });

    const text = await response.text(); // leggiamo testo grezzo per debug
    console.log("📤 Risposta grezza OpenAI:", text.slice(0, 200));

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("⚠️ Errore nel parsing JSON:", e.message);
      return res.status(500).json({ reply: "❌ Risposta non valida da OpenAI." });
    }

    if (!response.ok) {
      console.error("❌ Errore OpenAI:", data);
      return res.status(500).json({
        reply: `Errore OpenAI: ${data.error?.message || "Richiesta non valida."}`,
      });
    }

    const reply =
      data.choices?.[0]?.message?.content?.trim() ||
      "❌ Nessuna risposta ricevuta da OpenAI.";

    res.json({ reply });
  } catch (error) {
    console.error("❌ Errore proxy:", error);
    res.status(500).json({ reply: "Errore interno del proxy." });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`✅ Server attivo su porta ${port}`));

