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
              "Sei Chris – Travel Planner di Blog di Viaggi. Genera itinerari di viaggio dettagliati in italiano.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Errore OpenAI:", data);
      return res.status(500).json({
        reply: `Errore OpenAI: ${data.error?.message || "Richiesta non valida."}`,
      });
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || "❌ Nessuna risposta ricevuta.";
    res.json({ reply });
  } catch (error) {
    console.error("❌ Errore proxy:", error);
    res.status(500).json({ reply: "Errore interno del proxy." });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`✅ Server attivo su porta ${port}`));

